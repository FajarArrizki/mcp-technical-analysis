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

Test the MCP server using the MCP Inspector tool. The MCP Inspector provides a web UI for testing MCP servers interactively.

#### Quick Start

**Option 1: Using npm script (recommended)**
```bash
npm run inspector
```

**Option 2: Direct command**
```bash
npx @modelcontextprotocol/inspector node_modules/.bin/tsx src/mcp-server/index.ts
```

**Option 3: With environment variables**
```bash
npx @modelcontextprotocol/inspector -e OPENROUTER_API_KEY=your_key -e MODEL_ID=anthropic/claude-3-5-sonnet node_modules/.bin/tsx src/mcp-server/index.ts
```

#### What to Expect

1. **MCP Inspector Proxy** starts on port `6277` (default)
2. **MCP Inspector Client UI** opens at `http://localhost:6274` (default)
3. A **session token** is generated and displayed in the console
4. Browser automatically opens with token pre-filled in URL

#### Using the Inspector

1. **Open the UI** - Browser should open automatically, or navigate to `http://localhost:6274`
2. **Authenticate** - Session token is automatically included in URL, or enter it manually in Configuration
3. **Test Tools** - Use the UI to test:
   - `get_price` - Get price for a single ticker (e.g., "BTC")
   - `get_multiple_prices` - Get prices for multiple tickers (e.g., ["BTC", "ETH", "SOL"])
   - `get_indicator` - Get technical analysis for a single ticker (e.g., "BTC")
   - `get_multiple_indicators` - Get technical analysis for multiple tickers (e.g., ["BTC", "ETH", "SOL"])
   - `get_volume_analysis` - Get volume analysis for a single ticker (e.g., "BTC")
   - `get_multiple_volume_analysis` - Get volume analysis for multiple tickers (e.g., ["BTC", "ETH", "SOL"])
   - `get_multitimeframe` - Get multi-timeframe analysis for a single ticker (e.g., "BTC")
   - `get_multiple_multitimeframe` - Get multi-timeframe analysis for multiple tickers (e.g., ["BTC", "ETH", "SOL"])
4. **Test Resources** - Access:
   - `geartrade://state` - Current trading cycle state
   - `geartrade://performance` - Trading performance metrics
   - `geartrade://config` - Trading configuration

#### Export Configuration

The Inspector UI provides buttons to export server configuration:
- **Server Entry** - Copies single server config for `mcp.json`
- **Servers File** - Copies complete `mcp.json` structure

