#!/usr/bin/env node
/**
 * GearTrade MCP Local HTTP Server with Streaming
 * Runs the MCP server locally with HTTP/SSE streaming support
 */

import { createServer } from 'http'
import { URL } from 'url'

// Import the default export which includes the fetch handler
import mcpServer from './dist/index.js'

const PORT = process.env.PORT || 8787
const HOST = 'localhost' // Always bind to localhost for security

// Create HTTP server that wraps the Cloudflare Workers fetch handler
const server = createServer(async (req, res) => {
  try {
    // Build full URL
    const protocol = req.socket.encrypted ? 'https' : 'http'
    const url = `${protocol}://${req.headers.host || HOST}${req.url || '/'}`
    
    // Read request body for POST requests
    let body = ''
    if (req.method === 'POST') {
      for await (const chunk of req) {
        body += chunk
      }
    }

    // Create abort controller for request cancellation
    const controller = new AbortController()
    req.on('close', () => controller.abort())
    
    // Create a Request object (Web standard) with signal
    const request = new Request(url, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || ''])
      ),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
      signal: controller.signal,
    })

    // Call the MCP server's fetch handler (Cloudflare Workers style)
    const response = await mcpServer.fetch(request, {}, {})

    // Handle streaming responses (SSE)
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      res.writeHead(response.status, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID',
      })

      // Stream the response body
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const text = decoder.decode(value, { stream: true })
            res.write(text)
          }
        } catch (error) {
          console.error('Stream error:', error)
        } finally {
          res.end()
        }
      } else {
        res.end()
      }
      return
    }

    // Handle regular HTTP responses
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headers[key] = value
    })

    res.writeHead(response.status, headers)

    // Send response body
    const responseBody = await response.text()
    res.end(responseBody)

  } catch (error: any) {
    console.error('Server error:', error)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error.message
      }
    }))
  }
})

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`)
    console.error(`   Try a different port: PORT=8788 npm run dev:local\n`)
  } else {
    console.error('Server error:', error)
  }
  process.exit(1)
})

// Start server
server.listen(PORT, HOST, () => {
  const address = `http://${HOST}:${PORT}`
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║                                                                ║')
  console.log('║   ⚙  GearTrade MCP Server - Local HTTP Streaming Mode         ║')
  console.log('║                                                                ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`✅ Server running at: ${address}`)
  console.log('')
  console.log('📊 Available Endpoints:')
  console.log(`   • MCP Endpoint:      ${address}/mcp`)
  console.log(`   • SSE Streaming:     ${address}/stream`)
  console.log(`   • Health Check:      ${address}/health`)
  console.log(`   • Server Info:       ${address}/`)
  console.log('')
  console.log('🔧 Streaming Features:')
  console.log('   • GET  /stream       - SSE connection with heartbeat')
  console.log('   • POST /stream       - Streaming MCP commands')
  console.log('   • POST /mcp          - Traditional JSON-RPC')
  console.log('')
  console.log('🎯 MCP Methods:')
  console.log('   • initialize, initialized')
  console.log('   • tools/list, tools/call')
  console.log('   • resources/list, resources/read')
  console.log('   • prompts/list, prompts/get')
  console.log('')
  console.log('💡 Usage Examples:')
  console.log(`   • curl ${address}/health`)
  console.log(`   • curl ${address}/stream`)
  console.log(`   • curl -X POST ${address}/mcp -H "Content-Type: application/json" \\`)
  console.log('     -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\'')
  console.log('')
  console.log('⚙  Press Ctrl+C to stop the server')
  console.log('')
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚙  Shutting down gracefully...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGTERM', () => {
  console.log('\n\n⚙  Received SIGTERM, shutting down...')
  server.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

