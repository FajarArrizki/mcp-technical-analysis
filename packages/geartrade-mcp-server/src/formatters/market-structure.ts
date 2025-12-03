/**
 * Formatters for Market Structure Data
 * Extracted from index.ts for better modularity
 */

import type { ChangeOfCharacterResult } from '../signal-generation/analysis/market-structure'

/**
 * Format market structure data (COC, swing highs/lows)
 */
export function formatMarketStructure(marketStructure: ChangeOfCharacterResult | null) {
  if (!marketStructure) return null

  return {
    structure: marketStructure.structure,
    coc: marketStructure.coc,
    lastSwingHigh: marketStructure.lastSwingHigh,
    lastSwingLow: marketStructure.lastSwingLow,
    structureStrength: marketStructure.structureStrength,
    reversalSignal: marketStructure.reversalSignal,
    swingHighs: marketStructure.swingHighs,
    swingLows: marketStructure.swingLows,
    timestamp: marketStructure.timestamp,
  }
}
