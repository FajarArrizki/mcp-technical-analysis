# GearTrade MCP Server

**Model Context Protocol (MCP) server for autonomous AI trading on Hyperliquid**

GearTrade MCP Server is a comprehensive trading analysis and execution platform that exposes 36+ powerful trading tools through the Model Context Protocol. Built specifically for Hyperliquid perpetual futures trading, this server enables AI agents and trading systems to perform sophisticated market analysis, risk management, and order execution with full EIP-712 signing support.

## Overview

GearTrade MCP Server provides a complete suite of trading tools that cover every aspect of market analysis and execution. The platform offers real-time price data and comprehensive technical analysis with over 20 indicators including RSI, EMA, MACD, Bollinger Bands, ATR, ADX, OBV, VWAP, Stochastic, CCI, Williams %R, Parabolic SAR, Aroon, Support/Resistance, Fibonacci retracements, trend analysis, market structure detection, RSI divergence, candlestick pattern recognition, and market regime classification. Advanced volume analysis tools provide deep insights into buy/sell pressure, cumulative volume delta (CVD), liquidity zones, and volume-based trading recommendations. Multi-timeframe analysis enables trend alignment scoring across Daily, 4H, and 1H timeframes to identify high-probability trading setups.

The server includes 18 specialized advanced analysis tools for professional-grade market research. Fibonacci retracement analysis identifies key support and resistance levels with swing high/low detection. Order book depth analysis provides real-time bid/ask depth, spread calculations, order flow imbalance, and dynamic support/resistance zones. Volume profile tools generate both session and composite profiles with Point of Control (POC), Value Area High/Low (VAH/VAL), High/Low Volume Nodes (HVN/LVN), and accumulation/distribution zone identification. Market structure analysis detects Change of Character (COC) events, swing patterns, and potential reversal signals. Candlestick pattern detection identifies doji, hammer, and bullish/bearish engulfing formations. Divergence detection analyzes RSI divergences for early trend reversal signals. Liquidation level analysis maps liquidation clusters, predicts liquidity grab zones and stop hunts, and identifies safe entry zones. Long/short ratio analysis provides sentiment indicators with contrarian signals and extreme ratio detection. Spot-futures divergence tools identify premium/discount opportunities, arbitrage setups, and mean reversion signals.

Position and risk management tools enable automated position tracking with real-time unrealized PnL and Maximum Adverse Excursion (MAE) monitoring. Risk management calculators automatically determine optimal stop loss and take profit levels with risk/reward ratio analysis. Position setup tools calculate dynamic position sizing based on leverage requirements, margin management, and capital allocation strategies.

External market data integration provides real-time funding rate analysis with trend detection, open interest tracking with trend monitoring, and comprehensive volume and volatility trend analysis. These tools help traders understand market sentiment and potential price movements.

Order execution capabilities support both spot trading (1x leverage) and leveraged futures trading (1-50x) with full Hyperliquid integration. The platform includes a sophisticated paper trading simulator with realistic slippage modeling for safe strategy testing, and live trading execution via Hyperliquid API with EIP-712 cryptographic signing for secure order submission. All execution tools support both single and multiple asset batch processing, with safety mechanisms that default to paper trading for multiple simultaneous executions.

### Key Features

- **36+ MCP Tools**: Comprehensive trading toolkit covering all aspects of market analysis and execution
- **Hyperliquid Integration**: Native support for Hyperliquid perpetual futures with EIP-712 order signing
- **Real-time Data**: Live market data from Hyperliquid and Binance APIs
- **Advanced Analytics**: 20+ technical indicators, volume analysis, and market structure detection
- **Risk Management**: Automated position sizing, stop loss, and take profit calculation
- **Safe Execution**: Paper trading simulation with realistic slippage before live execution
- **Multi-Asset Support**: Batch processing for multiple tickers simultaneously
- **Type-Safe**: Full TypeScript implementation with Zod schema validation

### Use Cases

- **AI Trading Agents**: Enable AI agents to analyze markets and execute trades autonomously
- **Trading Bots**: Build sophisticated trading bots with comprehensive market analysis
- **Risk Management Systems**: Implement automated risk management and position sizing
- **Market Research**: Perform deep market analysis across multiple assets and timeframes
- **Backtesting**: Simulate trading strategies with paper trading executor

## Workflow: Analysis → Execution

GearTrade MCP Server supports a complete workflow from market analysis to order execution. AI agents can use tools sequentially to analyze markets and execute trades with user confirmation.

### Recommended Workflow

