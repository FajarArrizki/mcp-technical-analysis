# GearTrade MCP Server

🤖 **Model Context Protocol Server for AI-Powered Cryptocurrency Trading**

A comprehensive Model Context Protocol (MCP) server that bridges AI assistants with professional cryptocurrency trading capabilities. This server transforms AI conversations by providing real-time market data, sophisticated technical analysis, and intelligent trade execution tools through standardized MCP protocols. Whether you're building trading bots, automated strategies, or AI financial advisors, this server delivers the complete infrastructure needed for data-driven trading decisions across multiple timeframes and asset classes.

**🔥 Key Features:**
- 🔴 **38+ Trading Tools** - Complete analysis & execution toolkit
- 📊 **Real-time Market Data** - Live prices, indicators, volume analysis
- 🎯 **Advanced Technical Analysis** - RSI, MACD, Fibonacci, Order Book, etc.
- 💰 **Risk Management** - Position sizing, stop loss, take profit calculations
- 📈 **Multi-Timeframe Analysis** - Daily, 4H, 1H trend alignment
- 🤖 **23 AI Prompts** - Pre-configured trading workflows
- 📚 **19 Resources** - Comprehensive trading documentation
- 🔄 **Streaming Support** - HTTP/SSE for real-time updates
- 🎮 **Paper Trading** - Test strategies without risk
- ⚡ **Live Execution** - Trade on Hyperliquid (optional)

🏠 **Local Development:** Run the MCP server locally for full control and privacy  
🌐 **HTTP Streaming:** Remote MCP connection via `mcp-remote` for Cursor IDE

## 🌟 **What's Included**

### 📊 **38+ Complete Trading Tools**
- **Price Tools** (2): Real-time pricing for single/multiple assets
- **Technical Analysis** (2): 20+ indicators (RSI, EMA, MACD, Bollinger Bands, ATR, ADX, etc.)
- **Volume Analysis** (2): Buy/sell pressure, CVD, liquidity zones analysis
- **Multi-Timeframe** (2): Daily, 4H, 1H trend alignment analysis
- **Advanced Analysis** (3): Fibonacci, Order Book Depth, Liquidation Levels
- **Market Analysis** (8): Volume Profile, Market Structure, Candlestick Patterns, Divergence, Long/Short Ratio, Spot-Futures Divergence, External Data
- **Risk Management** (2): Position sizing, stop loss, take profit calculations
- **Comprehensive Analysis** (2): Complete crypto analysis with position setup
- **Execution Tools** (4): Spot & Futures trading (paper trading + live execution)
- **Batch Operations** (11): Multi-asset analysis for all above tools

### 📚 **19 Trading Resources**
- `geartrade://trading-strategies` - Comprehensive trading strategies guide
- `geartrade://risk-management` - Risk management best practices
- `geartrade://tools-overview` - Complete tools overview
- `geartrade://execution-workflow` - Analysis to execution workflow
- `geartrade://technical-indicators-guide` - Technical indicators guide
- `geartrade://hyperliquid-api-reference` - Hyperliquid API reference
- Plus 13 more specialized guides (volume analysis, fibonacci, orderbook, etc.)

### 🤖 **23 AI Trading Prompts**
- **Core Trading**: `analyze_and_execute`, `multi_asset_scan`, `comprehensive_analysis`
- **Technical Analysis**: `technical_indicator_analysis`, `volume_profile_analysis`, `market_structure_analysis`
- **Advanced**: `divergence_scan`, `liquidation_analysis`, `fibonacci_trading_strategy`, `spot_futures_arbitrage`
- **Risk Management**: `risk_analysis`, `position_monitoring`, `portfolio_review`, `volatility_analysis`
- Plus 12 more specialized prompts

## 🚀 **Quick Start**

### ⚡ Fastest Way - Streaming Mode (Recommended)

```bash
# Terminal 1 - Start Streaming Server
bash scripts/start-mcp-stream.sh

# Terminal 2 - Connect Terminal UI
pnpm run terminal
```

Server runs at `http://localhost:8787` with SSE streaming support!

📖 **Full Guide**: See [QUICKSTART.md](./QUICKSTART.md) and [STREAMING_GUIDE.md](./STREAMING_GUIDE.md)

