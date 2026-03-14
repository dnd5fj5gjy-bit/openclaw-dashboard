import { useState, useEffect } from 'react';

interface Rule {
  id: string;
  name: string;
  condition: string;
  conditionValue: number;
  action: string;
  actionAgent: string;
  actionMessage: string;
  enabled: boolean;
  createdAt: number;
  lastTriggered?: number;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  timestamp: number;
  agent?: string;
}

const AGENT_COLORS: Record<string, string> = {
  nexus: '#58a6ff',
  junior: '#39d3c3',
  bgv: '#3fb950',
};

const CONDITIONS = [
  { id: 'tasks_queued_gt', label: 'Queued tasks >' },
  { id: 'tasks_active_gt', label: 'Active tasks >' },
  { id: 'agent_idle_mins', label: 'Agent idle for minutes >' },
  { id: 'sessions_count_gt', label: 'Total sessions >' },
];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatAgo(ts: number): string {
  const ms = Date.now() - ts;
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

export default function Alerts() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [condition, setCondition] = useState('tasks_queued_gt');
  const [conditionValue, setConditionValue] = useState(5);
  const [actionAgent, setActionAgent] = useState('nexus');
  const [actionMessage, setActionMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [rulesRes, alertsRes] = await Promise.all([
          fetch('/api/rules'),
          fetch('/api/alerts?limit=50'),
        ]);
        if (rulesRes.ok) setRules(await rulesRes.json());
        if (alertsRes.ok) setAlerts(await alertsRes.json());
      } catch { /* ignore */ }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          condition,
          conditionValue,
          action: 'chat',
          actionAgent,
          actionMessage: actionMessage.trim() || `Alert: ${name.trim()}`,
          enabled: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRules(prev => [...prev, data.rule]);
        setName(''); setActionMessage(''); setShowForm(false);
      }
    } finally { setCreating(false); }
  };

  const toggleRule = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    } catch { /* ignore */ }
  };

  const deleteRule = async (id: string) => {
    try {
      await fetch(`/api/rules/${id}`, { method: 'DELETE' });
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  };

  const testRule = async (id: string) => {
    try {
      await fetch(`/api/rules/${id}/test`, { method: 'POST' });
      // Refresh alerts
      const res = await fetch('/api/alerts?limit=50');
      if (res.ok) setAlerts(await res.json());
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: 'flex', gap: '12px', height: '100%', padding: '12px', overflow: 'hidden' }}>
      {/* Rules panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#e6edf3' }}>Alert Rules</span>
          <button onClick={() => setShowForm(!showForm)}
            style={{ fontSize: '11px', fontWeight: 600, color: '#58a6ff', background: '#1a2f4d', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' }}>
            + New Rule
          </button>
        </div>

        {showForm && (
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
            <form onSubmit={createRule} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Rule name"
                style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }} />

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#8b949e', flexShrink: 0 }}>If</span>
                <select value={condition} onChange={e => setCondition(e.target.value)}
                  style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }}>
                  {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input type="number" value={conditionValue} onChange={e => setConditionValue(Number(e.target.value))}
                  style={{ width: '70px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#8b949e', flexShrink: 0 }}>Then post to</span>
                <select value={actionAgent} onChange={e => setActionAgent(e.target.value)}
                  style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }}>
                  <option value="nexus">Nexus</option>
                  <option value="junior">Junior</option>
                  <option value="bgv">BGV Agent</option>
                  <option value="all">All</option>
                </select>
              </div>

              <input value={actionMessage} onChange={e => setActionMessage(e.target.value)} placeholder="Alert message (optional)"
                style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 10px', color: '#e6edf3', fontSize: '12px', outline: 'none' }} />

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ fontSize: '11px', color: '#8b949e', background: 'none', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={creating || !name.trim()}
                  style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: '#238636', border: 'none', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer' }}>
                  {creating ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>
              No alert rules configured. Create one to get started.
            </div>
          ) : (
            rules.map(rule => {
              const condLabel = CONDITIONS.find(c => c.id === rule.condition)?.label || rule.condition;
              return (
                <div key={rule.id} style={{
                  background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px 14px',
                  borderLeft: `3px solid ${rule.enabled ? '#3fb950' : '#4d5566'}`,
                  opacity: rule.enabled ? 1 : 0.6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>{rule.name}</span>
                      {rule.lastTriggered && (
                        <span style={{ fontSize: '10px', color: '#4d5566', marginLeft: '8px' }}>fired {formatAgo(rule.lastTriggered)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => testRule(rule.id)}
                        style={{ fontSize: '10px', color: '#e3b341', background: 'none', border: '1px solid #30363d', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>Test</button>
                      <button onClick={() => toggleRule(rule.id, !rule.enabled)}
                        style={{ fontSize: '10px', color: rule.enabled ? '#3fb950' : '#8b949e', background: 'none', border: '1px solid #30363d', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>
                        {rule.enabled ? 'ON' : 'OFF'}
                      </button>
                      <button onClick={() => deleteRule(rule.id)}
                        style={{ fontSize: '10px', color: '#f85149', background: 'none', border: '1px solid #30363d', borderRadius: '4px', padding: '3px 8px', cursor: 'pointer' }}>x</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>
                    If <span style={{ color: '#58a6ff' }}>{condLabel} {rule.conditionValue}</span> → post to <span style={{ color: AGENT_COLORS[rule.actionAgent] || '#e6edf3' }}>{rule.actionAgent}</span>
                  </div>
                  {rule.actionMessage && (
                    <div style={{ fontSize: '11px', color: '#4d5566', marginTop: '4px', fontStyle: 'italic' }}>"{rule.actionMessage}"</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Alert feed */}
      <div style={{ width: '340px', background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #30363d', background: '#1c2128', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Alert Feed</span>
          <span style={{ fontSize: '10px', color: alerts.length > 0 ? '#f0883e' : '#4d5566', background: alerts.length > 0 ? '#3d1f00' : '#21262d', padding: '1px 8px', borderRadius: '10px', fontFamily: 'JetBrains Mono, monospace' }}>
            {alerts.length}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#4d5566', fontSize: '12px' }}>No alerts fired yet</div>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} style={{
                background: '#0d1117', border: '1px solid #21262d', borderRadius: '6px',
                padding: '10px 12px', marginBottom: '6px',
                borderLeft: '3px solid #f0883e',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#f0883e' }}>{alert.ruleName}</span>
                  <span className="mono" style={{ fontSize: '10px', color: '#4d5566' }}>{formatTime(alert.timestamp)}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#c9d1d9' }}>{alert.message}</div>
                {alert.agent && (
                  <div style={{ fontSize: '10px', color: AGENT_COLORS[alert.agent] || '#4d5566', marginTop: '2px' }}>→ {alert.agent}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
