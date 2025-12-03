/**
 * Formatters for Liquidation Levels Data
 * Extracted from index.ts for better modularity
 */

import type { LiquidationIndicator } from '../signal-generation/technical-indicators/liquidation'

/**
 * Format liquidation levels data
 */
export function formatLiquidationLevels(liquidation: LiquidationIndicator | null) {
  if (!liquidation) return null

  return {
    clusters: {
      long: liquidation.clusters.long,
      short: liquidation.clusters.short,
      nearest: liquidation.clusters.nearest,
      distance: liquidation.clusters.distance,
    },
    liquidityGrab: liquidation.liquidityGrab,
    stopHunt: liquidation.stopHunt,
    cascade: liquidation.cascade,
    safeEntry: liquidation.safeEntry,
  }
}
