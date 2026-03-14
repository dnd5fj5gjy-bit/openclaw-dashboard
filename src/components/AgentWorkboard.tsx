import { useState, useEffect } from 'react';

interface WorkboardTask {
  id: string;
  agent: string;
  title: string;
  description: string;
  status: 'active' | 'queued' | 'done';
  startedAt: number;
  completedAt: number | null;
  tags: string[];
  assignedTo?: string;
  assignedAt?: number;
}

interface TaskAssignment {
  agent: string;
  assignedAt: number;
  pickedUpAt: number | null;
}

async function claimTask(taskId: string, agentName: string) {
  try {
    const res = await fetch(`/api/tasks/${taskId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: agentName }),
    });
    return res.json();
  } catch (error) {
    console.error('Failed to claim task:', error);
    return null;
  }
}

async function getTaskAssignment(taskId: string): Promise<TaskAssignment | null> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/assignment`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function AgentWorkboard() {
  const [tasks, setTasks] = useState<WorkboardTask[]>([]);
  const [assignments, setAssignments] = useState<Record<string, TaskAssignment>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const res = await fetch('/api/tasks?status=active,queued&limit=50');
        const data = await res.json();
        setTasks(data);
        
        // Load assignments for each task
        const assigns: Record<string, TaskAssignment> = {};
        for (const task of data) {
          const assignment = await getTaskAssignment(task.id);
          if (assignment) assigns[task.id] = assignment;
        }
        setAssignments(assigns);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
    const interval = setInterval(loadTasks, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const queued = tasks.filter(t => t.status === 'queued' && !assignments[t.id]);
  const active = tasks.filter(t => t.status === 'active' && assignments[t.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px' }}>
      {/* Available Queue */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#58a6ff', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📋 Available Tasks ({queued.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {queued.length === 0 ? (
            <div style={{ color: '#4d5566', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
              Queue is clear
            </div>
          ) : (
            queued.map(task => (
              <div key={task.id} style={{
                background: '#0d1117',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '2px' }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>
                      {task.description.slice(0, 60)}...
                    </div>
                  )}
                  {task.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {task.tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: '10px',
                          color: '#4d5566',
                          background: '#21262d',
                          padding: '1px 5px',
                          borderRadius: '8px',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => claimTask(task.id, 'nexus')}
                  style={{
                    marginLeft: '12px',
                    padding: '6px 12px',
                    background: '#238636',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Claim
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Your Active Tasks */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#3fb950', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          ⬡ Your Active Tasks ({active.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {active.length === 0 ? (
            <div style={{ color: '#4d5566', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
              No active tasks
            </div>
          ) : (
            active.map(task => {
              const assignment = assignments[task.id];
              const minsElapsed = assignment ? Math.floor((Date.now() - assignment.assignedAt) / 60000) : 0;
              return (
                <div key={task.id} style={{
                  background: '#0d1117',
                  border: '1px solid #21262d',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#e6edf3' }}>
                      {task.title}
                    </div>
                    <span style={{ fontSize: '10px', color: '#4d5566' }}>
                      {minsElapsed}m elapsed
                    </span>
                  </div>
                  {task.description && (
                    <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>
                      {task.description}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