1. **Comprehensive Analysis**
   - Use `analisis_crypto` (single) or `analisis_multiple_crypto` (multiple) to gather complete market data
   - These tools aggregate:
     - Real-time price data
     - Technical indicators (20+ indicators)
     - Volume analysis (buy/sell pressure, CVD, liquidity zones)
     - Multi-timeframe analysis (Daily, 4H, 1H alignment)
     - External data (funding rate, open interest, volatility)
     - Position information (if exists)
     - Position setup calculations (leverage, margin, position size)
     - Risk management (stop loss, take profit, R:R ratio)

2. **AI Analysis & User Confirmation**
   - AI processes the comprehensive data
   - AI presents analysis results to user
   - AI asks: "Mau dieksekusi ke Hyperliquid? (YES/NO)"

3. **Execution (if user confirms)**
   - If user responds "YES":
     - AI calls `get_execution_spot` or `get_execution_futures`
     - With parameters: `execute: true`, `useLiveExecutor: true`
     - Order is executed on Hyperliquid with EIP-712 signing
   - If user responds "NO":
     - No execution, analysis only

### Example Workflow

```json
// Step 1: Comprehensive Analysis
{
  "name": "analisis_crypto",
  "arguments": {
    "ticker": "BTC",
    "capital": 10000,
    "riskPct": 1.0,
    "strategy": "flexible"
  }
}

// AI processes data and asks user:
// "Berdasarkan analisis, sinyal SELL dengan confidence 73.86%.
//  Entry: $180.14, Stop Loss: $183.38, Take Profit: $172.03.
//  Mau dieksekusi ke Hyperliquid? (YES/NO)"

// Step 2: Execution (if user confirms "YES")
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "SHORT",
    "quantity": 0.1,
    "leverage": 5,
    "orderType": "MARKET",
    "execute": true,
    "useLiveExecutor": true
  }
}
```

### Safety Features

- **Paper Trading First**: Always test with `execute: false` or `useLiveExecutor: false` first
- **User Confirmation**: AI should always ask for user confirmation before live execution
- **Multiple Executions**: `get_multiple_execution_*` tools default to paper trading for safety
- **Risk Management**: All position setup and risk calculations are included in analysis results

### Best Practices for AI Agents

1. **Always analyze first** - Use `analisis_crypto` before considering execution
2. **Present clear summary** - Show key metrics (signal, confidence, entry, stop loss, take profit)
3. **Ask for confirmation** - Never execute without explicit user approval
4. **Show risk details** - Display position size, leverage, margin, and potential loss/profit
5. **Use paper trading** - Test strategies with paper trading before live execution
6. **Monitor positions** - Use `get_position` to track open positions after execution

## Installation

```bash
npm install
```

## Deployment (Nullshot + Cloudflare)

GearTrade MCP Server can be deployed to Nullshot platform with Cloudflare Workers integration for production use.

### Quick Start

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Set Secrets**
   ```bash
   wrangler secret put HYPERLIQUID_ACCOUNT_ADDRESS
   wrangler secret put HYPERLIQUID_WALLET_API_KEY
   ```

4. **Deploy**
   ```bash
   bash .cloudflare/deploy.sh
   ```

### Detailed Deployment Guide

See [`.nullshot/deploy.md`](.nullshot/deploy.md) for complete deployment instructions including:
- Nullshot platform integration
- Cloudflare Workers configuration
- Zero Trust security setup
- Monitoring and troubleshooting

### Configuration Files

- **`nullshot.config.json`** - Nullshot MCP server configuration
- **`wrangler.toml`** - Cloudflare Workers configuration
- **`.cloudflare/deploy.sh`** - Deployment script

### Features

- ✅ **Cloudflare Workers**: Serverless deployment with global edge network
- ✅ **Zero Trust Security**: Access control via Cloudflare Zero Trust
- ✅ **MCP Server Portal**: Centralized management via Cloudflare
- ✅ **Auto-scaling**: Automatic scaling based on demand
- ✅ **Monitoring**: Built-in analytics and logging
- ✅ **HTTPS**: Secure connections by default

## Configuration

Set the following environment variables:

```bash
# AI Provider Configuration
AI_PROVIDER=openrouter  # or zai, anthropic, etc.
AI_PROVIDER_API_KEY=your_api_key_here
MODEL_ID=anthropic/claude-3-5-sonnet  # or glm-4.5, etc.

# Hyperliquid Configuration
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_ACCOUNT_ADDRESS=0x...  # Your wallet address
HYPERLIQUID_WALLET_API_KEY=your_private_key_here  # Private key (64 hex chars) for EIP-712 signing

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

## MCP Resources

The server provides the following resources (documentation that AI can read):

- **`geartrade://docs/trading-strategies`** - Comprehensive guide on trading strategies, technical analysis, and best practices
- **`geartrade://docs/risk-management`** - Guide on risk management, position sizing, stop loss, and take profit strategies
- **`geartrade://docs/tools-overview`** - Complete overview of all 38+ MCP tools available in GearTrade
- **`geartrade://docs/execution-workflow`** - Step-by-step guide for analysis to execution workflow with safety best practices

