import { useState, useEffect, useCallback } from 'react';

export interface AgentInfo {
  name: string;
  status: 'active' | 'idle' | 'offline';
  sessionCount: number;
  lastActive: number;
  lastActiveAgo: string;
}

export interface SessionRow {
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

export interface HealthData {
  status: string;
  lastPollTime: number;
  pollCount: number;
  agents: number;
  sessions: number;
  activeAgents: number;
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Fetch failed: ${url}`, err);
    return null;
  }
}

export function useAgentData(refreshMs = 5000) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    const [agentsData, sessionsData, healthData] = await Promise.all([
      fetchJSON<AgentInfo[]>('/api/agents'),
      fetchJSON<SessionRow[]>('/api/sessions'),
      fetchJSON<HealthData>('/api/health'),
    ]);

    if (agentsData) {
      setAgents(agentsData);
      setConnected(true);
    } else {
      setConnected(false);
    }
    if (sessionsData) setSessions(sessionsData);
    if (healthData) setHealth(healthData);

    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  return { agents, sessions, health, connected, loading, lastRefresh, refresh };
}
