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

