/**
 * OpenClaw Gateway WebSocket Bridge
 * 
 * Connects to the OpenClaw gateway at ws://127.0.0.1:18789 with auth token,
 * then exposes REST API + WebSocket proxy for the React dashboard.
 * 
 * Run: npx tsx backend/websocket-bridge.ts
 */

import { WebSocket, WebSocketServer } from 'ws';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';

// Gateway configuration
const GATEWAY_WS_URL = 'ws://127.0.0.1:18789';
const GATEWAY_AUTH_TOKEN = 'c575dd8b67206f842178462ff7ab21c937741b24cb6b8e76';

// Local server configuration
const BRIDGE_PORT = 7892;
const WS_PORT = 7893; // Separate port for WebSocket proxy

// In-memory state store
interface SessionData {
  session_id: string;
  agent_name: string;
  status: 'running' | 'paused' | 'stopped';
  created_at: string;
  last_message_at?: string;
  token_usage?: { used: number; total: number };
  tasks?: TaskData[];
}

interface TaskData {
  task_id: string;
  action: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result?: string;
  progress?: number;
}

const state = {
  sessions: new Map<string, SessionData>(),
  tasks: new Map<string, TaskData>(),
  gatewayConnected: false,
  lastHeartbeat: Date.now(),
};

// Gateway WebSocket connection
let gatewayWs: WebSocket | null = null;
const reconnectDelayMs = 2000;
let reconnectTimeout: NodeJS.Timeout | null = null;

/**
 * Connect to OpenClaw gateway with authentication
 */
function connectToGateway() {
  console.log(`🔌 Connecting to ${GATEWAY_WS_URL}...`);
  
  try {
    // Gateway expects auth token in URL query param or header
    const wsUrl = `${GATEWAY_WS_URL}?token=${GATEWAY_AUTH_TOKEN}`;
    gatewayWs = new WebSocket(wsUrl);
    
    gatewayWs.on('open', () => {
      console.log('✅ Connected to OpenClaw gateway');
      state.gatewayConnected = true;
      state.lastHeartbeat = Date.now();
      
      // Subscribe to relevant channels
      subscribeToChannels();
    });
    
    gatewayWs.on('message', (data) => {
      state.lastHeartbeat = Date.now();
      handleGatewayMessage(data.toString());
    });
    
    gatewayWs.on('error', (error) => {
      console.error('❌ Gateway WebSocket error:', error.message);
      state.gatewayConnected = false;
      scheduleReconnect();
    });
    
    gatewayWs.on('close', (code, reason) => {
      console.log(`🔌 Gateway connection closed: ${code} - ${reason?.toString()}`);
      state.gatewayConnected = false;
      scheduleReconnect();
    });
    
  } catch (error) {
    console.error('❌ Failed to create gateway connection:', error);
    scheduleReconnect();
  }
}

/**
 * Subscribe to gateway event channels
 */
function subscribeToChannels() {
  if (!gatewayWs?.readyState) return;
  
  const subscription = {
    type: 'subscribe',
    channels: [
      'sessions_list',
      'session_updates', 
      'task_progress',
      'agent_status',
      'tool_calls'
    ]
  };
  
  gatewayWs.send(JSON.stringify(subscription));
  console.log('📡 Subscribed to gateway channels');
}

/**
 * Handle incoming messages from gateway
 */
function handleGatewayMessage(rawData: string) {
  try {
    const message = JSON.parse(rawData);
    
    // Log message type for debugging
    console.debug(`📨 ${message.type}:`, Object.keys(message.payload || {}));
    
    switch (message.type) {
      case 'sessions_list':
        handleSessionsList(message);
        break;
        
      case 'session_update':
        handleSessionUpdate(message);
        break;
        
      case 'task_progress':
        handleTaskProgress(message);
        break;
        
      case 'tool_call':
      case 'tool_result':
        handleToolEvent(message);
        break;
        
      case 'heartbeat':
        state.lastHeartbeat = Date.now();
        break;
        
      default:
        console.debug('📬 Unhandled message type:', message.type);
    }
    
  } catch (error) {
    console.error('❌ Error parsing gateway message:', error);
    console.error('Raw data:', rawData.substring(0, 200));
  }
}

/**
 * Handle batch sessions list response
 */
