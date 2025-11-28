/**
 * Position Management - Stub implementation
 * Simplified version for MCP compatibility
 */

export interface Position {
  symbol: string
  quantity: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  side: 'LONG' | 'SHORT'
  leverage: number
  entryTime?: number
}

/**
 * Get active positions - stub implementation
 */
export function getActivePositions(): Map<string, Position> {
  return new Map()
}

/**
 * Update active positions - stub implementation
 */
export function updateActivePositions(positions: Map<string, Position>): void {
  // No-op
}
