#!/bin/bash
# MCP Inspector Helper Script
# Kills existing inspector processes and starts a new one

cd /root/GEARTRADE

echo "🛑 Stopping existing inspector processes..."

# Kill semua proses inspector
pkill -f "mcp-inspector|inspector" 2>/dev/null

# Kill processes using ports
lsof -ti:6277 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:6274 2>/dev/null | xargs kill -9 2>/dev/null

# Kill inspector processes (double check)
pkill -f "mcp-inspector" 2>/dev/null
pkill -f "inspector" 2>/dev/null

sleep 2

echo "✅ Ports cleared"
echo "🚀 Starting MCP Inspector..."
echo ""

# Restart inspector
npm run inspector
