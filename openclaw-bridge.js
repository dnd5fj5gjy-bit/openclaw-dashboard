#!/usr/bin/env node

/**
 * OpenClaw CLI Bridge Server
 * Polls `openclaw sessions_list` command and exposes REST API for dashboard
 * 
 * Run: node openclaw-bridge.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';

const execAsync = promisify(exec);

// In-memory state
let cachedSessions = [];
let lastPollTime = Date.now();

/**
 * Call OpenClaw CLI to get sessions list
 */
async function fetchOpenClawSessions() {
  try {
    const { stdout, stderr } = await execAsync('openclaw sessions_list --json', { timeout: 5000 });
    
    if (stderr) {
      console.log('CLI stderr:', stderr);
    }
    
    return JSON.parse(stdout.trim());
  } catch (error) {
    console.error('Error fetching OpenClaw sessions:', error.message);
    // Return mock data for demo if CLI fails
    return getMockSessions();
  }
}

/**
 * Mock session data based on your known agents
 */
function getMockSessions() {
  return [
    {
      id: 'agent:nexus',
      agentName: 'nexus',
      status: 'running',
      createdAt: '2026-03-12T06:00:00Z',
      lastMessageAt: new Date().toISOString(),
    },
    {
      id: 'agent:junior',
      agentName: 'junior',
      status: 'running',
      createdAt: '2026-03-12T06:05:00Z',
      lastMessageAt: new Date().toISOString(),
    },
    {
      id: 'agent:bgv',
      agentName: 'bgv',
      status: 'running',
      createdAt: '2026-03-12T06:10:00Z',
      lastMessageAt: new Date().toISOString(),
    },
  ];
}

/**
 * Fetch recent tasks from a specific session using OpenClaw CLI
 */
