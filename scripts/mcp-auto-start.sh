#!/bin/bash
# Auto-start MCP Server for Cursor IDE - VPN & Non-VPN Compatible
# This script automatically detects network conditions and uses the best available connection

SERVER_PORT=8787
PROJECT_DIR="/root/GEARTRADE"
LOG_FILE="${PROJECT_DIR}/logs/mcp-server.log"

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

# Function to check if server is running on specific URL
is_server_running() {
    local url="$1"
    curl -s --max-time 3 "${url}/health" > /dev/null 2>&1
    return $?
}

# Always use localhost - simplified configuration
echo "🌐 Using localhost configuration" >&2
PREFERRED_URL="http://localhost:${SERVER_PORT}"

# Check if server is already running
if is_server_running "$PREFERRED_URL"; then
    SERVER_URL="$PREFERRED_URL"
    echo "✅ MCP Server already running at ${SERVER_URL}" >&2
else
    echo "🚀 Starting MCP Server..." >&2

    # Start server in background
    cd "${PROJECT_DIR}/packages/geartrade-mcp-server"
    nohup pnpm tsx local-server.ts > "${LOG_FILE}" 2>&1 &
    SERVER_PID=$!

    # Wait for server to be ready (max 15 seconds)
    echo "⏳ Waiting for server to start..." >&2
    for i in {1..30}; do
        if is_server_running "$PREFERRED_URL"; then
            SERVER_URL="$PREFERRED_URL"
            echo "✅ MCP Server started successfully (PID: ${SERVER_PID})" >&2
            echo "🌐 Using: ${SERVER_URL}" >&2
            break
        fi
        sleep 0.5
    done

    if [ -z "$SERVER_URL" ]; then
        echo "❌ Failed to start MCP Server" >&2
        echo "📋 Check logs: ${LOG_FILE}" >&2
        exit 1
    fi
fi

# Connect via mcp-remote
echo "🔗 Connecting to MCP server..." >&2
exec npx -y mcp-remote "${SERVER_URL}/mcp"
