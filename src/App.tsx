import { useState } from 'react';
import { useAgentData } from './hooks/useAgentData';
import StatusBar from './components/StatusBar';
import AgentPanel from './components/AgentPanel';
import SessionsTable from './components/SessionsTable';
import DetailPanel from './components/DetailPanel';

export default function App() {
  const { agents, sessions, health, connected, loading, lastRefresh } = useAgentData(5000);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const handleSelectAgent = (name: string | null) => {
    setSelectedAgent(name);
    setSelectedSession(null); // Clear session selection when switching agent
  };

  const handleSelectSession = (key: string | null) => {
    setSelectedSession(key);
    if (key) {
      const session = sessions.find(s => s.key === key);
      if (session) setSelectedAgent(null);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#050509',
        overflow: 'hidden',
      }}
    >
      {/* Top status bar */}
      <StatusBar
        agents={agents}
        health={health}
        connected={connected}
        lastRefresh={lastRefresh}
      />

      {/* Main grid */}
      {loading ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{ fontSize: '12px', color: '#4a5568' }}
        >
          <div className="text-center">
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⬡</div>
            <div className="val-blue" style={{ letterSpacing: '0.15em' }}>INITIALIZING...</div>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr 240px',
            gridTemplateRows: '1fr',
            gap: '1px',
            background: '#1a2035', // gap color = border
            padding: '1px',
          }}
        >
          {/* Left: Agent panel */}
          <AgentPanel
            agents={agents}
            sessions={sessions}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
          />

          {/* Center: Sessions table */}
          <SessionsTable
            sessions={sessions}
            selectedSession={selectedSession}
            selectedAgent={selectedAgent}
            onSelectSession={handleSelectSession}
          />

          {/* Right: Detail panel */}
          <DetailPanel
            selectedSession={selectedSession}
            selectedAgent={selectedAgent}
            sessions={sessions}
            agents={agents}
          />
        </div>
      )}

      {/* Bottom status strip */}
      <div
        className="flex items-center justify-between px-3 border-t border-terminal-border flex-shrink-0"
        style={{ background: '#04060e', height: '22px', fontSize: '10px' }}
      >
        <div className="flex items-center gap-4">
          <span className="val-dim">
            OPENCLAW MULTI-AGENT DASHBOARD
          </span>
          <span className="val-dim">·</span>
          <span className="val-dim">
            DATA: LIVE FS POLL 5s
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="val-dim">
            {agents.filter(a => a.status === 'active').length} ACTIVE /
            {' '}{agents.length} TOTAL AGENTS
          </span>
          <span className="val-dim">·</span>
          <span className="val-dim">
            {sessions.length} SESSIONS
          </span>
          <span className="val-dim">·</span>
          <a
            href="https://github.com/dnd5fj5gjy-bit/openclaw-dashboard"
            target="_blank"
            rel="noreferrer"
            className="val-dim hover:val-blue"
          >
            github ↗
          </a>
        </div>
      </div>
    </div>
  );
}