AI agents can read these resources to understand how to use the tools effectively and follow best practices.

## MCP Prompts

The server provides the following prompt templates to help AI agents use tools more effectively:

### `analyze_and_execute`
Analyze a crypto asset and prepare execution plan with risk management.

**Arguments:**
- `ticker` (required) - Asset ticker to analyze (e.g., "BTC", "ETH", "SOL")
- `capital` (optional) - Trading capital in USD (default: 10000)
- `riskPct` (optional) - Risk percentage per trade (default: 1.0)

**Usage:**
AI agents can use this prompt to get a structured workflow for analyzing an asset and preparing for execution, including risk management calculations and user confirmation steps.

### `multi_asset_scan`
Scan multiple assets for trading opportunities and rank by confidence.

**Arguments:**
- `tickers` (required) - Array of tickers to scan (e.g., ["BTC", "ETH", "SOL"])
- `capital` (optional) - Trading capital in USD (default: 10000)

**Usage:**
AI agents can use this prompt to scan multiple assets, rank them by signal confidence and risk/reward ratio, and present the top opportunities to the user.

### `risk_analysis`
Perform comprehensive risk analysis for a trading position.

**Arguments:**
- `ticker` (required) - Asset ticker to analyze
- `entry` (required) - Entry price
- `side` (required) - Trade side ("LONG" or "SHORT")
- `capital` (required) - Trading capital in USD

**Usage:**
AI agents can use this prompt to calculate position sizing, stop loss, take profit, and risk/reward ratios for a specific trading setup.

### `position_monitoring`
Monitor open positions and provide status update.

**Arguments:**
- `tickers` (optional) - Array of tickers to monitor (monitors all positions if not provided)

**Usage:**
AI agents can use this prompt to monitor open positions, track PnL, and provide recommendations for position management.

### `comprehensive_analysis`
Perform comprehensive market analysis for crypto assets without execution.

**Arguments:**
- `ticker` (optional) - Single ticker to analyze (e.g., "BTC", "ETH", "SOL"). If not provided, can analyze multiple tickers
- `tickers` (optional) - Array of tickers to analyze (e.g., ["BTC", "ETH", "SOL"]). Use this for multiple assets
- `capital` (optional) - Trading capital in USD (default: 10000)
- `riskPct` (optional) - Risk percentage per trade (default: 1.0)
- `strategy` (optional) - Trading strategy timeframe: "short_term", "long_term", or "flexible" (default: "flexible")

**Usage:**
AI agents can use this prompt to perform deep market analysis without any execution. The prompt guides AI to:
- Analyze single or multiple assets comprehensively
- Present detailed technical, volume, and multi-timeframe analysis
- Include advanced analysis (Fibonacci, Order Book, Volume Profile, etc.)
- Provide trading signals with confidence levels
- Calculate entry, stop loss, take profit levels
- Assess risk without executing trades

**Key Features:**
- Analysis-only workflow (no execution)
- Supports both single and multiple asset analysis
- Comprehensive reporting with all available indicators
- Ranking and comparison for multiple assets
- Clear risk assessment and recommendations

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

### External Data Tools

- **`get_external_data`** - Get external market data for a single trading ticker
  - **Input:** `ticker` (string) - Asset ticker symbol (e.g., "BTC", "ETH", "SOL")
  - **Output:** External data including:
    - Funding Rate & Trend
    - Open Interest & Trend
    - Volume Trend
    - Volatility
  - **Example:**
    ```json
    {
      "name": "get_external_data",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_external_data`** - Get external market data for multiple trading tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of external data for each ticker
  - **Example:**
    ```json
    {
      "name": "get_multiple_external_data",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL"]
      }
    }
    ```

### Position Management Tools

- **`get_position`** - Get current position information for a single trading ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Position data including:
    - Side (LONG/SHORT)
    - Entry Price
    - Quantity
    - Unrealized PnL
    - MAE (Maximum Adverse Excursion)
  - **Example:**
    ```json
    {
      "name": "get_position",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_positions`** - Get current position information for multiple trading tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of position data for each ticker
  - **Example:**
    ```json
    {
      "name": "get_multiple_positions",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL"]
      }
    }
    ```

### Risk Management Tools