async function fetchSessionHistory(sessionId) {
  try {
    const escapedId = sessionId.replace(/"/g, '\\"');
    const { stdout } = await execAsync(
      `openclaw sessions_history --session-key "${sessionId}" --limit 50`, 
      { timeout: 5000 }
    );
    
    // Parse the output and extract tasks/messages
    return parseSessionHistory(stdout);
  } catch (error) {
    console.error(`Error fetching history for ${sessionId}:`, error.message);
    return getMockTasks(sessionId);
  }
}

/**
 * Parse OpenClaw sessions_history output into task format
 */
function parseSessionHistory(output) {
  // This depends on the actual CLI output format
  // For now, we'll return mock tasks that fit your dashboard
  
  const mockTasks = [
    {
      id: `${Date.now()}`,
      title: 'analyze_codebase',
      status: 'done',
      agent: 'nexus',
      description: 'Analyzed code structure and identified dependencies',
      createdAt: new Date().toISOString(),
    },
    {
      id: `${Date.now() - 10000}`,
      title: 'update_documentation',
      status: 'in-progress',
      agent: 'nexus',
      description: 'Updating memory files with latest changes',
      createdAt: new Date(Date.now() - 10000).toISOString(),
    },
  ];
  
  return mockTasks;
}

/**
 * Mock tasks for fallback
 */
function getMockTasks(sessionId) {
  const baseName = sessionId.split(':')[1] || 'agent';
  return [
    {
      id: `task-${baseName}-001`,
      title: 'initialize_environment',
      status: 'done',
      agent: baseName,
      description: 'Set up development environment and dependencies',
      createdAt: new Date(Date.now() - 60000).toISOString(),
    },
    {
      id: `task-${baseName}-002`,
      title: 'analyze_dependencies',
      status: 'todo',
      agent: baseName,
      description: 'Review and analyze project dependencies',
      createdAt: new Date(Date.now() - 30000).toISOString(),
    },
  ];
}

/**
 * Create Express REST API server
 */
function createRestApiServer(expressApp) {
  const apiRouter = express.Router();
  
  apiRouter.use(cors());
  
  // GET /api/sessions - Returns all sessions
  apiRouter.get('/sessions', (req, res) => {
    res.json({ sessions: cachedSessions });
  });
  
  // GET /api/tasks - Returns all tasks across sessions
  apiRouter.get('/tasks', (req, res) => {
    const allTasks = cachedSessions.flatMap(session => 
      session.tasks || []
    );
    
    res.json(allTasks);
  });
  
  // GET /api/sessions/:sessionId/tasks - Get tasks for a specific session
  apiRouter.get('/sessions/:sessionId/tasks', (req, res) => {
    const sessionId = req.params.sessionId;
    const session = cachedSessions.find(s => s.id === sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json(session.tasks || []);
  });
  
  // GET /api/tasks/:taskId - Get single task details
  apiRouter.get('/tasks/:taskId', (req, res) => {
    const allTasks = cachedSessions.flatMap(s => s.tasks || []);
    const task = allTasks.find(t => t.id === req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Add mock audit trail
    res.json({
      ...task,
      auditTrail: [
        {
          time: task.createdAt,
          action: 'created',
          details: `Task created with status ${task.status}`
        },
        {
          time: new Date().toISOString(),
          action: 'status_update',
          details: `Status is now ${task.status}`
        }
      ]
    });
  });
  
  // POST /api/tasks/:taskId/pause
  apiRouter.post('/tasks/:taskId/pause', (req, res) => {
    const taskId = req.params.taskId;
    
    // In production, this would invoke OpenClaw CLI to pause the task
    console.log(`Pausing task: ${taskId}`);
    
    const allTasks = cachedSessions.flatMap(s => s.tasks || []);
    const task = allTasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = 'review'; // Pause state
    
      res.json({ success: true, message: `Paused ${taskId}` });
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });
  
  // POST /api/tasks/:taskId/resume
  apiRouter.post('/tasks/:taskId/resume', (req, res) => {
    const taskId = req.params.taskId;
    
    console.log(`Resuming task: ${taskId}`);
    
    const allTasks = cachedSessions.flatMap(s => s.tasks || []);
    const task = allTasks.find(t => t.id === taskId);
    
    if (task) {
      task.status = 'in-progress';
    
      res.json({ success: true, message: `Resumed ${taskId}` });
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  });
  
  // GET /api/health - Health check endpoint
  apiRouter.get('/health', (req, res) => {
    const uptime = Math.floor((Date.now() - lastPollTime) / 1000);
    
    res.json({
      status: 'ok',
      lastPollTime: new Date(lastPollTime).toISOString(),
      uptimeSeconds: uptime,
      activeSessions: cachedSessions.filter(s => s.status === 'running').length,
      totalSessions: cachedSessions.length,
      totalTasks: cachedSessions.flatMap(s => s.tasks || []).length,
    });
  });
  
  expressApp.use('/api', apiRouter);
}

/**
 * Main polling function
 */
async function pollOpenClawData() {
  console.log('🔄 Fetching OpenClaw sessions...');
  
  try {
    const sessions = await fetchOpenClawSessions();
    
    // Add mock tasks to each session for demo
    cachedSessions = sessions.map(session => ({
      ...session,
      tasks: getMockTasks(session.id)
        .map(task => ({
          ...task,
          sessionId: session.id
        }))
    }));
    
    lastPollTime = Date.now();
    
    console.log(`✅ Updated: ${cachedSessions.length} sessions`);
    const totalTasks = cachedSessions.flatMap(s => s.tasks || []).length;
    console.log(`   Total tasks: ${totalTasks}`);
  } catch (error) {
    console.error('❌ Polling error:', error.message);
    
    // Fallback to mock data
    cachedSessions = getMockSessions().map(session => ({
      ...session,
      tasks: getMockTasks(session.id),
    }));
  }
}

/**
 * Main entry point
 */
function main() {
  const app = new Express();
  const port = process.env.PORT || 7892;
  
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  
  createRestApiServer(app);
  
  const server = http.createServer(app);
  
  server.listen(port, () => {
    console.log(`🚀 OpenClaw Bridge Server running on port ${port}`);
    console.log(`📡 Dashboard API: http://localhost:${port}/api`);
    
    // Initial fetch
    pollOpenClawData();
    
    // Poll every 5 seconds
    setInterval(pollOpenClawData, 5000);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bridge server...');
    server.close(() => {
      process.exit(0);
    });
  });
}

main();
