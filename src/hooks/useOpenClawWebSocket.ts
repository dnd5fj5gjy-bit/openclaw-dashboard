/**
 * Real-time WebSocket integration for OpenClaw Dashboard
 * Connects to bridge server at ws://localhost:7893/ws
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  GatewayMessage, 
  SessionUpdate, 
  KanbanTask,
  AgentHealth as AgentHealthData
} from '../utils/openclaw-types';

const WS_URL = import.meta.env.DEV 
  ? 'ws://localhost:7893/ws' 
  : '/ws'; // Vite proxies /ws in production

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface ConnectionState {
  connected: boolean;
  reconnectAttempts: number;
  error?: string;
}

export function useOpenClawWebSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    connected: false,
    reconnectAttempts: 0,
  });
  
  const [sessions, setSessions] = useState<SessionUpdate[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [agents, setAgents] = useState<AgentHealthData[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send control message to gateway
  const sendCommand = useCallback((command: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
      console.log('📤 Sent command:', command.type);
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send command');
    }
  }, []);

  // Process incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: GatewayMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'initial_state':
          console.log('📬 Received initial state');
          if (message.payload?.sessions) {
            setSessions(transformSessions(message.payload.sessions));
          }
          if (message.payload?.tasks) {
            setTasks(transformTasks(message.payload.tasks));
          }
          break;
          
        case 'sessions_update':
          console.log('📬 Sessions updated');
          if (message.payload?.sessions) {
            setSessions(transformSessions(message.payload.sessions));
          }
          break;
          
        case 'task_progress':
          console.log('📬 Task progress:', message.payload?.action);
          if (message.payload) {
            handleTaskUpdate(message.payload);
          }
          break;
          
        case 'session_update':
          if (message.payload) {
            handleSessionUpdate(message.payload);
          }
          break;
          
        default:
          console.debug('📨 Message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }, []);

  // Transform gateway sessions to our format
  const transformSessions = (rawSessions: any[]) => {
    return rawSessions.map((s: any) => ({
      session_id: s.session_id,
      agent_name: s.agent_name || 'unknown',
      status: (s.status as any) || 'running',
      created_at: s.created_at || new Date().toISOString(),
      last_message_at: s.last_message_at,
      tasks: s.tasks || [],
    }));
  };

  // Transform gateway tasks to Kanban format
  const transformTasks = (rawTasks: any[]) => {
    return rawTasks.map((t: any) => ({
      id: t.task_id || `task-${Date.now()}`,
      title: t.action?.replace(/_/g, ' ') || 'Unknown Task',
      status: mapTaskStatus(t.status) as KanbanTask['status'],
      agent: t.agent_name || 'Unknown',
      description: t.description || '',
      sessionId: t.session_id || '',
      createdAt: t.timestamp || new Date().toISOString(),
    }));
  };

  // Map gateway status to Kanban columns
  const mapTaskStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'success': 'done',
      'failed': 'review',
      'running': 'in-progress',
      'pending': 'todo',
      'paused': 'review',
    };
    return statusMap[status] || 'todo';
  };

  // Handle individual task update
  const handleTaskUpdate = (payload: any) => {
    setTasks(prev => {
      const taskId = payload.task_id;
      const existingIndex = prev.findIndex(t => t.id === taskId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: mapTaskStatus(payload.status || 'in-progress'),
          description: payload.description || updated[existingIndex].description,
        };
        return updated;
      } else {
        const newTask: KanbanTask = {
          id: taskId,
          title: (payload.action || 'Unknown').replace(/_/g, ' '),
          status: mapTaskStatus(payload.status || 'in-progress') as KanbanTask['status'],
          agent: payload.agent_name || 'Unknown',
          description: payload.description || '',
          sessionId: payload.session_id || '',
          createdAt: payload.timestamp || new Date().toISOString(),
        };
        return [...prev, newTask];
      }
    });
  };

  // Handle session status update
  const handleSessionUpdate = (payload: any) => {
    setSessions(prev => {
      const sessionId = payload.session_id;
      const existingIndex = prev.findIndex(s => s.session_id === sessionId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: (payload.status as any) || updated[existingIndex].status,
          last_message_at: payload.last_message_at || updated[existingIndex].last_message_at,
        };
        return updated;
      } else {
        return [...prev, {
          session_id: sessionId,
          agent_name: payload.agent_name || 'unknown',
          status: (payload.status as any) || 'running',
          created_at: payload.created_at || new Date().toISOString(),
        }];
      }
    });
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected');
      return;
    }

    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        setConnectionState(prev => ({
          ...prev,
          connected: true,
          reconnectAttempts: 0,
        }));
        console.log('✅ Connected to OpenClaw WebSocket');
      };

      wsRef.current.onmessage = handleMessage;
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionState(prev => ({
          ...prev,
          error: 'WebSocket connection failed',
        }));
      };

      wsRef.current.onclose = (event) => {
        setConnectionState(prev => ({
          ...prev,
          connected: false,
        }));
        
        console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason}`);
        
        // Schedule reconnection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        const attempts = connectionState.reconnectAttempts + 1;
        if (attempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(2, attempts), 10000);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
          
          setConnectionState(prev => ({
            ...prev,
            reconnectAttempts: attempts,
          }));
        } else {
          setConnectionState(prev => ({
            ...prev,
            error: 'Max reconnection attempts reached',
          }));
        }
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      setConnectionState(prev => ({
        ...prev,
        error: 'Failed to create WebSocket connection',
      }));
    }
  }, [handleMessage, connectionState.reconnectAttempts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  return {
    connected: connectionState.connected,
    error: connectionState.error,
    reconnectAttempts: connectionState.reconnectAttempts,
    sessions,
    tasks,
    agents,
    sendCommand,
    refresh: connect,
  };
}

export default useOpenClawWebSocket;
