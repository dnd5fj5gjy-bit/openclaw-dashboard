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
    <span className="mono" style={{ fontSize: '12px', color: '#8b949e' }}>
      {time.toLocaleTimeString('en-US', { hour12: false })}
      {' '}
      <span style={{ color: '#4d5566' }}>PDT</span>
    </span>
  );
}

export default function StatusBar({ agents, health, connected, lastRefresh }: Props) {
  const activeCount = agents.filter(a => a.status === 'active').length;
  const totalSessions = health?.sessions ?? 0;

  return (
    <div
      style={{
        height: '44px',
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
      }}
    >
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', color: '#58a6ff' }}>⬡</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.01em' }}>
            Nexus Command
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="dot"
            style={{
              background: connected ? '#3fb950' : '#f85149',
              boxShadow: connected ? '0 0 6px rgba(63,185,80,0.6)' : 'none',
            }}
          />
          <span style={{ fontSize: '11px', color: connected ? '#3fb950' : '#f85149', fontWeight: 500 }}>
            {connected ? 'Gateway Connected' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Center stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {[
          { label: 'Agents', value: agents.length, color: '#8b949e' },
          { label: 'Active', value: activeCount, color: '#3fb950' },
          { label: 'Sessions', value: totalSessions, color: '#58a6ff' },
        ].map(({ label, value, color }, i) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRight: i < 2 ? '1px solid #30363d' : 'none',
            }}
          >
            <span style={{ fontSize: '11px', color: '#4d5566' }}>{label}</span>
            <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {lastRefresh && (
          <span style={{ fontSize: '11px', color: '#4d5566' }}>
            synced {lastRefresh.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <Clock />
      </div>
    </div>
  );
}
