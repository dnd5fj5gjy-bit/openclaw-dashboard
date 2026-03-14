#!/usr/bin/env node

/**
 * OpenClaw CLI Bridge Server
 * Polls `openclaw status --json` and `openclaw sessions_list --json`
 * and exposes REST API for dashboard frontend
 *
 * Run: node openclaw-bridge.js
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { join, basename } from 'path';

const execAsync = promisify(exec);

const WORKSPACE_ROOT = '/Users/bgvai/.openclaw';
const AGENTS_DIR = join(WORKSPACE_ROOT, 'workspace-nexus');

// In-memory cache
let cachedData = {
  agents: [],
  sessions: [],
  tasks: [],
  health: null,
  lastPoll: Date.now(),
  pollCount: 0,
  messages: [],
  events: [],
  taskAssignments: {},
  projects: [],
  reminders: [],
  rules: [],
  alerts: [],
};

/**
 * Fetch data from openclaw status --json
 */
async function fetchOpenClawStatus() {
  try {
    const { stdout } = await execAsync('openclaw status --json', { timeout: 10000 });
    return JSON.parse(stdout.trim());
  } catch (error) {
    console.error('⚠️  Error fetching openclaw status:', error.message);
    return null;
  }
}

/**
 * Fetch data from openclaw sessions --json --all-agents
 */
async function fetchOpenClawSessions() {
  try {
    const { stdout } = await execAsync('openclaw sessions --json --all-agents', { timeout: 10000 });
    const data = JSON.parse(stdout.trim());
    return data.sessions || [];
  } catch (error) {
    console.error('⚠️  Error fetching openclaw sessions:', error.message);
    return null;
  }
}

/**
 * Parse session key: "agent:nexus:telegram:direct:8325999298"
 */
function parseSessionKey(key) {
  const parts = key.split(':');
  return {
    agent: parts[1] || 'unknown',
    channel: parts[2] || 'unknown',
    kind: parts[3] || 'direct',
    from: parts[4] || 'unknown',
  };
}

/**
 * Transform raw sessions into AgentInfo and SessionRow format
 */
function transformAgentData(rawSessions) {
  if (!Array.isArray(rawSessions)) return { agents: [], sessions: [] };

  const agentMap = new Map();
  const sessionRows = [];
  const now = Date.now();

  rawSessions.forEach(session => {
    const parsed = parseSessionKey(session.key);
    const agentName = session.agentId || parsed.agent || 'unknown';
    const updatedAt = session.updatedAt || Date.now();
    const ageMs = now - updatedAt;
    const ageLabel = formatAge(ageMs);

    if (session.kind === 'main') return;

    if (!agentMap.has(agentName)) {
      agentMap.set(agentName, {
        name: agentName,
        status: 'idle',
        sessionCount: 0,
        lastActive: updatedAt,
        lastActiveAgo: ageLabel,
      });
    }

    const agent = agentMap.get(agentName);
    agent.sessionCount += 1;
    if (updatedAt > agent.lastActive) {
      agent.lastActive = updatedAt;
      agent.lastActiveAgo = ageLabel;
      agent.status = ageMs < 300000 ? 'active' : 'idle';
    }

    sessionRows.push({
      key: session.key,
      agentName,
      sessionId: session.sessionId,
      updatedAt,
      ageLabel,
      chatType: session.kind || 'unknown',
      channel: parsed.channel,
      from: parsed.from,
      kind: session.kind || 'direct',
    });
  });

  return {
    agents: Array.from(agentMap.values()),
    sessions: sessionRows,
  };
}

/**
 * Format milliseconds as human-readable age
 */
