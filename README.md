# GearTrade MCP Server

Model Context Protocol (MCP) server for autonomous AI trading on Hyperliquid.

## Overview

GearTrade MCP Server exposes trading functionality through the Model Context Protocol, allowing AI agents to:
- Generate trading signals using technical analysis and AI
- Get real-time market data
- Manage trading positions
- Run trading cycles
- Monitor performance metrics

## Installation

```bash
npm install
```

## Configuration

Set the following environment variables:

```bash
# AI Provider Configuration
AI_PROVIDER=openrouter  # or zai, anthropic, etc.
AI_PROVIDER_API_KEY=your_api_key_here
MODEL_ID=anthropic/claude-3-5-sonnet  # or glm-4.5, etc.

# Hyperliquid Configuration
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_WALLET_ADDRESS=0x...
HYPERLIQUID_ACCOUNT_ADDRESS=0x...

# Trading Configuration
CYCLE_INTERVAL_MS=10000
PAPER_CAPITAL=10000
TOP_ASSETS_FOR_AI=15
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Testing with MCP Inspector

Test the MCP server using the MCP Inspector tool:

```bash
npm run inspector
```

This will:
1. Start the MCP Inspector web interface
2. Connect to the GearTrade MCP server
3. Allow you to test all tools and resources interactively

The inspector will open in your browser at `http://localhost:6274` (or similar port).

**Troubleshooting:**

1. **"PORT IS IN USE" error:**
   ```bash
   lsof -ti:6274 | xargs kill -9
   lsof -ti:6277 | xargs kill -9
   ```

2. **"Command not found" error:**
   - Make sure dependencies are installed: `npm install`
   - Check that `tsx` exists: `ls node_modules/.bin/tsx`

3. **"Cannot find package @modelcontextprotocol/sdk" error:**
   ```bash
   npm install @modelcontextprotocol/sdk@latest
   npm install
   ```

4. **Connection error to MCP Inspector Proxy:**
   - Make sure MCP server can run: `node_modules/.bin/tsx src/mcp-server/index.ts`
   - Check that wrapper script has execute permissions: `chmod +x scripts/run-mcp-inspector.sh`
   - Verify `.env` file is configured with required API keys

5. **Test MCP server directly:**
   ```bash
   # Should output: "GearTrade MCP Server running on stdio"
   node_modules/.bin/tsx src/mcp-server/index.ts
   ```

**Note:** Make sure you have set up your `.env` file with required API keys before testing:
- `OPENROUTER_API_KEY` or `AI_PROVIDER_API_KEY`
- `MODEL_ID`
- `HYPERLIQUID_API_URL` (optional, has default)

## MCP Tools

The server provides the following tools:

- `generate_trading_signals` - Generate AI-powered trading signals for assets
- `get_market_data` - Get current market data for specified assets
- `get_active_positions` - Get current active trading positions
- `run_trading_cycle` - Run a single trading cycle (test mode)
- `get_performance` - Get trading performance metrics

## MCP Resources

The server provides the following resources:

- `geartrade://state` - Current trading cycle state
- `geartrade://performance` - Trading performance metrics
- `geartrade://config` - Current trading configuration

## Architecture

- `src/signal-generation/` - Core trading logic (analysis, execution, risk management)
- `src/mcp-server/` - MCP server implementation
- `data/` - State persistence (cycle state, trades, performance)

## License

See LICENSE file.

