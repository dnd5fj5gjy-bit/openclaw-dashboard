import { useState, useEffect } from 'react';
import { AgentInfo, HealthData } from '../hooks/useAgentData';

interface Props {
  agents: AgentInfo[];
  health: HealthData | null;
  connected: boolean;
  lastRefresh: Date | null;
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-terminal-text font-mono">
      {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      {' '}
      <span className="val-dim">PDT</span>
    </span>
  );
}

export default function StatusBar({ agents, health, connected, lastRefresh }: Props) {
  const activeCount = agents.filter(a => a.status === 'active').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;
  const totalSessions = health?.sessions ?? 0;

  return (
    <div
      className="flex items-center justify-between px-3 border-b border-terminal-border flex-shrink-0"
      style={{ background: '#04060e', height: '32px', fontSize: '11px' }}
    >
      {/* Left: branding */}
      <div className="flex items-center gap-4">
        <span className="font-bold text-terminal-blue tracking-widest" style={{ fontSize: '12px' }}>
          ⬡ NEXUS COMMAND
        </span>
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full inline-block ${connected ? 'bg-terminal-green' : 'bg-terminal-red'}`}
            style={{ animation: connected ? 'pulse 2s infinite' : 'none' }}
          />
          <span className={connected ? 'val-green' : 'val-red'}>
            {connected ? 'GATEWAY ONLINE' : 'GATEWAY OFFLINE'}
          </span>
        </div>
      </div>

      {/* Center: live stats */}
      <div className="flex items-center gap-0">
        <div className="ticker-item">
          <span className="val-dim">AGENTS</span>
          <span className="val-blue font-bold">{agents.length}</span>
        </div>
        <div className="ticker-item">
          <span className="val-dim">ACTIVE</span>
          <span className="val-green font-bold">{activeCount}</span>
        </div>
        {idleCount > 0 && (
          <div className="ticker-item">
            <span className="val-dim">IDLE</span>
            <span className="val-yellow font-bold">{idleCount}</span>
          </div>
        )}
        <div className="ticker-item">
          <span className="val-dim">SESSIONS</span>
          <span className="val-cyan font-bold">{totalSessions}</span>
        </div>
        {lastRefresh && (
          <div className="ticker-item">
            <span className="val-dim">SYNC</span>
            <span className="val-dim">{lastRefresh.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Right: clock */}
      <div className="flex items-center gap-4">
        <Clock />
      </div>
    </div>
  );
}
