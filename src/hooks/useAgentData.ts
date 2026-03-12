/**
 * Agent data hooks combining REST API and WebSocket real-time updates
 */

import { useState, useEffect } from 'react';
import { useOpenClawWebSocket } from './useOpenClawWebSocket';

export interface AgentSession {
  session_id: string;
  agent_name: string;
  status: 'running' | 'paused' | 'stopped';
  created_at: string;
  last_message_at?: string;
  task_count?: number;
}

export interface KanbanTask {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  agent: string;
  description: string;
  sessionId: string;
  createdAt: string;
}

export interface AgentHealth {
  agent_name: string;
  status: 'active' | 'stalled' | 'alert';
  last_message_at?: string;
  task_count: number;
  token_usage?: { used: number; total: number };
}

/**
 * Fetch agent data from REST API (initial load)
 */
async function fetchAgentSessions(): Promise<AgentSession[]> {
  try {
    const response = await fetch('/api/sessions');
    const data = await response.json();
    return data.sessions || [];
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return [];
  }
}

async function fetchKanbanTasks(): Promise<KanbanTask[]> {
  try {
    const response = await fetch('/api/tasks');
    const tasks = await response.json();
    
    return tasks.map((t: any) => ({
      id: t.task_id || `task-${Date.now()}`,
      title: t.action?.replace(/_/g, ' ') || 'Unknown Task',
      status: mapTaskStatus(t.status),
      agent: t.agent_name || 'Unknown',
      description: t.description || '',
      sessionId: t.session_id || '',
      createdAt: t.timestamp || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
}

async function fetchAgentHealth(): Promise<AgentHealth[]> {
  try {
    const response = await fetch('/api/agents');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch agent health:', error);
    return [];
  }
}

function mapTaskStatus(status: string): KanbanTask['status'] {
  const statusMap: Record<string, KanbanTask['status']> = {
    'success': 'done',
    'failed': 'review',
    'running': 'in-progress',
    'pending': 'todo',
    'paused': 'review',
  };
  return statusMap[status] || 'todo';
}

/**
 * Combined hook for all agent data with WebSocket integration
 */
export function useAgentData() {
  const ws = useOpenClawWebSocket();
  
  // Local state for REST-fetched data (fallback/initial)
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch from REST API
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const [sessionData, tasksData, agentsData] = await Promise.all([
          fetchAgentSessions(),
          fetchKanbanTasks(),
          fetchAgentHealth(),
        ]);
        
        if (!mounted) return;
        
        // Only set if WebSocket hasn't provided data yet
        if (sessionData.length > 0 && sessions.length === 0) {
          setSessions(sessionData);
        }
        if (tasksData.length > 0 && tasks.length === 0) {
          setTasks(tasksData);
        }
        if (agentsData.length > 0 && agents.length === 0) {
          setAgents(agentsData);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading initial data:', err);
        if (!ws.connected) {
          setError('Failed to load agent data');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    loadData();
    
    // Periodic refresh from REST (fallback for WebSocket)
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000); // Every 30 seconds
    
    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, [ws.connected]);

  // Derive combined data from WebSocket or REST
  const allSessions: AgentSession[] = ws.sessions.length > 0 
    ? ws.sessions.map((s: any) => ({
        session_id: s.session_id,
        agent_name: s.agent_name,
        status: s.status as any,
        created_at: s.created_at || new Date().toISOString(),
        last_message_at: s.last_message_at,
        task_count: s.tasks?.length || 0,
      }))
    : sessions;

  const allTasks: KanbanTask[] = ws.tasks.length > 0 ? ws.tasks : tasks;
  
  // Calculate agent health from sessions
  const calculatedAgents: AgentHealth[] = Object.values(
    allSessions.reduce((acc: Record<string, AgentHealth>, session) => {
      if (!acc[session.agent_name]) {
        acc[session.agent_name] = {
          agent_name: session.agent_name,
          status: 'stalled',
          task_count: 0,
        };
      }
      
      const agent = acc[session.agent_name];
      
      // Determine status based on last message time
      if (session.status === 'running') {
        const lastMessageTime = session.last_message_at 
          ? new Date(session.last_message_at).getTime()
          : Date.now();
        const minutesSinceLastMessage = (Date.now() - lastMessageTime) / 60000;
        
        if (minutesSinceLastMessage < 5) {
          agent.status = 'active';
        } else if (minutesSinceLastMessage < 30) {
          agent.status = 'stalled';
        } else {
          agent.status = 'alert';
        }
      }
      
      agent.last_message_at = session.last_message_at || agent.last_message_at;
      agent.task_count += session.task_count || 0;
      
      return acc;
    }, {})
  );

  // Control actions
  const stopSession = (sessionId: string) => {
    ws.sendCommand({ type: 'session_stop', session_id: sessionId });
  };

  const pauseSession = (sessionId: string) => {
    ws.sendCommand({ type: 'session_pause', session_id: sessionId });
    // Optimistic update
    setSessions(prev => prev.map(s => 
      s.session_id === sessionId ? { ...s, status: 'paused' as const } : s
    ));
  };

  const resumeSession = (sessionId: string) => {
    ws.sendCommand({ type: 'session_resume', session_id: sessionId });
    // Optimistic update
    setSessions(prev => prev.map(s => 
      s.session_id === sessionId ? { ...s, status: 'running' as const } : s
    ));
  };

  return {
    // Connection state
    connected: ws.connected,
    loading,
    error: ws.error || error,
    
    // Data
    sessions: allSessions,
    tasks: allTasks,
    agents: calculatedAgents,
    
    // Actions
    stopSession,
    pauseSession,
    resumeSession,
    refresh: ws.refresh,
  };
}

export default useAgentData;
