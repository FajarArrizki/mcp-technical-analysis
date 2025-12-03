/**
 * Formatters for Candlestick Patterns Data
 * Extracted from index.ts for better modularity
 */

import type { CandlestickPatternsResult } from '../signal-generation/analysis/candlestick'

/**
 * Format candlestick patterns data
 */
export function formatCandlestickPatterns(patterns: CandlestickPatternsResult | null) {
  if (!patterns || !patterns.patterns) {
    return {
      patterns: [],
      latestPattern: null,
      bullishCount: 0,
      bearishCount: 0,
    }
  }

  return {
    patterns: patterns.patterns.map((p) => ({
      type: p.type,
      index: p.index,
      bullish: p.bullish,
    })),
    latestPattern: patterns.patterns.length > 0 ? patterns.patterns[patterns.patterns.length - 1] : null,
    bullishCount: patterns.patterns.filter((p) => p.bullish).length,
    bearishCount: patterns.patterns.filter((p) => !p.bullish).length,
  }
}
