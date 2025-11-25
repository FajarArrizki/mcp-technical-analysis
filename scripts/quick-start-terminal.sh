#!/bin/bash

# Quick Start Script for GearTrade Terminal UI
# This script checks, installs, builds, and runs the terminal

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          GearTrade Terminal UI - Quick Start                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "mcp.json" ]; then
    echo -e "${RED}❌ Error: mcp.json not found${NC}"
    echo "   Please run this script from the GEARTRADE root directory"
    exit 1
fi

echo -e "${CYAN}📦 Checking dependencies...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js version too old: $(node -v)${NC}"
    echo "   Please upgrade to Node.js 20+ from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠ pnpm not found, installing...${NC}"
    npm install -g pnpm
fi

echo -e "${GREEN}✓ pnpm detected${NC}"

# Check if terminal-ui is built
if [ ! -d "packages/terminal-ui/dist" ]; then
    echo ""
    echo -e "${CYAN}🔨 Building terminal UI for the first time...${NC}"
    echo ""
    
    cd packages/terminal-ui
    
    # Install dependencies
    echo -e "${CYAN}📦 Installing dependencies...${NC}"
    pnpm install
    
    # Build
    echo -e "${CYAN}🔨 Building...${NC}"
    pnpm run build
    
    cd ../..
    
    echo ""
    echo -e "${GREEN}✓ Terminal UI built successfully${NC}"
else
    echo -e "${GREEN}✓ Terminal UI already built${NC}"
fi

# Check if MCP server is built
if [ ! -d "packages/geartrade-mcp-server/dist" ]; then
    echo ""
    echo -e "${YELLOW}⚠ MCP server not built yet${NC}"
    echo -e "${CYAN}Building MCP server...${NC}"
    
    cd packages/geartrade-mcp-server
    pnpm install
    pnpm run build
    cd ../..
    
    echo -e "${GREEN}✓ MCP server built${NC}"
fi

echo ""
echo -e "${CYAN}🚀 Starting GearTrade Terminal...${NC}"
echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""

# Run terminal
node packages/terminal-ui/dist/cli.js

echo ""
echo "────────────────────────────────────────────────────────────────"
echo ""
echo -e "${GREEN}Thanks for using GearTrade Terminal! 👋${NC}"



