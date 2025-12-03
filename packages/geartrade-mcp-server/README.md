# GearTrade MCP Server

A comprehensive Model Context Protocol (MCP) server that bridges AI assistants with real-time technical analysis, market data, and Hyperliquid trading execution.

## 📋 Overview

This is the core MCP server package providing:
- **69 Tools** - Analysis, trading, indicators, account management
- **35 Technical Indicators** - MAs, oscillators, channels, patterns
- **31 AI Prompts** - Day trading, swing trading, position trading workflows
- **4 Resources** - Strategy guides, technical reference, risk management
- **Hyperliquid Integration** - Futures & spot trading with slippage protection
- **AI Memory** - Persistent memory with Mem0 for pattern learning
- **Real-time Data** - Prices, order book, liquidations, whale tracking

## 🏗️ Directory Structure

```
geartrade-mcp-server/
├── src/                      Source code
│   ├── formatters/          Output formatting utilities (17 files)
│   │   ├── indicators.ts    Technical indicator formatting
│   │   ├── volume.ts        Volume analysis formatting
│   │   └── ...              Other specialized formatters
│   ├── prompts/             AI prompt templates (31 prompts)
│   │   └── index.ts         Day/swing/position trading workflows
│   ├── resources/           Educational resources (4 resources)
│   │   └── index.ts         Strategy guides and references
│   ├── server/              HTTP/SSE infrastructure
│   │   ├── cors.ts          CORS middleware
│   │   └── json-rpc.ts      JSON-RPC 2.0 handler
│   ├── signal-generation/   Analysis engine
│   │   ├── analysis/        Market analysis modules
│   │   ├── data-fetchers/   API integrations
│   │   ├── exit-conditions/ Exit strategy calculations
│   │   ├── risk-management/ Position sizing and leverage
│   │   └── technical-indicators/ Indicator implementations
│   ├── tools/               69 MCP tools organized by category
│   │   ├── account/         10 account & memory tools
│   │   ├── analysis/        15 market analysis tools
│   │   ├── data/            3 price & position tools
│   │   ├── indicators/      35 technical indicator tools
│   │   └── trading/         6 trading execution tools
│   ├── memory/              AI memory storage (Mem0 integration)
│   └── index.ts             Main entry point
├── dist/                     Built JavaScript files
├── scripts/                  Build and utility scripts
├── package.json             Package manifest
├── tsconfig.json            TypeScript configuration
├── .env                     Environment variables (not in git)
└── local-server.ts          Local HTTP server for testing
```

## 🔧 Installation

### Prerequisites
- Node.js 14+ (16+ recommended)
- npm or pnpm
- TypeScript 5.x

### Install Dependencies
```bash
# From this directory
npm install

# Or using pnpm
pnpm install
```

## 📝 Configuration

### 1. Environment Variables

Copy `.env.example` and create `.env`:
```bash
cp ../.env.example .env
```

Edit `.env` with your configuration:
```bash
# Hyperliquid Trading (required for trading tools)
AGENT_WALLET_PRIVATE_KEY=<your-private-key>
MAIN_WALLET_ADDRESS=<your-wallet-address>

# AI Memory (optional, for memory tools)
MEM0_API_KEY=<your-api-key>
MEM0_USER_ID=<your-user-id>

# Server Configuration
MCP_TRANSPORT=stdio    # 'stdio' or 'http'
MCP_PORT=3000         # Only for HTTP mode
```

### 2. Build Configuration

`tsconfig.json` is pre-configured for:
- TypeScript 5.x compilation
- ES2020 target
- CommonJS modules
- Source maps for debugging
- Strict type checking

## 🚀 Usage

### Build
```bash
# Build TypeScript to JavaScript
npm run build

# Output: dist/ directory
```

### Run stdio Mode (Default)
```bash
# Run MCP server with stdio transport
node dist/index.js

# Or using npm script
npm start
```

### Run HTTP/SSE Mode
```bash
# Set environment variable
MCP_TRANSPORT=http MCP_PORT=3000 node dist/index.js

# Or use local server script
npm run local-server
```

### Development Mode
```bash
# Watch mode with auto-rebuild
npm run dev
```

## 📊 Tool Categories

### Account Tools (10 tools)
- Hyperliquid account operations (balances, transfers)
- Bridge operations (Hyperliquid ↔ Arbitrum)
- AI memory (save preferences, log trades, get insights)

### Analysis Tools (15 tools)
- Market sentiment analysis
- Technical indicators (RSI, MACD, EMA, etc.)
- Volume analysis and CVD
- Multi-timeframe trend alignment
- Order book depth analysis
- Whale tracking and tier classification

### Data Tools (3 tools)
- Real-time price data
- Position data retrieval
- Long/short ratio analysis

