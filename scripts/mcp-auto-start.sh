#!/bin/bash
# Auto-start MCP Server for Cursor IDE
# This script checks if server is running, starts it if needed, then connects via mcp-remote

SERVER_PORT=8787
SERVER_URL="http://localhost:${SERVER_PORT}"
PROJECT_DIR="/root/GEARTRADE"
LOG_FILE="${PROJECT_DIR}/logs/mcp-server.log"

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

# Function to check if server is running
is_server_running() {
    curl -s "${SERVER_URL}/health" > /dev/null 2>&1
    return $?
}

# Check if server is already running
if is_server_running; then
    echo "✅ MCP Server already running at ${SERVER_URL}" >&2
else
    echo "🚀 Starting MCP Server..." >&2
    
    # Start server in background
    cd "${PROJECT_DIR}/packages/geartrade-mcp-server"
    nohup pnpm tsx local-server.ts > "${LOG_FILE}" 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready (max 10 seconds)
    for i in {1..20}; do
        if is_server_running; then
            echo "✅ MCP Server started successfully (PID: ${SERVER_PID})" >&2
            break
        fi
        sleep 0.5
    done
    
    if ! is_server_running; then
        echo "❌ Failed to start MCP Server" >&2
        exit 1
    fi
fi

# Connect via mcp-remote
exec npx -y mcp-remote "${SERVER_URL}/mcp"