### Installation:
```bash
# Clone the repository
git clone https://github.com/FajarArrizki/ai-trading-mcp-server.git
cd ai-trading-mcp-server

# Install dependencies
pnpm install

# Build the server
pnpm run build
```

### 🖥️ **Terminal UI (New!)**

Interactive terminal interface untuk testing dan development - **NO IMPORT ISSUES!**

```bash
# Quick start
pnpm run terminal:build
pnpm run terminal
```

**Features:**
- 🎨 **Beautiful UI** - Claude Code inspired design
- 🔌 **Zero Import Issues** - Pure Node.js, deployment-ready
- 🛠️ **Interactive Tools** - Execute all 36 MCP tools
- 📦 **Resource Access** - Read all 25 resources
- ✅ **Production Ready** - Works everywhere, no bundling issues

**Documentation:**
- 📖 [How to Use](HOW_TO_USE_TERMINAL.md) - Quick start guide
- 📚 [Complete Guide](packages/terminal-ui/GUIDE.md) - Full documentation
- 💡 [Examples](packages/terminal-ui/EXAMPLES.md) - Usage examples
- 🚀 [Deployment](packages/terminal-ui/DEPLOYMENT.md) - Deploy anywhere
- 📊 [Summary](TERMINAL_UI_SUMMARY.md) - Technical overview

**Why Terminal UI?**

Dibuat khusus untuk mengatasi masalah *"pas di deployment ga bisa, karna mengunakan import"*:
- ✅ No dynamic imports
- ✅ No ESM/CJS conflicts
- ✅ Pure static imports
- ✅ Minimal dependencies
- ✅ Works in all environments

### 🔧 Configure MCP Client

## 🚀 Quick Start - MCP Integration

### Option 1: HTTP Streaming Mode (Recommended)

**Start the server:**
```bash
cd /root/GEARTRADE
bash scripts/start-mcp-stream.sh
```

Server runs at `http://localhost:8787` with SSE streaming support!

**Configure Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "geartrade-local-stream": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/mcp"
      ],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "OPENROUTER_API_KEY": "your_openrouter_api_key_here",
        "HYPERLIQUID_API_URL": "https://api.hyperliquid.xyz",
        "HYPERLIQUID_WALLET_API_KEY": "",
        "HYPERLIQUID_ACCOUNT_ADDRESS": "",
        "CANDLES_COUNT": "100"
      }
    }
  }
}
```

**Required Environment Variables:**
- `OPENROUTER_API_KEY` - Get from [OpenRouter](https://openrouter.ai/keys) (Required for AI analysis)
- `HYPERLIQUID_API_URL` - API endpoint for market data (default provided)
- `HYPERLIQUID_WALLET_API_KEY` - Only for live trading (leave empty for analysis only)
- `HYPERLIQUID_ACCOUNT_ADDRESS` - Only for live trading (leave empty for analysis only)
- `CANDLES_COUNT` - Number of candles for analysis (100 recommended)

### Option 2: Direct Execution

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "tsx",
      "args": ["/path/to/GEARTRADE/packages/geartrade-mcp-server/src/index.ts"],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "OPENROUTER_API_KEY": "your_api_key_here",
        "HYPERLIQUID_API_URL": "https://api.hyperliquid.xyz"
      }
    }
  }
}
```

