/**
 * OpenClaw Gateway Message Types & Interfaces
 * All TypeScript types for WebSocket integration
 */

// Base message interface from gateway
export interface GatewayMessage {
  type: string;
  payload?: any;
  timestamp?: string;
}

// Session-related interfaces
export interface SessionUpdate {
  session_id: string;
  agent_name: string;
  status: 'running' | 'paused' | 'stopped';
  created_at: string;
  tasks?: TaskProgress[];
}

export interface TaskProgress {
  task_id: string;
  action: string;
  description: string;
  timestamp: string;
  result?: string;
  status?: 'success' | 'failed' | 'running';
  progress?: number; // 0-100
}

// Kanban board task interface
export interface KanbanTask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  agent: string;
  description: string;
  sessionId: string;
  createdAt: string;
}

// Task details with full audit trail
export interface TaskDetails {
  id: string;
  sessionId: string;
  agentName: string;
  action: string;
  description: string;
  timestamp: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  result?: string;
  auditTrail: Array<{
    time: string;
    action: string;
    details?: string;
  }>;
}

// Agent health metrics
export interface AgentHealth {
  agentName: string;
  status: 'active' | 'stalled' | 'alert';
  lastMessage: string;
  tokenUsage: {
    used: number;
    total: number;
    remaining: number;
  };
  activityLog: Array<{
    time: string;
    message: string;
  }>;
}

// WebSocket connection state
export interface ConnectionState {
  connected: boolean;
  connectedAt?: Date;
  lastMessageAt?: Date;
  error?: string;
  reconnectAttempts: number;
}

// API response interfaces
export interface SessionsResponse {
  sessions: SessionUpdate[];
}

export interface TaskListResponse {
  tasks: KanbanTask[];
}

export interface TaskDetailsResponse {
  task: TaskDetails;
}

export interface HealthResponse {
  status: 'ok';
  gateway: string;
  lastMessageTimestamp?: number;
  activeSessions: number;
  activeTasks: number;
}

// Action response interfaces
export interface SessionActionResponse {
  success: boolean;
  message: string;
}
