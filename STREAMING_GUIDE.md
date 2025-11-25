# 🚀 GearTrade MCP Streaming Guide

## Overview

GearTrade MCP Server mendukung **HTTP Streaming** dengan **SSE (Server-Sent Events)** untuk real-time responses dan monitoring.

## Features

✅ **SSE Streaming** - Real-time server events  
✅ **HTTP/JSON-RPC** - Traditional request/response  
✅ **Heartbeat** - Auto connection monitoring  
✅ **Multi-endpoint** - Stream, MCP, Health checks  
✅ **CORS Support** - Cross-origin ready  

## Quick Start

### 1️⃣ Start MCP Server with Streaming

```bash
# Terminal 1 - Start streaming server
bash scripts/start-mcp-stream.sh
```

Server akan berjalan di: `http://localhost:8787`

### 2️⃣ Connect Terminal UI

```bash
# Terminal 2 - Connect dengan Terminal UI
cd /root/GEARTRADE
pnpm run terminal
```

Terminal UI otomatis detect streaming mode dari `mcp.json`.

## Available Endpoints

### 🔥 Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stream` | GET | SSE connection with heartbeat |
| `/stream` | POST | Streaming MCP commands |
| `/mcp` | POST | Traditional JSON-RPC |
| `/health` | GET | Health check |
| `/` | GET | Server info |

### 📡 SSE Stream Connection

```bash
# Connect to SSE stream (heartbeat every 30s)
curl -N http://localhost:8787/stream
```

Response format:
```
id: 0
event: connected
data: {"type":"connection","message":"Connected to MCP streaming server",...}

id: 1
event: heartbeat
data: {"type":"heartbeat","timestamp":"2024-11-25T..."}
```

### 🔧 Streaming MCP Command

```bash
# Execute MCP command with streaming response
curl -X POST http://localhost:8787/stream \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

Streaming events:
1. `request_received` - Request diterima
2. `processing` - Sedang diproses
3. `response` - Response data
4. `completed` - Selesai

### 📋 Traditional JSON-RPC

```bash
# Non-streaming request/response
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### 💚 Health Check

```bash
curl http://localhost:8787/health
```

Response:
```json
{
  "status": "ok",
  "server": "geartrade-mcp-server",
  "version": "1.0.0",
  "streaming": true,
  "endpoints": ["/stream", "/mcp", "/events"]
}
```

## Configuration

### mcp.json (Streaming Mode)

```json
{
  "mcpServers": {
    "geartrade-stream": {
      "type": "stream",
      "url": "http://localhost:8787/stream",
      "description": "GearTrade MCP with SSE Streaming"
    }
  }
}
```

### Change Port

```bash
# Set custom port
PORT=9000 tsx packages/geartrade-mcp-server/local-server.ts
```

## Scripts

```bash
# Start streaming server
pnpm run stream        # Development mode
pnpm run stream:prod   # Production mode

# Test streaming
pnpm run test-stream   # Test SSE connection

# Test MCP
pnpm run test-mcp      # Test tools/list
```

## Event Types

### SSE Events

| Event | Description | Data |
|-------|-------------|------|
| `connected` | Initial connection | Server info |
| `heartbeat` | Keep-alive ping | Timestamp |
| `request_received` | Request received | Method, params |
| `processing` | Processing request | Status message |
| `response` | MCP response | Result data |
| `completed` | Request completed | Success status |
| `error` | Error occurred | Error message |

## MCP Methods

All standard MCP methods supported:

- `initialize` - Initialize connection
- `initialized` - Confirm initialization
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List resources
- `resources/read` - Read resource
- `prompts/list` - List prompts
- `prompts/get` - Get prompt
- `ping` - Health check

## Advanced Usage

### JavaScript/TypeScript Client

```typescript
import { StreamMCPClient } from './stream-mcp-client'

const client = new StreamMCPClient({
  url: 'http://localhost:8787/stream'
})

// Connect
await client.connect()

// Listen to real-time events
await client.connectStream((event) => {
  console.log(`Event: ${event.event}`, event.data)
})

// Execute streaming command
const iterator = await client.sendStreamingRequest('tools/list')
for await (const event of iterator) {
  console.log(event)
}

// Traditional request
const tools = await client.listTools()
console.log(tools)
```

### Batch Requests

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '[
    {"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}},
    {"jsonrpc":"2.0","id":2,"method":"resources/list","params":{}}
  ]'
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :8787

# Or use different port
PORT=8788 bash scripts/start-mcp-stream.sh
```

### Connection Timeout

- Check if server is running: `curl http://localhost:8787/health`
- Check firewall settings
- Ensure no proxy blocking localhost

### Stream Not Working

- Verify `Content-Type: text/event-stream` in response
- Check browser/client SSE support
- Test with `curl -N` for raw stream

## Performance

- Heartbeat: 30 seconds interval
- Auto reconnect on disconnect
- CORS headers for cross-origin
- Keep-alive connection
- Streaming reduces latency for large responses

## Security

⚠️ **Local Development Only**

Current setup is for local development. For production:

1. Add authentication (API keys, OAuth)
2. Enable HTTPS/TLS
3. Rate limiting
4. Input validation
5. Whitelist CORS origins

## Example Output

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ⚙  GearTrade MCP Server - Local HTTP Streaming Mode         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

✅ Server running at: http://localhost:8787

📊 Available Endpoints:
   • MCP Endpoint:      http://localhost:8787/mcp
   • SSE Streaming:     http://localhost:8787/stream
   • Health Check:      http://localhost:8787/health
   • Server Info:       http://localhost:8787/

🔧 Streaming Features:
   • GET  /stream       - SSE connection with heartbeat
   • POST /stream       - Streaming MCP commands
   • POST /mcp          - Traditional JSON-RPC

⚙  Press Ctrl+C to stop the server
```

## Next Steps

1. ✅ Start server: `bash scripts/start-mcp-stream.sh`
2. ✅ Test health: `curl http://localhost:8787/health`
3. ✅ Connect Terminal UI: `pnpm run terminal`
4. ✅ Execute tools and monitor real-time

Happy trading! 🚀⚙️


