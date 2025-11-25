/**
 * MCP Client - Connects to MCP Server via stdio
 * Built without complex imports for deployment compatibility
 */

import { spawn, ChildProcess } from 'child_process'
import type { IMCPClient, MCPTool, MCPResource } from './types.js'

export interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
}

export class MCPClient implements IMCPClient {
  private process?: ChildProcess
  private config: MCPServerConfig
  private messageId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void
    reject: (error: any) => void
  }>()
  private buffer = ''

  constructor(config: MCPServerConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...this.config.env,
      }

      this.process = spawn(this.config.command, this.config.args, {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
      })

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error('Failed to create process stdio'))
        return
      }

      let isResolved = false
      const serverErrors: string[] = []

      this.process.stdout.on('data', (data) => {
        this.handleData(data.toString())
      })

      this.process.stderr?.on('data', (data) => {
        const error = data.toString()
        serverErrors.push(error)
        // Don't log immediately, wait to see if it's fatal
      })

      this.process.on('error', (error) => {
        if (!isResolved) {
          isResolved = true
          reject(new Error(`Failed to spawn process: ${error.message}`))
        }
      })

      this.process.on('exit', (code, signal) => {
        if (!isResolved && code !== 0) {
          isResolved = true
          const errorLog = serverErrors.join('\n')
          reject(new Error(
            `MCP Server exited with code ${code}${signal ? ` (signal: ${signal})` : ''}\n${errorLog}`
          ))
        }
      })

      // Give the server time to start before initializing
      setTimeout(() => {
        // Initialize connection
        this.sendRequest('initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {},
          },
          clientInfo: {
            name: 'geartrade-terminal',
            version: '1.0.0',
          },
        }).then(() => {
          if (!isResolved) {
            isResolved = true
            // Send initialized notification
            return this.sendRequest('initialized', {})
          }
        }).then(() => {
          resolve()
        }).catch((error) => {
          if (!isResolved) {
            isResolved = true
            const errorLog = serverErrors.length > 0 
              ? `\n\nServer errors:\n${serverErrors.join('\n')}`
              : ''
            reject(new Error(`${error.message}${errorLog}`))
          }
        })
      }, 1000) // Wait 1 second for server to start
    })
  }

  private handleData(data: string) {
    this.buffer += data
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.trim()) continue
      
      try {
        const message = JSON.parse(line)
        this.handleMessage(message)
      } catch (e) {
        // Ignore parse errors - might be partial JSON
      }
    }
  }

  private handleMessage(message: any) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!
      this.pendingRequests.delete(message.id)

      if (message.error) {
        reject(new Error(message.error.message || 'Unknown error'))
      } else {
        resolve(message.result)
      }
    }
  }

  private sendRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId
      this.pendingRequests.set(id, { resolve, reject })

      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      }

      if (!this.process?.stdin) {
        reject(new Error('Process not connected'))
        return
      }

      try {
        this.process.stdin.write(JSON.stringify(request) + '\n')
      } catch (error) {
        this.pendingRequests.delete(id)
        reject(error)
        return
      }

      // Timeout after 60 seconds (increased from 30)
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout for method: ${method}`))
        }
      }, 60000)
    })
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
    if (this.process) {
      this.process.kill()
      this.process = undefined
    }
  }
}

