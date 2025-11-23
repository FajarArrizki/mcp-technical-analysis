#!/bin/bash
# MCP Inspector Wrapper Script
# This script ensures proper path resolution for MCP Inspector

cd "$(dirname "$0")/.."
SCRIPT_DIR="$(pwd)"

# Use absolute path to tsx
TSX_PATH="${SCRIPT_DIR}/node_modules/.bin/tsx"
MCP_SERVER="${SCRIPT_DIR}/src/mcp-server/index.ts"

if [ ! -f "$TSX_PATH" ]; then
  echo "Error: tsx not found at $TSX_PATH"
  echo "Please run: npm install"
  exit 1
fi

if [ ! -f "$MCP_SERVER" ]; then
  echo "Error: MCP server not found at $MCP_SERVER"
  exit 1
fi

# Run MCP Inspector with absolute paths
exec npx @modelcontextprotocol/inspector "$TSX_PATH" "$MCP_SERVER"

