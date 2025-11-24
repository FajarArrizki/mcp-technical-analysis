/**
 * Reversal Confirmation Detection
 * hasReversalConfirmations, getReversalConfirmationCount functions
 */

export interface TechnicalIndicators {
  rsiDivergence?: {
    divergence?: string
  } | null
  macdDivergence?: {
    divergence?: string
  } | null
  volumeChange?: number
  rsi14?: number | null
}

/**
 * Check for reversal confirmations (minimum 2 required)
 * Returns true if at least 2 reversal confirmations are present
 */
export function hasReversalConfirmations(indicators: TechnicalIndicators | null): boolean {
  if (!indicators) {
    return false
  }

  // Check for minimum 2 reversal confirmations
  let confirmations = 0
  
  // Bullish divergence
  const rsiDiv = indicators.rsiDivergence?.divergence?.toLowerCase()
  if (rsiDiv && rsiDiv.includes('bullish')) confirmations++
  
  const macdDiv = indicators.macdDivergence?.divergence?.toLowerCase()
  if (macdDiv && macdDiv.includes('bullish')) confirmations++
  
  // Volume spike (volume change > 30%)
  const volumeChange = indicators.volumeChange || 0
  if (volumeChange > 0.3) confirmations++
  
  // Extreme oversold (RSI < 20)
  if (indicators.rsi14 !== null && indicators.rsi14 !== undefined && indicators.rsi14 < 20) {
    confirmations++
  }
  
  return confirmations >= 2
}

/**
 * Get reversal confirmation count (for display purposes)
 * Returns the number of reversal confirmations found
 */
export function getReversalConfirmationCount(indicators: TechnicalIndicators | null): number {
  if (!indicators) {
    return 0
  }

  let count = 0
  
  const rsiDiv = indicators.rsiDivergence?.divergence?.toLowerCase()
  if (rsiDiv && rsiDiv.includes('bullish')) count++
  
  const macdDiv = indicators.macdDivergence?.divergence?.toLowerCase()
  if (macdDiv && macdDiv.includes('bullish')) count++
  
  if ((indicators.volumeChange || 0) > 0.3) count++
  
  if (indicators.rsi14 !== null && indicators.rsi14 !== undefined && indicators.rsi14 < 20) {
    count++
  }
  
  return count
}

