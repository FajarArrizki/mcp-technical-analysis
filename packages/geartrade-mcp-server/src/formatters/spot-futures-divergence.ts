/**
 * Formatters for Spot-Futures Divergence Data
 * Extracted from index.ts for better modularity
 */

import type { SpotFuturesDivergenceIndicator } from '../signal-generation/technical-indicators/spot-futures-divergence'

/**
 * Format spot-futures divergence data
 */
export function formatSpotFuturesDivergence(divergence: SpotFuturesDivergenceIndicator | null) {
  if (!divergence) return null

  return {
    premium: divergence.premium,
    arbitrage: divergence.arbitrage,
    meanReversion: divergence.meanReversion,
    divergence: divergence.divergence,
  }
}
