import { useState, useEffect } from 'react';

interface Reminder {
  id: string;
  taskId?: string;
  title: string;
  scheduledAt: number;
  agent?: string;
  message: string;
  fired: boolean;
  createdAt: number;
}

const AGENT_COLORS: Record<string, string> = {
  nexus: '#58a6ff',
  junior: '#39d3c3',
  bgv: '#3fb950',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour12: false, hour: '2-digit', minute: '2-digit',
  });
}

function formatCountdown(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'past due';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `in ${days}d ${hrs % 24}h`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [agent, setAgent] = useState('nexus');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [creating, setCreating] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/reminders');
        if (res.ok) setReminders(await res.json());
      } catch { /* ignore */ }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const createReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduleDate || !scheduleTime) return;
    setCreating(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).getTime();
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), agent, scheduledAt }),
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(prev => [...prev, data.reminder]);
        setTitle(''); setMessage(''); setScheduleDate(''); setScheduleTime('');
        setShowForm(false);
      }
    } finally { setCreating(false); }
  };

  const deleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const remindersByDate: Record<string, Reminder[]> = {};
  reminders.forEach(r => {
    const d = new Date(r.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!remindersByDate[key]) remindersByDate[key] = [];
    remindersByDate[key].push(r);
  });

  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const upcoming = reminders
    .filter(r => !r.fired && r.scheduledAt > Date.now())
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
    .slice(0, 8);

  return (
    <div style={{ display: 'flex', gap: '12px', height: '100%', padding: '12px', overflow: 'hidden' }}>
      {/* Calendar grid */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1); }}
              style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
              &larr;
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3', minWidth: '160px', textAlign: 'center' }}>{monthName}</span>
            <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1); }}
              style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
              &rarr;
            </button>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ fontSize: '11px', fontWeight: 600, color: '#58a6ff', background: '#1a2f4d', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' }}>
            + New Reminder
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ fontSize: '10px', fontWeight: 600, color: '#4d5566', textAlign: 'center', padding: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>

        {/* Calendar cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', flex: 1, minHeight: 0 }}>
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} style={{ background: '#0d1117', borderRadius: '4px' }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayReminders = remindersByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div key={day} style={{
                background: isToday ? '#1a2f4d' : '#161b22',
                border: `1px solid ${isToday ? '#58a6ff' : '#21262d'}`,
                borderRadius: '4px',
                padding: '4px 6px',
                minHeight: '60px',
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? '#58a6ff' : '#8b949e', marginBottom: '2px' }}>{day}</div>
                {dayReminders.slice(0, 3).map(r => (
                  <div key={r.id} style={{
                    fontSize: '9px', color: AGENT_COLORS[r.agent || ''] || '#8b949e',
                    background: '#0d1117', borderRadius: '2px', padding: '1px 4px', marginBottom: '1px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.title}
                  </div>
                ))}
                {dayReminders.length > 3 && (
                  <div style={{ fontSize: '9px', color: '#4d5566' }}>+{dayReminders.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right sidebar: upcoming + form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '260px', overflow: 'hidden' }}>
        {/* Create form */}
        {showForm && (
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#58a6ff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Schedule Reminder
            </div>
            <form onSubmit={createReminder} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
                style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }} />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message (optional)" rows={2}
                style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none', resize: 'none' }} />
              <select value={agent} onChange={e => setAgent(e.target.value)}
                style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }}>
                <option value="nexus">Nexus</option>
                <option value="junior">Junior</option>
                <option value="bgv">BGV Agent</option>
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }} />
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ fontSize: '11px', color: '#8b949e', background: 'none', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating || !title.trim() || !scheduleDate || !scheduleTime}
                  style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: '#238636', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', opacity: creating ? 0.6 : 1 }}>
                  {creating ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Upcoming */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', background: '#1c2128', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upcoming</span>
            <span style={{ fontSize: '10px', color: '#58a6ff', background: '#1a2f4d', padding: '1px 8px', borderRadius: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
              {upcoming.length}
            </span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#4d5566', fontSize: '12px' }}>No upcoming reminders</div>
            ) : (
              upcoming.map(r => (
                <div key={r.id} style={{
                  background: '#0d1117', border: '1px solid #21262d', borderRadius: '6px',
                  padding: '10px 12px', marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#e6edf3' }}>{r.title}</span>
                    <button onClick={() => deleteReminder(r.id)}
                      style={{ fontSize: '10px', color: '#f85149', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
                      x
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: AGENT_COLORS[r.agent || ''] || '#4d5566' }}>{r.agent || 'all'}</span>
                    <span className="mono" style={{ fontSize: '10px', color: '#e3b341' }}>{formatCountdown(r.scheduledAt)}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '10px', color: '#4d5566', marginTop: '2px' }}>
                    {formatDate(r.scheduledAt)} {formatTime(r.scheduledAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Past reminders */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', maxHeight: '200px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', background: '#1c2128' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4d5566', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fired</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {reminders.filter(r => r.fired).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#4d5566', fontSize: '11px' }}>None yet</div>
            ) : (
              reminders.filter(r => r.fired).slice(-5).reverse().map(r => (
                <div key={r.id} style={{ fontSize: '11px', color: '#4d5566', padding: '4px 8px', borderBottom: '1px solid #21262d' }}>
                  <span style={{ color: '#8b949e' }}>{r.title}</span> — {formatDate(r.scheduledAt)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
