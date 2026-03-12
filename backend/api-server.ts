/**
 * REST API Server for Dashboard Integration
 * Uses OpenClaw tool invocations to fetch live session data
 * Polls every 5 seconds and exposes /api endpoints
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';

// State management (in-memory cache)
let cachedSessions: Array<{
  session_id: string;
  agent_name: string;
  status: string;
  created_at: string;
}> = [];

let cachedTasks: Array<{
  id: string;
  title: string;
  status: string;
  agent: string;
  description: string;
  sessionId: string;
  createdAt: string;
}> = [];

// Polling configuration
const POLL_INTERVAL_MS = 5000; // 5 seconds
let lastPollTime = Date.now();
let pollingTimeout: NodeJS.Timeout | null = null;

/**
 * Simulate OpenClaw tool invocation (in production, this would invoke actual tools)
 * For now, we'll fetch from the local OpenClaw gateway if available
 */
async function fetchOpenClawSessions() {
  try {
    // Try to call OpenClaw sessions_list via HTTP gateway endpoint
    const response = await fetch('http://localhost:7891/api/sessions_list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Gateway API not available, using mock data');
  }
  
  // Fallback to mock data based on your known agents
  return [
    {
      session_id: 'agent:nexus',
      agent_name: 'nexus',
      status: 'running',
      created_at: '2026-03-12T06:00:00Z'
    },
    {
      session_id: 'agent:junior',
      agent_name: 'junior',
      status: 'running',
      created_at: '2026-03-12T06:05:00Z'
    },
    {
      session_id: 'agent:bgv',
      agent_name: 'bgv',
      status: 'paused',
      created_at: '2026-03-12T06:10:00Z'
    }
  ];
}

/**
 * Fetch task details for a session using sessions_history tool
 */
async function fetchSessionHistory(sessionId: string) {
  try {
    const response = await fetch('http://localhost:7891/api/sessions_history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey: sessionId, limit: 50 })
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Fallback mock data
  }
  
  // Mock task list for demo
  return [
    {
      task_id: 'task-001',
      action: 'analyze_codebase',
      description: 'Analyze code structure and dependencies',
      timestamp: new Date().toISOString(),
      status: 'success'
    },
    {
      task_id: 'task-002',
      action: 'update_documentation',
      description: 'Update memory files with latest changes',
      timestamp: new Date().toISOString(),
      status: 'running'
    }
  ];
}

/**
 * Main polling function to fetch live data from OpenClaw
 */
async function pollOpenClawData() {
  console.log('🔄 Polling OpenClaw sessions...');
  
  const sessions = await fetchOpenClawSessions();
  
  // Update cached sessions
  cachedSessions = sessions.map(session => ({
    session_id: session.session_id,
    agent_name: session.agent_name,
    status: session.status || 'running',
    created_at: session.created_at || new Date().toISOString()
  }));
  
  // Fetch tasks for each running session
  const allTasks: any[] = [];
  
  for (const session of sessions) {
    if (session.status === 'running') {
      try {
        const history = await fetchSessionHistory(session.session_id);
        
        const sessionTasks = history.map((entry: any, idx: number) => ({
          id: `task-${session.session_id}-${idx}`,
          title: entry.action?.replace(/_/g, ' ') || 'Unknown action',
          status: mapTaskStatus(entry.status),
          agent: session.agent_name,
          description: entry.description || 'No description available',
          sessionId: session.session_id,
          createdAt: new Date(entry.timestamp).toISOString(),
        }));
        
        allTasks.push(...sessionTasks);
      } catch (error) {
        console.error(`Error fetching tasks for ${session.session_id}:`, error);
      }
    }
  }
  
  cachedTasks = allTasks;
  lastPollTime = Date.now();
  
  console.log(`✅ Updated: ${cachedSessions.length} sessions, ${allTasks.length} tasks`);
}

/**
 * Map OpenClaw status to Kanban column names
 */
function mapTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'success': 'done',
    'failed': 'review',
    'running': 'in-progress',
    'pending': 'todo',
    'paused': 'review',
  };
  return statusMap[status] || 'todo';
}

/**
 * Create REST API Express server
 */
function createRestApiServer(expressApp: Express) {
  const apiRouter = express.Router();
  
  // Enable CORS
  apiRouter.use(cors());
  
  // GET /api/sessions
  apiRouter.get('/sessions', (_req: Request, res: Response) => {
    res.json({ sessions: cachedSessions });
  });
  
  // GET /api/tasks
  apiRouter.get('/tasks', (_req: Request, res: Response) => {
    res.json(cachedTasks);
  });
  
  // GET /api/tasks/:taskId
  apiRouter.get('/tasks/:taskId', (req: Request, res: Response) => {
    const task = cachedTasks.find(t => t.id === req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Mock audit trail for demo
    res.json({
      ...task,
      auditTrail: [
        {
          time: new Date(task.createdAt).toISOString(),
          action: task.title,
          details: task.description
        },
        {
          time: new Date().toISOString(),
          action: 'status_change',
          details: `Status updated to ${task.status}`
        }
      ]
    });
  });
  
  // POST /api/tasks/:taskId/pause
  apiRouter.post('/tasks/:taskId/pause', (req: Request, res: Response) => {
    const task = cachedTasks.find(t => t.id === req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(`⏸️ Pausing task: ${task.id}`);
    task.status = 'review';
    
    res.json({ success: true, message: `Paused task ${task.id}` });
  });
  
  // POST /api/tasks/:taskId/resume
  apiRouter.post('/tasks/:taskId/resume', (req: Request, res: Response) => {
    const task = cachedTasks.find(t => t.id === req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log(`▶️ Resuming task: ${task.id}`);
    task.status = 'in-progress';
    
    res.json({ success: true, message: `Resumed task ${task.id}` });
  });
  
  // GET /api/health
  apiRouter.get('/health', (_req: Request, res: Response) => {
    const uptimeSeconds = Math.floor((Date.now() - lastPollTime) / 1000);
    
    res.json({
      status: 'ok',
      lastPollTime: lastPollTime,
      activeSessions: cachedSessions.filter(s => s.status === 'running').length,
      totalSessions: cachedSessions.length,
      activeTasks: cachedTasks.filter(t => t.status === 'in-progress').length,
      totalTasks: cachedTasks.length,
    });
  });
  
  expressApp.use('/api', apiRouter);
}

/**
 * Main entry point
 */
function main() {
  const app = express();
  const port = 7892; // Different from gateway to avoid conflicts
  
  app.use(cors());
  app.use(express.json());
  
  createRestApiServer(app);
  
  const server = http.createServer(app);
  
  server.listen(port, () => {
    console.log(`🚀 REST API server listening on http://localhost:${port}`);
    console.log(`📡 Dashboard proxy should target http://localhost:${port}/api`);
    
    // Start polling immediately
    pollOpenClawData();
    
    // Poll every 5 seconds
    pollingTimeout = setInterval(pollOpenClawData, POLL_INTERVAL_MS);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (pollingTimeout) {
      clearInterval(pollingTimeout);
    }
    server.close(() => {
      process.exit(0);
    });
  });
}

main();