**Cursor (Alternative)** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "node",
      "args": [
        "--loader",
        "tsx",
        "/path/to/GEARTRADE/packages/geartrade-mcp-server/src/index.ts"
      ],
      "env": {
        "NODE_OPTIONS": "--loader tsx",
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "OPENROUTER_API_KEY": "your_api_key_here",
        "HYPERLIQUID_API_URL": "https://api.hyperliquid.xyz",
        "CANDLES_COUNT": "100"
      }
    }
  }
}
```

## 📦 MCP Capabilities

### Tools (38+)
| Category | Count | Description |
|----------|-------|-------------|
| Price Analysis | 2 | Real-time pricing for single/multiple assets |
| Technical Analysis | 2 | 20+ indicators (RSI, EMA, MACD, Bollinger Bands, ATR, ADX) |
| Volume Analysis | 2 | Buy/sell pressure, CVD, liquidity zones |
| Multi-Timeframe | 2 | Daily, 4H, 1H trend alignment |
| Advanced Analysis | 3 | Fibonacci, Order Book Depth, Liquidation Levels |
| Market Analysis | 8 | Volume Profile, Market Structure, Candlestick Patterns, Divergence, Long/Short Ratio, Spot-Futures Divergence, External Data |
| Risk Management | 2 | Position sizing, stop loss, take profit calculations |
| Comprehensive | 2 | Complete crypto analysis with position setup |
| Execution | 4 | Paper trading + live execution via Hyperliquid |
| Batch Operations | 11+ | Multi-asset versions of all above tools |

**Example Tools:**
- `get_price` / `get_multiple_prices` - Real-time crypto prices
- `get_indicator` / `get_multiple_indicators` - Technical indicators (RSI, MACD, etc.)
- `get_volume_analysis` - Buy/sell pressure, CVD, liquidity zones
- `get_fibonacci` - Fibonacci retracement levels
- `get_orderbook_depth` - Order book support/resistance
- `analisis_crypto` - Comprehensive single-asset analysis
- `analisis_multiple_crypto` - Batch multi-asset analysis
- `calculate_risk_management` - Stop loss, take profit, risk/reward
- `get_execution_spot` / `get_execution_futures` - Trade execution

### Resources (19)
- `geartrade://trading-strategies` - Trading strategies guide
- `geartrade://risk-management` - Risk management guide
- `geartrade://tools-overview` - Complete tools documentation
- `geartrade://execution-workflow` - Step-by-step execution guide
- `geartrade://technical-indicators-guide` - Indicators reference
- `geartrade://hyperliquid-api-reference` - Hyperliquid API docs
- `geartrade://volume-analysis-guide` - Volume analysis guide
- `geartrade://fibonacci-trading-guide` - Fibonacci strategies
- Plus 11 more specialized guides

### Prompts (23)
- **Core Trading**: `analyze_and_execute`, `multi_asset_scan`, `comprehensive_analysis`
- **Quick Analysis**: `quick_price_check`, `trend_analysis`, `market_overview`
- **Technical**: `technical_indicator_analysis`, `volume_profile_analysis`, `market_structure_analysis`
- **Advanced**: `divergence_scan`, `liquidation_analysis`, `fibonacci_trading_strategy`, `spot_futures_arbitrage`
- **Risk**: `risk_analysis`, `position_monitoring`, `portfolio_review`, `volatility_analysis`, `entry_exit_strategy`
- Plus 8 more specialized prompts

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GearTrade MCP Server                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │   MCP Clients   │◄──►│      MCP Protocol           │◄──►│
│  │  - Claude       │    │  - Tool Execution           │    │
│  │  - Cursor IDE   │    │  - Resource Access          │    │
│  │  - Cline IDE    │    │  - Prompt Management        │    │
│  └─────────────────┘    └─────────────────────────────┘    │
│                                  │                          │
│                                  ▼                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Core MCP Server                            ││
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  ││
│  │  │   Trading Tools │  │      Resources              │  ││
│  │  │  - Price (2)    │  │  - Trading State            │  ││
│  │  │  - Analysis (2) │  │  - Performance Metrics      │  ││
│  │  │  - Volume (2)   │  │  - Configuration            │  ││
│  │  │  - Advanced (10)│  │  - Documentation            │  ││
│  │  │  - Risk (2)     │  └─────────────────────────────┘  ││
│  │  │  - Exec (4)     │                                   ││
│  │  └─────────────────┘                                   ││
│  │                                                         ││
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  ││
│  │  │   AI Prompts    │  │    Security Layer           │  ││
│  │  │  - Core Trading │  │  - Multi-User Credentials   │  ││
│  │  │  - Technical    │  │  - Input Validation (Zod)   │  ││
│  │  │  - Risk Mgmt    │  │  - Paper Trading Default    │  ││
│  │  └─────────────────┘  └─────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│                                  │                          │
│                                  ▼                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              External APIs                              ││
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  ││
│  │  │  Hyperliquid    │  │     AI Providers            │  ││
│  │  │  - Market Data  │  │  - OpenRouter               │  ││
│  │  │  - Execution    │  │  - OpenAI                   │  ││
│  │  │  - Account Info │  │  - Custom Models            │  ││
│  │  └─────────────────┘  └─────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Component Details

