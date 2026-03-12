import { AgentInfo, SessionRow } from '../hooks/useAgentData';

interface Props {
  selectedSession: string | null;
  selectedAgent: string | null;
  sessions: SessionRow[];
  agents: AgentInfo[];
}

const AGENT_META: Record<string, { icon: string; color: string; role: string }> = {
  nexus:  { icon: '⬡', color: '#58a6ff', role: 'Tech Lead' },
  junior: { icon: '◈', color: '#39d3c3', role: 'Team Lead' },
  bgv:    { icon: '◉', color: '#3fb950', role: 'BGV Agent' },
};

const STATUS_CONFIG = {
  active:  { color: '#3fb950', label: 'Active',  bg: '#1a4427' },
  idle:    { color: '#e3b341', label: 'Idle',    bg: '#3a2e00' },
  offline: { color: '#4d5566', label: 'Offline', bg: '#21262d' },
};

function formatTimestamp(ms: number): string {
  if (!ms) return 'Unknown';
  return new Date(ms).toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function formatAgo(ms: number): string {
  if (!ms) return 'never';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid #21262d',
    }}>
      <span style={{ fontSize: '11px', color: '#4d5566' }}>{label}</span>
      <span className="mono" style={{ fontSize: '12px', color: color || '#e6edf3', fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}

function AgentDetail({ agent, sessions }: { agent: AgentInfo; sessions: SessionRow[] }) {
  const meta = AGENT_META[agent.name.toLowerCase()] || { icon: '◌', color: '#8b949e', role: 'Agent' };
  const sc = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
  const agentSessions = sessions.filter(s => s.agentName === agent.name);

  return (
    <div>
      {/* Agent hero */}
      <div style={{
        background: '#1c2128', borderRadius: '8px', padding: '16px', marginBottom: '16px',
        border: '1px solid #30363d',
        borderLeft: `4px solid ${meta.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '22px', color: meta.color }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#e6edf3', textTransform: 'capitalize' }}>
              {agent.name}
            </div>
            <div style={{ fontSize: '11px', color: '#4d5566' }}>{meta.role}</div>
          </div>
        </div>
        <span className="badge" style={{ color: sc.color, background: sc.bg }}>
          <span className="dot" style={{ background: sc.color, width: '5px', height: '5px' }} />
          {sc.label}
        </span>
      </div>

      <Stat label="Sessions" value={String(agentSessions.length)} color="#58a6ff" />
      <Stat label="Last active" value={formatAgo(agent.lastActive)} color={sc.color} />
      <Stat label="Last seen" value={formatTimestamp(agent.lastActive)} />
      <Stat label="Direct" value={String(agentSessions.filter(s => s.kind === 'direct').length)} />
      <Stat label="Group" value={String(agentSessions.filter(s => s.kind === 'group').length)} />

      {agentSessions.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#4d5566', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Recent Sessions
          </div>
          {agentSessions.slice(0, 6).map(s => (
            <div key={s.key} style={{
              padding: '8px 0', borderBottom: '1px solid #21262d',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <span style={{
                  fontSize: '10px', fontWeight: 600,
                  color: s.kind === 'group' ? '#f0883e' : '#58a6ff',
                  background: s.kind === 'group' ? '#3d1f00' : '#1a2f4d',
                  padding: '1px 6px', borderRadius: '3px', marginRight: '6px',
                }}>
                  {s.kind === 'group' ? 'GRP' : 'DM'}
                </span>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>
                  {s.channel === 'telegram' ? 'Telegram' : s.channel}
                </span>
              </div>
              <span className="mono" style={{ fontSize: '10px', color: '#4d5566' }}>{s.ageLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionDetail({ session }: { session: SessionRow }) {
  const meta = AGENT_META[session.agentName?.toLowerCase()] || { icon: '◌', color: '#8b949e', role: 'Agent' };

  return (
    <div>
      <div style={{
        background: '#1c2128', borderRadius: '8px', padding: '14px', marginBottom: '16px',
        border: '1px solid #30363d',
        borderLeft: `4px solid ${meta.color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px', color: meta.color }}>{meta.icon}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3', textTransform: 'capitalize' }}>
              {session.agentName}
            </div>
            <div style={{ fontSize: '10px', color: '#4d5566' }}>Session Detail</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', fontWeight: 600,
            color: session.kind === 'group' ? '#f0883e' : '#58a6ff',
            background: session.kind === 'group' ? '#3d1f00' : '#1a2f4d',
            padding: '2px 8px', borderRadius: '4px',
          }}>
            {session.kind === 'group' ? 'Group' : 'Direct Message'}
          </span>
          <span style={{
            fontSize: '10px', color: '#8b949e',
            background: '#21262d', padding: '2px 8px', borderRadius: '4px',
          }}>
            {session.channel}
          </span>
        </div>
      </div>

      <Stat label="Age" value={session.ageLabel} color="#e3b341" />
      <Stat label="Chat type" value={session.chatType} />
      <Stat label="Channel" value={session.channel} />
      <Stat label="From" value={session.from || 'N/A'} />
      <Stat label="Last active" value={formatTimestamp(session.updatedAt)} />

      <div style={{ marginTop: '16px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#4d5566', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
          Session Key
        </div>
        <div className="mono" style={{
          background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px',
          padding: '10px', fontSize: '10px', color: '#4d5566',
          wordBreak: 'break-all', lineHeight: '1.6',
        }}>
          {session.key}
        </div>
      </div>
    </div>
  );
}

export default function DetailPanel({ selectedSession, selectedAgent, sessions, agents }: Props) {
  const session = selectedSession ? sessions.find(s => s.key === selectedSession) : null;
  const agent = selectedAgent ? agents.find(a => a.name === selectedAgent) : null;

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="panel-title">Detail</span>
        <span style={{ fontSize: '11px', color: '#4d5566' }}>
          {session ? 'Session' : agent ? 'Agent' : 'Select a row'}
        </span>
      </div>

      <div className="panel-body">
        {session ? (
          <SessionDetail session={session} />
        ) : agent ? (
          <AgentDetail agent={agent} sessions={sessions} />
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#4d5566' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.5 }}>◌</div>
            <div style={{ fontSize: '13px', marginBottom: '6px', color: '#8b949e' }}>Nothing selected</div>
            <div style={{ fontSize: '11px' }}>Click an agent card or session row to drill in</div>
          </div>
        )}
      </div>
    </div>
  );
}
