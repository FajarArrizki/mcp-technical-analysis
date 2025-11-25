/**
 * HTTP MCP Client - for Nullshot MCP servers (HTTP-based)
 * Compatible with Cloudflare Workers deployment
 */

import type { IMCPClient, MCPTool, MCPResource } from './types.js'

export interface HTTPServerConfig {
  url: string
  headers?: Record<string, string>
}

export class HTTPMCPClient implements IMCPClient {
  private config: HTTPServerConfig
  private messageId = 0

  constructor(config: HTTPServerConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    // Test connection
    try {
      const response = await fetch(this.config.url, {
        method: 'GET',
        headers: this.config.headers || {},
      })
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }
      
      // Initialize
      await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {},
        },
        clientInfo: {
          name: 'geartrade-terminal',
          version: '1.0.0',
        },
      })
    } catch (error: any) {
      throw new Error(`Failed to connect: ${error.message}`)
    }
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
      const response = await fetch(this.config.url, {
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
    // HTTP client doesn't need cleanup
  }
}