**MCP Protocol Layer**
- Tool Execution: 38+ trading tools for analysis and execution
- Resource Management: 19 comprehensive documentation resources
- Prompt System: 23 AI-optimized trading prompts

**Security Layer**
- Multi-user credentials via tool parameters
- Zod schema validation
- Paper trading by default
- No hardcoded secrets

## 📁 Project Structure

```
ai-trading-mcp-server/
├── packages/
│   └── geartrade-mcp-server/          # Main MCP server package
│       ├── src/
│       │   ├── index.ts               # MCP server entry (36 tools, 25 resources, 23 prompts)
│       │   └── signal-generation/     # Trading engine modules
│       │       ├── ai/                # AI integration
│       │       │   ├── call-api.ts    # OpenRouter/OpenAI API calls
│       │       │   └── index.ts
│       │       ├── analysis/          # Market analysis modules
│       │       │   ├── bounce.ts              # Bounce detection
│       │       │   ├── btc-correlation.ts     # BTC correlation analysis
│       │       │   ├── candlestick.ts         # Candlestick patterns
│       │       │   ├── divergence.ts          # Divergence detection
│       │       │   ├── market-regime.ts       # Market regime detection
│       │       │   ├── market-structure.ts    # Market structure analysis
│       │       │   ├── orderbook.ts           # Order book analysis
│       │       │   ├── volume-analysis.ts     # Volume analysis
│       │       │   ├── volume-profile.ts      # Volume profile
│       │       │   ├── whale-detection.ts     # Whale activity detection
│       │       │   └── ...                    # 20+ analysis modules
│       │       ├── data-fetchers/     # Market data sources
│       │       │   ├── binance.ts             # Binance spot data
│       │       │   ├── binance-futures.ts     # Binance futures data
│       │       │   ├── blockchain.ts          # On-chain data
│       │       │   ├── hyperliquid.ts         # Hyperliquid API
│       │       │   ├── market-data.ts         # Aggregated market data
│       │       │   └── historical-data.ts     # Historical OHLCV data
│       │       ├── execution/         # Trade execution
│       │       │   ├── paper-executor.ts      # Paper trading simulation
│       │       │   ├── live-executor.ts       # Live trade execution
│       │       │   ├── hyperliquid-signing.ts # Hyperliquid signing
│       │       │   └── position-sizer.ts      # Position sizing
│       │       ├── technical-indicators/      # Technical analysis
│       │       │   ├── aggregator.ts          # Indicator aggregation
│       │       │   ├── fibonacci.ts           # Fibonacci levels
│       │       │   ├── funding-rate.ts        # Funding rate analysis
│       │       │   ├── liquidation.ts         # Liquidation levels
│       │       │   ├── long-short-ratio.ts    # Long/short ratio
│       │       │   ├── momentum.ts            # RSI, MACD, Stochastic
│       │       │   ├── moving-averages.ts     # EMA, SMA, WMA
│       │       │   ├── open-interest.ts       # Open interest analysis
│       │       │   ├── spot-futures-divergence.ts  # Spot-futures spread
│       │       │   ├── trend.ts               # Trend indicators
│       │       │   ├── volatility.ts          # ATR, Bollinger Bands
│       │       │   └── volume.ts              # Volume indicators
│       │       ├── risk-management/   # Risk management
│       │       │   ├── anti-liquidation.ts    # Liquidation protection
│       │       │   ├── emergency-exit.ts      # Emergency exit logic
│       │       │   ├── leverage.ts            # Leverage calculation
│       │       │   ├── margin.ts              # Margin management
│       │       │   ├── take-profit.ts         # Take profit strategies
│       │       │   └── mae.ts                 # Max adverse excursion
│       │       ├── types/             # TypeScript types
│       │       │   ├── futures-types.ts       # Futures trading types
│       │       │   └── index.ts               # Type exports
│       │       ├── utils/             # Utilities
│       │       │   ├── cache.ts               # Data caching
│       │       │   ├── logger.ts              # Logging utility
│       │       │   ├── multi-timeframe.ts     # MTF utilities
│       │       │   └── trend-strength.ts      # Trend strength calc
│       │       ├── config/            # Configuration
│       │       │   └── index.ts               # Server config
│       │       ├── index.ts           # Signal generation exports
│       │       └── main.ts            # Main signal generation
│       ├── dist/                      # Compiled JavaScript output
│       │   ├── index.js               # Main entry point
│       │   ├── index.d.ts             # TypeScript declarations
│       │   └── signal-generation/     # Compiled modules
│       ├── package.json               # Package dependencies
│       ├── tsconfig.json              # TypeScript config
│       └── mcp.local.json             # Local MCP configuration
├── scripts/                           # Utility scripts
│   ├── run-mcp-inspector.sh           # MCP inspector launcher
│   ├── setup-git-remote.sh            # Git remote setup
│   └── test-signal-generation.js      # Signal generation tests
├── package.json                       # Workspace root config
├── pnpm-workspace.yaml                # PNPM workspace config
├── pnpm-lock.yaml                     # Dependency lock file
├── mcp.json                           # MCP configuration
├── LICENSE                            # MIT License
└── README.md                          # This file
```

