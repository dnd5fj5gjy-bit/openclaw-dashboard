import { SessionRow } from '../hooks/useAgentData';

interface Props {
  sessions: SessionRow[];
  selectedSession: string | null;
  selectedAgent: string | null;
  onSelectSession: (key: string | null) => void;
}

const AGENT_COLORS: Record<string, string> = {
  nexus: '#4dabf7',
  junior: '#22d3ee',
  bgv: '#00d97e',
};

const CHANNEL_ICONS: Record<string, string> = {
  telegram: 'TG',
  discord: 'DC',
  signal: 'SG',
  whatsapp: 'WA',
  internal: 'IN',
  unknown: '??',
};

function agentColor(name: string): string {
  return AGENT_COLORS[name.toLowerCase()] || '#c8d8f0';
}

function truncateKey(key: string, maxLen = 28): string {
  if (key.length <= maxLen) return key;
  // Show agent:kind:channel:...last8
  const parts = key.split(':');
  if (parts.length >= 4) {
    const start = parts.slice(0, 3).join(':');
    const end = parts[parts.length - 1].slice(-8);
    return `${start}:…${end}`;
  }
  return key.slice(0, maxLen - 3) + '…';
}

export default function SessionsTable({ sessions, selectedSession, selectedAgent, onSelectSession }: Props) {
  const filtered = selectedAgent
    ? sessions.filter(s => s.agentName === selectedAgent)
    : sessions;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-header-title">Sessions</span>
        <div className="flex items-center gap-3">
          {selectedAgent && (
            <span className="val-yellow text-xs">{selectedAgent.toUpperCase()}</span>
          )}
          <span className="val-dim">{filtered.length} / {sessions.length}</span>
        </div>
      </div>

      <div className="panel-body p-0">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>AGENT</th>
              <th>KEY</th>
              <th style={{ width: '32px' }}>CH</th>
              <th style={{ width: '40px' }}>TYPE</th>
              <th style={{ width: '48px' }}>AGE</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 val-dim">
                  No sessions found
                </td>
              </tr>
            ) : (
              filtered.map(session => {
                const isSelected = selectedSession === session.key;
                const color = agentColor(session.agentName);
                const chIcon = CHANNEL_ICONS[session.channel] || session.channel.slice(0, 2).toUpperCase();

                // Age-based color
                const ageMs = Date.now() - session.updatedAt;
                const ageMins = ageMs / 60000;
                let ageColor = '#4a5568';
                if (ageMins < 60) ageColor = '#00d97e';
                else if (ageMins < 480) ageColor = '#ffc107';

                return (
                  <tr
                    key={session.key}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => onSelectSession(isSelected ? null : session.key)}
                  >
                    <td>
                      <span className="font-semibold uppercase" style={{ color, fontSize: '10px' }}>
                        {session.agentName}
                      </span>
                    </td>
                    <td>
                      <span className="val-dim font-mono" style={{ fontSize: '10px' }}>
                        {truncateKey(session.key)}
                      </span>
                    </td>
                    <td>
                      <span className="val-dim" style={{ fontSize: '9px' }}>
                        {chIcon}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '9px',
                          color: session.kind === 'group' ? '#fb923c' : '#4dabf7',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {session.kind === 'group' ? 'GRP' : 'DM'}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: ageColor, fontSize: '11px' }}>
                        {session.ageLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
