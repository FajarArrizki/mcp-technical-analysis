/**
 * Formatters for Divergence Data
 * Extracted from index.ts for better modularity
 */

import type { DivergenceResult } from '../signal-generation/analysis/divergence'

/**
 * Format divergence data (bullish/bearish)
 */
export function formatDivergence(divergence: DivergenceResult | null) {
  if (!divergence) return null

  return {
    bullishDivergence: divergence.bullishDivergence,
    bearishDivergence: divergence.bearishDivergence,
    divergence: divergence.divergence,
  }
}