function handleSessionsList(message: any) {
  const sessions = message.payload?.sessions || [];
  
  sessions.forEach((session: SessionData) => {
    state.sessions.set(session.session_id, {
      session_id: session.session_id,
      agent_name: session.agent_name || 'unknown',
      status: (session.status as any) || 'running',
      created_at: session.created_at || new Date().toISOString(),
      last_message_at: session.last_message_at,
      token_usage: session.token_usage,
      tasks: session.tasks || [],
    });
  });
  
  console.log(`📊 Updated sessions: ${state.sessions.size} active`);
}

/**
 * Handle individual session update
 */
function handleSessionUpdate(message: any) {
  const payload = message.payload;
  const sessionId = payload.session_id;
  
  if (state.sessions.has(sessionId)) {
    const existing = state.sessions.get(sessionId)!;
    state.sessions.set(sessionId, {
      ...existing,
      status: payload.status || existing.status,
      last_message_at: payload.last_message_at || existing.last_message_at,
      token_usage: payload.token_usage || existing.token_usage,
    });
  }
}

/**
 * Handle task progress update
 */
function handleTaskProgress(message: any) {
  const payload = message.payload;
  const taskId = payload.task_id;
  
  // Store task data
  state.tasks.set(taskId, {
    task_id: taskId,
    action: payload.action || 'unknown',
    description: payload.description || '',
    timestamp: payload.timestamp || new Date().toISOString(),
    status: (payload.status as any) || 'running',
    result: payload.result,
    progress: payload.progress,
  });
  
  // Also update the parent session if we know it
  if (payload.session_id && state.sessions.has(payload.session_id)) {
    const session = state.sessions.get(payload.session_id)!;
    if (!session.tasks) session.tasks = [];
    
    // Find or create task in session
    const existingTask = session.tasks?.find(t => t.task_id === taskId);
    if (existingTask) {
      Object.assign(existingTask, payload);
    } else {
      session.tasks.push({
        task_id: taskId,
        action: payload.action,
        description: payload.description,
        timestamp: payload.timestamp,
        status: payload.status || 'running',
      });
    }
  }
}

/**
 * Handle tool call/result events (for audit trail)
 */
function handleToolEvent(message: any) {
  const isResult = message.type === 'tool_result';
  const sessionId = message.payload?.session_id;
  
  if (sessionId && state.sessions.has(sessionId)) {
    const session = state.sessions.get(sessionId)!;
    if (!session.tasks) session.tasks = [];
    
    // Add to audit trail (stored as tasks for now)
    session.tasks.push({
      task_id: `tool-${Date.now()}`,
      action: isResult ? `${message.payload.tool}_result` : `${message.payload.tool}_call`,
      description: isResult 
        ? message.payload.result?.substring(0, 200) 
        : 'Tool invocation',
      timestamp: new Date().toISOString(),
      status: isResult ? (message.payload.success ? 'success' : 'failed') : 'running',
    });
    
    // Keep only last 50 events per session
    if (session.tasks.length > 50) {
      session.tasks = session.tasks.slice(-50);
    }
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout);
  
  const delay = Math.min(reconnectDelayMs * 2, 10000); // Max 10s
  console.log(`🔄 Reconnecting in ${delay}ms...`);
  
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectToGateway();
  }, delay);
}

/**
 * Create Express REST API server
 */
