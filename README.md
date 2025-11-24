# AI Trading MCP Server

🤖 **Advanced MCP Server for AI-Powered Trading Assistants**

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

# Install the MCP server
pnpm run install:mcp
```

### Usage with Claude Desktop:
Add this to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

**Option 1: Direct Command Execution**
```json
{
  "mcpServers": {
    "ai-trading": {
      "command": "node",
      "args": ["/path/to/ai-trading-mcp-server/packages/geartrade-mcp-server/dist/index.js"],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "AI_PROVIDER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Option 2: HTTP Server Deployment**
```json
{
  "mcpServers": {
    "ai-trading": {
      "type": "http",
      "url": "https://geartrade-mcp-server.fajararrizki15.workers.dev/mcp"
    }
  }
}
```

### 🌐 **Live Deployment Test**
You can test the live deployment directly:
```bash
# Check server health
curl https://geartrade-mcp-server.fajararrizki15.workers.dev/health

# List all available tools
curl -X POST https://geartrade-mcp-server.fajararrizki15.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'

# Test trading analysis
curl -X POST https://geartrade-mcp-server.fajararrizki15.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"get_price","arguments":{"ticker":"BTC"}}}'
```

## ⚙️ **Multi-User Support (Open-Source Ready)**

Each user provides their own credentials via tool parameters - no hardcoded secrets!

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
    "accountAddress": "0xUserAddress",     // User's own address
    "walletApiKey": "UserPrivateKey"        // User's own private key
  }
}
```

## ⚙️ **Configuration**

### Environment Variables:
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

Key environment variables:
- `AI_PROVIDER` - Your AI provider (openrouter, openai, etc.)
- `MODEL_ID` - The model to use for analysis
- `AI_PROVIDER_API_KEY` - Your API key for the AI provider

### Development:
```bash
# Install dependencies
pnpm install

# Build the server
pnpm run build

# Run in development mode
pnpm run dev

# Validate MCP configuration
pnpm run validate
```

## 💡 **Key Features**

### 🚀 **MCP Integration**
- **Model Context Protocol** compatible
- **Claude Desktop** integration
- **AI Assistant** ready
- **Real-time trading analysis**

### 🔒 **Security First**
- **Multi-user credentials** via tool parameters
- **Paper trading safety** by default
- **Input validation** with Zod schemas
- **No hardcoded secrets** anywhere

### 🛠️ **Professional Tools**
- **Complete market analysis** with 20+ indicators
- **Risk management** with position sizing & stop loss
- **Paper trading** simulation with realistic slippage
- **Live execution** via Hyperliquid API with EIP-712 signing
- **Multi-asset support** with batch processing

## 📖 **Usage Examples**

### Basic Price Analysis:
```json
{
  "name": "get_price",
  "arguments": {
    "ticker": "BTC"
  }
}
```

### Comprehensive Market Analysis:
```json
{
  "name": "analisis_crypto",
  "arguments": {
    "ticker": "BTC",
    "capital": 10000,
    "riskPct": 2.0,
    "strategy": "flexible"
  }
}
```

### Multi-Asset Scan:
```json
{
  "name": "analisis_multiple_crypto",
  "arguments": {
    "tickers": ["BTC", "ETH", "SOL"],
    "capital": 10000
  }
}
```

### Risk Calculation:
```json
{
  "name": "calculate_risk_management",
  "arguments": {
    "ticker": "BTC",
    "entryPrice": 87000,
    "side": "LONG",
    "stopLossPct": 2.0,
    "takeProfitPct": 5.0,
    "positionSizeUsd": 1000
  }
}
```

### Paper Trading Execution:
```json
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "LONG",
    "quantity": 0.1,
    "leverage": 10,
    "execute": true,
    "useLiveExecutor": false  // Paper trading
  }
}
```

## 🎯 **Perfect For**

- **AI Trading Agents** - Complete analysis and execution capabilities
- **Trading Bots** - Sophisticated market analysis tools
- **Risk Management Systems** - Automated position sizing and risk calculations
- **Market Research** - Deep analysis across multiple assets and timeframes
- **Educational Platforms** - Teaching technical analysis and trading strategies

## 🏗️ **Architecture**

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                    AI Trading MCP Server                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │   AI Clients    │◄──►│      MCP Protocol           │◄──►│
│  │  - Claude       │    │  - Tool Execution           │    │
│  │  - Cursor IDE   │    │  - Resource Access          │    │
│  │  - Cline IDE    │    │  - Prompt Management        │    │
│  └─────────────────┘    └─────────────────────────────┘    │
│                                  │                        │
│                                  ▼                        │
│  ┌─────────────────────────────────────────────────────────┐
│  │              Core MCP Server                            │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  │   Trading Tools │  │      Resources              │  │
│  │  │  - Price (2)    │  │  - Trading State            │  │
│  │  │  - Analysis (2) │  │  - Performance Metrics      │  │
│  │  │  - Volume (2)   │  │  - Configuration            │  │
│  │  │  - Advanced (10)│  │  - Documentation            │  │
│  │  │  - Risk (2)     │  └─────────────────────────────┘  │
│  │  │  - Exec (4)     │                                   │
│  │  └─────────────────┘                                   │
│  │                                                         │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  │   AI Prompts    │  │    Security Layer           │  │
│  │  │  - Core Trading │  │  - Multi-User Credentials   │  │
│  │  │  - Technical    │  │  - Input Validation         │  │
│  │  │  - Risk Mgmt    │  │  - Paper Trading Safety     │  │
│  │  └─────────────────┘  └─────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────┘
│                                  │
│                                  ▼
│  ┌─────────────────────────────────────────────────────────┐
│  │              External APIs                               │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  │  Hyperliquid    │  │     AI Providers            │  │
│  │  │  - Market Data  │  │  - OpenRouter               │  │
│  │  │  - Execution    │  │  - OpenAI                   │  │
│  │  │  - Account Info │  │  - Custom Models            │  │
│  │  └─────────────────┘  └─────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### **🤖 MCP Protocol Layer**
- **Tool Execution**: 36 specialized trading tools for market analysis and execution
- **Resource Management**: 25 data resources for state and configuration
- **Prompt System**: 23 AI-optimized prompts for trading strategies

#### **⚙️ Core Server Components**
- **@nullshot/mcp Framework**: Modern MCP server implementation
- **TypeScript Runtime**: Type-safe execution and development
- **Security Middleware**: Input validation and credential management

#### **📊 Trading Tools Categories**
```
Trading Tools (36 Total)
├── Price Analysis (2 tools)
│   ├── Real-time price fetching
│   └── Multi-asset price comparison
├── Technical Analysis (2 tools)
│   ├── 20+ technical indicators
│   └── Multi-timeframe analysis
├── Volume Analysis (2 tools)
│   ├── Buy/sell pressure analysis
│   └── Volume profile calculations
├── Advanced Analysis (10 tools)
│   ├── Fibonacci retracements
│   ├── Order book analysis
│   ├── Market structure analysis
│   ├── Candlestick pattern recognition
│   ├── Divergence detection
│   └── Liquidation level analysis
├── Risk Management (2 tools)
│   ├── Position sizing calculations
│   └── Stop loss/take profit optimization
└── Execution Tools (4 tools)
    ├── Paper trading simulation
    ├── Live market execution
    └── Portfolio management
