#!/bin/bash
# Auto-start MCP Server for Cursor IDE - VPN & Non-VPN Compatible
# This script automatically detects network conditions and uses the best available connection

SERVER_PORT=8787
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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
echo "Using localhost configuration"
PREFERRED_URL="http://localhost:${SERVER_PORT}"

# Check if server is already running
if is_server_running "$PREFERRED_URL"; then
    SERVER_URL="$PREFERRED_URL"
    echo "[SUCCESS] MCP Server already running at ${SERVER_URL}"
else
    echo "Starting MCP Server..."

    # Start server in background using tsx to run TypeScript directly
    cd "${PROJECT_DIR}/packages/geartrade-mcp-server"
    nohup npx tsx local-server.ts > "${LOG_FILE}" 2>&1 &
    SERVER_PID=$!

    # Wait for server to be ready (max 15 seconds)
    echo "Waiting for server to start..."
    for i in {1..15}; do
        if is_server_running "$PREFERRED_URL"; then
            SERVER_URL="$PREFERRED_URL"
            echo "[SUCCESS] MCP Server started successfully (PID: ${SERVER_PID})"
            echo "[SUCCESS] Using: ${SERVER_URL}"
            break
        fi
        echo "  Loading... [${i}/15]"
        sleep 1
    done

    if [ -z "$SERVER_URL" ]; then
        echo "[ERROR] Failed to start MCP Server" >&2
        echo "Check logs: ${LOG_FILE}" >&2
        exit 1
    fi
fi

# Server is ready - output the URL for client connection
echo "[SUCCESS] MCP Server ready at: ${SERVER_URL}/mcp"
echo "[SUCCESS] Connect your MCP client to: ${SERVER_URL}/mcp"

# Keep script running to maintain server process
wait
