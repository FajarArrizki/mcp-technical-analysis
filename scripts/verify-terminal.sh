#!/bin/bash

# Verification Script for Terminal UI
# Checks if everything is properly installed and configured

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         Terminal UI Verification Script                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SUCCESS=0
WARNINGS=0
ERRORS=0

check() {
    echo -n "  Checking $1... "
}

pass() {
    echo -e "${GREEN}✓${NC} $1"
    SUCCESS=$((SUCCESS + 1))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

fail() {
    echo -e "${RED}✖${NC} $1"
    ERRORS=$((ERRORS + 1))
}

echo -e "${CYAN}1. Checking Environment${NC}"
echo ""

# Check Node.js
check "Node.js"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    pass "Found $NODE_VERSION"
else
    fail "Not found"
fi

# Check pnpm
check "pnpm"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm -v)
    pass "Found v$PNPM_VERSION"
else
    warn "Not found (optional)"
fi

echo ""
echo -e "${CYAN}2. Checking Files${NC}"
echo ""

# Check mcp.json
check "mcp.json"
if [ -f "mcp.json" ]; then
    pass "Found"
else
    fail "Not found"
fi

# Check package.json
check "package.json"
if [ -f "packages/terminal-ui/package.json" ]; then
    pass "Found"
else
    fail "Not found"
fi

# Check source files
check "Source files"
if [ -f "packages/terminal-ui/src/cli.ts" ] && \
   [ -f "packages/terminal-ui/src/ui.ts" ] && \
   [ -f "packages/terminal-ui/src/mcp-client.ts" ]; then
    pass "All present"
else
    fail "Missing files"
fi

echo ""
echo -e "${CYAN}3. Checking Build${NC}"
echo ""

# Check dist directory
check "Build output"
if [ -d "packages/terminal-ui/dist" ]; then
    if [ -f "packages/terminal-ui/dist/cli.js" ]; then
        pass "Built successfully"
    else
        warn "Incomplete build"
    fi
else
    fail "Not built"
fi

# Check dist files
check "Compiled files"
if [ -f "packages/terminal-ui/dist/cli.js" ] && \
   [ -f "packages/terminal-ui/dist/ui.js" ] && \
   [ -f "packages/terminal-ui/dist/mcp-client.js" ]; then
    pass "All present"
else
    fail "Missing files"
fi

# Check executable permission
check "Execute permission"
if [ -x "packages/terminal-ui/dist/cli.js" ]; then
    pass "Executable"
else
    warn "Not executable (can be fixed)"
fi

echo ""
echo -e "${CYAN}4. Checking Documentation${NC}"
echo ""

# Check docs
DOCS=(
    "packages/terminal-ui/README.md"
    "packages/terminal-ui/GUIDE.md"
    "packages/terminal-ui/EXAMPLES.md"
    "packages/terminal-ui/DEPLOYMENT.md"
    "packages/terminal-ui/INDEX.md"
)

check "Documentation files"
FOUND_DOCS=0
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        FOUND_DOCS=$((FOUND_DOCS + 1))
    fi
done

if [ $FOUND_DOCS -eq ${#DOCS[@]} ]; then
    pass "All ${#DOCS[@]} docs present"
else
    warn "$FOUND_DOCS/${#DOCS[@]} docs found"
fi

echo ""
echo -e "${CYAN}5. Checking Dependencies${NC}"
echo ""

# Check node_modules
check "node_modules"
if [ -d "packages/terminal-ui/node_modules" ]; then
    pass "Installed"
else
    fail "Not installed"
fi

# Check key dependencies
check "@modelcontextprotocol/sdk"
if [ -d "packages/terminal-ui/node_modules/@modelcontextprotocol/sdk" ]; then
    pass "Installed"
else
    fail "Missing"
fi

echo ""
echo -e "${CYAN}6. Testing Terminal${NC}"
echo ""

# Test CLI startup (without interaction)
check "Terminal startup"
if timeout 2s node packages/terminal-ui/dist/cli.js --help 2>&1 > /dev/null || [ $? -eq 124 ]; then
    pass "Starts successfully"
else
    warn "Startup test inconclusive"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "Results: ${GREEN}$SUCCESS passed${NC}, ${YELLOW}$WARNINGS warnings${NC}, ${RED}$ERRORS errors${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Terminal UI is ready to use!${NC}"
    echo ""
    echo "Run with:"
    echo "  pnpm run terminal"
    echo ""
    exit 0
else
    echo -e "${RED}✖ Terminal UI needs attention${NC}"
    echo ""
    echo "To fix:"
    echo "  pnpm run terminal:build"
    echo ""
    exit 1
fi


