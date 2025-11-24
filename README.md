# GearTrade MCP Server - Cloudflare Workers Edition

🚀 **Complete Trading Analysis & Execution Platform with 36+ Tools**
🌐 **Deployed on Cloudflare Workers Global Edge Network**

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

## 🌐 **Live Demo**

**🔗 URL:** https://geartrade-mcp-server.fajararrizki15.workers.dev

### Quick API Test:
```bash
# Check server status
curl https://geartrade-mcp-server.fajararrizki15.workers.dev/health

# List all 36 tools
curl -X POST https://geartrade-mcp-server.fajararrizki15.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/list"}'

# Get comprehensive BTC analysis
curl -X POST https://geartrade-mcp-server.fajararrizki15.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"method":"tools/call","params":{"name":"analisis_crypto","arguments":{"ticker":"BTC","capital":10000}}}'
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

## 🚀 **Deploy Your Own Version**

### Prerequisites:
- Cloudflare account (free tier works!)
- Node.js 18+ and npm
- Git

### Quick Setup:
```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/geartrade-mcp-server.git
cd geartrade-mcp-server/packages/geartrade-mcp-server

# Install dependencies
npm install

# Set your environment variables
wrangler secret put AI_PROVIDER      # e.g., "openrouter"
wrangler secret put MODEL_ID         # e.g., "openai/gpt-4-turbo"
wrangler secret put AI_PROVIDER_API_KEY  # Your AI provider key

# Deploy to Cloudflare Workers
wrangler deploy
```

**🎉 Your server will be live at:** `https://your-worker-name.workers.dev`

## 💡 **Key Features**

### 🌍 **Global Performance**
- **200+ Edge Locations** worldwide via Cloudflare
- **Sub-second response times**
- **Auto-scaling** with zero server management
- **HTTPS security** by default

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

## 📊 **Architecture**

```
GearTrade MCP Server
├── 🌐 Cloudflare Workers (Global Edge)
│   ├── 📊 36 Trading Tools
│   ├── 📚 25 Resources
│   └── 🤖 23 AI Prompts
├── 🔧 MCP Protocol Integration
├── 💰 Hyperliquid API Support
└── 🔒 Multi-User Security
```

## 💰 **Cost**

### Cloudflare Workers (Free Tier):
- **100,000 requests/day** included
- **Global CDN** included
- **SSL certificates** included
- **Pay-as-you-go** after free tier (~$0.50 per million requests)

### Tips to Minimize Costs:
- Use batch tools (`get_multiple_*`) for efficiency
- Cache responses where appropriate
- Monitor usage in Cloudflare dashboard

## 📞 **Documentation**

- **[User Deployment Guide](USER_DEPLOYMENT_GUIDE.md)** - Step-by-step setup instructions
- **[Migration Summary](MIGRATION_SUMMARY.md)** - Complete migration details
- **[API Documentation](https://geartrade-mcp-server.fajararrizki15.workers.dev)** - Interactive API docs

## 🔗 **Integration**

### MCP Clients:
- **Cline IDE** - VS Code extension
- **Cursor** - AI-powered IDE
- **Other MCP-compatible clients**

### Direct API:
```bash
# All endpoints work with standard HTTP requests
GET  /health          - Server status
GET  /resources       - List all resources
GET  /prompts         - List all prompts
POST /mcp            - Main MCP protocol endpoint
```

## 🏆 **What Makes This Special**

- ✅ **Complete Migration** - All 36+ tools from original server
- ✅ **Serverless Architecture** - Zero server maintenance
- ✅ **Multi-User Ready** - Each user provides own credentials
- ✅ **Open Source Deployable** - No vendor lock-in
- ✅ **Global Performance** - 200+ edge locations
- ✅ **Production Ready** - Full security and monitoring
- ✅ **Free to Deploy** - Uses Cloudflare free tier

---

**🎉 Your Complete Trading Platform is Ready!**

Deploy your own version in minutes and start using professional-grade trading tools today.

**🚀 Get Started:** [User Deployment Guide](USER_DEPLOYMENT_GUIDE.md)

---

*Built with ❤️ for the trading community - empowering AI agents with comprehensive trading capabilities*