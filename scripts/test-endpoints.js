#!/usr/bin/env node

/**
 * Test script to find OpenClaw HTTP API endpoints
 */

const http = require('http');
const WebSocket = require('ws');

async function testHttpEndpoint(url, path) {
  return new Promise((resolve) => {
    const fullUrl = `${url}${path}`;
    console.log(`Testing: ${fullUrl}`);
    
    setTimeout(() => {
      if (!resolved) {
        resolve({ url: fullUrl, success: false });
      }
    }, 2000);
    
    setTimeout(async () => {
      let resolved = false;
      
      const req = http.request(url + path, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolved = true;
          console.log(`  Status: ${res.statusCode}`);
          console.log(`  Response: ${data.substring(0, 150)}`);
          resolve({ url: fullUrl, success: res.statusCode === 200, data });
        });
      });
      
      req.on('error', (err) => {
        resolved = true;
        console.log(`  Error: ${err.message}`);
        resolve({ url: fullUrl, success: false, error: err.message });
      });
      
      req.end();
    }, 0);
  });
}

async function testWebSocket(url) {
  return new Promise((resolve) => {
    console.log(`Testing WS: ${url}`);
    
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
      console.log('  ✅ Connected!');
      resolve({ url, success: true });
      
      // Send a ping to test
      ws.send(JSON.stringify({ type: 'ping' }));
    });
    
    ws.on('error', (err) => {
      console.log(`  ❌ Error: ${err.message}`);
      resolve({ url, success: false, error: err.message });
    });
    
    ws.on('close', () => {
      if (!ws.opened) {
        resolve({ url, success: false, reason: 'closed' });
      }
    });
    
    setTimeout(() => {
      ws.close();
      resolve({ url, success: false, error: 'timeout' });
    }, 3000);
  });
}

async function main() {
  const baseUrl = 'http://localhost:7891';
  const baseWsUrl = 'ws://localhost:7891/ws';
  
  console.log('🔍 Discovering OpenClaw endpoints...\n');
  
  // Test common API paths
  const paths = [
    '/api/sessions_list',
    '/api/sessions',
    '/sessions_list',
    '/sessions',
    '/health',
    '/'
  ];
  
  console.log('Testing HTTP endpoints...');
  for (const path of paths) {
    await testHttpEndpoint(baseUrl, path);
  }
  
  console.log('\nTesting WebSocket endpoints...');
  const wsPaths = ['/ws', '/websocket', '/api/ws'];
  
  for (const path of wsPaths) {
    await testWebSocket(`${baseWsUrl}${path}`);
  }
  
  console.log('\n📝 Summary: Try these commands:');
  console.log('curl -X POST http://localhost:7891/api/sessions_list');
  console.log('curl ws://localhost:7891/ws');
}

main().catch(console.error);
