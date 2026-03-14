# OpenClaw Dashboard — Deploy & Run Guide

## Quick Start (Local)

```bash
cd ~/.openclaw/workspace-nexus/dashboard

# Start the bridge server (polls OpenClaw CLI, serves API on :9999)
node openclaw-bridge.js &

# Start the Vite dev server (serves frontend on :3000, proxies /api → :9999)
npm run dev
```

Or use the combined launcher:
```bash
bash start-dashboard.sh
```

## Production Build

```bash
cd ~/.openclaw/workspace-nexus/dashboard
npm run build          # outputs to dist/
npm run preview        # preview build locally
```

For Vercel: push to `master` — auto-deploys via `vercel.json` config.

## Bridge API Endpoints

### Core
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents with status + session counts |
| GET | `/api/sessions` | All sessions (filter: `?agent=`, `?channel=`, `?kind=`) |
| GET | `/api/tasks` | Tasks from JSONL (filter: `?agent=`, `?status=`, `?tag=`, `?project=`) |
| GET | `/api/health` | Bridge health stats |

### Task Lifecycle
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Create task `{title, description, agent, tags, project}` |
| PUT | `/api/tasks/:id` | Update task `{status, agent, title, ...}` |
| POST | `/api/tasks/:id/assign` | Claim task `{agent}` — sets status to active |
| PUT | `/api/tasks/:id/project` | Assign to project `{project}` |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat?limit=60` | Recent chat messages |
| POST | `/api/chat` | Send message `{from, to, message, type}` |
| POST | `/api/chat/agent` | Agent posts `{agent, message, type}` |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project `{name, color}` |
| DELETE | `/api/projects/:id` | Delete project |

### Calendar / Reminders
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reminders` | List all reminders |
| POST | `/api/reminders` | Schedule reminder `{title, message, agent, scheduledAt}` |
| DELETE | `/api/reminders/:id` | Cancel reminder |

### Docs / Memories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/memories/:agent` | Agent memory files (parsed frontmatter) |
| GET | `/api/skills` | SKILL.md files from skills directory |
| GET | `/api/sessions/:id/replay?limit=20` | Session message replay |

### Alert Rules
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rules` | List alert rules |
| POST | `/api/rules` | Create rule `{name, condition, conditionValue, actionAgent, actionMessage}` |
| PUT | `/api/rules/:id` | Update rule `{enabled, ...}` |
| DELETE | `/api/rules/:id` | Delete rule |
| POST | `/api/rules/:id/test` | Force-fire rule (test alert) |
| GET | `/api/alerts?limit=50` | Alert feed |

### Audit
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events?agent=&type=&limit=100` | Audit log |

## Persistent Worker

The bridge runs as a long-lived Node process. To keep it alive:

```bash
# Run in background with nohup
nohup node openclaw-bridge.js > /tmp/openclaw-bridge.log 2>&1 &

# Or use the LaunchAgent (auto-starts on boot)
# Located at: ~/Library/LaunchAgents/ai.openclaw.dashboard.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.dashboard.plist

# Stop it
launchctl unload ~/Library/LaunchAgents/ai.openclaw.dashboard.plist
kill $(pgrep -f openclaw-bridge)
```

## Helper Commands

```bash
# Run tests
cd dashboard && npm test

# Build
cd dashboard && npm run build

# Run bridge locally
node openclaw-bridge.js

# Create branch & commit
git checkout -b feat/taskboard-complete
git add . && git commit -m "TaskBoard: claim/work/complete + audit"
git push origin feat/taskboard-complete
gh pr create --title "TaskBoard: claim/work/complete" --body "Implements full task lifecycle"
```
