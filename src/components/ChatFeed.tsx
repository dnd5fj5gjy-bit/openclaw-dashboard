import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  type: string;
  timestamp: number;
}

const AGENT_COLORS: Record<string, string> = {
  nexus: '#4dabf7',
  junior: '#22d3ee',
  bgv: '#00d97e',
};

const AGENT_ICONS: Record<string, string> = {
  nexus: '⬡',
  junior: '◈',
  bgv: '◉',
};

function agentColor(name: string): string {
  return AGENT_COLORS[name?.toLowerCase()] || '#c8d8f0';
}

function agentIcon(name: string): string {
  return AGENT_ICONS[name?.toLowerCase()] || '◌';
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function typeColor(type: string): string {
  const map: Record<string, string> = {
    status: '#4a5568',
    idea: '#fb923c',
    question: '#ffc107',
    insight: '#00d97e',
    task: '#4dabf7',
    message: '#c8d8f0',
  };
  return map[type] || '#c8d8f0';
}

async function fetchMessages(): Promise<ChatMessage[]> {
  try {
    const res = await fetch('/api/chat?limit=50');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default function ChatFeed() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages().then(setMessages);
    const interval = setInterval(() => {
      fetchMessages().then(setMessages);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom (newest messages)
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'felix', to: 'all', message: newMsg.trim(), type: 'message' }),
      });
      setNewMsg('');
      const updated = await fetchMessages();
      setMessages(updated);
    } finally {
      setSending(false);
    }
  };

  // Display in chronological order (oldest first at top)
  const chronological = [...messages].reverse();

  return (
    <div className="panel flex flex-col" style={{ height: '200px' }}>
      <div className="panel-header flex-shrink-0">
        <span className="panel-header-title">⬡ Agent Team Channel</span>
        <span className="val-dim">{messages.length} messages</span>
      </div>

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto px-3 py-1" style={{ fontSize: '11px' }}>
        {chronological.length === 0 ? (
          <div className="text-center py-4 val-dim" style={{ fontSize: '10px' }}>
            No messages yet. Agents will post here proactively.
          </div>
        ) : (
          chronological.map(msg => {
            const color = msg.from === 'felix' ? '#d4c89a' : agentColor(msg.from);
            const icon = msg.from === 'felix' ? '●' : agentIcon(msg.from);
            const tc = typeColor(msg.type);

            return (
              <div key={msg.id} className="flex items-start gap-2 py-1 border-b border-terminal-border">
                {/* Timestamp */}
                <span className="val-dim flex-shrink-0" style={{ fontSize: '9px', marginTop: '2px', width: '52px' }}>
                  {formatTime(msg.timestamp)}
                </span>

                {/* From */}
                <span
                  className="flex-shrink-0 font-bold uppercase"
                  style={{ color, fontSize: '10px', width: '52px' }}
                >
                  {icon} {msg.from}
                </span>

                {/* To (if not 'all') */}
                {msg.to !== 'all' && (
                  <span className="val-dim flex-shrink-0" style={{ fontSize: '9px', marginTop: '2px' }}>
                    →{msg.to}
                  </span>
                )}

                {/* Type badge */}
                {msg.type !== 'message' && (
                  <span
                    className="flex-shrink-0 px-1 rounded"
                    style={{ fontSize: '8px', color: tc, background: `${tc}22`, marginTop: '1px' }}
                  >
                    {msg.type.toUpperCase()}
                  </span>
                )}

                {/* Message */}
                <span className="flex-1 text-terminal-text" style={{ lineHeight: '1.5' }}>
                  {msg.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — Felix can inject into the channel */}
      <form
        onSubmit={sendMessage}
        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-t border-terminal-border"
        style={{ background: '#04060e' }}
      >
        <span className="val-dim" style={{ fontSize: '10px' }}>
          ● FELIX →
        </span>
        <input
          type="text"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="Broadcast to agent team..."
          className="flex-1 bg-transparent text-terminal-text outline-none"
          style={{ fontSize: '11px', caretColor: '#4dabf7' }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMsg.trim() || sending}
          className="val-blue hover:text-white disabled:val-dim"
          style={{ fontSize: '10px' }}
        >
          SEND ↵
        </button>
      </form>
    </div>
  );
}