- **`calculate_risk_management`** - Calculate risk management parameters (stop loss, take profit, risk/reward ratio)
  - **Input:**
    - `ticker` (string) - Asset ticker symbol
    - `entryPrice` (number) - Entry price
    - `side` (enum: "LONG" | "SHORT") - Trade side
    - `stopLossPct` (number) - Stop loss percentage
    - `takeProfitPct` (number) - Take profit percentage
    - `positionSizeUsd` (number) - Position size in USD
  - **Output:** Risk management data including:
    - Stop Loss (Fixed & Flexible)
    - Take Profit
    - Potential Loss/Profit
    - Risk/Reward Ratio
  - **Example:**
    ```json
    {
      "name": "calculate_risk_management",
      "arguments": {
        "ticker": "BTC",
        "entryPrice": 87000,
        "side": "LONG",
        "stopLossPct": 2,
        "takeProfitPct": 4.5,
        "positionSizeUsd": 10000
      }
    }
    ```

### Position Setup Tools

- **`calculate_position_setup`** - Calculate position setup parameters (quantity, leverage, margin)
  - **Input:**
    - `ticker` (string) - Asset ticker symbol
    - `entryPrice` (number) - Entry price
    - `side` (enum: "LONG" | "SHORT") - Trade side
    - `positionSizeUsd` (number) - Position size in USD
    - `capital` (number, optional) - Total capital (default: 10000)
    - `riskPct` (number, optional) - Risk percentage (default: 0.9)
  - **Output:** Position setup data including:
    - Quantity
    - Leverage
    - Margin Percentage
    - Margin Used
    - Position Value
    - Capital Allocation
  - **Example:**
    ```json
    {
      "name": "calculate_position_setup",
      "arguments": {
        "ticker": "BTC",
        "entryPrice": 87000,
        "side": "LONG",
        "positionSizeUsd": 10000,
        "capital": 10000,
        "riskPct": 0.9
      }
    }
    ```

### Advanced Analysis Tools

#### Fibonacci Retracement

- **`get_fibonacci`** - Get Fibonacci retracement levels and analysis for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Fibonacci data including levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%, 127.2%, 161.8%, 200%), current level, swing high/low, direction, signal
  - **Example:**
    ```json
    {
      "name": "get_fibonacci",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_fibonacci`** - Get Fibonacci retracement for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of Fibonacci data for each ticker

#### Order Book Depth

- **`get_orderbook_depth`** - Get order book depth analysis for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Order book data including bid/ask depth, spread, imbalance, support/resistance zones, liquidity score
  - **Example:**
    ```json
    {
      "name": "get_orderbook_depth",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_orderbook_depth`** - Get order book depth for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of order book data for each ticker

#### Volume Profile

- **`get_volume_profile`** - Get volume profile analysis for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Volume profile data including POC, VAH/VAL, HVN/LVN, accumulation/distribution zones
  - **Example:**
    ```json
    {
      "name": "get_volume_profile",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_volume_profile`** - Get volume profile for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of volume profile data for each ticker

#### Market Structure

- **`get_market_structure`** - Get market structure analysis (Change of Character) for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Market structure data including structure (bullish/bearish/neutral), COC, swing highs/lows, reversal signals
  - **Example:**
    ```json
    {
      "name": "get_market_structure",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_market_structure`** - Get market structure for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of market structure data for each ticker

#### Candlestick Patterns

- **`get_candlestick_patterns`** - Get candlestick pattern detection for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Candlestick patterns including doji, hammer, bullish/bearish engulfing, latest pattern, bullish/bearish count
  - **Example:**
    ```json
    {
      "name": "get_candlestick_patterns",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_candlestick_patterns`** - Get candlestick patterns for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of candlestick patterns for each ticker

#### Divergence Detection

- **`get_divergence`** - Get RSI divergence detection for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Divergence data including bullish/bearish divergence signals
  - **Example:**
    ```json
    {
      "name": "get_divergence",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_divergence`** - Get divergence detection for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of divergence data for each ticker

#### Liquidation Levels

- **`get_liquidation_levels`** - Get liquidation level analysis for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Liquidation data including clusters, liquidity grab zones, stop hunt predictions, cascade risk, safe entry zones
  - **Example:**
    ```json
    {
      "name": "get_liquidation_levels",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_liquidation_levels`** - Get liquidation levels for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of liquidation data for each ticker

#### Long/Short Ratio

- **`get_long_short_ratio`** - Get long/short ratio analysis for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Long/short ratio data including sentiment, contrarian signals, extreme ratios, divergence
  - **Example:**
    ```json
    {
      "name": "get_long_short_ratio",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_long_short_ratio`** - Get long/short ratio for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of long/short ratio data for each ticker

#### Spot-Futures Divergence

- **`get_spot_futures_divergence`** - Get spot-futures divergence analysis for a single ticker
  - **Input:** `ticker` (string) - Asset ticker symbol
  - **Output:** Spot-futures divergence data including premium analysis, arbitrage opportunities, mean reversion signals
  - **Example:**
    ```json
    {
      "name": "get_spot_futures_divergence",
      "arguments": {
        "ticker": "BTC"
      }
    }
    ```

