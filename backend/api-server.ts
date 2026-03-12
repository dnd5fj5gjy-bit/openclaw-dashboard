/**
 * OpenClaw Dashboard API Server
 * Reads live data directly from OpenClaw agent session files on disk
 * Polls every 5 seconds and exposes REST endpoints
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';

const AGENTS_DIR = '/Users/bgvai/.openclaw/agents';
const COMMS_LOG = '/Users/bgvai/.openclaw/workspace-nexus/agent-comms.jsonl';
const POLL_INTERVAL_MS = 5000;

interface RawSession {
  key: string;
  agentName: string;
  sessionId: string;
  updatedAt: number;
  chatType: string;
  channel: string;
  from: string;
  kind: string;
}

interface AgentInfo {
  name: string;
  status: 'active' | 'idle' | 'offline';
  sessionCount: number;
  lastActive: number;
  lastActiveAgo: string;
}

interface SessionRow {
  key: string;
  agentName: string;
  sessionId: string;
  updatedAt: number;
  ageLabel: string;
  chatType: string;
  channel: string;
  from: string;
  kind: string;
}

let cachedAgents: AgentInfo[] = [];
let cachedSessions: SessionRow[] = [];
let lastPollTime = Date.now();
let pollCount = 0;

function formatAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getAgentStatus(lastActive: number, sessionCount: number): 'active' | 'idle' | 'offline' {
  if (sessionCount === 0) return 'offline';
  const ageMinutes = (Date.now() - lastActive) / 60000;
  if (ageMinutes < 60) return 'active';
  if (ageMinutes < 480) return 'idle';
  return 'offline';
}

function loadAgentData(agentName: string): { sessions: RawSession[] } {
  try {
    const sessionsFile = path.join(AGENTS_DIR, agentName, 'sessions', 'sessions.json');
    if (!fs.existsSync(sessionsFile)) return { sessions: [] };

    const raw = JSON.parse(fs.readFileSync(sessionsFile, 'utf8')) as Record<string, any>;
    const sessions: RawSession[] = [];

    for (const [key, data] of Object.entries(raw)) {
      if (!data || typeof data !== 'object') continue;

      // Determine kind from key
      const kind = key.includes(':group:') ? 'group' : 'direct';

      // Extract readable "from" label
      let fromLabel = data.origin?.from || data.lastTo || key;
      // Shorten for display
      if (fromLabel.includes(':')) {
        const parts = fromLabel.split(':');
        fromLabel = parts[parts.length - 1];
      }

      sessions.push({
        key,
        agentName,
        sessionId: data.sessionId || key,
        updatedAt: data.updatedAt || 0,
        chatType: data.chatType || data.origin?.chatType || kind,
        channel: data.lastChannel || data.origin?.provider || 'internal',
        from: fromLabel,
        kind,
      });
    }

    return { sessions: sessions.sort((a, b) => b.updatedAt - a.updatedAt) };
  } catch (err) {
    console.error(`Error reading ${agentName}:`, (err as Error).message);
    return { sessions: [] };
  }
}

async function pollData() {
  try {
    if (!fs.existsSync(AGENTS_DIR)) {
      console.warn('⚠️  Agents dir not found:', AGENTS_DIR);
      return;
    }

    const agentDirs = fs.readdirSync(AGENTS_DIR).filter(d => {
      try {
        return fs.statSync(path.join(AGENTS_DIR, d)).isDirectory();
      } catch {
        return false;
      }
    });

    const agents: AgentInfo[] = [];
    const allSessions: SessionRow[] = [];

    for (const agentName of agentDirs) {
      const { sessions } = loadAgentData(agentName);
      const lastActive = sessions.length > 0 ? sessions[0].updatedAt : 0;
      const status = getAgentStatus(lastActive, sessions.length);

      agents.push({
        name: agentName,
        status,
        sessionCount: sessions.length,
        lastActive,
        lastActiveAgo: lastActive > 0 ? formatAgo(lastActive) : 'never',
      });

      for (const s of sessions) {
        allSessions.push({
          ...s,
          ageLabel: s.updatedAt > 0 ? formatAgo(s.updatedAt) : 'unknown',
        });
      }
    }

    // Sort sessions by most recent first
    allSessions.sort((a, b) => b.updatedAt - a.updatedAt);

    cachedAgents = agents.sort((a, b) => b.lastActive - a.lastActive);
    cachedSessions = allSessions;
    lastPollTime = Date.now();
    pollCount++;

    const totalSessions = allSessions.length;
    const activeAgents = agents.filter(a => a.status === 'active').length;
    console.log(`✅ [poll #${pollCount}] ${agents.length} agents (${activeAgents} active), ${totalSessions} sessions`);
  } catch (err) {
    console.error('Poll error:', (err as Error).message);
  }
}

function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // GET /api/agents
  app.get('/api/agents', (_req: Request, res: Response) => {
    res.json(cachedAgents);
  });

  // GET /api/sessions
  app.get('/api/sessions', (_req: Request, res: Response) => {
    const limit = parseInt((_req.query.limit as string) || '100');
    const agent = _req.query.agent as string | undefined;
    let sessions = cachedSessions;
    if (agent) sessions = sessions.filter(s => s.agentName === agent);
    res.json(sessions.slice(0, limit));
  });

  // GET /api/chat — read last N messages from shared comms log
  app.get('/api/chat', (_req: Request, res: Response) => {
    try {
      if (!fs.existsSync(COMMS_LOG)) {
        return res.json([]);
      }
      const lines = fs.readFileSync(COMMS_LOG, 'utf8')
        .split('\n')
        .filter(l => l.trim())
        .map(l => {
          try { return JSON.parse(l); } catch { return null; }
        })
        .filter(Boolean);
      const limit = parseInt((_req.query.limit as string) || '100');
      res.json(lines.slice(-limit).reverse()); // newest first
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // POST /api/chat — append a message to the shared comms log
  app.post('/api/chat', (req: Request, res: Response) => {
    try {
      const { from, to, message, type } = req.body as {
        from: string;
        to: string;
        message: string;
        type?: string;
      };
      if (!from || !to || !message) {
        return res.status(400).json({ error: 'from, to, message required' });
      }
      const entry = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        from,
        to,
        message,
        type: type || 'message',
        timestamp: Date.now(),
      };
      fs.appendFileSync(COMMS_LOG, JSON.stringify(entry) + '\n');
      console.log(`💬 [${from}→${to}] ${message.slice(0, 60)}...`);
      res.json({ ok: true, id: entry.id });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // GET /api/health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      lastPollTime,
      pollCount,
      agentsDir: AGENTS_DIR,
      agents: cachedAgents.length,
      sessions: cachedSessions.length,
      activeAgents: cachedAgents.filter(a => a.status === 'active').length,
    });
  });

  const server = http.createServer(app);
  const port = 7892;

  server.listen(port, () => {
    console.log(`🚀 Dashboard API on http://localhost:${port}`);
    pollData();
    setInterval(pollData, POLL_INTERVAL_MS);
  });

  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

main();