### Indicator Tools (35 tools)
- Moving averages (10 types)
- Oscillators (14 types)
- Channels (3 types)
- Pivot points (3 types)
- Trend indicators (6 types)
- Pattern recognition (3 types)
- Strength indicators (4 types)
- Volatility indicators (6 types)
- Volume indicators (8 types)

### Trading Tools (6 tools)
- Testnet futures trading
- Mainnet futures trading (REAL MONEY!)
- Spot trading
- Position closing
- Risk management calculations
- Position sizing

## 🎯 AI Prompts (31 total)

### Day Trading (9 prompts)
- Scalping strategies (1-5 min)
- Momentum trading
- Range trading
- Quick risk assessment

### Swing Trading (11 prompts)
- Multi-timeframe analysis
- Key level identification
- Pattern recognition
- Risk/reward optimization

### Position Trading (11 prompts)
- Long-term trend analysis
- Macro strategy
- Portfolio management
- Major support/resistance

## 📚 Resources (4 total)

1. **Trading Strategy Guide** - Day/swing/position strategies
2. **Technical Analysis Reference** - Complete indicator reference
3. **Risk Management Guide** - Position sizing, stops, R/R
4. **Tool Usage Patterns** - Practical workflow examples

## 🔌 Integration

### Claude Desktop
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "node",
      "args": [
        "C:/path/to/packages/geartrade-mcp-server/dist/index.js"
      ],
      "env": {
        "AGENT_WALLET_PRIVATE_KEY": "your-key",
        "MAIN_WALLET_ADDRESS": "your-address"
      }
    }
  }
}
```

### HTTP/SSE Mode
```bash
# Start server
MCP_TRANSPORT=http MCP_PORT=3000 node dist/index.js

# Connect from any HTTP client
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## 🧪 Testing

### Manual Testing
```bash
# Build and run
npm run build
node dist/index.js

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### Local HTTP Server
```bash
# Run local server for testing
npm run local-server

# Access at http://localhost:3000
```

## 🛠️ Development

### Project Structure
- **src/** - TypeScript source code
- **dist/** - Compiled JavaScript (generated)
- **scripts/** - Build and utility scripts
- **node_modules/** - Dependencies (generated)

### Adding New Tools
1. Create tool file in appropriate category
2. Export from category `index.ts`
3. Register in main `tools/index.ts`
4. Build and test

### Modifying Indicators
1. Edit files in `signal-generation/technical-indicators/`
2. Update corresponding tool in `tools/indicators/`
3. Update formatters if needed
4. Build and test

## 📦 Dependencies

### Production
- `@nullshot/mcp` - MCP SDK framework
- `zod` - Schema validation
- `dotenv` - Environment variables
- `ethers` - Ethereum wallet operations
- `axios` - HTTP requests

### Development
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `ts-node` - TypeScript execution
- `nodemon` - Auto-restart on changes

## 🚀 Deployment

### Production Build
```bash
# Clean and build
npm run clean
npm run build

# Run production server
NODE_ENV=production node dist/index.js
```

### Docker (Coming Soon)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

## 🔧 Maintenance

### Update Dependencies
```bash
npm update
```

### Clean Build
```bash
npm run clean
# or manually
rm -rf dist
```

### Rebuild
```bash
npm run build
```

## 📊 Performance

- **Tool Execution**: < 100ms (most tools)
- **Data Fetching**: 200-500ms (external APIs)
- **Memory Usage**: ~100-200MB
- **Concurrent Requests**: Supports multiple simultaneous tool calls

## 🔐 Security

- Private keys stored in `.env` (not committed)
- Droid-Shield protection against secret leaks
- Input validation with Zod schemas
- Slippage protection for trades (0.010% - 8.00%)
- Testnet available for safe testing

## 🚨 Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Runtime Errors
- Check `.env` file exists with required variables
- Verify Node.js version (14+)
- Check wallet private key is valid
- Ensure APIs are accessible (no firewall blocking)

### Memory Errors
- AI memory requires `MEM0_API_KEY` and `MEM0_USER_ID`
- Get API key from https://mem0.ai

### Trading Errors
- Test on testnet first (`isTestnet: true`)
- Verify wallet has sufficient balance
- Check leverage and position size limits
- Review slippage configuration

## 🚀 Future Enhancements

- WebSocket support for real-time streaming
- Multi-exchange support (Binance, Bybit, etc.)
- Advanced pattern recognition with ML
- Backtesting engine integration
- Web dashboard UI
- Mobile notifications
- Portfolio analytics

## 📄 License

MIT License - See root LICENSE file

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: See README files in each subdirectory
- **API Reference**: See tool descriptions in code

---

**Made with ❤️ by the GearTrade Team**
