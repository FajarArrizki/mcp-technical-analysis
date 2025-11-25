/**
 * Common types for MCP clients
 */

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface IMCPClient {
  connect(): Promise<void>
  listTools(): Promise<MCPTool[]>
  callTool(name: string, args: any): Promise<any>
  listResources(): Promise<MCPResource[]>
  readResource(uri: string): Promise<any>
  disconnect(): Promise<void>
}


