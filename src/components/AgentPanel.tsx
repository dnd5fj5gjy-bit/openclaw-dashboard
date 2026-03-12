import { AgentInfo, SessionRow } from '../hooks/useAgentData';

interface Props {
  agents: AgentInfo[];
  sessions: SessionRow[];
  selectedAgent: string | null;
  onSelectAgent: (name: string | null) => void;
}

const AGENT_META: Record<string, { icon: string; color: string; role: string }> = {
  nexus:  { icon: '⬡', color: '#58a6ff', role: 'Tech Lead' },
  junior: { icon: '◈', color: '#39d3c3', role: 'Team Lead' },
  bgv:    { icon: '◉', color: '#3fb950', role: 'BGV Agent' },
};

const STATUS_CONFIG = {
  active:  { color: '#3fb950', bg: '#1a4427', label: 'Active',  dotClass: 'dot-green' },
  idle:    { color: '#e3b341', bg: '#3a2e00', label: 'Idle',    dotClass: 'dot-yellow' },
  offline: { color: '#4d5566', bg: '#21262d', label: 'Offline', dotClass: 'dot-gray' },
};

function formatAgo(ms: number): string {
  if (!ms) return 'never';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function AgentPanel({ agents, sessions, selectedAgent, onSelectAgent }: Props) {
  // Filter out 'main' agent dir (not a real agent)
  const realAgents = agents.filter(a => a.name !== 'main');

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="panel-title">Agents</span>
        <span className="panel-badge">{realAgents.length}</span>
      </div>

      <div className="panel-body">
        {realAgents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#4d5566', fontSize: '12px' }}>
            Loading…
          </div>
        ) : (
          realAgents.map(agent => {
            const meta = AGENT_META[agent.name.toLowerCase()] || { icon: '◌', color: '#8b949e', role: 'Agent' };
            const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
            const isSelected = selectedAgent === agent.name;
            const agentSessions = sessions.filter(s => s.agentName === agent.name);
            const recentSessions = agentSessions.slice(0, 3);

            return (
              <div
                key={agent.name}
                className={`agent-card ${isSelected ? 'is-selected' : ''}`}
                style={{ borderLeftColor: isSelected ? '#58a6ff' : meta.color }}
                onClick={() => onSelectAgent(isSelected ? null : agent.name)}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', color: meta.color }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3', textTransform: 'capitalize' }}>
                        {agent.name}
                      </div>
                      <div style={{ fontSize: '10px', color: '#4d5566', marginTop: '1px' }}>{meta.role}</div>
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      color: sc.color, background: sc.bg, fontSize: '10px',
                      gap: '4px',
                    }}
                  >
                    <span className={`dot ${sc.dotClass}`} style={{ width: '5px', height: '5px' }} />
                    {sc.label}
                  </span>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '8px', fontSize: '11px',
                }}>
                  <div style={{ background: '#0d1117', borderRadius: '6px', padding: '6px 8px' }}>
                    <div style={{ color: '#4d5566', fontSize: '10px', marginBottom: '2px' }}>Sessions</div>
                    <div className="mono" style={{ color: '#58a6ff', fontWeight: 600 }}>{agentSessions.length}</div>
                  </div>
                  <div style={{ background: '#0d1117', borderRadius: '6px', padding: '6px 8px' }}>
                    <div style={{ color: '#4d5566', fontSize: '10px', marginBottom: '2px' }}>Last seen</div>
                    <div className="mono" style={{ color: sc.color, fontWeight: 500 }}>
                      {formatAgo(agent.lastActive)}
                    </div>
                  </div>
                </div>

                {/* Recent sessions */}
                {recentSessions.length > 0 && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid #21262d', paddingTop: '8px' }}>
                    {recentSessions.map(s => (
                      <div
                        key={s.key}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '2px 0', fontSize: '11px', gap: '6px',
                        }}
                      >
                        <span style={{
                          color: s.kind === 'group' ? '#f0883e' : '#58a6ff',
                          fontSize: '9px', fontWeight: 600,
                          background: s.kind === 'group' ? '#3d1f00' : '#1a2f4d',
                          padding: '1px 5px', borderRadius: '3px',
                        }}>
                          {s.kind === 'group' ? 'GRP' : 'DM'}
                        </span>
                        <span style={{ color: '#8b949e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.channel === 'telegram' ? 'Telegram' : s.channel}
                        </span>
                        <span className="mono" style={{ color: '#4d5566', fontSize: '10px', flexShrink: 0 }}>
                          {s.ageLabel}
                        </span>
                      </div>
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
}
