/**
 * Streaming MCP Client - SSE (Server-Sent Events) support
 * For real-time streaming responses from MCP server
 */

import type { IMCPClient, MCPTool, MCPResource } from './types.js'

export interface StreamServerConfig {
  url: string
  headers?: Record<string, string>
}

export interface StreamEvent {
  id: string
  event: string
  data: any
}

export class StreamMCPClient implements IMCPClient {
  private config: StreamServerConfig
  private messageId = 0
  private eventSource?: EventSource

  constructor(config: StreamServerConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    // Test connection
    try {
      const response = await fetch(this.config.url.replace('/stream', '/health'), {
        method: 'GET',
        headers: this.config.headers || {},
      })
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const info = await response.json() as any
      if (!info.streaming) {
        throw new Error('Server does not support streaming')
      }

      // Initialize with regular POST
      await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: 'geartrade-terminal-stream',
          version: '1.0.0',
        },
      })
    } catch (error: any) {
      throw new Error(`Failed to connect: ${error.message}`)
    }
  }

  // Create SSE connection for real-time updates
  async connectStream(onEvent: (event: StreamEvent) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const streamUrl = this.config.url
      
      // Node.js doesn't have native EventSource, use fetch with streaming
      fetch(streamUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...this.config.headers,
        },
      }).then(async (response) => {
        if (!response.ok) {
          reject(new Error(`Stream connection failed: ${response.status}`))
          return
        }

        if (!response.body) {
          reject(new Error('No response body for streaming'))
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        resolve()

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            let currentEvent: Partial<StreamEvent> = {}
            
            for (const line of lines) {
              if (line.startsWith('id:')) {
                currentEvent.id = line.substring(3).trim()
              } else if (line.startsWith('event:')) {
                currentEvent.event = line.substring(6).trim()
              } else if (line.startsWith('data:')) {
                try {
                  currentEvent.data = JSON.parse(line.substring(5).trim())
                } catch {
                  currentEvent.data = line.substring(5).trim()
                }
              } else if (line === '' && currentEvent.event) {
                // Event complete
                onEvent(currentEvent as StreamEvent)
                currentEvent = {}
              }
            }
          }
        } catch (error) {
          console.error('Stream reading error:', error)
        }
      }).catch(reject)
    })
  }

  // Send request with streaming support
  async sendStreamingRequest(method: string, params?: any): Promise<AsyncIterator<StreamEvent>> {
    const id = ++this.messageId
    
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    const response = await fetch(this.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...this.config.headers,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const iterator = {
      async next(): Promise<IteratorResult<StreamEvent>> {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            return { done: true, value: undefined }
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          let currentEvent: Partial<StreamEvent> = {}
          
          for (const line of lines) {
            if (line.startsWith('id:')) {
              currentEvent.id = line.substring(3).trim()
            } else if (line.startsWith('event:')) {
              currentEvent.event = line.substring(6).trim()
            } else if (line.startsWith('data:')) {
              try {
                currentEvent.data = JSON.parse(line.substring(5).trim())
              } catch {
                currentEvent.data = line.substring(5).trim()
              }
            } else if (line === '' && currentEvent.event) {
              // Event complete
              return { done: false, value: currentEvent as StreamEvent }
            }
          }
        }
      }
    }
    
    return iterator
  }

  private async sendRequest(method: string, params?: any): Promise<any> {
    const id = ++this.messageId
    
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    try {
      // Use non-streaming endpoint for regular requests
      const url = this.config.url.replace('/stream', '/mcp')
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json() as { error?: { message?: string }, result?: any }
      
      if (result.error) {
        throw new Error(result.error.message || 'Unknown error')
      }
      
      return result.result
    } catch (error: any) {
      throw new Error(`Request failed: ${error.message}`)
    }
  }

  async listTools(): Promise<MCPTool[]> {
    const result = await this.sendRequest('tools/list')
    return result.tools || []
  }

  async callTool(name: string, args: any): Promise<any> {
    const result = await this.sendRequest('tools/call', {
      name,
      arguments: args,
    })
    return result
  }

  async listResources(): Promise<MCPResource[]> {
    const result = await this.sendRequest('resources/list')
    return result.resources || []
  }

  async readResource(uri: string): Promise<any> {
    const result = await this.sendRequest('resources/read', { uri })
    return result
  }

  async disconnect(): Promise<void> {
    // Close any open streams
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = undefined
    }
  }
}

