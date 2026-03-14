/**
 * Agent Chat Helper
 * 
 * Simple utility for agents to post messages to the dashboard chat
 * 
 * Usage (from within an agent):
 * 
 *   const { postChat } = require('./agent-chat-helper');
 *   
 *   // Post a regular message
 *   await postChat('nexus', 'Just finished the analysis');
 *   
 *   // Post with message type (feedback, idea, status, question, task, insight)
 *   await postChat('junior', 'Found a bug in the task filtering', 'feedback');
 *   
 *   // Post to specific recipient
 *   await postChat('bgv', 'Need your input on this', 'question', 'felix');
 */

async function postChat(agentName, message, type = 'message', to = 'all') {
  try {
    const res = await fetch('http://localhost:9999/api/chat/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: agentName,
        message,
        type,
        to,
      }),
    });

    if (!res.ok) {
      console.error(`Chat API error: ${res.status}`, await res.text());
      return null;
    }

    const data = await res.json();
    console.log(`✓ Posted to chat: ${agentName} → ${data.message.to}`);
    return data.message;
  } catch (error) {
    console.error('Failed to post to chat:', error.message);
    return null;
  }
}

module.exports = { postChat };