- **`get_multiple_spot_futures_divergence`** - Get spot-futures divergence for multiple tickers at once
  - **Input:** `tickers` (array of strings) - Array of asset ticker symbols
  - **Output:** Array of spot-futures divergence data for each ticker

### Comprehensive Analysis Tools

These tools aggregate all available market data into a single comprehensive analysis, perfect for AI agents that need complete market context before making trading decisions.

- **`analisis_crypto`** - Get comprehensive trading analysis for a single crypto asset
  - **Input:**
    - `ticker` (string, required) - Asset ticker symbol (e.g., "BTC", "ETH", "SOL")
    - `capital` (number, optional) - Total trading capital in USD (default: 10000)
    - `riskPct` (number, optional) - Risk percentage per trade (default: 1.0)
    - `strategy` (enum, optional) - Trading strategy timeframe: "short_term", "long_term", or "flexible" (default: "flexible")
  - **Output:** Complete analysis object with the following structure:
    ```json
    {
      "ticker": "BTC",
      "price": 87532,
      "timestamp": "2025-11-23T19:39:31.201Z",
      "technical": {
        "rsi": {
          "rsi14": 65.32,
          "rsi7": 70.81,
          "rsi4h": 49.83
        },
        "ema": {
          "ema20": 87205.37,
          "ema50": 87036.01
        },
        "macd": {
          "macd": 155.41,
          "signal": 104.25,
          "histogram": 51.16
        },
        "bollingerBands": {
          "upper": 87600.86,
          "middle": 87145.94,
          "lower": 86691.03,
          "position": "Above middle (Bullish)"
        },
        "atr": 180.57,
        "adx": {
          "adx": 21.35,
          "plusDI": 33.79,
          "minusDI": 12.91,
          "trend": "Weak"
        },
        "obv": 364.61,
        "vwap": 86975.39,
        "stochastic": {
          "k": 84.17,
          "d": 82.91
        },
        "cci": 171.71,
        "williamsR": -15.83,
        "parabolicSAR": {
          "value": 87159.42,
          "trend": "Bullish"
        },
        "aroon": {
          "up": null,
          "down": 100,
          "trend": "Strong Downtrend"
        },
        "support": 86692.13,
        "resistance": 87161.16,
        "fibonacci": null,
        "trend": {
          "direction": "downtrend",
          "strength": "40/100"
        },
        "marketStructure": {
          "structure": "uptrend",
          "higherHigh": false,
          "lowerLow": false
        },
        "rsiDivergence": "bearish",
        "candlestick": null,
        "marketRegime": "neutral",
        "change24h": 0.75,
        "volumeChange24h": -42.57
      },
      "volumeAnalysis": {
        "buyVolume": 1902.86,
        "sellVolume": 1925.51,
        "netDelta": -22.65,
        "buyPressure": 49.70,
        "sellPressure": 50.30,
        "dominantSide": "NEUTRAL",
        "keyLevel": 87587.25,
        "keyLevelDelta": -55.25,
        "poc": 86679.03,
        "vah": 87344.13,
        "val": 86627.87,
        "hvn": "86679.03, 87037.16, 87011.58",
        "lvn": "87523.19, 86423.22, 86448.80",
        "cvdTrend": "RISING",
        "cvdDelta": 181.59,
        "topLiquidityZones": [
          {
            "priceRange": "86709.02-87560.26",
            "type": "neutral",
            "strength": "high"
          },
          {
            "priceRange": "86478.51-86705.44",
            "type": "support",
            "strength": "high"
          }
        ],
        "recommendation": "HOLD",
        "confidence": 50,
        "riskLevel": "MEDIUM"
      },
      "multiTimeframe": {
        "dailyTrend": "downtrend",
        "h4Aligned": false,
        "h1Aligned": false,
        "overall": "Not Aligned",
        "score": 40,
        "reason": "Lower timeframes not aligned",
        "daily": {
          "price": 87519,
          "ema20": 95542.64,
          "ema50": 105397.56,
          "rsi14": 23.35
        },
        "h4": {
          "price": 87519,
          "ema20": 86507.88,
          "rsi14": 49.83
        },
        "h1": {
          "price": 87519,
          "ema20": 86347.45,
          "rsi14": 62.46
        }
      },
      "externalData": {
        "fundingRate": "0.0001%",
        "fundingRateTrend": "stable",
        "openInterest": null,
        "openInterestTrend": "stable",
        "volumeTrend": "increasing",
        "volatility": "low"
      },
      "fibonacci": {
        "levels": {
          "level0": 87159.42,
          "level236": 86925.40,
          "level382": 86750.35,
          "level500": 86575.30,
          "level618": 86400.25,
          "level786": 86150.15,
          "level100": 85900.05,
          "level1272": 85625.00,
          "level1618": 85350.00,
          "level2000": 85000.00
        },
        "currentLevel": "23.6%",
        "distanceFromLevel": 55.25,
        "isNearLevel": true,
        "nearestLevel": "23.6%",
        "nearestLevelPrice": 86925.40,
        "swingHigh": 87532.00,
        "swingLow": 85900.05,
        "range": 1631.95,
        "direction": "uptrend",
        "strength": 75,
        "signal": "buy"
      },
      "orderBook": {
        "bidPrice": 87530.50,
        "askPrice": 87533.50,
        "midPrice": 87532.00,
        "spread": 3.00,
        "spreadPercent": 0.0034,
        "bidDepth": 1250.50,
        "askDepth": 980.25,
        "imbalance": 0.21,
        "supportZones": [
          {
            "price": 87500.00,
            "depth": 500.00,
            "distance": 32.00
          }
        ],
        "resistanceZones": [
          {
            "price": 87600.00,
            "depth": 450.00,
            "distance": -68.00
          }
        ],
        "liquidityScore": 0.75,
        "timestamp": 1732381171201
      },
      "volumeProfile": {
        "session": {
          "poc": 86679.03,
          "vah": 87344.13,
          "val": 86627.87,
          "hvn": [
            {"price": 86679.03, "volume": 1250.50},
            {"price": 87037.16, "volume": 980.25}
          ],
          "lvn": [
            {"price": 87523.19, "volume": 120.50},
            {"price": 86423.22, "volume": 95.25}
          ]
        },
        "composite": {
          "poc": 86679.03,
          "vah": 87344.13,
          "val": 86627.87,
          "accumulationZones": [
            {"priceRange": "86478.51-86705.44", "strength": "high"}
          ],
          "distributionZones": [
            {"priceRange": "86709.02-87560.26", "strength": "high"}
          ]
        }
      },
      "liquidationLevels": {
        "clusters": [
          {
            "price": 88000.00,
            "liquidity": 2500000.00,
            "distance": 468.00,
            "type": "long_liquidation"
          }
        ],
        "liquidityGrabZones": [
          {
            "priceRange": "87800.00-88200.00",
            "risk": "high",
            "distance": 268.00
          }
        ],
        "stopHuntPrediction": {
          "likely": true,
          "direction": "up",
          "targetPrice": 88000.00
        },
        "cascadeRisk": "medium",
        "safeEntryZones": [
          {
            "priceRange": "87000.00-87500.00",
            "risk": "low"
          }
        ]
      },
      "longShortRatio": {
        "ratio": 1.25,
        "longs": 55.56,
        "shorts": 44.44,
        "sentiment": "bullish",
        "contrarianSignal": "bearish",
        "extremeRatio": false,
        "divergence": "none"
      },
      "spotFuturesDivergence": {
        "premium": 0.0015,
        "premiumPercent": 0.15,
        "direction": "premium",
        "arbitrageOpportunity": false,
        "meanReversionSignal": "neutral",
        "trend": "stable"
      },
      "position": null,
      "positionSetup": {
        "ticker": "BTC",
        "entryPrice": 87532,
        "side": "LONG",
        "positionSizeUsd": 1.20,
        "quantity": 0.00001371,
        "leverage": 6,
        "marginPercent": 85,
        "marginUsed": 0.20,
        "positionValue": 1.20,
        "capital": 6,
        "capitalAllocated": 1.20,
        "capitalAllocatedPct": 20.00,
        "riskPct": 1
      },
      "riskManagement": {
        "stopLossFixed": 85956.42,
        "stopLossFixedPct": 1.8,
        "stopLossFlexible": 86925.40,
        "stopLossFlexiblePct": 0.69,
        "takeProfit": 91470.94,
        "takeProfitPct": 4.5,
        "potentialLoss": 0.0216,
        "potentialProfit": 0.054,
        "riskRewardRatio": 2.50
      }
    }
    ```
  - **Output Fields Explained:**
    - **`technical`**: Complete technical analysis with 20+ indicators including RSI (14, 7, 4H), EMA (20, 50), MACD, Bollinger Bands, ATR, ADX, OBV, VWAP, Stochastic, CCI, Williams %R, Parabolic SAR, Aroon, Support/Resistance, Fibonacci, Trend, Market Structure, RSI Divergence, Candlestick patterns, Market Regime, 24h Change, Volume Change
    - **`volumeAnalysis`**: Buy/sell volume, net delta, buy/sell pressure, dominant side, key level, POC (Point of Control), VAH/VAL (Value Area High/Low), HVN/LVN (High/Low Volume Nodes), CVD trend & delta, top liquidity zones, recommendation, confidence, risk level
    - **`multiTimeframe`**: Daily trend, 4H/1H alignment status, overall alignment, score (0-100), reason, detailed data for daily/4H/1H timeframes (price, EMA20, RSI14)
    - **`externalData`**: Funding rate, funding rate trend, open interest, open interest trend, volume trend, volatility
    - **`fibonacci`**: Complete Fibonacci retracement analysis with levels (0%, 23.6%, 38.2%, 50%, 61.8%, 78.6%, 100%, 127.2%, 161.8%, 200%), current level, distance from level, nearest level, swing high/low, range, direction, strength, signal
    - **`orderBook`**: Order book depth analysis with bid/ask prices, spread, bid/ask depth, imbalance, support/resistance zones, liquidity score
    - **`volumeProfile`**: Session and composite volume profiles with POC, VAH/VAL, HVN/LVN, accumulation/distribution zones
    - **`liquidationLevels`**: Liquidation cluster analysis with liquidity grab zones, stop hunt predictions, cascade risk, safe entry zones
    - **`longShortRatio`**: Long/short ratio analysis with sentiment, contrarian signals, extreme ratio detection, divergence
    - **`spotFuturesDivergence`**: Spot-futures premium analysis with arbitrage opportunities, mean reversion signals, trend
    - **`position`**: Current position information (if exists) including quantity, entry price, unrealized PnL, MAE
    - **`positionSetup`**: Calculated position setup with ticker, entry price, side (LONG/SHORT), position size USD, quantity, leverage, margin percentage, margin used, position value, capital, capital allocated, capital allocated percentage, risk percentage
    - **`riskManagement`**: Stop loss (fixed & flexible), take profit levels, potential loss/profit, risk/reward ratio
  - **Example Request:**
    ```json
    {
      "name": "analisis_crypto",
      "arguments": {
        "ticker": "BTC",
        "capital": 10000,
        "riskPct": 1.0,
        "strategy": "flexible"
      }
    }
    ```
  - **Use Case:** Perfect for AI agents that need complete market context before making trading decisions. Use this tool first, then ask user for execution confirmation.

