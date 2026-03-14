import { useState, useEffect } from 'react';
import { useAgentData } from './hooks/useAgentData';
import { useTasks } from './hooks/useTasks';
import StatusBar from './components/StatusBar';
import AgentPanel from './components/AgentPanel';
import SessionsTable from './components/SessionsTable';
import TaskBoard from './components/TaskBoard';
import DetailPanel from './components/DetailPanel';
import ChatFeed from './components/ChatFeed';
import AgentWorkboard from './components/AgentWorkboard';
import AuditLog from './components/AuditLog';
import Calendar from './pages/Calendar';
import Projects from './pages/Projects';
import Docs from './pages/Docs';
import Alerts from './pages/Alerts';

type CenterView = 'sessions' | 'tasks' | 'workboard' | 'audit' | 'calendar' | 'projects' | 'docs' | 'alerts';

export default function App() {
  try {
    const { agents, sessions, health, connected, loading, lastRefresh } = useAgentData(5000);
    const { tasks } = useTasks(5000);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [centerView, setCenterView] = useState<CenterView>('workboard');

    useEffect(() => {
      console.log('[App] State updated - loading:', loading, 'agents:', agents.length);
    }, [loading, agents.length, sessions.length]);

    const handleSelectAgent = (name: string | null) => {
      setSelectedAgent(name);
      setSelectedSession(null);
    };

    const handleSelectSession = (key: string | null) => {
      setSelectedSession(key);
      if (key) setSelectedAgent(null);
    };

    const activeTasks = tasks.filter(t => t.status === 'active').length;

    // Full-width views don't need the 3-column layout
    const isFullWidth = ['calendar', 'projects', 'docs', 'alerts'].includes(centerView);

    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', overflow: 'hidden', gap: '8px', padding: '0' }}>
        {/* Top bar */}
        <StatusBar agents={agents} health={health} connected={connected} lastRefresh={lastRefresh} />

        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '28px', color: '#58a6ff' }}>⬡</span>
            <span style={{ fontSize: '13px', color: '#4d5566', letterSpacing: '0.1em' }}>LOADING…</span>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px', minHeight: 0, overflow: 'hidden' }}>
            {/* Tab switcher */}
            <div style={{
              display: 'flex', gap: '2px', flexShrink: 0,
              overflowX: 'auto', padding: '0 0 0 0',
            }}>
              {([
                { id: 'workboard' as CenterView, label: '⬡ Workboard', count: activeTasks },
                { id: 'tasks' as CenterView, label: 'Tasks', count: activeTasks, badge: activeTasks > 0 },
                { id: 'projects' as CenterView, label: 'Projects', count: undefined },
                { id: 'calendar' as CenterView, label: 'Calendar', count: undefined },
                { id: 'docs' as CenterView, label: 'Docs', count: undefined },
                { id: 'alerts' as CenterView, label: 'Alerts', count: undefined },
                { id: 'audit' as CenterView, label: 'Audit Log', count: undefined },
                { id: 'sessions' as CenterView, label: 'Sessions', count: sessions.length },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCenterView(tab.id)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    border: '1px solid',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    background: centerView === tab.id ? '#1c2128' : 'transparent',
                    borderColor: centerView === tab.id ? '#30363d' : 'transparent',
                    color: centerView === tab.id ? '#e6edf3' : '#8b949e',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600,
                      background: centerView === tab.id ? '#1a2f4d' : '#21262d',
                      color: centerView === tab.id ? '#58a6ff' : '#4d5566',
                      padding: '1px 6px', borderRadius: '8px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Main content area */}
            {isFullWidth ? (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}>
                {centerView === 'calendar' ? <Calendar /> :
                 centerView === 'projects' ? <Projects /> :
                 centerView === 'docs' ? <Docs /> :
                 centerView === 'alerts' ? <Alerts /> : null}
              </div>
            ) : (
              /* 3-column layout for core views */
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '230px 1fr 260px', gap: '8px', minHeight: 0 }}>
                {/* Left: Agents */}
                <AgentPanel
                  agents={agents}
                  sessions={sessions}
                  selectedAgent={selectedAgent}
                  onSelectAgent={handleSelectAgent}
                />

                {/* Center content */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  {centerView === 'workboard' ? (
                    <AgentWorkboard />
                  ) : centerView === 'audit' ? (
                    <AuditLog />
                  ) : centerView === 'sessions' ? (
                    <SessionsTable
                      sessions={sessions}
                      selectedSession={selectedSession}
                      selectedAgent={selectedAgent}
                      onSelectSession={handleSelectSession}
                    />
                  ) : (
                    <TaskBoard tasks={tasks} />
                  )}
                </div>

                {/* Right: Detail */}
                <DetailPanel
                  selectedSession={selectedSession}
                  selectedAgent={selectedAgent}
                  sessions={sessions}
                  agents={agents}
                />
              </div>
            )}

            {/* Bottom: Team channel */}
            <ChatFeed />

            {/* Footer strip */}
            <div style={{
              height: '20px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 4px',
            }}>
              <span style={{ fontSize: '10px', color: '#4d5566' }}>
                Nexus Command · OpenClaw Multi-Agent Dashboard · live poll 5s
              </span>
              <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: '#4d5566' }}>
                <span>{agents.filter(a => a.status === 'active' && a.name !== 'main').length} agents active</span>
                <span>·</span>
                <span>{sessions.length} sessions</span>
                <span>·</span>
                <a
                  href="https://github.com/dnd5fj5gjy-bit/openclaw-dashboard"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#4d5566', textDecoration: 'none' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#58a6ff')}
                  onMouseOut={e => (e.currentTarget.style.color = '#4d5566')}
                >
                  github ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error('[App] Error:', err);
    return (
      <div style={{ padding: '20px', color: '#ff6b6b', fontFamily: 'monospace' }}>
        <h2>Application Error</h2>
        <pre>{String(err)}</pre>
      </div>
    );
  }
}
