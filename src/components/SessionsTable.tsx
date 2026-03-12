import { SessionRow } from '../hooks/useAgentData';

interface Props {
  sessions: SessionRow[];
  selectedSession: string | null;
  selectedAgent: string | null;
  onSelectSession: (key: string | null) => void;
}

const AGENT_COLORS: Record<string, string> = {
  nexus: '#58a6ff',
  junior: '#39d3c3',
  bgv: '#3fb950',
};

function agentColor(name: string): string {
  return AGENT_COLORS[name?.toLowerCase()] || '#8b949e';
}

function truncateKey(key: string, max = 38): string {
  if (key.length <= max) return key;
  const parts = key.split(':');
  if (parts.length >= 3) {
    const head = parts.slice(0, 3).join(':');
    const tail = parts.slice(3).join(':');
    if (tail) {
      return `${head}:${tail.slice(0, 14)}…`;
    }
  }
  return key.slice(0, max - 1) + '…';
}

export default function SessionsTable({ sessions, selectedSession, selectedAgent, onSelectSession }: Props) {
  const filtered = selectedAgent
    ? sessions.filter(s => s.agentName === selectedAgent)
    : sessions;

  return (
    <div className="panel h-full">
      <div className="panel-header">
        <span className="panel-title">Sessions</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedAgent && (
            <span style={{
              fontSize: '10px', fontWeight: 600, color: agentColor(selectedAgent),
              background: '#1a2f4d', padding: '2px 7px', borderRadius: '10px',
              textTransform: 'capitalize',
            }}>
              {selectedAgent}
            </span>
          )}
          <span className="panel-badge">{filtered.length}</span>
        </div>
      </div>

      <div className="panel-body" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '75px' }}>Agent</th>
              <th>Session</th>
              <th style={{ width: '50px', textAlign: 'center' }}>Type</th>
              <th style={{ width: '45px', textAlign: 'center' }}>Ch</th>
              <th style={{ width: '55px', textAlign: 'right', paddingRight: '14px' }}>Age</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#4d5566' }}>
                  No sessions found
                </td>
              </tr>
            ) : (
              filtered.map(session => {
                const isSelected = selectedSession === session.key;
                const color = agentColor(session.agentName);
                const ageMins = (Date.now() - session.updatedAt) / 60000;
                const ageColor = ageMins < 60 ? '#3fb950' : ageMins < 480 ? '#e3b341' : '#4d5566';
                const chLabel = session.channel === 'telegram' ? 'TG'
                  : session.channel === 'discord' ? 'DC'
                  : session.channel?.slice(0, 2).toUpperCase() || '??';

                return (
                  <tr
                    key={session.key}
                    className={isSelected ? 'selected' : ''}
                    onClick={() => onSelectSession(isSelected ? null : session.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ color, fontWeight: 600, fontSize: '12px', textTransform: 'capitalize' }}>
                        {session.agentName}
                      </span>
                    </td>
                    <td>
                      <span className="mono truncate-key" style={{ color: '#8b949e', fontSize: '11px', display: 'block', maxWidth: '320px' }}>
                        {truncateKey(session.key)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 600,
                        color: session.kind === 'group' ? '#f0883e' : '#58a6ff',
                        background: session.kind === 'group' ? '#3d1f00' : '#1a2f4d',
                        padding: '2px 6px', borderRadius: '4px',
                      }}>
                        {session.kind === 'group' ? 'Group' : 'DM'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="mono" style={{ color: '#4d5566', fontSize: '10px' }}>{chLabel}</span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '14px' }}>
                      <span className="mono" style={{ color: ageColor, fontSize: '12px', fontWeight: 500 }}>
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
