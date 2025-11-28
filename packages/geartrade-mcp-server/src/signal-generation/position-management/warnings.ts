/**
 * Position Warnings - Stub implementation
 * Simplified version for MCP compatibility
 */

export interface WarningData {
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Collect warning - stub implementation
 */
export function collectWarning(
  asset: string,
  message: string,
  metadata?: any[],
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  console.warn(`[${asset}] ${message}`)
}

/**
 * Get warnings for asset - stub implementation
 */
export function getWarningsForAsset(asset: string): WarningData[] {
  return []
}

/**
 * Clear warnings for asset - stub implementation
 */
export function clearWarningsForAsset(asset: string): void {
  // No-op
}
