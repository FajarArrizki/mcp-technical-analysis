#!/bin/bash

# GearTrade Terminal Launcher
# Automatically builds and starts the terminal UI

set -e

echo "🚀 Starting GearTrade Terminal..."
echo ""

# Check if we're in the right directory
if [ ! -f "mcp.json" ]; then
    echo "❌ Error: mcp.json not found"
    echo "   Please run this script from the GEARTRADE root directory"
    exit 1
fi

# Build terminal UI if needed
if [ ! -d "packages/terminal-ui/dist" ]; then
    echo "📦 Building terminal UI..."
    cd packages/terminal-ui
    pnpm install
    pnpm run build
    cd ../..
fi

# Run terminal UI
echo "✅ Starting terminal..."
echo ""
node packages/terminal-ui/dist/cli.js



