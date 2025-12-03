/**
 * JSON-RPC 2.0 Helpers
 * Extracted from index.ts for better modularity
 */

/**
 * JSON-RPC 2.0 response helper
 */
export function jsonRpcResponse(id: string | number | null, result: any) {
  return {
    jsonrpc: '2.0',
    id,
    result
  }
}

/**
 * JSON-RPC 2.0 error response helper
 */
export function jsonRpcError(id: string | number | null, code: number, message: string, data?: any) {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data && { data })
    }
  }
}
