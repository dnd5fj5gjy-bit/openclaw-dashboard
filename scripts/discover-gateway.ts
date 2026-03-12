#!/usr/bin/env node

/**
 * Discover and test OpenClaw gateway connections
 */

import WebSocket from 'ws';

const gatewayUrls = [
  'ws://localhost:7891/ws',
  'ws://localhost:7891/websocket',
  'ws://localhost:7891/api/ws',
];

console.log('🔍 Testing OpenClaw gateway WebSocket connections...\n');

async function testConnection(url) {
  return new Promise((resolve) => {
    console.log(`Testing: ${url}`);
    
    const ws = new WebSocket(url);
    let receivedMessages = [];
    
    ws.on('open', () => {
      console.log('✅ Connected');
      
      // Try various subscription patterns
      const attempts = [
        JSON.stringify({ type: 'ping' }),
        JSON.stringify({ type: 'subscribe', channels: ['*'] }),
        JSON.stringify({ event: 'all' }),
      ];
      
      let attemptIndex = 0;
      
      function tryNextAttempt() {
        if (attemptIndex < attempts.length) {
          ws.send(attempts[attemptIndex]);
          attemptIndex++;
          setTimeout(tryNextAttempt, 500);
        }
      }
      
      tryNextAttempt();
    });
    
    ws.on('message', (data) => {
      const msg = data.toString();
      receivedMessages.push(msg);
      console.log('📨 Received:', msg.substring(0, 100));
    });
    
    ws.on('error', (err) => {
      console.error('❌ Error:', err.message);
      resolve({ url, success: false, error: err.message, messages: receivedMessages });
    });
    
    ws.on('close', () => {
      if (receivedMessages.length > 0) {
        const sample = JSON.parse(receivedMessages[0]);
        console.log('\n📊 Sample message type:', sample.type);
        console.log('Sample payload keys:', Object.keys(sample.payload || {}));
      }
      resolve({ url, success: false, messages: receivedMessages });
    });
    
    // Timeout after 8 seconds
    setTimeout(() => {
      ws.close();
      if (receivedMessages.length === 0) {
        console.log('❌ No response received');
      } else {
        const sample = JSON.parse(receivedMessages[0]);
        console.log('\n📊 Sample message type:', sample.type);
        console.log('Sample payload keys:', Object.keys(sample.payload || {}));
      }
      resolve({ url, success: false, messages: receivedMessages });
    }, 8000);
  });
}

async function main() {
  for (const url of gatewayUrls) {
    const result = await testConnection(url);
    console.log('');
    
    if (result.messages.length > 0) {
      console.log(`✅ SUCCESSFUL CONNECTION TO: ${url}`);
      console.log('📡 This is the endpoint to use!\n');
      break;
    }
  }
  
  console.log('📝 Discovery Complete. Here are your options:\n');
  console.log('1. Use a successful connection URL (if any)');
  console.log('2. Fall back to polling OpenClaw tool invocations');
  console.log('3. Check if OpenClaw CLI has gateway connection commands\n');
  
  // Suggested next steps
  console.log('🎯 Recommended next steps:');
  console.log('- If you found a working URL, I can implement the WebSocket bridge');
  console.log('- Or we can use the existing `sessions_list` tool with polling (simpler, works now)');
}

main().catch(console.error);
