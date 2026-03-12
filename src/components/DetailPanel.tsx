import { AgentInfo, SessionRow } from '../hooks/useAgentData';

interface Props {
  selectedSession: string | null;
  selectedAgent: string | null;
  sessions: SessionRow[];
  agents: AgentInfo[];
}

const AGENT_COLORS: Record<string, string> = {
  nexus: '#4dabf7',
  junior: '#22d3ee',
  bgv: '#00d97e',
};

function agentColor(name: string): string {
  return AGENT_COLORS[name?.toLowerCase()] || '#c8d8f0';
}

function formatTimestamp(ms: number): string {
  if (!ms) return 'Unknown';
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-terminal-border" style={{ fontSize: '10px' }}>
      <span className="val-dim uppercase tracking-wide">{label}</span>
      <span style={{ color: color || '#c8d8f0', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  );
}

function AgentDetail({ agent, sessions }: { agent: AgentInfo; sessions: SessionRow[] }) {
  const color = agentColor(agent.name);
  const agentSessions = sessions.filter(s => s.agentName === agent.name);
  const STATUS_COLORS = { active: '#00d97e', idle: '#ffc107', offline: '#4a5568' };
  const statusColor = STATUS_COLORS[agent.status] || '#4a5568';

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color, fontSize: '18px' }}>◈</span>
        <div>
          <div className="font-bold uppercase tracking-widest" style={{ color, fontSize: '13px' }}>
            {agent.name}
          </div>
          <div style={{ fontSize: '9px', color: statusColor, letterSpacing: '0.1em' }}>
            ● {agent.status.toUpperCase()}
          </div>
        </div>
      </div>

      <Row label="Sessions" value={String(agent.sessionCount)} color="#22d3ee" />
      <Row label="Last Active" value={agent.lastActiveAgo} color={statusColor} />
      <Row
        label="Last Seen"
        value={agent.lastActive > 0 ? formatTimestamp(agent.lastActive) : 'Never'}
        color="#4a5568"
      />

      {agentSessions.length > 0 && (
        <div className="mt-4">
          <div className="val-dim uppercase text-xs tracking-wide mb-2" style={{ fontSize: '9px' }}>
            Recent Sessions
          </div>
          {agentSessions.slice(0, 8).map(s => (
            <div
              key={s.key}
              className="py-1.5 border-b border-terminal-border"
              style={{ fontSize: '10px' }}
            >
              <div className="flex justify-between mb-0.5">
                <span
                  style={{
                    color: s.kind === 'group' ? '#fb923c' : '#4dabf7',
                    fontSize: '9px',
                    letterSpacing: '0.06em',
                  }}
                >
                  {s.kind === 'group' ? '◉ GRP' : '◈ DM'}
                </span>
                <span className="val-dim">{s.ageLabel}</span>
              </div>
              <div className="val-dim" style={{ fontSize: '9px', wordBreak: 'break-all' }}>
                {s.key.split(':').slice(2).join(':').slice(0, 35)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionDetail({ session }: { session: SessionRow }) {
  const color = agentColor(session.agentName);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color, fontSize: '14px' }}>◈</span>
        <div>
          <div className="font-bold uppercase" style={{ color, fontSize: '11px' }}>
            {session.agentName}
          </div>
          <div style={{ fontSize: '9px', color: '#4a5568' }}>Session Detail</div>
        </div>
      </div>

      <Row label="Type" value={session.kind.toUpperCase()} color={session.kind === 'group' ? '#fb923c' : '#4dabf7'} />
      <Row label="Channel" value={session.channel.toUpperCase()} />
      <Row label="Chat Type" value={session.chatType.toUpperCase()} />
      <Row label="From" value={session.from || 'N/A'} />
      <Row label="Age" value={session.ageLabel} />
      <Row label="Last Active" value={formatTimestamp(session.updatedAt)} color="#4a5568" />

      <div className="mt-4">
        <div className="val-dim uppercase text-xs tracking-wide mb-2" style={{ fontSize: '9px' }}>
          Session Key
        </div>
        <div
          className="p-2 border border-terminal-border val-dim"
          style={{ fontSize: '9px', wordBreak: 'break-all', background: '#04060e', lineHeight: '1.6' }}
        >
          {session.key}
        </div>
      </div>

      <div className="mt-3">
        <div className="val-dim uppercase text-xs tracking-wide mb-2" style={{ fontSize: '9px' }}>
          Session ID
        </div>
        <div
          className="p-2 border border-terminal-border val-dim"
          style={{ fontSize: '9px', wordBreak: 'break-all', background: '#04060e', lineHeight: '1.6' }}
        >
          {session.sessionId}
        </div>
      </div>
    </div>
  );
}

export default function DetailPanel({ selectedSession, selectedAgent, sessions, agents }: Props) {
  const session = selectedSession ? sessions.find(s => s.key === selectedSession) : null;
  const agent = selectedAgent ? agents.find(a => a.name === selectedAgent) : null;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-header-title">Detail</span>
        <span className="val-dim">
          {session ? 'SESSION' : agent ? 'AGENT' : 'SELECT ROW'}
        </span>
      </div>

      <div className="panel-body">
        {session ? (
          <SessionDetail session={session} />
        ) : agent ? (
          <AgentDetail agent={agent} sessions={sessions} />
        ) : (
          <div className="text-center py-12 val-dim" style={{ fontSize: '11px' }}>
            <div className="mb-2" style={{ fontSize: '20px' }}>◌</div>
            <div>Click an agent or session</div>
            <div className="mt-1" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>
              to view details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