Example exported config:
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "node_modules/.bin/tsx",
      "args": ["src/mcp-server/index.ts"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key",
        "MODEL_ID": "anthropic/claude-3-5-sonnet"
      }
    }
  }
}
```

#### Troubleshooting

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
   - Check that session token is included in URL or entered in Configuration

5. **Test MCP server directly:**
   ```bash
   # Should output: "GearTrade MCP Server running on stdio"
   node_modules/.bin/tsx src/mcp-server/index.ts
   ```

6. **Custom ports:**
   ```bash
   CLIENT_PORT=8080 SERVER_PORT=9000 npx @modelcontextprotocol/inspector node_modules/.bin/tsx src/mcp-server/index.ts
   ```

#### Security Notes

- The MCP Inspector proxy server requires authentication by default
- A random session token is generated on startup
- Never disable authentication (`DANGEROUSLY_OMIT_AUTH`) unless you understand the risks
- The proxy server should not be exposed to untrusted networks

**Note:** Make sure you have set up your `.env` file with required API keys before testing:
- `OPENROUTER_API_KEY` or `AI_PROVIDER_API_KEY`
- `MODEL_ID`
- `HYPERLIQUID_API_URL` (optional, has default)

## MCP Tools

The server provides the following tools:

### Price Tools

- **`get_price`** - Get latest price for a single trading ticker/symbol
  - **Input:** `ticker` (string) - Asset ticker symbol (e.g., "BTC", "ETH", "SOL")
  - **Output:** 
    ```json
    {
      "ticker": "BTC",
      "price": 43250.50,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
    ```
  - **Example:**
    ```json
    {
      "name": "get_price",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_prices`** - Get latest prices for multiple trading tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])
  - **Output:**
    ```json
    {
      "results": [
        {
          "ticker": "BTC",
          "price": 43250.50,
          "timestamp": "2024-01-15T10:30:00.000Z"
        },
        {
          "ticker": "ETH",
          "price": 2650.75,
          "timestamp": "2024-01-15T10:30:00.000Z"
        }
      ]
    }
    ```
  - **Example:**
    ```json
    {
      "name": "get_multiple_prices",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL", "BNB"]
      }
    }
    ```
  - **Note:** All prices are fetched in parallel for better performance

### Technical Analysis Tools

- **`get_indicator`** - Get comprehensive technical analysis indicators for a single trading ticker
  - **Input:** `ticker` (string) - Asset ticker symbol (e.g., "BTC", "ETH", "SOL")
  - **Output:** Technical indicators including:
    - RSI (14, 7, 4H)
    - EMA (20, 50)
    - MACD (MACD, Signal, Histogram)
    - Bollinger Bands (Upper, Middle, Lower, Position)
    - ATR (14)
    - ADX (ADX, +DI, -DI, Trend)
    - OBV, VWAP
    - Stochastic (K, D)
    - CCI, Williams %R
    - Parabolic SAR
    - Aroon (Up, Down, Trend)
    - Support & Resistance
    - Fibonacci levels
    - Trend analysis
    - Market Structure
    - RSI Divergence
    - Candlestick patterns
    - Market Regime
    - 24h Change & Volume Change
  - **Example:**
    ```json
    {
      "name": "get_indicator",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```
  - **Output Example:**
    ```json
    {
      "ticker": "BTC",
      "price": 43250.50,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "technical": {
        "rsi": {
          "rsi14": 51.85,
          "rsi7": 48.35,
          "rsi4h": 40.25
        },
        "ema": {
          "ema20": 180.08,
          "ema50": 179.84
        },
        "macd": {
          "macd": 0.2968,
          "signal": 0.3821,
          "histogram": -0.0853
        },
        ...
      }
    }
    ```

- **`get_multiple_indicators`** - Get comprehensive technical analysis indicators for multiple trading tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])
  - **Output:** Array of technical indicators for each ticker
  - **Example:**
    ```json
    {
      "name": "get_multiple_indicators",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL"]
      }
    }
    ```
  - **Output Example:**
    ```json
    {
      "results": [
        {
          "ticker": "BTC",
          "price": 43250.50,
          "timestamp": "2024-01-15T10:30:00.000Z",
          "technical": { ... }
        },
        {
          "ticker": "ETH",
          "price": 2650.75,
          "timestamp": "2024-01-15T10:30:00.000Z",
          "technical": { ... }
        }
      ],
      "summary": {
        "total": 2,
        "found": 2,
        "notFound": 0
      }
    }
    ```
  - **Note:** All technical data is fetched in parallel for better performance

### Volume Analysis Tools

- **`get_volume_analysis`** - Get comprehensive volume analysis for a single trading ticker
  - **Input:** `ticker` (string) - Asset ticker symbol (e.g., "BTC", "ETH", "SOL")
  - **Output:** Volume analysis including:
    - Buy/Sell Volume & Net Delta
    - Buy/Sell Pressure & Dominant Side
    - Key Level & Delta
    - POC (Point of Control)
    - VAH/VAL (Value Area High/Low)
    - HVN/LVN (High/Low Volume Nodes)
    - CVD Trend & Delta
    - Top Liquidity Zones
    - Recommendation (ENTER/EXIT/HOLD/WAIT)
    - Confidence & Risk Level
  - **Example:**
    ```json
    {
      "name": "get_volume_analysis",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_volume_analysis`** - Get comprehensive volume analysis for multiple trading tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])
  - **Output:** Array of volume analysis for each ticker
  - **Example:**
    ```json
    {
      "name": "get_multiple_volume_analysis",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL"]
      }
    }
    ```
  - **Note:** All volume analysis data is fetched in parallel for better performance

### Multi-Timeframe Analysis Tools

- **`get_multitimeframe`** - Get multi-timeframe trend alignment analysis for a single trading ticker
  - **Input:** `ticker` (string) - Asset ticker symbol (e.g., "BTC", "ETH", "SOL")
  - **Output:** Multi-timeframe analysis including:
    - Daily Trend (uptrend/downtrend/neutral)
    - 4H Aligned (Yes/No)
    - 1H Aligned (Yes/No)
    - Overall Alignment Status
    - Alignment Score (0-100)
    - Additional timeframe data (Daily, 4H, 1H) with price, EMA, RSI
  - **Example:**
    ```json
    {
      "name": "get_multitimeframe",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```
  - **Output Example:**
    ```json
    {
      "ticker": "BTC",
      "price": 87000,
      "multiTimeframe": {
        "dailyTrend": "downtrend",
        "h4Aligned": true,
        "h1Aligned": true,
        "overall": "Aligned",
        "score": 100,
        "daily": {
          "price": 87000,
          "ema20": 86500,
          "ema50": 86000,
          "rsi14": 45.5
        }
      }
    }
    ```

- **`get_multiple_multitimeframe`** - Get multi-timeframe trend alignment analysis for multiple trading tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])
  - **Output:** Array of multi-timeframe analysis for each ticker
  - **Example:**
    ```json
    {
      "name": "get_multiple_multitimeframe",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL"]
      }
    }
    ```
  - **Note:** All multi-timeframe data is fetched in parallel for better performance

### Trading Tools (Planned)

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