### Key Directories

| Directory | Description |
|-----------|-------------|
| `src/index.ts` | Main MCP server with 38+ tools, 19 resources, 23 prompts |
| `local-server.ts` | HTTP/SSE streaming server for remote MCP connections |
| `signal-generation/analysis/` | 20+ market analysis modules |
| `signal-generation/technical-indicators/` | 13 technical indicator modules |
| `signal-generation/data-fetchers/` | Multi-source market data fetchers |
| `signal-generation/execution/` | Paper & live trade execution |
| `signal-generation/risk-management/` | Risk management & position sizing |

## 🛠️ Development

```bash
# Development mode
pnpm run dev

# Build
pnpm run build

# Validate MCP config
pnpm run validate

# List tools & resources
pnpm run list
```

## 🔐 Security & Multi-User Support

### Analysis-Only Mode (Recommended for beginners)
Leave wallet credentials empty - all analysis tools work without trading:
```json
{
  "HYPERLIQUID_WALLET_API_KEY": "",
  "HYPERLIQUID_ACCOUNT_ADDRESS": ""
}
```

**Available without credentials:**
- ✅ All price & market data tools
- ✅ All technical analysis tools
- ✅ All volume & advanced analysis
- ✅ Risk calculations
- ✅ Paper trading simulation

### Real Trading Mode (Advanced users)
Users provide their own credentials via tool parameters OR environment variables:

**Via Tool Parameters:**
```json
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "LONG",
    "quantity": 0.1,
    "leverage": 10,
    "execute": true,
    "useLiveExecutor": true,
    "accountAddress": "0xUserAddress",
    "walletApiKey": "UserPrivateKey"
  }
}
```

**Via Environment Variables:**
```json
{
  "env": {
    "HYPERLIQUID_WALLET_API_KEY": "your_private_key",
    "HYPERLIQUID_ACCOUNT_ADDRESS": "0xYourAddress"
  }
}
```

### Security Features
- ✅ Multi-user credentials support
- ✅ Zod schema validation
- ✅ Paper trading by default
- ✅ No hardcoded secrets
- ✅ Analysis-only mode available
- ✅ Credentials per-tool override

## 🌐 API Endpoints (HTTP Streaming Mode)

When running `bash scripts/start-mcp-stream.sh`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `http://localhost:8787/` | GET | Server info & documentation |
| `http://localhost:8787/health` | GET | Health check (JSON) |
| `http://localhost:8787/mcp` | POST | MCP JSON-RPC endpoint |
| `http://localhost:8787/stream` | GET/POST | SSE streaming endpoint |

**Test Commands:**
```bash
# Health check
curl http://localhost:8787/health

# List all tools
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get BTC price
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"ticker":"BTC"}}}'
```

## 📄 License

MIT

---

*Built for the AI trading community - empowering AI assistants with professional trading capabilities*
