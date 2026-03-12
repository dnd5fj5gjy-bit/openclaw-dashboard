import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  from: string;
  to: string;
  message: string;
  type: string;
  timestamp: number;
}

const AGENT_META: Record<string, { icon: string; color: string }> = {
  nexus:  { icon: '⬡', color: '#58a6ff' },
  junior: { icon: '◈', color: '#39d3c3' },
  bgv:    { icon: '◉', color: '#3fb950' },
  felix:  { icon: '●', color: '#e3b341' },
};

const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  insight: { color: '#3fb950', bg: '#1a4427' },
  idea:    { color: '#f0883e', bg: '#3d1f00' },
  status:  { color: '#4d5566', bg: '#21262d' },
  question:{ color: '#e3b341', bg: '#3a2e00' },
  task:    { color: '#58a6ff', bg: '#1a2f4d' },
  message: { color: '#8b949e', bg: '#21262d' },
};

function agentMeta(name: string) {
  return AGENT_META[name?.toLowerCase()] || { icon: '◌', color: '#8b949e' };
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit',
  });
}

async function fetchMessages(): Promise<ChatMessage[]> {
  try {
    const res = await fetch('/api/chat?limit=60');
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
  const endRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages().then(msgs => setMessages(msgs));
    const interval = setInterval(() => {
      fetchMessages().then(msgs => setMessages(msgs));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wasAtBottom.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  const chronological = [...messages].reverse();

  return (
    <div
      className="panel"
      style={{ height: '180px', flexShrink: 0, borderRadius: '8px' }}
    >
      <div className="panel-header" style={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>⬡</span>
          <span className="panel-title">Agent Team Channel</span>
        </div>
        <span className="panel-badge">{messages.length}</span>
      </div>

      {/* Feed */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflowY: 'auto', padding: '8px 14px' }}
        onScroll={() => {
          const el = containerRef.current;
          if (el) wasAtBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 20;
        }}
      >
        {chronological.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: '#4d5566', fontSize: '12px' }}>
            No messages yet — agents will post here proactively on heartbeats
          </div>
        ) : (
          chronological.map(msg => {
            const meta = agentMeta(msg.from);
            const ts = TYPE_STYLES[msg.type] || TYPE_STYLES.message;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '4px 0', borderBottom: '1px solid #21262d',
                }}
              >
                {/* Time */}
                <span className="mono" style={{ fontSize: '10px', color: '#4d5566', flexShrink: 0, marginTop: '2px', width: '40px' }}>
                  {formatTime(msg.timestamp)}
                </span>

                {/* Sender */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, width: '64px' }}>
                  <span style={{ color: meta.color, fontSize: '11px' }}>{meta.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color, textTransform: 'capitalize' }}>
                    {msg.from}
                  </span>
                </div>

                {/* Type badge */}
                {msg.type !== 'message' && (
                  <span style={{
                    fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em',
                    color: ts.color, background: ts.bg,
                    padding: '1px 6px', borderRadius: '3px', flexShrink: 0, marginTop: '2px',
                    textTransform: 'uppercase',
                  }}>
                    {msg.type}
                  </span>
                )}

                {/* Message */}
                <span style={{ fontSize: '12px', color: '#c9d1d9', lineHeight: '1.5', flex: 1 }}>
                  {msg.to !== 'all' && (
                    <span style={{ color: '#4d5566', marginRight: '4px' }}>→{msg.to}</span>
                  )}
                  {msg.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '7px 14px',
          borderTop: '1px solid #30363d',
          background: '#0d1117',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '11px', color: '#e3b341', fontWeight: 600, flexShrink: 0 }}>
          ● Felix
        </span>
        <span style={{ color: '#4d5566', fontSize: '11px' }}>→ all</span>
        <input
          type="text"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="Broadcast to agent team…"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: '12px', color: '#e6edf3', caretColor: '#58a6ff',
          }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!newMsg.trim() || sending}
          style={{
            fontSize: '11px', fontWeight: 600,
            color: newMsg.trim() ? '#58a6ff' : '#4d5566',
            background: 'none', border: 'none', cursor: newMsg.trim() ? 'pointer' : 'default',
            flexShrink: 0,
          }}
        >
          Send ↵
        </button>
      </form>
    </div>
  );
}
