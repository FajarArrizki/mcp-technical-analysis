# Server

This directory contains server infrastructure components for HTTP/SSE streaming and MCP protocol support.

## 📁 Files

- **`cors.ts`** - CORS middleware configuration for cross-origin requests
- **`json-rpc.ts`** - JSON-RPC 2.0 protocol handler for MCP communication

## 🎯 Purpose

The server module provides:

1. **HTTP/SSE Streaming** - Real-time data streaming support
2. **CORS Configuration** - Cross-origin request handling
3. **JSON-RPC Protocol** - MCP communication protocol
4. **Error Handling** - Standardized error responses
5. **Transport Layer** - Abstraction for stdio and HTTP transports

## 📝 Components

### CORS Middleware (`cors.ts`)

Handles cross-origin requests for HTTP/SSE transport:

```typescript
import { configureCORS } from './server/cors'

// Configure CORS for Express app
configureCORS(app)
```

**Features:**
- Allows all origins in development
- Configurable origin whitelist for production
- Pre-flight request handling
- Custom headers support

### JSON-RPC Handler (`json-rpc.ts`)

Implements JSON-RPC 2.0 protocol for MCP:

```typescript
import { handleJSONRPC } from './server/json-rpc'

// Process JSON-RPC request
const response = await handleJSONRPC(request, mcpServer)
```

**Features:**
- Request/response validation
- Method routing (tools, prompts, resources)
- Error code standardization
- Batch request support

## 🔄 Transport Support

The server supports multiple transport modes:

### 1. stdio Transport (Default)
Standard input/output for direct MCP client integration:
```bash
node dist/index.js
```

### 2. HTTP/SSE Transport
HTTP server with Server-Sent Events for real-time streaming:
```bash
MCP_TRANSPORT=http MCP_PORT=3000 node dist/index.js
```

## 🏗️ Architecture

```
server/
├── cors.ts         - CORS middleware
└── json-rpc.ts     - JSON-RPC 2.0 handler
```

## 📊 Request Flow

```
Client Request
    ↓
CORS Middleware (HTTP only)
    ↓
JSON-RPC Handler
    ↓
MCP Server (tools/prompts/resources)
    ↓
Response Formatter
    ↓
Client Response
```

## 🔧 Configuration

### Environment Variables

- `MCP_TRANSPORT` - Transport mode (`stdio` or `http`, default: `stdio`)
- `MCP_PORT` - HTTP server port (default: `3000`)
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

### Example Configuration

```bash
# HTTP/SSE mode with custom port
MCP_TRANSPORT=http
MCP_PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

## 🚀 Usage Example

```typescript
import { McpServer } from '@nullshot/mcp'
import { configureCORS } from './server/cors'
import { handleJSONRPC } from './server/json-rpc'

// Create MCP server
const server = new McpServer()

// Configure HTTP transport
if (transport === 'http') {
  const app = express()
  configureCORS(app)
  
  app.post('/mcp', async (req, res) => {
    const response = await handleJSONRPC(req.body, server)
    res.json(response)
  })
}
```

## 🛡️ Security

- CORS origin validation
- Request size limits
- Rate limiting (recommended for production)
- Input sanitization via JSON-RPC validation

## 🚀 Future Enhancements

- WebSocket transport
- Authentication middleware
- Request logging and metrics
- Response compression
- SSL/TLS support

---

**Note**: Server components are internal infrastructure. They support both stdio and HTTP/SSE transports for MCP protocol.
