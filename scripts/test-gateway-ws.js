#!/usr/bin/env node

/**
 * Test script to probe OpenClaw gateway WebSocket endpoints
 * Run: node scripts/test-gateway-ws.js
 */

const WebSocket = require('ws');

const testUrls = [
  'ws://localhost:7891/websocket',
  'ws://localhost:7891/ws',
  'ws://localhost:7891/api/ws',
  'wss://gateway.openclaw.ai/ws',
];

console.log('🔍 Testing OpenClaw gateway WebSocket endpoints...\n');

let connected = false;
let connectionInfo = null;

async function testConnection(url) {
  return new Promise((resolve, reject) => {
    console.log(`Testing: ${url}`);
    
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
      console.log(`✅ Connected to: ${url}`);
      connected = true;
      connectionInfo = url;
      
      // Send a test ping to see response format
      ws.send(JSON.stringify({ type: 'ping' }));
      
      setTimeout(() => {
        ws.close();
        resolve({ url, success: true });
      }, 2000);
    });
    
    ws.on('message', (data) => {
      console.log(`📨 Received: ${data.toString()}`);
    });
    
    ws.on('error', (error) => {
      console.error(`❌ Error connecting to ${url}:`, error.message);
    });
    
    ws.on('close', () => {
      if (!connectionInfo && url === testUrls[testUrls.length - 1]) {
        resolve({ success: false, message: 'No connections successful' });
      }
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        resolve({ url, success: false, error: 'Timeout' });
      }
    }, 5000);
  });
}

async function main() {
  for (const url of testUrls) {
    const result = await testConnection(url);
    if (result.success && connected) break;
    console.log('');
  }
  
  if (!connected) {
    console.log('\n❌ No WebSocket endpoints found. Trying alternative approach...');
    console.log('Suggested next steps:');
    console.log('1. Check if OpenClaw CLI has gateway connection commands');
    console.log('2. Look for environment variables like OPENCLAW_GATEWAY_URL');
    console.log('3. Search existing codebase for WebSocket patterns');
  }
}

main().catch(console.error);
