import { useState, useEffect, useCallback } from 'react';

export interface AgentTask {
  id: string;
  agent: string;
  title: string;
  description: string;
  status: 'active' | 'queued' | 'done' | 'idle';
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  tags: string[];
}

async function fetchTasks(): Promise<AgentTask[]> {
  try {
    const res = await fetch('/api/tasks');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function useTasks(refreshMs = 5000) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await fetchTasks();
    setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  return { tasks, loading, refresh };
}
