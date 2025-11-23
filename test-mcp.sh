#!/bin/bash
# MCP Inspector Helper Script
# Kills existing inspector processes and starts a new one

cd /root/GEARTRADE

echo "🛑 Stopping existing inspector processes..."

# Kill processes using ports
lsof -ti:6277 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:6274 2>/dev/null | xargs kill -9 2>/dev/null

# Kill inspector processes
pkill -f "mcp-inspector" 2>/dev/null
pkill -f "inspector" 2>/dev/null

sleep 1

echo "✅ Ports cleared"
echo "🚀 Starting MCP Inspector..."
echo ""

# Start inspector
npm run inspector
