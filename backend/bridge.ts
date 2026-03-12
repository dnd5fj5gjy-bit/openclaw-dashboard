/**
 * OpenClaw Bridge Server
 * Polls OpenClaw CLI and exposes REST API + WebSocket for dashboard
 * 
 * Run: npx tsx backend/bridge.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';

const execAsync = promisify(exec);

// Configuration
const PORT = 7892;
const WS_PORT = 7893;

// State store
let sessions: any[] = [];
let tasks: any[] = [];
let lastUpdate = Date.now();

/**
 * Fetch sessions from OpenClaw CLI
 */
async function fetchSessions() {
  try {
    const { stdout } = await execAsync('openclaw sessions_list --limit 10', { timeout: 5000 });
    
    // Parse CLI output (adapt to actual format)
    const lines = stdout.trim().split('\n').filter(l => l.trim());
    const parsed = lines.map(line => parseSessionLine(line));
    
    return parsed;
  } catch (error: any) {
    console.error('Failed to fetch sessions:', error.message);
    return getMockSessions();
  }
}

/**
 * Parse a session line from CLI output
 */
function parseSessionLine(line: string): any {
  // Adjust this based on actual CLI output format
  // Example: "session-abc123 | nexus | running | 5m ago"
  const parts = line.split(/\s*\|\s*/);
  
  return {
    session_id: parts[0]?.trim() || `session-${Date.now()}`,
    agent_name: parts[1]?.trim().split(' ')[0] || 'unknown',
    status: (parts[2]?.trim() as any) || 'running',
    last_message_at: parseTimeAgo(parts[3]) || new Date().toISOString(),
    tasks: [],
  };
}

/**
 * Parse time-ago string to ISO timestamp
 */
function parseTimeAgo(timeStr: string): string | null {
  if (!timeStr) return null;
  
  const now = new Date();
  let date = new Date(now);
  
  if (timeStr.includes('m ago')) {
    const minutes = parseInt(timeStr) || 0;
    date.setMinutes(date.getMinutes() - minutes);
  } else if (timeStr.includes('h ago')) {
    const hours = parseInt(timeStr) || 0;
    date.setHours(date.getHours() - hours);
  } else if (timeStr === 'just now') {
    return now.toISOString();
  }
  
  return date.toISOString();
}

/**
 * Mock sessions for demo
 */
function getMockSessions(): any[] {
  const baseTime = new Date();
  return [
    {
      session_id: 'session-nexus',
      agent_name: 'nexus',
      status: 'running' as const,
      created_at: baseTime.toISOString(),
      last_message_at: new Date(baseTime.getTime() - 2 * 60000).toISOString(),
      tasks: [
        { task_id: 'task-1', action: 'build_dashboard', status: 'running', description: 'Building React dashboard' },
      ],
    },
    {
      session_id: 'session-junior',
      agent_name: 'junior',
      status: 'running' as const,
      created_at: baseTime.toISOString(),
      last_message_at: new Date(baseTime.getTime() - 30 * 60000).toISOString(),
      tasks: [
        { task_id: 'task-2', action: 'plan_strategy', status: 'success', description: 'Strategic planning complete' },
      ],
    },
    {
      session_id: 'session-bgv',
      agent_name: 'bgv',
      status: 'paused' as const,
      created_at: baseTime.toISOString(),
      last_message_at: new Date(baseTime.getTime() - 45 * 60000).toISOString(),
      tasks: [
        { task_id: 'task-3', action: 'content_research', status: 'running', description: 'Researching content ideas' },
      ],
    },
  ];
}

/**
 * Mock tasks for demo
 */
function getMockTasks() {
  return [
    { task_id: 't1', action: 'build_dashboard', agent_name: 'nexus', status: 'running', description: 'Building React dashboard', timestamp: new Date().toISOString() },
    { task_id: 't2', action: 'plan_strategy', agent_name: 'junior', status: 'success', description: 'Strategic planning', timestamp: new Date().toISOString() },
    { task_id: 't3', action: 'content_research', agent_name: 'bgv', status: 'running', description: 'Researching content', timestamp: new Date().toISOString() },
  ];
}

/**
 * Create Express server
 */
function createServer(): Express {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      last_update: new Date(lastUpdate).toISOString(),
      sessions_count: sessions.length,
    });
  });
  
  // Get all sessions
  app.get('/api/sessions', (_req: Request, res: Response) => {
    res.json({ sessions });
  });
  
  // Get tasks
  app.get('/api/tasks', (_req: Request, res: Response) => {
    const allTasks = sessions.flatMap(s => s.tasks || []);
    res.json(allTasks);
  });
  
  // Agent health
  app.get('/api/agents', (_req: Request, res: Response) => {
    const agents = Object.values(
      sessions.reduce((acc: any, session: any) => {
        if (!acc[session.agent_name]) {
          acc[session.agent_name] = {
            agent_name: session.agent_name,
            status: 'stalled',
            last_message_at: null,
            task_count: 0,
          };
        }
        
        const agent = acc[session.agent_name];
        if (session.status === 'running') {
          const lastMsg = session.last_message_at 
            ? new Date(session.last_message_at).getTime() 
            : Date.now();
          const minutesAgo = (Date.now() - lastMsg) / 60000;
          
          if (minutesAgo < 5) agent.status = 'active';
          else if (minutesAgo < 30) agent.status = 'stalled';
          else agent.status = 'alert';
        }
        
        if (session.last_message_at && (!agent.last_message_at || session.last_message_at > agent.last_message_at)) {
          agent.last_message_at = session.last_message_at;
        }
        agent.task_count += (session.tasks?.length || 0);
        
        return acc;
      }, {})
    );
    
    res.json(agents);
  });
  
  return app;
}

/**
 * Main polling function
 */
async function pollData() {
  try {
    const newSessions = await fetchSessions();
    sessions = newSessions;
    tasks = getMockTasks(); // TODO: real task fetching
    
    lastUpdate = Date.now();
    
    console.log(`📊 Updated: ${sessions.length} sessions`);
    
    // Broadcast to WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'sessions_update',
          payload: { sessions }
        }));
      }
    });
  } catch (error) {
    console.error('Poll error:', error);
    // Keep using cached data
  }
}

/**
 * Start everything
 */
function main() {
  console.log('🚀 Starting OpenClaw Bridge Server');
  console.log(`   REST API: http://localhost:${PORT}/api`);
  console.log(`   WebSocket: ws://localhost:${WS_PORT}/ws`);
  
  // HTTP server for REST API
  const app = createServer();
  const httpServer = http.createServer(app as any);
  
  httpServer.listen(PORT, async () => {
    console.log(`✅ REST API listening on ${PORT}`);
    
    // WebSocket server
    const wsServer = http.createServer();
    wss = new WebSocketServer({ server: wsServer, path: '/ws' });
    
    wss.on('connection', (ws) => {
      console.log('🔗 Dashboard connected');
      
      // Send initial state
      ws.send(JSON.stringify({
        type: 'initial_state',
        payload: { sessions, tasks }
      }));
    });
    
    wsServer.listen(WS_PORT, () => {
      console.log(`✅ WebSocket listening on ${WS_PORT}`);
      
      // Initial fetch
      await pollData();
      
      // Poll every 10 seconds
      setInterval(pollData, 10000);
    });
  });
}

let wss: WebSocketServer;

main();
