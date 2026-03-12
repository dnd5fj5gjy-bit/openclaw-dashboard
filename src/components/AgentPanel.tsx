import { AgentInfo, SessionRow } from '../hooks/useAgentData';

interface Props {
  agents: AgentInfo[];
  sessions: SessionRow[];
  selectedAgent: string | null;
  onSelectAgent: (name: string | null) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#00d97e',
  idle: '#ffc107',
  offline: '#4a5568',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'LIVE',
  idle: 'IDLE',
  offline: 'OFF',
};

function AgentEmoji(name: string): string {
  const map: Record<string, string> = {
    nexus: '⬡',
    junior: '◈',
    bgv: '◉',
  };
  return map[name.toLowerCase()] || '◌';
}

export default function AgentPanel({ agents, sessions, selectedAgent, onSelectAgent }: Props) {
  const totalSessions = sessions.length;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-header-title">Agents</span>
        <span className="val-dim">{agents.length} registered</span>
      </div>

      <div className="panel-body">
        {agents.length === 0 ? (
          <div className="text-center py-8 val-dim text-xs">
            Loading agent data...
          </div>
        ) : (
          agents.map(agent => {
            const color = STATUS_COLORS[agent.status] || '#4a5568';
            const label = STATUS_LABELS[agent.status] || '???';
            const isSelected = selectedAgent === agent.name;
            const agentSessions = sessions.filter(s => s.agentName === agent.name);

            return (
              <div
                key={agent.name}
                className={`agent-card ${agent.status} cursor-pointer`}
                style={{ borderLeftColor: isSelected ? '#4dabf7' : color }}
                onClick={() => onSelectAgent(isSelected ? null : agent.name)}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color, fontSize: '14px' }}>{AgentEmoji(agent.name)}</span>
                    <span className="font-bold text-terminal-text uppercase tracking-wider text-xs">
                      {agent.name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ color, background: `${color}22`, fontSize: '9px', letterSpacing: '0.08em' }}
                  >
                    {label}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: '10px' }}>
                  <div>
                    <span className="val-dim">SESSIONS </span>
                    <span className="val-cyan">{agentSessions.length}</span>
                  </div>
                  <div>
                    <span className="val-dim">LAST </span>
                    <span style={{ color }}>
                      {agent.lastActiveAgo || 'never'}
                    </span>
                  </div>
                </div>

                {/* Session type breakdown */}
                {agentSessions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-terminal-border" style={{ fontSize: '10px' }}>
                    {(['direct', 'group'] as const).map(kind => {
                      const count = agentSessions.filter(s => s.kind === kind).length;
                      if (count === 0) return null;
                      return (
                        <div key={kind} className="flex justify-between">
                          <span className="val-dim">{kind.toUpperCase()}</span>
                          <span className="val-dim">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Footer summary */}
        {agents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-terminal-border" style={{ fontSize: '10px' }}>
            <div className="flex justify-between mb-1">
              <span className="val-dim">TOTAL SESSIONS</span>
              <span className="val-blue">{totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="val-dim">DIRECT</span>
              <span className="val-dim">{sessions.filter(s => s.kind === 'direct').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="val-dim">GROUP</span>
              <span className="val-dim">{sessions.filter(s => s.kind === 'group').length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