function createRestServer() {
  const app: Express = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      gateway_connected: state.gatewayConnected,
      last_heartbeat: new Date(state.lastHeartbeat).toISOString(),
      sessions_count: state.sessions.size,
      tasks_count: state.tasks.size,
    });
  });
  
  // Get all sessions
  app.get('/api/sessions', (_req: Request, res: Response) => {
    const sessions = Array.from(state.sessions.values());
    res.json({ sessions });
  });
  
  // Get session by ID
  app.get('/api/sessions/:sessionId', (req: Request, res: Response) => {
    const session = state.sessions.get(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  });
  
  // Get all tasks (flattened from all sessions)
  app.get('/api/tasks', (_req: Request, res: Response) => {
    const allTasks = Array.from(state.tasks.values());
    res.json(allTasks);
  });
  
  // Get task by ID
  app.get('/api/tasks/:taskId', (req: Request, res: Response) => {
    const task = state.tasks.get(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  });
  
  // Agent health endpoint (for the AgentHealth component)
  app.get('/api/agents', (_req: Request, res: Response) => {
    const agents = Array.from(state.sessions.values()).reduce((acc, session) => {
      if (!acc[session.agent_name]) {
        acc[session.agent_name] = {
          agent_name: session.agent_name,
          status: 'stalled',
          last_message_at: null,
          task_count: 0,
          token_usage: { used: 0, total: 0 },
        };
      }
      
      const agent = acc[session.agent_name];
      if (session.status === 'running') agent.status = 'active';
      if (session.last_message_at && (!agent.last_message_at || session.last_message_at > agent.last_message_at)) {
        agent.last_message_at = session.last_message_at;
      }
      agent.task_count += (session.tasks?.length || 0);
      
      if (session.token_usage) {
        agent.token_usage.used += session.token_usage.used || 0;
        agent.token_usage.total += session.token_usage.total || 0;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    res.json(Object.values(agents));
  });
  
  return app;
}

/**
 * Create WebSocket proxy server for real-time dashboard updates
 */
function createWSServer(httpServer: http.Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log(`🔗 Dashboard connected via WebSocket`);
    
    // Send current state on connect
    const initialState = {
      type: 'initial_state',
      payload: {
        sessions: Array.from(state.sessions.values()),
        tasks: Array.from(state.tasks.values()),
      }
    };
    ws.send(JSON.stringify(initialState));
    
    ws.on('message', (data) => {
      // Handle commands from dashboard (pause, resume, stop)
      try {
        const command = JSON.parse(data.toString());
        
        switch (command.type) {
          case 'session_stop':
            handleSessionStop(command.session_id);
            break;
            
          case 'session_pause':
            handleSessionPause(command.session_id);
            break;
            
          case 'session_resume':
            handleSessionResume(command.session_id);
            break;
            
          default:
            console.log('Unknown command:', command.type);
        }
      } catch (error) {
        console.error('Error parsing dashboard message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log(`🔌 Dashboard disconnected`);
    });
  });
  
  // Forward gateway updates to all connected dashboards
  const broadcastUpdate = (update: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(update));
      }
    });
  };
  
  // Monkey-patch our handlers to also broadcast
  const originalHandleSessionsList = handleSessionsList;
  (handleSessionsList as any) = (msg: any) => {
    originalHandleSessionsList(msg);
    broadcastUpdate({ type: 'sessions_update', payload: msg.payload });
  };
}

/**
 * Handle session control commands
 */
function handleSessionStop(sessionId: string) {
  console.log(`⏹️ Stopping session: ${sessionId}`);
  // In future: send command to gateway via WebSocket
}

function handleSessionPause(sessionId: string) {
  console.log(`⏸️ Pausing session: ${sessionId}`);
  if (state.sessions.has(sessionId)) {
    const session = state.sessions.get(sessionId)!;
    session.status = 'paused';
  }
}

function handleSessionResume(sessionId: string) {
  console.log(`▶️ Resuming session: ${sessionId}`);
  if (state.sessions.has(sessionId)) {
    const session = state.sessions.get(sessionId)!;
    session.status = 'running';
  }
}

/**
 * Main entry point
 */
function main() {
  console.log('🚀 Starting OpenClaw Gateway Bridge');
  console.log(`   Gateway: ${GATEWAY_WS_URL}`);
  console.log(`   REST API: http://localhost:${BRIDGE_PORT}/api`);
  console.log(`   WebSocket Proxy: ws://localhost:${WS_PORT}/ws`);
  
  // Create and start HTTP server for REST API
  const app = createRestServer();
  const httpServer = http.createServer(app as any);
  
  httpServer.listen(BRIDGE_PORT, () => {
    console.log(`✅ REST API server listening on port ${BRIDGE_PORT}`);
    
    // Create WebSocket server on separate port
    const wsServer = http.createServer();
    createWSServer(wsServer);
    wsServer.listen(WS_PORT, () => {
      console.log(`✅ WebSocket proxy listening on port ${WS_PORT}`);
      
      // Connect to gateway
      connectToGateway();
    });
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bridge...');
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (gatewayWs) gatewayWs.close();
    httpServer.close(() => process.exit(0));
  });
}

main();
