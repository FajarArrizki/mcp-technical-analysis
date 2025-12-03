/**
 * Formatters for Long/Short Ratio Data
 * Extracted from index.ts for better modularity
 */

import type { LongShortRatioIndicator } from '../signal-generation/technical-indicators/long-short-ratio'

/**
 * Format long/short ratio data
 */
export function formatLongShortRatio(ratio: LongShortRatioIndicator | null) {
  if (!ratio) return null

  return {
    sentiment: ratio.sentiment,
    contrarian: ratio.contrarian,
    extreme: ratio.extreme,
    divergence: ratio.divergence,
  }
}
