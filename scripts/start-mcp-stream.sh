#!/bin/bash

# Start GearTrade MCP Server with HTTP Streaming
# Run this to enable SSE (Server-Sent Events) streaming

echo "🚀 Starting GearTrade MCP Server with Streaming..."
echo ""
echo "This will start the server with HTTP/SSE streaming support"
echo "Default: http://localhost:8787"
echo ""
echo "Keep this terminal open!"
echo ""

cd /root/GEARTRADE/packages/geartrade-mcp-server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "Installing tsx..."
    pnpm add -D tsx
fi

# Start streaming server
echo "🔥 Starting MCP server with streaming..."
echo ""

pnpm tsx local-server.ts

# If it exits
echo ""
echo "💡 MCP Server stopped."
echo "💡 To restart: bash scripts/start-mcp-stream.sh"
echo "💡 In another terminal, run Terminal UI: cd /root/GEARTRADE && pnpm run terminal"

