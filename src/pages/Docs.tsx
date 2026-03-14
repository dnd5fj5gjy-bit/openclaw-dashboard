import { useState, useEffect } from 'react';

interface Skill {
  name: string;
  path: string;
  content: string | null;
}

interface Memory {
  name: string;
  type: string;
  description: string;
  content: string;
}

interface SessionSummary {
  sessionId: string;
  agentId: string;
  key: string;
  updatedAt: number;
  kind: string;
}

interface ReplayMessage {
  role: string;
  content: string;
  timestamp?: number;
}

const AGENT_META: Record<string, { icon: string; color: string; role: string }> = {
  nexus: { icon: '⬡', color: '#58a6ff', role: 'Tech Lead' },
  junior: { icon: '◈', color: '#39d3c3', role: 'Team Lead' },
  bgv: { icon: '◉', color: '#3fb950', role: 'BGV Agent' },
};

function formatAge(ts: number): string {
  const ms = Date.now() - ts;
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export default function Docs() {
  const [selectedAgent, setSelectedAgent] = useState('nexus');
  const [activeTab, setActiveTab] = useState<'skills' | 'memories' | 'replay'>('memories');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [replayMessages, setReplayMessages] = useState<ReplayMessage[]>([]);
  const [replaySession, setReplaySession] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [skillsRes, memoriesRes, sessionsRes] = await Promise.all([
          fetch('/api/skills'),
          fetch(`/api/memories/${selectedAgent}`),
          fetch(`/api/sessions?agent=${selectedAgent}`),
        ]);
        if (skillsRes.ok) setSkills(await skillsRes.json());
        if (memoriesRes.ok) setMemories(await memoriesRes.json());
        if (sessionsRes.ok) setSessions(await sessionsRes.json());
      } catch { /* ignore */ }
      setLoading(false);
    };
    loadData();
  }, [selectedAgent]);

  const loadReplay = async (sessionId: string) => {
    setReplaySession(sessionId);
    setReplayMessages([]);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/replay?limit=20`);
      if (res.ok) setReplayMessages(await res.json());
    } catch { /* ignore */ }
  };

  const meta = AGENT_META[selectedAgent] || AGENT_META.nexus;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Agent selector sidebar */}
      <div style={{ width: '180px', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #30363d' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Agents</span>
        </div>
        <div style={{ padding: '6px' }}>
          {Object.entries(AGENT_META).map(([name, m]) => (
            <button key={name} onClick={() => { setSelectedAgent(name); setReplaySession(null); }}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: '6px', cursor: 'pointer', border: 'none',
                background: selectedAgent === name ? '#1c2128' : 'transparent',
                color: selectedAgent === name ? m.color : '#8b949e',
                marginBottom: '2px',
              }}>
              <span style={{ fontSize: '14px' }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{name}</div>
                <div style={{ fontSize: '10px', color: '#4d5566' }}>{m.role}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '10px 14px', borderBottom: '1px solid #30363d' }}>
          {([
            { id: 'memories' as const, label: 'Memories', count: memories.length },
            { id: 'skills' as const, label: 'Skills', count: skills.filter(s => s.content).length },
            { id: 'replay' as const, label: 'Session Replay', count: sessions.length },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 500, borderRadius: '6px',
                border: '1px solid', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                background: activeTab === tab.id ? '#1c2128' : 'transparent',
                borderColor: activeTab === tab.id ? '#30363d' : 'transparent',
                color: activeTab === tab.id ? '#e6edf3' : '#8b949e',
              }}>
              {tab.label}
              <span style={{ fontSize: '10px', fontWeight: 600, background: activeTab === tab.id ? '#1a2f4d' : '#21262d', color: activeTab === tab.id ? '#58a6ff' : '#4d5566', padding: '1px 6px', borderRadius: '8px', fontFamily: 'JetBrains Mono, monospace' }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566' }}>Loading...</div>
          ) : activeTab === 'memories' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>No memories found for {selectedAgent}</div>
              ) : (
                memories.map((mem, i) => (
                  <div key={i} style={{
                    background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
                    borderLeft: `3px solid ${meta.color}`, overflow: 'hidden',
                  }}>
                    <div style={{ padding: '10px 14px', background: '#1c2128', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>{mem.name}</span>
                        <span style={{ fontSize: '9px', fontWeight: 600, color: '#d2a8ff', background: '#2d1f5e', padding: '1px 6px', borderRadius: '3px', textTransform: 'uppercase' }}>{mem.type}</span>
                      </div>
                    </div>
                    {mem.description && (
                      <div style={{ padding: '8px 14px', fontSize: '11px', color: '#8b949e', borderBottom: '1px solid #21262d' }}>{mem.description}</div>
                    )}
                    <pre style={{
                      padding: '12px 14px', fontSize: '11px', color: '#c9d1d9', lineHeight: '1.6',
                      fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      margin: 0, background: '#0d1117',
                    }}>
                      {mem.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'skills' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {skills.filter(s => s.content).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>No skills found</div>
              ) : (
                skills.filter(s => s.content).map(skill => (
                  <div key={skill.name} style={{
                    background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden',
                  }}>
                    <div style={{ padding: '10px 14px', background: '#1c2128', borderBottom: '1px solid #30363d' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>{skill.name}</span>
                      <span style={{ fontSize: '10px', color: '#4d5566', marginLeft: '8px' }}>{skill.path}</span>
                    </div>
                    <pre style={{
                      padding: '12px 14px', fontSize: '11px', color: '#c9d1d9', lineHeight: '1.6',
                      fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      margin: 0, background: '#0d1117', maxHeight: '400px', overflow: 'auto',
                    }}>
                      {skill.content}
                    </pre>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Replay */
            <div style={{ display: 'flex', gap: '12px', height: '100%' }}>
              {/* Session list */}
              <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                {sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>No sessions</div>
                ) : (
                  sessions.map(s => (
                    <button key={s.key} onClick={() => loadReplay(s.sessionId)}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: '6px',
                        background: replaySession === s.sessionId ? '#1a2f4d' : '#161b22',
                        border: `1px solid ${replaySession === s.sessionId ? '#58a6ff' : '#30363d'}`,
                        cursor: 'pointer', color: '#e6edf3',
                      }}>
                      <div style={{ fontSize: '11px', fontWeight: 500, marginBottom: '2px' }}>
                        {s.kind === 'group' ? 'Group' : 'DM'} — {s.key.split(':').slice(-1)[0]}
                      </div>
                      <div style={{ fontSize: '10px', color: '#4d5566' }}>{formatAge(s.updatedAt)}</div>
                    </button>
                  ))
                )}
              </div>

              {/* Replay messages */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                {!replaySession ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>Select a session to replay</div>
                ) : replayMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>No messages in this session (replay data may not be available)</div>
                ) : (
                  replayMessages.map((msg, i) => (
                    <div key={i} style={{
                      background: msg.role === 'assistant' ? '#161b22' : '#1c2128',
                      border: '1px solid #30363d', borderRadius: '6px', padding: '10px 14px',
                      borderLeft: `3px solid ${msg.role === 'assistant' ? meta.color : '#e3b341'}`,
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: msg.role === 'assistant' ? meta.color : '#e3b341', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {msg.role === 'assistant' ? selectedAgent : 'User'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#c9d1d9', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {typeof msg.content === 'string' ? (msg.content.length > 1000 ? msg.content.slice(0, 997) + '...' : msg.content) : JSON.stringify(msg.content).slice(0, 500)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