- **`analisis_multiple_crypto`** - Get comprehensive trading analysis for multiple crypto assets at once
  - **Input:**
    - `tickers` (array of strings, required) - Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])
    - `capital` (number, optional) - Total trading capital in USD (default: 10000)
    - `riskPct` (number, optional) - Risk percentage per trade (default: 1.0)
    - `strategy` (enum, optional) - Trading strategy timeframe: "short_term", "long_term", or "flexible" (default: "flexible")
  - **Output:** Array of comprehensive analysis for each ticker
  - **Example:**
    ```json
    {
      "name": "analisis_multiple_crypto",
      "arguments": {
        "tickers": ["BTC", "ETH", "SOL"],
        "capital": 10000,
        "riskPct": 1.0,
        "strategy": "flexible"
      }
    }
    ```
  - **Use Case:** Analyze multiple assets simultaneously to compare opportunities and identify the best trading setups.

### Execution Tools

#### Spot Execution

- **`get_execution_spot`** - Get spot trading execution information for a single ticker (no leverage, 1x)
  - **Input:**
    - `ticker` (string) - Asset ticker symbol
    - `side` (enum: "LONG" | "SHORT") - Trade side
    - `quantity` (number) - Quantity to trade (in base asset units)
    - `price` (number, optional) - Limit price (if not provided, uses current market price)
    - `orderType` (enum: "MARKET" | "LIMIT", default: "MARKET") - Order type
    - `execute` (boolean, default: false) - Whether to actually execute the order via Hyperliquid
    - `useLiveExecutor` (boolean, default: false) - Whether to use live executor (requires HYPERLIQUID_WALLET_API_KEY)
  - **Output:** Execution data including order ID, position value, margin required, status, estimated fill price, slippage
  - **Example (Simulation):**
    ```json
    {
      "name": "get_execution_spot",
      "arguments": {
        "ticker": "BTC",
        "side": "LONG",
        "quantity": 0.1,
        "orderType": "MARKET"
      }
    }
    ```
  - **Example (Execute with Paper Trading):**
    ```json
    {
      "name": "get_execution_spot",
      "arguments": {
        "ticker": "BTC",
        "side": "LONG",
        "quantity": 0.1,
        "execute": true,
        "useLiveExecutor": false
      }
    }
    ```
  - **Example (Execute with Live Trading):**
    ```json
    {
      "name": "get_execution_spot",
      "arguments": {
        "ticker": "BTC",
        "side": "LONG",
        "quantity": 0.1,
        "execute": true,
        "useLiveExecutor": true
      }
    }
    ```
  - **Note:** 
    - Default: Simulation only (no actual execution)
    - `execute=true` + `useLiveExecutor=false`: Uses PaperExecutor (simulation with slippage)
    - `execute=true` + `useLiveExecutor=true`: Uses LiveExecutor (real execution via Hyperliquid API, requires EIP-712 signing)

