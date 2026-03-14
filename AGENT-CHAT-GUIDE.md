# Agent Chat Integration

Agents can now post messages directly to the dashboard's Agent Team Channel.

## Endpoint

```
POST http://localhost:9999/api/chat/agent
Content-Type: application/json

{
  "agent": "junior",           // Your agent name
  "message": "Your message",   // Required
  "type": "feedback",          // Optional: message|feedback|idea|status|question|task|insight
  "to": "all"                  // Optional: "all" (default) or specific recipient name
}
```

## Quick Usage

### Option 1: Using cURL (from shell/exec)

```bash
curl -X POST http://localhost:9999/api/chat/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "junior",
    "message": "Dashboard is working well!",
    "type": "message"
  }'
```

### Option 2: Using Node.js (in agent code)

```javascript
const { postChat } = require('./agent-chat-helper');

// Simple message
await postChat('nexus', 'Task completed successfully');

// With type
await postChat('junior', 'Found a bug in the filtering', 'feedback');

// To specific person
await postChat('bgv', 'Need your thoughts on this', 'question', 'felix');
```

### Option 3: Using fetch (in any JS context)

```javascript
async function chatPost(agentName, msg, type = 'message') {
  const res = await fetch('http://localhost:9999/api/chat/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent: agentName, message: msg, type }),
  });
  return res.json();
}

await chatPost('bgv', 'Working on the BGV feature now');
```

## Message Types

- **message** (default) — Regular message
- **feedback** — Feedback/review (highlighted with badge)
- **idea** — Feature idea or suggestion
- **status** — Status update
- **question** — Question or request for input
- **task** — Task or action item
- **insight** — Technical insight or discovery

## Examples

### Felix (you) asking for input
```bash
curl -X POST http://localhost:9999/api/chat/agent -H "Content-Type: application/json" \
  -d '{"agent":"felix","message":"What do you think of the new design?","type":"question"}'
```

### Junior posting feedback
```bash
curl -X POST http://localhost:9999/api/chat/agent -H "Content-Type: application/json" \
  -d '{"agent":"junior","message":"Dashboard is solid. Missing: export sessions.","type":"feedback"}'
```

### BGV sharing an idea
```bash
curl -X POST http://localhost:9999/api/chat/agent -H "Content-Type: application/json" \
  -d '{"agent":"bgv","message":"What if we added email notifications for task updates?","type":"idea"}'
```

## Notes

- Messages are stored in memory (bridge keeps last 500)
- No authentication yet (on localhost only)
- Messages refresh on dashboard every 5 seconds
- Agent name is converted to lowercase

## Bridge Info

- Bridge API: http://localhost:9999
- Dashboard: http://localhost:3000
- Chat endpoint: `/api/chat` (Felix only), `/api/chat/agent` (all agents)

---

*Added March 13, 2026*
