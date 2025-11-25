# ⚙️ GearTrade MCP - Quick Start

## 🚀 Streaming Mode (Recommended)

### Terminal 1: Start Streaming Server

```bash
cd /root/GEARTRADE
bash scripts/start-mcp-stream.sh
```

Output:
```
╔════════════════════════════════════════════════════════════════╗
║   ⚙  GearTrade MCP Server - Local HTTP Streaming Mode         ║
╚════════════════════════════════════════════════════════════════╝

✅ Server running at: http://localhost:8787

📊 Available Endpoints:
   • MCP Endpoint:      http://localhost:8787/mcp
   • SSE Streaming:     http://localhost:8787/stream
   • Health Check:      http://localhost:8787/health
```

### Terminal 2: Connect Terminal UI

```bash
cd /root/GEARTRADE
pnpm run terminal
```

## 📋 Quick Commands

```bash
# Test health
curl http://localhost:8787/health

# Test SSE stream
curl -N http://localhost:8787/stream

# List tools
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get price
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"ticker":"BTC"}}}'
```

## 📖 Guides

- **[STREAMING_GUIDE.md](./STREAMING_GUIDE.md)** - Complete streaming documentation
- **[HOW_TO_USE_TERMINAL.md](./HOW_TO_USE_TERMINAL.md)** - Terminal UI guide
- **[README.md](./README.md)** - Full project documentation

## 🔧 Configuration

Current config in `mcp.json`:
```json
{
  "mcpServers": {
    "geartrade-stream": {
      "type": "stream",
      "url": "http://localhost:8787/stream"
    }
  }
}
```

## ⚙️ Features

✅ Real-time SSE streaming  
✅ 36 Trading tools  
✅ 25 Resources  
✅ 23 Prompts  
✅ Gear-themed Terminal UI  
✅ HTTP + Streaming modes  

Happy trading! 🚀



