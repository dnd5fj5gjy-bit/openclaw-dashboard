#!/bin/bash

# Dashboard startup script
# Starts both the bridge server and the dev frontend

set -e

DASHBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DASHBOARD_DIR"

echo "🚀 Starting OpenClaw Dashboard..."
echo ""

# Start bridge server in background
echo "1️⃣  Starting bridge server on port 9999..."
node openclaw-bridge.js &
BRIDGE_PID=$!
sleep 2

# Check if bridge is running
if kill -0 $BRIDGE_PID 2>/dev/null; then
  echo "   ✅ Bridge running (PID $BRIDGE_PID)"
else
  echo "   ❌ Bridge failed to start"
  exit 1
fi

echo ""
echo "2️⃣  Starting frontend dev server on port 3000..."
echo "   Open: http://localhost:3000"
echo ""
echo "To stop: Press Ctrl+C (will terminate both servers)"
echo ""

# Start dev server
npm run dev

# When dev server exits, kill the bridge too
kill $BRIDGE_PID 2>/dev/null || true
