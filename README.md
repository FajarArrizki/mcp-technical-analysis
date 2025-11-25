# AI Trading MCP Server

🤖 **Model Context Protocol Server for AI-Powered Trading**

A comprehensive MCP server that provides AI assistants with real-time cryptocurrency trading capabilities through standardized protocols. Connect Claude, Cursor, or any MCP-compatible client to access professional-grade trading tools.

## 🎯 **MCP Server Capabilities**

### 📊 **36 Trading Tools**
| Category | Tools | Description |
|----------|-------|-------------|
| Price | 2 | Real-time pricing for single/multiple assets |
| Technical Analysis | 2 | 20+ indicators (RSI, EMA, MACD, Bollinger Bands) |
| Volume Analysis | 2 | Buy/sell pressure, CVD, liquidity analysis |
| Multi-Timeframe | 2 | Daily, 4H, 1H trend alignment |
| Advanced Analysis | 10 | Fibonacci, Order Book, Volume Profile, Market Structure |
| Risk Management | 2 | Position sizing, stop loss, take profit |
| Comprehensive | 2 | Complete crypto analysis with position setup |
| Execution | 4 | Paper trading + live execution via Hyperliquid |

### 📚 **25 Resources**
- `geartrade://state` - Current trading state
- `geartrade://performance` - Performance metrics
- `geartrade://config` - Server configuration
- `geartrade://docs/*` - Trading documentation

### 🤖 **23 AI Prompts**
Pre-built prompts for trading workflows: `analyze_and_execute`, `multi_asset_scan`, `technical_indicator_analysis`, `risk_analysis`, and more.

---

## 🚀 **Quick Start**

### Installation
```bash
git clone https://github.com/FajarArrizki/ai-trading-mcp-server.git
cd ai-trading-mcp-server
pnpm install
pnpm run build
```

### MCP Client Configuration

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ai-trading": {
      "command": "node",
      "args": ["/path/to/ai-trading-mcp-server/packages/geartrade-mcp-server/dist/index.js"],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "AI_PROVIDER_API_KEY": "your-api-key"
      }
    }
  }
}
```

**HTTP Mode** (for hosted deployments):
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

---

## 🔧 **MCP Protocol**

### Tool Call Examples

**Get Price:**
```json
{"method": "tools/call", "params": {"name": "get_price", "arguments": {"ticker": "BTC"}}}
```

**Technical Analysis:**
```json
{"method": "tools/call", "params": {"name": "get_technical_analysis", "arguments": {"ticker": "ETH", "timeframe": "4h"}}}
```

**Risk Calculation:**
```json
{"method": "tools/call", "params": {"name": "calculate_risk_management", "arguments": {"ticker": "BTC", "entryPrice": 87000, "side": "LONG", "stopLossPct": 2.0, "positionSizeUsd": 1000}}}
```

**Execute Trade (Paper):**
```json
{"method": "tools/call", "params": {"name": "get_execution_futures", "arguments": {"ticker": "BTC", "side": "LONG", "quantity": 0.1, "leverage": 10, "execute": true, "useLiveExecutor": false}}}
```

### Resource Access
```json
{"method": "resources/read", "params": {"uri": "geartrade://state"}}
```

### List Available Tools
```json
{"method": "tools/list"}
```

---

## 🔒 **Multi-User Credentials**

Users provide their own credentials via tool parameters - no hardcoded secrets:

```json
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "LONG",
    "quantity": 0.1,
    "execute": true,
    "useLiveExecutor": true,
    "accountAddress": "0xUserAddress",
    "walletApiKey": "UserPrivateKey"
  }
}
```

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                  AI Trading MCP Server                  │
├─────────────────────────────────────────────────────────┤
│  MCP Protocol Layer                                     │
│  ├── Tool Execution (36 tools)                         │
│  ├── Resource Access (25 resources)                    │
│  └── Prompt Management (23 prompts)                    │
├─────────────────────────────────────────────────────────┤
│  Core Services                                          │
│  ├── Market Data (Hyperliquid API)                     │
│  ├── Technical Analysis Engine                         │
│  ├── Risk Management Calculator                        │
│  └── Trade Executor (Paper + Live)                     │
├─────────────────────────────────────────────────────────┤
│  Security                                               │
│  ├── Input Validation (Zod)                            │
│  ├── Multi-User Credentials                            │
│  └── Paper Trading Default                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 **Project Structure**

```
ai-trading-mcp-server/
├── packages/
│   └── geartrade-mcp-server/
│       ├── src/index.ts          # MCP server entry
│       └── dist/                 # Built output
├── package.json
└── pnpm-workspace.yaml
```

---

## 🛠️ **Development**

```bash
pnpm run dev        # Development mode
pnpm run build      # Build server
pnpm run validate   # Validate MCP config
pnpm run list       # List tools & resources
```

### Environment Variables
```bash
AI_PROVIDER=openrouter
MODEL_ID=openai/gpt-4-turbo
AI_PROVIDER_API_KEY=your-key
```

---

## 🌐 **Live Server**

Test the hosted MCP server:
```bash
# Health check
curl https://geartrade-mcp-server.fajararrizki15.workers.dev/health

# List tools
curl -X POST https://geartrade-mcp-server.fajararrizki15.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'
```

---

## 📖 **Compatible Clients**

- **Claude Desktop** - Native MCP support
- **Cursor IDE** - AI coding with MCP
- **Cline** - VS Code MCP extension
- **Any MCP-compatible client**

---

**Built for the AI trading community** | [MCP Protocol Spec](https://modelcontextprotocol.io)
