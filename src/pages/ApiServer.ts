import { Router } from 'express'
import cors from 'cors'
import sessionStatus from '../api/session_status.js'

const router = Router()

// Enable CORS for the dashboard frontend
router.use(cors())

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/**
 * Get all agent sessions with their status
 */
router.get('/sessions', async (req, res) => {
  try {
    const response = await sessionStatus('')
    res.json(response.data)
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ error: 'Failed to fetch agent sessions' })
  }
})

/**
 * Get specific session details
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const response = await sessionStatus(req.params.sessionId)
    res.json(response.data)
  } catch (error) {
    console.error(`Error fetching session ${req.params.sessionId}:`, error)
    res.status(500).json({ error: 'Failed to fetch session details' })
  }
})

/**
 * Get tasks filtered by agent and status
 */
router.get('/tasks', async (req, res) => {
  try {
    const sessionId = req.query.agent as string || ''
    const response = await sessionStatus(sessionId)
    
    // Transform OpenClaw session data into task objects for Kanban board
    const tasks = response.data?.sessions?.map((session: any, index: number) => ({
      id: session.session_id,
      title: `Session ${index + 1}`.replace(/session-/gi, ''),
      status: session.status || 'todo',
      agent: session.agent_name || 'Unknown Agent',
      description: session.tasks?.[0]?.description || 'No description available'
    })) || []
    
    res.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

/**
 * Get workspace files for a specific session/agent
 */
router.get('/workspace', async (req, res) => {
  try {
    const agent = req.query.agent as string || ''
    // This would integrate with filesystem or memory API
    // For now, return placeholder structure
    const response = {
      files: [
        { name: 'memory/', type: 'folder' },
        { name: 'learnings/', type: 'folder' },
        { name: 'agents/', type: 'folder', children: [
          { name: `${agent}/`, type: 'folder' }
        ]}
      ]
    }
    res.json(response)
  } catch (error) {
    console.error('Error fetching workspace:', error)
    res.status(500).json({ error: 'Failed to fetch workspace' })
  }
})

/**
 * Get task details with full audit trail
 */
router.get('/task/:taskId', async (req, res) => {
  try {
    const response = await sessionStatus(req.params.taskId)
    
    // Extract timeline/audit trail from session data
    const timeline: any[] = []
    if (response.data?.tasks) {
      response.data.tasks.forEach((task: any, idx: number) => {
        timeline.push({
          time: task.timestamp || `Step ${idx}`,
          action: task.action || 'Task step',
          agent: task.agent || 'Unknown',
          details: task.description
        })
      })
    }
    
    res.json({
      ...response.data,
      timeline
    })
  } catch (error) {
    console.error(`Error fetching task ${req.params.taskId}:`, error)
    res.status(500).json({ error: 'Failed to fetch task details' })
  }
})

/**
 * Stop a session
 */
router.post('/sessions/:sessionId/stop', async (req, res) => {
  try {
    const response = await stopSession(req.params.sessionId)
    res.json(response.data)
  } catch (error) {
    console.error(`Error stopping session ${req.params.sessionId}:`, error)
    res.status(500).json({ error: 'Failed to stop session' })
  }
})

/**
 * Pause a session
 */
router.post('/sessions/:sessionId/pause', async (req, res) => {
  try {
    // Would integrate with pauseSession API
    res.json({ success: true, message: 'Session paused' })
  } catch (error) {
    console.error(`Error pausing session ${req.params.sessionId}:`, error)
    res.status(500).json({ error: 'Failed to pause session' })
  }
})

/**
 * Resume a session
 */
router.post('/sessions/:sessionId/resume', async (req, res) => {
  try {
    // Would integrate with resumeSession API
    res.json({ success: true, message: 'Session resumed' })
  } catch (error) {
    console.error(`Error resuming session ${req.params.sessionId}:`, error)
    res.status(500).json({ error: 'Failed to resume session' })
  }
})

export default router