- **`get_multiple_execution_spot`** - Get spot trading execution information for multiple tickers at once
  - **Input:**
    - `executions` (array) - Array of execution requests, each with `ticker`, `side`, `quantity`, `price` (optional), `orderType` (optional)
    - `execute` (boolean, default: false) - Whether to actually execute orders (uses PaperExecutor for safety)
  - **Output:** Array of execution results with summary
  - **Example:**
    ```json
    {
      "name": "get_multiple_execution_spot",
      "arguments": {
        "executions": [
          {"ticker": "BTC", "side": "LONG", "quantity": 0.1},
          {"ticker": "ETH", "side": "SHORT", "quantity": 1.0}
        ],
        "execute": false
      }
    }
    ```
  - **Note:** For multiple executions, `execute=true` always uses PaperExecutor for safety (no live trading)

#### Futures Execution

- **`get_execution_futures`** - Get futures trading execution information for a single ticker (with leverage)
  - **Input:**
    - `ticker` (string) - Asset ticker symbol
    - `side` (enum: "LONG" | "SHORT") - Trade side
    - `quantity` (number) - Quantity to trade (in base asset units)
    - `leverage` (number, default: 10) - Leverage multiplier (1-50x)
    - `price` (number, optional) - Limit price (if not provided, uses current market price)
    - `orderType` (enum: "MARKET" | "LIMIT", default: "MARKET") - Order type
    - `execute` (boolean, default: false) - Whether to actually execute the order via Hyperliquid
    - `useLiveExecutor` (boolean, default: false) - Whether to use live executor (requires HYPERLIQUID_WALLET_API_KEY)
  - **Output:** Execution data including order ID, leverage, position value, margin required, status, estimated fill price, slippage
  - **Example (Simulation):**
    ```json
    {
      "name": "get_execution_futures",
      "arguments": {
        "ticker": "BTC",
        "side": "LONG",
        "quantity": 0.1,
        "leverage": 10,
        "orderType": "MARKET"
      }
    }
    ```
  - **Example (Execute with Live Trading):**
    ```json
    {
      "name": "get_execution_futures",
      "arguments": {
        "ticker": "BTC",
        "side": "LONG",
        "quantity": 0.1,
        "leverage": 10,
        "execute": true,
        "useLiveExecutor": true
      }
    }
    ```
  - **Note:** 
    - Default: Simulation only (no actual execution)
    - `execute=true` + `useLiveExecutor=false`: Uses PaperExecutor (simulation with slippage)
    - `execute=true` + `useLiveExecutor=true`: Uses LiveExecutor (real execution via Hyperliquid API with EIP-712 signing)

