import { useState, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

interface Task {
  id: string;
  agent: string;
  title: string;
  description: string;
  status: 'active' | 'queued' | 'done' | 'idle';
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  tags: string[];
  project?: string;
}

const AGENT_META: Record<string, { icon: string; color: string }> = {
  nexus: { icon: '⬡', color: '#58a6ff' },
  junior: { icon: '◈', color: '#39d3c3' },
  bgv: { icon: '◉', color: '#3fb950' },
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  active: { color: '#3fb950', bg: '#1a4427' },
  queued: { color: '#58a6ff', bg: '#1a2f4d' },
  done: { color: '#4d5566', bg: '#21262d' },
  idle: { color: '#e3b341', bg: '#3a2e00' },
};

const PROJECT_COLORS = ['#58a6ff', '#3fb950', '#f0883e', '#d2a8ff', '#e3b341', '#ff7b72', '#39d3c3', '#79c0ff'];

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PROJECT_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, tRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/tasks'),
        ]);
        if (pRes.ok) setProjects(await pRes.json());
        if (tRes.ok) setTasks(await tRes.json());
      } catch { /* ignore */ }
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => [...prev, data.project]);
        setNewName(''); setShowNewProject(false);
      }
    } finally { setCreating(false); }
  };

  const assignToProject = async (taskId: string, projectId: string) => {
    try {
      await fetch(`/api/tasks/${encodeURIComponent(taskId)}/project`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectId }),
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, project: projectId } : t));
      setAssigning(null);
    } catch { /* ignore */ }
  };

  const filteredTasks = selectedProject
    ? tasks.filter(t => t.project === selectedProject)
    : tasks;

  const unassigned = tasks.filter(t => !t.project);

  const columns: Array<{ status: string; label: string }> = [
    { status: 'queued', label: 'Queued' },
    { status: 'active', label: 'Active' },
    { status: 'done', label: 'Done' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Project sidebar */}
      <div style={{ width: '220px', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</span>
          <button onClick={() => setShowNewProject(!showNewProject)}
            style={{ fontSize: '14px', color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>+</button>
        </div>

        {showNewProject && (
          <form onSubmit={createProject} style={{ padding: '10px', borderBottom: '1px solid #30363d' }}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name"
              style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 8px', color: '#e6edf3', fontSize: '12px', outline: 'none', marginBottom: '8px' }} />
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: newColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
            <button type="submit" disabled={creating || !newName.trim()}
              style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: '#238636', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', width: '100%' }}>
              Create
            </button>
          </form>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          <button onClick={() => setSelectedProject(null)}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 500, border: 'none',
              background: !selectedProject ? '#1a2f4d' : 'transparent',
              color: !selectedProject ? '#58a6ff' : '#8b949e',
              marginBottom: '2px',
            }}>
            All Tasks ({tasks.length})
          </button>
          {projects.map(p => {
            const count = tasks.filter(t => t.project === p.id).length;
            return (
              <button key={p.id} onClick={() => setSelectedProject(p.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 500, border: 'none',
                  background: selectedProject === p.id ? '#1c2128' : 'transparent',
                  color: selectedProject === p.id ? p.color : '#8b949e',
                  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px',
                }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontSize: '10px', color: '#4d5566', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
              </button>
            );
          })}

          {unassigned.length > 0 && (
            <button onClick={() => setSelectedProject('__unassigned')}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 500, border: 'none',
                background: selectedProject === '__unassigned' ? '#1c2128' : 'transparent',
                color: '#4d5566', marginTop: '8px',
              }}>
              Unassigned ({unassigned.length})
            </button>
          )}
        </div>
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '12px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>
            {selectedProject === '__unassigned' ? 'Unassigned Tasks' :
             selectedProject ? projects.find(p => p.id === selectedProject)?.name || 'Project' :
             'All Tasks'}
          </span>
          <span style={{ fontSize: '11px', color: '#4d5566' }}>
            {(selectedProject === '__unassigned' ? unassigned : filteredTasks).length} tasks
          </span>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', minHeight: 0 }}>
          {columns.map(col => {
            const colTasks = (selectedProject === '__unassigned' ? unassigned : filteredTasks)
              .filter(t => t.status === col.status);
            const sc = STATUS_COLORS[col.status] || STATUS_COLORS.queued;
            return (
              <div key={col.status} style={{
                background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', background: '#1c2128', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: sc.color, background: sc.bg, padding: '1px 8px', borderRadius: '10px', fontFamily: 'JetBrains Mono, monospace' }}>{colTasks.length}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                  {colTasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#4d5566', fontSize: '12px' }}>Empty</div>
                  ) : (
                    colTasks.map(task => {
                      const meta = AGENT_META[task.agent?.toLowerCase()] || { icon: '◌', color: '#8b949e' };
                      return (
                        <div key={task.id} className="task-card fade-in" style={{ borderLeft: `3px solid ${sc.color}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: meta.color, fontSize: '12px' }}>{meta.icon}</span>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color, textTransform: 'capitalize' }}>{task.agent}</span>
                            </div>
                            {!task.project && projects.length > 0 && (
                              <div style={{ position: 'relative' }}>
                                <button onClick={() => setAssigning(assigning === task.id ? null : task.id)}
                                  style={{ fontSize: '10px', color: '#4d5566', background: 'none', border: '1px solid #30363d', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}>
                                  + project
                                </button>
                                {assigning === task.id && (
                                  <div style={{
                                    position: 'absolute', right: 0, top: '100%', marginTop: '4px', zIndex: 10,
                                    background: '#1c2128', border: '1px solid #30363d', borderRadius: '6px', padding: '4px',
                                    minWidth: '140px',
                                  }}>
                                    {projects.map(p => (
                                      <button key={p.id} onClick={() => assignToProject(task.id, p.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', color: '#e6edf3', background: 'transparent', border: 'none' }}
                                        onMouseOver={e => (e.currentTarget.style.background = '#21262d')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }} />
                                        {p.name}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#e6edf3', marginBottom: '4px' }}>{task.title}</div>
                          {task.description && (
                            <div style={{ fontSize: '11px', color: '#8b949e', lineHeight: '1.4' }}>
                              {task.description.length > 80 ? task.description.slice(0, 77) + '...' : task.description}
                            </div>
                          )}
                          {task.tags?.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {task.tags.map(tag => (
                                <span key={tag} style={{ fontSize: '9px', color: '#4d5566', background: '#21262d', padding: '1px 6px', borderRadius: '8px', border: '1px solid #30363d' }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
