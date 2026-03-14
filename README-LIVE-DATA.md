# Dashboard Live Data Integration

## Overview

The dashboard now pulls live data from OpenClaw CLI and displays real-time information about agents, sessions, and tasks.

## Components

### 1. Bridge Server (`openclaw-bridge.js`)
A Node.js/Express server that:
- Polls `openclaw sessions --json --all-agents` every 10 seconds
- Reads `agent-tasks.jsonl` from the workspace
- Exposes REST API endpoints for the frontend

**Port:** 9999
**Endpoints:**
- `GET /api/agents` - Agent list with session counts and status
- `GET /api/sessions` - All active sessions
- `GET /api/tasks` - Tasks from agent-tasks.jsonl
- `GET /api/health` - Bridge health and poll stats

### 2. Frontend Hooks

**`useAgentData(refreshMs)`**
```typescript
const { agents, sessions, health, connected, loading, lastRefresh } = useAgentData(5000);
```
Polls `/api/agents`, `/api/sessions`, `/api/health` every 5 seconds (default).

**`useTasks(refreshMs)`**
```typescript
const { tasks } = useTasks(5000);
```
Polls `/api/tasks` every 5 seconds (default).

### 3. Vite Proxy Configuration
The dev server proxies `/api` requests to `http://localhost:9999`:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:9999',
      changeOrigin: true,
    }
  }
}
```

## Running

### Quick Start
```bash
./start-dashboard.sh
```
This starts both the bridge and dev server, opening http://localhost:3000

### Manual Start

**Terminal 1 - Bridge:**
```bash
cd /Users/bgvai/.openclaw/workspace-nexus/dashboard
node openclaw-bridge.js
```

**Terminal 2 - Frontend:**
```bash
cd /Users/bgvai/.openclaw/workspace-nexus/dashboard
npm run dev
```

## Data Flow

```
OpenClaw CLI
    ↓
Bridge Server (polls every 10s)
    ├── openclaw sessions --json --all-agents → /api/sessions
    ├── openclaw status --json → (for future use)
    └── agent-tasks.jsonl → /api/tasks
    ↓
Vite Proxy (dev server)
    ├── Frontend hooks (useAgentData, useTasks)
    └── Dashboard UI
```

## Key Transformations

### Sessions → SessionRows
Raw OpenClaw session format transformed to include:
- Session key (e.g., "agent:nexus:telegram:direct:8325999298")
- Agent name
- Channel (telegram, discord, etc.)
- Kind (direct, group, thread)
- Last updated timestamp + formatted age label

### Sessions → Agents
Session data aggregated per agent:
- Session count
- Last active timestamp
- Status (active if < 5 min, idle otherwise)
- Formatted age label

### Tasks
Loaded from `agent-tasks.jsonl` with minimal transformation:
- Each line is a JSON task object
- Already formatted for task board display
- Retains full metadata (startedAt, completedAt, tags)

## Performance Notes

- Bridge polls every 10 seconds (configurable via setInterval)
- Frontend polls every 5 seconds (configurable in hooks)
- Each poll hits OpenClaw CLI (< 100ms typical)
- Task file is read fresh each poll (~1ms)
- API responses cached in memory between polls

## Future Enhancements

### WebSocket Real-Time (Optional)
Replace polling with WebSocket connection to gateway for instant updates:
```typescript
const ws = new WebSocket('ws://localhost:9999/ws');
ws.onmessage = (event) => updateDashboard(event.data);
```

### Task Mutations
Add endpoints to create/update tasks:
```typescript
POST /api/tasks - Create new task
PUT /api/tasks/:id - Update task status
POST /api/tasks/:id/complete - Mark complete
```

### Persistent Storage
Save bridge data to SQLite or PostgreSQL for historical queries.

### Auth
Secure bridge API with token or API key.

---

*Last updated: March 13, 2026*