```

#### **🔒 Security Architecture**
```
Security Layer
├── Multi-User Credentials
│   ├── User-provided API keys
│   ├── Per-session authentication
│   └── No hardcoded secrets
├── Input Validation
│   ├── Zod schema validation
│   ├── Type safety enforcement
│   └── Parameter sanitization
└── Safe Trading Defaults
    ├── Paper trading by default
    ├── Risk limit enforcement
    └── Execution confirmations
```

#### **🌐 Integration Points**
```
External Integrations
├── Market Data Providers
│   └── Hyperliquid API
├── AI Provider Services
│   ├── OpenRouter
│   ├── OpenAI
│   └── Custom model endpoints
└── Execution Platforms
    ├── Hyperliquid Derivatives
    └── Future exchange integrations
```

## 🛠️ **Project Structure**

```
ai-trading-mcp-server/
├── packages/
│   └── geartrade-mcp-server/     # Main MCP server package
│       ├── src/
│       │   ├── index.ts          # Server entry point
│       │   ├── tools/            # Trading tools implementation
│       │   ├── resources/        # Data resources
│       │   └── prompts/          # AI trading prompts
│       ├── dist/                 # Compiled JavaScript
│       └── package.json
├── package.json                  # Workspace configuration
├── pnpm-workspace.yaml          # PNPM workspace config
└── README.md
```

## 📚 **Documentation & Support**

### Available Commands:
```bash
pnpm run dev          # Start development server
pnpm run build        # Build for production
pnpm run install:mcp  # Install MCP server
pnpm run validate     # Validate MCP configuration
pnpm run list         # List MCP tools and resources
```

### Integration:
- **Claude Desktop** - Native MCP support
- **Cline IDE** - VS Code extension with MCP
- **Cursor** - AI-powered IDE with MCP
- **Other MCP-compatible clients**

### Environment Setup:
1. Copy `.env.example` to `.env`
2. Configure your AI provider and API keys
3. Build and install the MCP server
4. Add to your MCP client configuration

## 🏆 **What Makes This Special**

- ✅ **Complete Trading Toolkit** - 36+ professional trading tools
- ✅ **MCP Protocol Ready** - Native integration with AI assistants
- ✅ **Multi-User Support** - Each user provides own credentials
- ✅ **AI-Powered Analysis** - Intelligent market insights
- ✅ **Paper Trading Safe** - Practice without real money
- ✅ **Live Trading Ready** - Real execution via Hyperliquid API
- ✅ **Open Source** - Full transparency and customization

---

**🎉 Your AI Trading Assistant is Ready!**

Install the MCP server and start using professional-grade trading tools with Claude Desktop or other AI assistants today.

**🚀 Quick Start:** Clone, install dependencies, and configure with your AI provider

---

*Built with ❤️ for the AI trading community - empowering AI assistants with comprehensive trading capabilities*