- **`get_multiple_execution_futures`** - Get futures trading execution information for multiple tickers at once
  - **Input:**
    - `executions` (array) - Array of execution requests, each with `ticker`, `side`, `quantity`, `leverage` (optional, default: 10), `price` (optional), `orderType` (optional)
    - `execute` (boolean, default: false) - Whether to actually execute orders (uses PaperExecutor for safety)
  - **Output:** Array of execution results with summary
  - **Example:**
    ```json
    {
      "name": "get_multiple_execution_futures",
      "arguments": {
        "executions": [
          {"ticker": "BTC", "side": "LONG", "quantity": 0.1, "leverage": 10},
          {"ticker": "ETH", "side": "SHORT", "quantity": 1.0, "leverage": 5}
        ],
        "execute": false
      }
    }
    ```
  - **Note:** For multiple executions, `execute=true` always uses PaperExecutor for safety (no live trading)

### Execution Implementation Details

#### LiveExecutor (Real Trading via Hyperliquid)

- **EIP-712 Signing:** Fully implemented with proper domain separator and message structure
- **Order Submission:** Submits signed orders to Hyperliquid `/exchange` endpoint
- **Order Status Polling:** Polls Hyperliquid API for order fill confirmation
- **Requirements:**
  - `HYPERLIQUID_WALLET_API_KEY` - Private key (64 hex characters, 32 bytes)
  - `HYPERLIQUID_ACCOUNT_ADDRESS` - Wallet address matching the private key
- **Safety:** Validates wallet address matches account address before execution

#### PaperExecutor (Simulation)

- **Slippage Simulation:** Realistic slippage with random variation (±20% of base slippage)
- **Virtual Balance:** Tracks virtual capital and positions
- **Trade Persistence:** Saves trades to file for tracking
- **No Risk:** Completely safe for testing and multiple executions

#### Multiple Executions Safety

- **Default Behavior:** All multiple execution tools use PaperExecutor when `execute=true`
- **Reason:** Prevents accidental live trading of multiple positions simultaneously
- **Single Executions:** Can use LiveExecutor with `useLiveExecutor=true` (requires proper configuration)

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