function formatAge(ms) {
  if (ms < 1000) return 'just now';
  if (ms < 60000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

/**
 * Load tasks from agent-tasks.jsonl if it exists
 */
async function loadTasksFromFile() {
  try {
    const path = join(AGENTS_DIR, 'agent-tasks.jsonl');
    try {
      const data = await fs.readFile(path, 'utf-8');
      return data
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const task = JSON.parse(line);
          return {
            id: task.id,
            agent: task.agent || 'unknown',
            title: task.title || 'untitled',
            description: task.description || '',
            status: task.status || 'idle',
            startedAt: task.startedAt || Date.now(),
            updatedAt: task.updatedAt || Date.now(),
            completedAt: task.completedAt || null,
            tags: task.tags || [],
            project: task.project || null,
          };
        });
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Save tasks back to agent-tasks.jsonl
 */
async function saveTasksToFile(tasks) {
  try {
    const path = join(AGENTS_DIR, 'agent-tasks.jsonl');
    const data = tasks.map(t => JSON.stringify(t)).join('\n') + '\n';
    await fs.writeFile(path, data, 'utf-8');
  } catch (error) {
    console.error('Error saving tasks:', error.message);
  }
}

/**
 * Generate unique ID
 */
function uid(prefix = '') {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Evaluate alert rules
 */
function evaluateRules() {
  const now = Date.now();
  for (const rule of cachedData.rules) {
    if (!rule.enabled) continue;

    // Throttle: don't re-fire within 5 minutes
    if (rule.lastTriggered && (now - rule.lastTriggered) < 300000) continue;

    let triggered = false;
    switch (rule.condition) {
      case 'tasks_queued_gt':
        triggered = cachedData.tasks.filter(t => t.status === 'queued').length > rule.conditionValue;
        break;
      case 'tasks_active_gt':
        triggered = cachedData.tasks.filter(t => t.status === 'active').length > rule.conditionValue;
        break;
      case 'agent_idle_mins': {
        const idleAgents = cachedData.agents.filter(a => {
          const idleMins = (now - a.lastActive) / 60000;
          return idleMins > rule.conditionValue;
        });
        triggered = idleAgents.length > 0;
        break;
      }
      case 'sessions_count_gt':
        triggered = cachedData.sessions.length > rule.conditionValue;
        break;
    }

    if (triggered) {
      rule.lastTriggered = now;
      const alert = {
        id: uid('alert-'),
        ruleId: rule.id,
        ruleName: rule.name,
        message: rule.actionMessage || `Rule "${rule.name}" triggered`,
        timestamp: now,
        agent: rule.actionAgent,
      };
      cachedData.alerts.push(alert);

      // Post to chat feed
      cachedData.messages.push({
        id: uid('msg-'),
        from: 'system',
        to: rule.actionAgent || 'all',
        message: `⚠️ Alert: ${alert.message}`,
        type: 'alert',
        timestamp: now,
      });

      // Keep limits
      if (cachedData.alerts.length > 500) cachedData.alerts = cachedData.alerts.slice(-500);
      if (cachedData.messages.length > 500) cachedData.messages = cachedData.messages.slice(-500);

      console.log(`🔔 Alert fired: ${rule.name}`);
    }
  }
}

/**
 * Check and fire due reminders
 */
function checkReminders() {
  const now = Date.now();
  for (const reminder of cachedData.reminders) {
    if (reminder.fired) continue;
    if (now >= reminder.scheduledAt) {
      reminder.fired = true;

      // Post to chat
      cachedData.messages.push({
        id: uid('msg-'),
        from: 'system',
        to: reminder.agent || 'all',
        message: `⏰ Reminder: ${reminder.title}${reminder.message ? ' — ' + reminder.message : ''}`,
        type: 'task',
        timestamp: now,
      });

      // Log event
      cachedData.events.push({
        id: uid('evt-'),
        timestamp: now,
        type: 'reminder_fired',
        actor: 'system',
        target: reminder.agent || 'all',
        details: `Reminder fired: ${reminder.title}`,
      });

      if (cachedData.messages.length > 500) cachedData.messages = cachedData.messages.slice(-500);
      if (cachedData.events.length > 1000) cachedData.events = cachedData.events.slice(-1000);

      console.log(`⏰ Reminder fired: ${reminder.title}`);
    }
  }
}

/**
 * Main polling function
 */
async function pollOpenClawData() {
  try {
    const [rawSessions, statusData] = await Promise.all([
      fetchOpenClawSessions(),
      fetchOpenClawStatus(),
    ]);

    if (rawSessions) {
      const { agents, sessions } = transformAgentData(rawSessions);
      cachedData.agents = agents;
      cachedData.sessions = sessions;
    }

    const tasks = await loadTasksFromFile();
    cachedData.tasks = tasks;

    cachedData.health = {
      status: 'ok',
      lastPollTime: Date.now(),
      pollCount: cachedData.pollCount + 1,
      agents: cachedData.agents.length,
      sessions: cachedData.sessions.length,
      activeAgents: cachedData.agents.filter(a => a.status === 'active').length,
    };

    cachedData.lastPoll = Date.now();
    cachedData.pollCount += 1;

    // Evaluate rules and check reminders each poll
    evaluateRules();
    checkReminders();

    console.log(`✅ Poll #${cachedData.pollCount}: ${cachedData.agents.length} agents, ${cachedData.sessions.length} sessions, ${cachedData.tasks.length} tasks`);
  } catch (error) {
    console.error('❌ Polling error:', error.message);
    cachedData.health = {
      status: 'error',
      lastPollTime: Date.now(),
      pollCount: cachedData.pollCount,
      agents: 0,
      sessions: 0,
      activeAgents: 0,
    };
  }
}

/**
 * Express app setup
 */
const app = express();
const port = process.env.PORT || 9999;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Core API Routes ───────────────────────────────────────────

app.get('/api/agents', (req, res) => {
  res.json(cachedData.agents);
});

app.get('/api/sessions', (req, res) => {
  let filtered = cachedData.sessions;
  if (req.query.channel) filtered = filtered.filter(s => s.channel === req.query.channel);
  if (req.query.agent) filtered = filtered.filter(s => s.agentName === req.query.agent);
  if (req.query.kind) filtered = filtered.filter(s => s.kind === req.query.kind);
  res.json(filtered);
});

app.get('/api/tasks', (req, res) => {
  let filtered = cachedData.tasks;
  if (req.query.agent) filtered = filtered.filter(t => t.agent === req.query.agent);
  if (req.query.status) {
    const statuses = req.query.status.split(',');
    filtered = filtered.filter(t => statuses.includes(t.status));
  }
  if (req.query.tag) filtered = filtered.filter(t => t.tags && t.tags.includes(req.query.tag));
  if (req.query.project) filtered = filtered.filter(t => t.project === req.query.project);
  if (req.query.completed === 'true') {
    filtered = filtered.filter(t => t.status === 'done' || t.completedAt);
    filtered = filtered.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }
  if (req.query.active === 'true') {
    filtered = filtered.filter(t => t.status === 'active' || t.status === 'queued');
  }
  const limit = parseInt(req.query.limit) || 100;
  filtered = filtered.slice(0, limit);
  res.json(filtered);
});

// Create task
app.post('/api/tasks', async (req, res) => {
  const { title, description, agent, tags, project, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Missing title' });

  const task = {
    id: uid('task-'),
    agent: agent || 'unassigned',
    title: String(title).trim(),
    description: String(description || '').trim(),
    status: status || 'queued',
    startedAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    tags: tags || [],
    project: project || null,
  };

  cachedData.tasks.push(task);
  await saveTasksToFile(cachedData.tasks);

  cachedData.events.push({
    id: uid('evt-'),
    timestamp: Date.now(),
    type: 'task_created',
    actor: agent || 'felix',
    target: task.id,
    details: `Created task: ${task.title}`,
  });

  console.log(`📋 Task created: ${task.title}`);
  res.json({ success: true, task });
});

// Update task (status change, complete, etc.)
app.put('/api/tasks/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const idx = cachedData.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  const task = cachedData.tasks[idx];
  const updates = req.body;

  if (updates.status) task.status = updates.status;
  if (updates.agent) task.agent = updates.agent;
  if (updates.title) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.tags) task.tags = updates.tags;
  if (updates.project !== undefined) task.project = updates.project;
  task.updatedAt = Date.now();

  if (updates.status === 'done') task.completedAt = Date.now();
  if (updates.status === 'active' && !task.startedAt) task.startedAt = Date.now();

  await saveTasksToFile(cachedData.tasks);

  const eventType = updates.status === 'done' ? 'task_completed' :
                     updates.status === 'active' ? 'task_started' : 'task_updated';
  cachedData.events.push({
    id: uid('evt-'),
    timestamp: Date.now(),
    type: eventType,
    actor: updates.agent || task.agent,
    target: taskId,
    details: `${eventType.replace('_', ' ')}: ${task.title}`,
  });
  if (cachedData.events.length > 1000) cachedData.events = cachedData.events.slice(-1000);

  console.log(`📋 Task updated: ${task.title} → ${task.status}`);
  res.json({ success: true, task });
});

// Assign task to project
app.put('/api/tasks/:taskId/project', async (req, res) => {
  const { taskId } = req.params;
  const { project } = req.body;
  const idx = cachedData.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  cachedData.tasks[idx].project = project || null;
  cachedData.tasks[idx].updatedAt = Date.now();
  await saveTasksToFile(cachedData.tasks);

  res.json({ success: true, task: cachedData.tasks[idx] });
});

app.get('/api/health', (req, res) => {
  res.json(cachedData.health || { status: 'loading' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Date.now() - cachedData.lastPoll });
});

// ─── Chat endpoints ────────────────────────────────────────────

app.get('/api/chat', (req, res) => {
  const limit = parseInt(req.query.limit) || 60;
  res.json(cachedData.messages.slice(-limit));
});

app.post('/api/chat', (req, res) => {
  const { from, to, message, type } = req.body;
  if (!from || !to || !message) {
    return res.status(400).json({ error: 'Missing required fields: from, to, message' });
  }

  const chatMsg = {
    id: uid('msg-'),
    from: String(from).toLowerCase(),
    to: String(to).toLowerCase(),
    message: String(message).trim(),
    type: type || 'message',
    timestamp: Date.now(),
  };

  cachedData.messages.push(chatMsg);
  if (cachedData.messages.length > 500) cachedData.messages = cachedData.messages.slice(-500);

  console.log(`💬 Chat: ${chatMsg.from} → ${chatMsg.to}: "${chatMsg.message.slice(0, 50)}..."`);
  res.json({ success: true, message: chatMsg });
});

app.post('/api/chat/agent', (req, res) => {
  const { agent, message, type, to } = req.body;
  if (!agent || !message) {
    return res.status(400).json({ error: 'Missing required fields: agent, message' });
  }

  const chatMsg = {
    id: uid('msg-'),
    from: String(agent).toLowerCase(),
    to: String(to || 'all').toLowerCase(),
    message: String(message).trim(),
    type: type || 'message',
    timestamp: Date.now(),
  };

  cachedData.messages.push(chatMsg);
  if (cachedData.messages.length > 500) cachedData.messages = cachedData.messages.slice(-500);

  console.log(`💬 Agent chat: ${chatMsg.from} → ${chatMsg.to}: "${chatMsg.message.slice(0, 50)}..."`);
  res.json({ success: true, message: chatMsg });
});

// ─── Task assignment endpoints ─────────────────────────────────

app.post('/api/tasks/:taskId/assign', async (req, res) => {
  const { taskId } = req.params;
  const { agent } = req.body;
  if (!agent) return res.status(400).json({ error: 'Missing agent' });

  cachedData.taskAssignments[taskId] = {
    agent: String(agent).toLowerCase(),
    assignedAt: Date.now(),
    pickedUpAt: null,
  };

  // Also update the task status to active
  const taskIdx = cachedData.tasks.findIndex(t => t.id === taskId);
  if (taskIdx !== -1) {
    cachedData.tasks[taskIdx].status = 'active';
    cachedData.tasks[taskIdx].agent = agent;
    cachedData.tasks[taskIdx].updatedAt = Date.now();
    await saveTasksToFile(cachedData.tasks);
  }

  cachedData.events.push({
    id: uid('evt-'),
    timestamp: Date.now(),
    type: 'task_assigned',
    actor: agent,
    target: taskId,
    details: `Claimed task ${taskId}`,
  });
  if (cachedData.events.length > 1000) cachedData.events = cachedData.events.slice(-1000);

  console.log(`📋 Task assignment: ${agent} → ${taskId}`);
  res.json({ success: true, assignment: cachedData.taskAssignments[taskId] });
});

app.get('/api/tasks/:taskId/assignment', (req, res) => {
  const { taskId } = req.params;
  res.json(cachedData.taskAssignments[taskId] || null);
});

// ─── Audit log endpoint ────────────────────────────────────────

app.get('/api/events', (req, res) => {
  let filtered = [...cachedData.events];
  if (req.query.agent) filtered = filtered.filter(e => e.actor === req.query.agent);
  if (req.query.type) filtered = filtered.filter(e => e.type === req.query.type);
  const limit = parseInt(req.query.limit) || 100;
  filtered = filtered.slice(-limit).reverse();
  res.json(filtered);
});

// ─── Skills endpoint ───────────────────────────────────────────

app.get('/api/skills', async (req, res) => {
  try {
    const skillsDir = join(AGENTS_DIR, '.openclaw', 'skills');
    let out = [];
    try {
      const dirs = await fs.readdir(skillsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        const skillPath = `${skillsDir}/${d.name}/SKILL.md`;
        try {
          const content = await fs.readFile(skillPath, 'utf-8');
          out.push({ name: d.name, path: skillPath, content });
        } catch {
          out.push({ name: d.name, path: skillPath, content: null });
        }
      }
    } catch {
      out = [];
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ─── Projects endpoints ────────────────────────────────────────

app.get('/api/projects', (req, res) => {
  res.json(cachedData.projects);
});

app.post('/api/projects', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  const project = {
    id: uid('proj-'),
    name: String(name).trim(),
    color: color || '#58a6ff',
    createdAt: Date.now(),
  };

  cachedData.projects.push(project);

  cachedData.events.push({
    id: uid('evt-'),
    timestamp: Date.now(),
    type: 'project_created',
    actor: 'felix',
    target: project.id,
    details: `Created project: ${project.name}`,
  });

  console.log(`📁 Project created: ${project.name}`);
  res.json({ success: true, project });
});

app.delete('/api/projects/:id', (req, res) => {
  cachedData.projects = cachedData.projects.filter(p => p.id !== req.params.id);
  // Unassign tasks
  cachedData.tasks.forEach(t => {
    if (t.project === req.params.id) t.project = null;
  });
  res.json({ success: true });
});

// ─── Reminders endpoints ───────────────────────────────────────

app.get('/api/reminders', (req, res) => {
  res.json(cachedData.reminders);
});

app.post('/api/reminders', (req, res) => {
  const { title, message, agent, scheduledAt, taskId } = req.body;
  if (!title || !scheduledAt) return res.status(400).json({ error: 'Missing title or scheduledAt' });

  const reminder = {
    id: uid('rem-'),
    taskId: taskId || null,
    title: String(title).trim(),
    message: String(message || '').trim(),
    agent: agent || null,
    scheduledAt: Number(scheduledAt),
    fired: false,
    createdAt: Date.now(),
  };

  cachedData.reminders.push(reminder);

  console.log(`⏰ Reminder scheduled: ${reminder.title} for ${new Date(reminder.scheduledAt).toISOString()}`);
  res.json({ success: true, reminder });
});

app.delete('/api/reminders/:id', (req, res) => {
  cachedData.reminders = cachedData.reminders.filter(r => r.id !== req.params.id);
  res.json({ success: true });
});

// ─── Memories endpoint ─────────────────────────────────────────

app.get('/api/memories/:agent', async (req, res) => {
  const { agent } = req.params;
  const memories = [];

  // Check workspace-specific memory directory
  const memoryDirs = [
    join(WORKSPACE_ROOT, `workspace-${agent}`, 'memory'),
    join(WORKSPACE_ROOT, `workspace-${agent}`, 'memories'),
  ];

  for (const memDir of memoryDirs) {
    try {
      const files = await fs.readdir(memDir);
      for (const file of files) {
        if (!file.endsWith('.md') || file === 'MEMORY.md') continue;
        try {
          const content = await fs.readFile(join(memDir, file), 'utf-8');
          // Parse frontmatter
          let name = file.replace('.md', '');
          let type = 'unknown';
          let description = '';
          let body = content;

          const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
          if (fmMatch) {
            const fm = fmMatch[1];
            body = fmMatch[2].trim();
            const nameMatch = fm.match(/name:\s*(.+)/);
            const typeMatch = fm.match(/type:\s*(.+)/);
            const descMatch = fm.match(/description:\s*(.+)/);
            if (nameMatch) name = nameMatch[1].trim();
            if (typeMatch) type = typeMatch[1].trim();
            if (descMatch) description = descMatch[1].trim();
          }

          memories.push({ name, type, description, content: body });
        } catch { /* skip unreadable files */ }
      }
    } catch { /* dir doesn't exist */ }
  }

  // Also try to read MEMORY.md index
  const indexPaths = [
    join(WORKSPACE_ROOT, `workspace-${agent}`, 'MEMORY.md'),
    join(WORKSPACE_ROOT, `workspace-${agent}`, 'memory', 'MEMORY.md'),
  ];

  for (const indexPath of indexPaths) {
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      if (content.trim()) {
        memories.unshift({
          name: 'MEMORY.md (index)',
          type: 'index',
          description: 'Memory index file',
          content: content.trim(),
        });
      }
      break;
    } catch { /* not found */ }
  }

  res.json(memories);
});

// ─── Session replay endpoint ───────────────────────────────────

app.get('/api/sessions/:sessionId/replay', async (req, res) => {
  const { sessionId } = req.params;
  const limit = parseInt(req.query.limit) || 20;

  // Try to find the session file in agent directories
  const agentIds = ['nexus', 'junior', 'bgv'];
  for (const agentId of agentIds) {
    const sessionDir = join(WORKSPACE_ROOT, 'agents', agentId, 'sessions');
    try {
      const sessionsFile = join(sessionDir, 'sessions.json');
      const data = JSON.parse(await fs.readFile(sessionsFile, 'utf-8'));

      // Find matching session
      for (const [key, session] of Object.entries(data)) {
        if (session && typeof session === 'object' && session.sessionId === sessionId) {
          // Try to read the conversation log
          const logPath = join(sessionDir, `${sessionId}.jsonl`);
          try {
            const logData = await fs.readFile(logPath, 'utf-8');
            const messages = logData
              .split('\n')
              .filter(l => l.trim())
              .map(l => { try { return JSON.parse(l); } catch { return null; } })
              .filter(Boolean)
              .filter(m => m.role === 'user' || m.role === 'assistant')
              .map(m => ({
                role: m.role,
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                timestamp: m.timestamp || null,
              }))
              .slice(-limit);
            return res.json(messages);
          } catch {
            // No log file
          }
        }
      }
    } catch { /* dir/file not found */ }
  }

  res.json([]);
});

// ─── Alert rules endpoints ─────────────────────────────────────

app.get('/api/rules', (req, res) => {
  res.json(cachedData.rules);
});

app.post('/api/rules', (req, res) => {
  const { name, condition, conditionValue, action, actionAgent, actionMessage, enabled } = req.body;
  if (!name || !condition) return res.status(400).json({ error: 'Missing name or condition' });

  const rule = {
    id: uid('rule-'),
    name: String(name).trim(),
    condition,
    conditionValue: Number(conditionValue) || 0,
    action: action || 'chat',
    actionAgent: actionAgent || 'all',
    actionMessage: String(actionMessage || '').trim(),
    enabled: enabled !== false,
    createdAt: Date.now(),
    lastTriggered: null,
  };

  cachedData.rules.push(rule);
  console.log(`🔔 Rule created: ${rule.name}`);
  res.json({ success: true, rule });
});

app.put('/api/rules/:id', (req, res) => {
  const idx = cachedData.rules.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Rule not found' });

  const updates = req.body;
  if (updates.enabled !== undefined) cachedData.rules[idx].enabled = updates.enabled;
  if (updates.name) cachedData.rules[idx].name = updates.name;
  if (updates.conditionValue !== undefined) cachedData.rules[idx].conditionValue = updates.conditionValue;
  if (updates.actionMessage) cachedData.rules[idx].actionMessage = updates.actionMessage;

  res.json({ success: true, rule: cachedData.rules[idx] });
});

app.delete('/api/rules/:id', (req, res) => {
  cachedData.rules = cachedData.rules.filter(r => r.id !== req.params.id);
  res.json({ success: true });
});

// Test a rule (force-fire it)
app.post('/api/rules/:id/test', (req, res) => {
  const rule = cachedData.rules.find(r => r.id === req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });

  const now = Date.now();
  const alert = {
    id: uid('alert-'),
    ruleId: rule.id,
    ruleName: rule.name,
    message: `[TEST] ${rule.actionMessage || rule.name}`,
    timestamp: now,
    agent: rule.actionAgent,
  };

  cachedData.alerts.push(alert);
  cachedData.messages.push({
    id: uid('msg-'),
    from: 'system',
    to: rule.actionAgent || 'all',
    message: `⚠️ Test Alert: ${alert.message}`,
    type: 'alert',
    timestamp: now,
  });

  console.log(`🔔 Test alert fired: ${rule.name}`);
  res.json({ success: true, alert });
});

app.get('/api/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json(cachedData.alerts.slice(-limit).reverse());
});

// ─── Start server ──────────────────────────────────────────────

const server = app.listen(port, () => {
  console.log(`\n🚀 OpenClaw Bridge Server started`);
  console.log(`📡 API: http://localhost:${port}/api`);
  console.log(`   Core:      GET /api/agents, /api/sessions, /api/tasks, /api/health`);
  console.log(`   Tasks:     POST /api/tasks, PUT /api/tasks/:id, POST /api/tasks/:id/assign`);
  console.log(`   Chat:      GET /api/chat, POST /api/chat, POST /api/chat/agent`);
  console.log(`   Projects:  GET /api/projects, POST /api/projects`);
  console.log(`   Calendar:  GET /api/reminders, POST /api/reminders`);
  console.log(`   Docs:      GET /api/memories/:agent, GET /api/skills`);
  console.log(`   Alerts:    GET /api/rules, POST /api/rules, GET /api/alerts`);
  console.log(`   Audit:     GET /api/events`);
  console.log(`   Replay:    GET /api/sessions/:id/replay\n`);

  pollOpenClawData();
  setInterval(pollOpenClawData, 10000);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
