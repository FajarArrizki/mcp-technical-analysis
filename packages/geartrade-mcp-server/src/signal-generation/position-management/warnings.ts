/**
 * Warning Collection
 * collectWarning, signalWarnings functions
 */

export interface SignalWarning {
  asset: string
  message: string
  details: string[] | null
  timestamp: number
}

// Global warnings collection for signal processing
export const signalWarnings: SignalWarning[] = []

/**
 * Helper function to collect warnings instead of printing immediately
 */
export function collectWarning(asset: string, message: string, details: string[] | null = null): void {
  signalWarnings.push({
    asset,
    message,
    details,
    timestamp: Date.now()
  })
}

/**
 * Clear all warnings
 */
export function clearWarnings(): void {
  signalWarnings.length = 0
}

/**
 * Get all warnings for a specific asset
 */
export function getWarningsForAsset(asset: string): SignalWarning[] {
  return signalWarnings.filter(w => w.asset === asset)
}

