/**
 * CORS Configuration for MCP Server
 * Extracted from index.ts for better modularity
 */

/**
 * CORS headers for streaming support
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID',
  'Access-Control-Max-Age': '86400'
}

/**
 * SSE streaming headers
 */
export const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID'
}

/**
 * SSE streaming headers for POST requests
 */
export const ssePostHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID'
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(): Response {
  return new Response(null, { headers: corsHeaders })
}
