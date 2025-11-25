# GearTrade MCP Server

🤖 **Model Context Protocol Server for AI-Powered Cryptocurrency Trading**

A comprehensive Model Context Protocol (MCP) server that bridges AI assistants with professional cryptocurrency trading capabilities. This server transforms AI conversations by providing real-time market data, sophisticated technical analysis, and intelligent trade execution tools through standardized MCP protocols. Whether you're building trading bots, automated strategies, or AI financial advisors, this server delivers the complete infrastructure needed for data-driven trading decisions across multiple timeframes and asset classes.

**🔥 Key Features:**
- Real-time market analysis and price monitoring
- Advanced technical indicators (RSI, MACD, Bollinger Bands, etc.)
- Intelligent risk management and position sizing
- Paper trading simulation for strategy testing
- Live trade execution via Hyperliquid API
- Multi-timeframe analysis and market scanning

## 🌟 **What's Included**

### 📊 **36 Complete Trading Tools**
- **Price Tools** (2): Real-time pricing for single/multiple assets
- **Technical Analysis** (2): 20+ indicators (RSI, EMA, MACD, Bollinger Bands, etc.)
- **Volume Analysis** (2): Buy/sell pressure, CVD, liquidity analysis
- **Multi-Timeframe** (2): Daily, 4H, 1H trend alignment analysis
- **Advanced Analysis** (10): Fibonacci, Order Book, Volume Profile, Market Structure, Candlestick Patterns, Divergence, Liquidation Levels, Long/Short Ratio, Spot-Futures Divergence
- **Risk Management** (2): Position sizing, stop loss, take profit calculations
- **Comprehensive Analysis** (2): Complete crypto analysis with position setup
- **Execution Tools** (4): Spot & Futures trading (paper trading + live execution)

### 📚 **25 Trading Resources**
- `geartrade://state` - Current trading state
- `geartrade://performance` - Performance metrics
- `geartrade://config` - Configuration
- `geartrade://docs/*` - Complete trading documentation

### 🤖 **23 AI Trading Prompts**
- Core trading: `analyze_and_execute`, `multi_asset_scan`, `comprehensive_analysis`
- Technical: `technical_indicator_analysis`, `volume_profile_analysis`, `market_structure_analysis`
- Advanced: `divergence_scan`, `liquidation_analysis`, `fibonacci_trading_strategy`
- Risk: `risk_analysis`, `position_monitoring`, `portfolio_review`

## 🚀 **Quick Start**

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

### Configure MCP Client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "node",
      "args": ["/path/to/packages/geartrade-mcp-server/dist/index.js"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "node",
      "args": ["/path/to/packages/geartrade-mcp-server/dist/index.js"]
    }
  }
}
```

## 📦 MCP Capabilities

### Tools (36)
| Category | Count | Description |
|----------|-------|-------------|
| Price Analysis | 2 | Real-time pricing for single/multiple assets |
| Technical Analysis | 2 | 20+ indicators (RSI, EMA, MACD, Bollinger Bands) |
| Volume Analysis | 2 | Buy/sell pressure, CVD, liquidity analysis |
| Multi-Timeframe | 2 | Daily, 4H, 1H trend alignment |
| Advanced Analysis | 10 | Fibonacci, Order Book, Market Structure, Patterns |
| Risk Management | 2 | Position sizing, stop loss, take profit |
| Comprehensive | 2 | Complete crypto analysis with position setup |
| Execution | 4 | Paper trading + live execution via Hyperliquid |

### Resources (25)
- `geartrade://state` - Current trading state
- `geartrade://performance` - Performance metrics
- `geartrade://config` - Configuration
- `geartrade://docs/*` - Trading documentation

### Prompts (23)
- **Core**: `analyze_and_execute`, `multi_asset_scan`, `comprehensive_analysis`
- **Technical**: `technical_indicator_analysis`, `volume_profile_analysis`
- **Advanced**: `divergence_scan`, `liquidation_analysis`, `fibonacci_trading_strategy`
- **Risk**: `risk_analysis`, `position_monitoring`, `portfolio_review`

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
- Tool Execution: 36 trading tools for analysis and execution
- Resource Management: 25 data resources
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
│   └── geartrade-mcp-server/                  # Main MCP server package
│       ├── src/
│       │   ├── index.ts                       # MCP server entry (36 tools, 25 resources, 23 prompts)
│       │   └── signal-generation/             # Trading engine modules
│       │       ├── ai/                        # AI integration
│       │       │   ├── call-api.ts            # OpenRouter/OpenAI API calls
│       │       │   └── index.ts
│       │       ├── analysis/                  # Market analysis modules
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
│       │       ├── data-fetchers/             # Market data sources
│       │       │   ├── binance.ts             # Binance spot data
│       │       │   ├── binance-futures.ts     # Binance futures data
│       │       │   ├── blockchain.ts          # On-chain data
│       │       │   ├── hyperliquid.ts         # Hyperliquid API
│       │       │   ├── market-data.ts         # Aggregated market data
│       │       │   └── historical-data.ts     # Historical OHLCV data
│       │       ├── execution/                 # Trade execution
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
│       │       ├── risk-management/           # Risk management
│       │       │   ├── anti-liquidation.ts    # Liquidation protection
│       │       │   ├── emergency-exit.ts      # Emergency exit logic
│       │       │   ├── leverage.ts            # Leverage calculation
│       │       │   ├── margin.ts              # Margin management
│       │       │   ├── take-profit.ts         # Take profit strategies
│       │       │   └── mae.ts                 # Max adverse excursion
│       │       ├── types/                     # TypeScript types
│       │       │   ├── futures-types.ts       # Futures trading types
│       │       │   └── index.ts               # Type exports
│       │       ├── utils/                     # Utilities
│       │       │   ├── cache.ts               # Data caching
│       │       │   ├── logger.ts              # Logging utility
│       │       │   ├── multi-timeframe.ts     # MTF utilities
│       │       │   └── trend-strength.ts      # Trend strength calc
│       │       ├── config/                    # Configuration
│       │       │   └── index.ts               # Server config
│       │       ├── index.ts                   # Signal generation exports
│       │       └── main.ts                    # Main signal generation
│       ├── dist/                              # Compiled JavaScript output
│       │   ├── index.js                       # Main entry point
│       │   ├── index.d.ts                     # TypeScript declarations
│       │   └── signal-generation/             # Compiled modules
│       ├── package.json                       # Package dependencies
│       ├── tsconfig.json                      # TypeScript config
│       └── wrangler.toml                      # Cloudflare Workers config
├── scripts/                                   # Utility scripts
│   ├── run-mcp-inspector.sh                   # MCP inspector launcher
│   ├── setup-git-remote.sh                    # Git remote setup
│   └── test-signal-generation.js              # Signal generation tests
├── package.json                               # Workspace root config
├── pnpm-workspace.yaml                        # PNPM workspace config
├── pnpm-lock.yaml                             # Dependency lock file
├── mcp.json                                   # MCP configuration
├── LICENSE                                    # MIT License
└── README.md                                  # This file
```

### Key Directories

| Directory | Description |
|-----------|-------------|
| `src/index.ts` | Main MCP server with 36 tools, 25 resources, 23 prompts |
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

## 🔐 Multi-User Credentials

Users provide their own credentials via tool parameters:

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

## 📄 License

MIT

---

*Built for the AI trading community - empowering AI assistants with professional trading capabilities*
