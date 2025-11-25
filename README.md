# GearTrade MCP Server

🤖 **Model Context Protocol Server for AI-Powered Cryptocurrency Trading**

A comprehensive MCP server that provides AI assistants with professional cryptocurrency trading capabilities through standardized protocols. Built for seamless integration with Claude Desktop, Cursor, and other MCP-compatible clients.

## 🚀 Quick Start

### Installation
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
geartrade-mcp-server/
├── packages/
│   └── geartrade-mcp-server/
│       ├── src/
│       │   └── index.ts        # MCP server implementation
│       ├── dist/               # Compiled output
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

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
