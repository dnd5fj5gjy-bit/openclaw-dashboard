import { useState, useEffect } from 'react';

interface Event {
  id: string;
  timestamp: number;
  type: string;
  actor: string;
  target: string;
  details: string;
}

const EVENT_ICONS: Record<string, string> = {
  task_assigned: '📋',
  task_completed: '✅',
  chat_message: '💬',
  status_change: '⚙️',
  session_created: '🔗',
};

const AGENT_COLORS: Record<string, string> = {
  nexus: '#58a6ff',
  junior: '#39d3c3',
  bgv: '#3fb950',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatAgo(ts: number): string {
  const ms = Date.now() - ts;
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export default function AuditLog() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<string>(''); // agent name

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const url = filter
          ? `/api/events?agent=${filter}&limit=100`
          : '/api/events?limit=100';
        const res = await fetch(url);
        if (res.ok) setEvents(await res.json());
      } catch (error) {
        console.error('Failed to load events:', error);
      }
    };

    loadEvents();
    const interval = setInterval(loadEvents, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '12px' }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 500,
            background: !filter ? '#30363d' : 'transparent',
            color: !filter ? '#e6edf3' : '#4d5566',
            border: '1px solid #30363d',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {['nexus', 'junior', 'bgv'].map(agent => (
          <button
            key={agent}
            onClick={() => setFilter(agent)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 500,
              background: filter === agent ? '#30363d' : 'transparent',
              color: filter === agent ? AGENT_COLORS[agent] : '#4d5566',
              border: `1px solid ${filter === agent ? AGENT_COLORS[agent] : '#30363d'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {agent}
          </button>
        ))}
      </div>

      {/* Log */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px', minHeight: 0 }}>
        {events.length === 0 ? (
          <div style={{ color: '#4d5566', fontSize: '12px', padding: '24px', textAlign: 'center' }}>
            No events
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              style={{
                background: '#0d1117',
                border: '1px solid #21262d',
                borderRadius: '4px',
                padding: '8px 10px',
                display: 'flex',
                gap: '8px',
                fontSize: '11px',
              }}
            >
              <span style={{ color: '#4d5566', flexShrink: 0 }}>
                {formatTime(event.timestamp)}
              </span>
              <span style={{ flexShrink: 0 }}>
                {EVENT_ICONS[event.type] || '•'}
              </span>
              <span style={{
                color: AGENT_COLORS[event.actor] || '#8b949e',
                fontWeight: 600,
                flexShrink: 0,
                textTransform: 'capitalize',
              }}>
                {event.actor}
              </span>
              <span style={{ color: '#8b949e', flex: 1 }}>
                {event.details}
              </span>
              <span style={{ color: '#4d5566', flexShrink: 0 }}>
                {formatAgo(event.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
