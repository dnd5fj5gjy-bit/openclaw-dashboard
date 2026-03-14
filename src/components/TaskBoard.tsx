import { useState } from 'react';
import { AgentTask } from '../hooks/useTasks';

interface Props {
  tasks: AgentTask[];
}

const AGENT_META: Record<string, { icon: string; color: string }> = {
  nexus:  { icon: '⬡', color: '#58a6ff' },
  junior: { icon: '◈', color: '#39d3c3' },
  bgv:    { icon: '◉', color: '#3fb950' },
};

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: '#3fb950',
    bg: '#1a4427',
    dotColor: '#3fb950',
    headerBg: 'linear-gradient(135deg, #1a4427 0%, #12301a 100%)',
  },
  queued: {
    label: 'Queued',
    color: '#58a6ff',
    bg: '#1a2f4d',
    dotColor: '#58a6ff',
    headerBg: 'linear-gradient(135deg, #1a2f4d 0%, #0f1e33 100%)',
  },
  done: {
    label: 'Done',
    color: '#4d5566',
    bg: '#21262d',
    dotColor: '#4d5566',
    headerBg: 'linear-gradient(135deg, #21262d 0%, #161b22 100%)',
  },
};

function formatAgo(ms: number): string {
  if (!ms) return '—';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function TaskCard({ task }: { task: AgentTask }) {
  const meta = AGENT_META[task.agent.toLowerCase()] || { icon: '◌', color: '#8b949e' };
  const sc = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.queued;
  const elapsed = task.status === 'active' ? formatAgo(task.startedAt) : null;
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const claimTask = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      await fetch(`/api/tasks/${encodeURIComponent(task.id)}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'nexus' }),
      });
      setClaimed(true);
    } catch (err) {
      console.error('Claim failed', err);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`task-card status-${task.status} fade-in`}>
      {/* Agent + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: meta.color, fontSize: '13px' }}>{meta.icon}</span>
          <span style={{
            fontSize: '11px', fontWeight: 600, color: meta.color,
            textTransform: 'capitalize',
          }}>
            {task.agent}
          </span>
        </div>
        {elapsed && (
          <span className="mono" style={{ fontSize: '10px', color: '#4d5566' }}>
            {elapsed}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#e6edf3', marginBottom: '4px', lineHeight: '1.4' }}>
        {task.title}
      </div>

      {/* Description */}
      {task.description && (
        <div style={{ fontSize: '11px', color: '#8b949e', lineHeight: '1.5', marginBottom: '8px' }}>
          {task.description.length > 100 ? task.description.slice(0, 97) + '…' : task.description}
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {task.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '10px',
                color: '#4d5566',
                background: '#21262d',
                padding: '1px 7px',
                borderRadius: '10px',
                border: '1px solid #30363d',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '8px' }}>
        {task.status === 'queued' && (
          <button
            onClick={claimTask}
            disabled={claiming || claimed}
            style={{
              fontSize: '11px', fontWeight: 600,
              color: claimed ? '#3fb950' : '#58a6ff',
              background: 'none', border: '1px solid #30363d', padding: '6px 10px', borderRadius: '6px', cursor: claiming ? 'wait' : 'pointer'
            }}
          >
            {claiming ? 'Claiming…' : claimed ? 'Claimed' : 'Claim'}
          </button>
        )}
        {task.status === 'done' && task.completedAt && (
          <div style={{ fontSize: '10px', color: '#4d5566' }}>
            Completed {formatAgo(task.completedAt)}
          </div>
        )}
      </div>
    </div>
  );
}

function Column({
  status, tasks,
}: {
  status: 'active' | 'queued' | 'done';
  tasks: AgentTask[];
}) {
  const sc = STATUS_CONFIG[status];

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0,
    }}>
      {/* Column header */}
      <div style={{
        background: '#1c2128',
        borderBottom: '1px solid #30363d',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot" style={{
            background: sc.dotColor,
            boxShadow: status === 'active' ? `0 0 6px ${sc.dotColor}80` : 'none',
            animation: status === 'active' ? 'pulse-glow 2s infinite' : 'none',
          }} />
          <span style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: sc.color,
          }}>
            {sc.label}
          </span>
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: sc.color,
          background: sc.bg, padding: '1px 8px', borderRadius: '10px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {tasks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 12px',
            color: '#4d5566', fontSize: '12px',
          }}>
            {status === 'active' ? 'No active tasks' :
             status === 'queued' ? 'Queue is clear' :
             'No completed tasks yet'}
          </div>
        ) : (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks }: Props) {
  const [showAllDone, setShowAllDone] = useState(false);

  const active = tasks.filter(t => t.status === 'active');
  const queued = tasks.filter(t => t.status === 'queued');
  const done   = tasks.filter(t => t.status === 'done');
  const displayDone = showAllDone ? done : done.slice(0, 10); // show 10 by default, all if expanded

  return (
    <div className="panel h-full" style={{ overflow: 'hidden' }}>
      <div className="panel-header">
        <span className="panel-title">Task Board</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="panel-badge">{tasks.length} total</span>
          {done.length > 10 && (
            <button
              onClick={() => setShowAllDone(!showAllDone)}
              style={{
                fontSize: '10px', fontWeight: 600,
                color: showAllDone ? '#3fb950' : '#4d5566',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '2px 6px', borderRadius: '4px',
                transition: 'color 0.15s',
              }}
              onMouseOver={(e) => {
                if (!showAllDone) (e.target as HTMLElement).style.color = '#58a6ff';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLElement).style.color = showAllDone ? '#3fb950' : '#4d5566';
              }}
            >
              {showAllDone ? `Hide (${done.length} total)` : `Show all (${done.length})`}
            </button>
          )}
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
        padding: '10px',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <Column status="active" tasks={active} />
        <Column status="queued" tasks={queued} />
        <Column status="done"   tasks={displayDone} />
      </div>
    </div>
  );
}
