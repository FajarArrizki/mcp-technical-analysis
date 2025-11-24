/**
 * Long/Short Ratio Indicators
 * Analyze trader sentiment, contrarian signals, extreme ratios
 */

import { LongShortRatioData } from '../types/futures-types'

export interface LongShortRatioIndicator {
  sentiment: {
    overall: 'extreme_long' | 'extreme_short' | 'moderate_long' | 'moderate_short' | 'balanced'
    retail: 'long' | 'short' | 'balanced'
    pro: 'long' | 'short' | 'balanced'
  }
  contrarian: {
    signal: boolean // True if contrarian signal (fade retail)
    direction: 'long' | 'short' | 'neutral'
    strength: number // 0-1, signal strength
  }
  extreme: {
    detected: boolean // True if extreme ratio (>70% or <30%)
    level: 'extreme_long' | 'extreme_short' | 'normal'
    reversalSignal: boolean // True if extreme and likely to reverse
  }
  divergence: {
    retailVsPro: number // Divergence between retail and pro (-1 to 1)
    signal: 'follow_pro' | 'fade_retail' | 'neutral'
  }
}

/**
 * Analyze sentiment
 */
function analyzeSentiment(ratioData: LongShortRatioData): LongShortRatioIndicator['sentiment'] {
  const longPct = ratioData.longPct

  // Overall sentiment
  let overall: 'extreme_long' | 'extreme_short' | 'moderate_long' | 'moderate_short' | 'balanced' = 'balanced'
  if (longPct > 70) {
    overall = 'extreme_long'
  } else if (longPct > 55) {
    overall = 'moderate_long'
  } else if (longPct < 30) {
    overall = 'extreme_short'
  } else if (longPct < 45) {
    overall = 'moderate_short'
  }

  // Retail sentiment
  let retail: 'long' | 'short' | 'balanced' = 'balanced'
  if (ratioData.retailLongPct > 55) {
    retail = 'long'
  } else if (ratioData.retailLongPct < 45) {
    retail = 'short'
  }

  // Pro sentiment
  let pro: 'long' | 'short' | 'balanced' = 'balanced'
  if (ratioData.proLongPct > 55) {
    pro = 'long'
  } else if (ratioData.proLongPct < 45) {
    pro = 'short'
  }

  return {
    overall,
    retail,
    pro
  }
}

/**
 * Detect contrarian signals
 */
function detectContrarian(ratioData: LongShortRatioData): LongShortRatioIndicator['contrarian'] {
  // Contrarian: fade retail sentiment
  // If retail is 80% long, consider shorts (retail is usually wrong)

  const retailLongPct = ratioData.retailLongPct
  let signal = false
  let direction: 'long' | 'short' | 'neutral' = 'neutral'
  let strength = 0

  if (retailLongPct > 70) {
    // Retail extremely long = contrarian short signal
    signal = true
    direction = 'short'
    strength = Math.min(1, (retailLongPct - 70) / 20) // 70-90% range maps to 0-1
  } else if (retailLongPct < 30) {
    // Retail extremely short = contrarian long signal
    signal = true
    direction = 'long'
    strength = Math.min(1, (30 - retailLongPct) / 20) // 10-30% range maps to 0-1
  }

  return {
    signal,
    direction,
    strength: isNaN(strength) ? 0 : strength
  }
}

/**
 * Detect extreme ratios
 */
function detectExtreme(ratioData: LongShortRatioData): LongShortRatioIndicator['extreme'] {
  const longPct = ratioData.longPct
  const extreme = longPct > 70 || longPct < 30

  let level: 'extreme_long' | 'extreme_short' | 'normal' = 'normal'
  if (longPct > 70) {
    level = 'extreme_long'
  } else if (longPct < 30) {
    level = 'extreme_short'
  }

  // Reversal signal: extreme ratios often reverse
  const reversalSignal = extreme

  return {
    detected: extreme,
    level,
    reversalSignal
  }
}

/**
 * Calculate retail vs pro divergence
 */
function calculateDivergence(ratioData: LongShortRatioData): LongShortRatioIndicator['divergence'] {
  const retailLongPct = ratioData.retailLongPct
  const proLongPct = ratioData.proLongPct

  // Divergence: difference between retail and pro positioning
  const divergence = (retailLongPct - proLongPct) / 100 // Normalize to -1 to 1

  // Signal: follow pro, fade retail
  let signal: 'follow_pro' | 'fade_retail' | 'neutral' = 'neutral'
  
  if (Math.abs(divergence) > 0.1) {
    // Significant divergence
    if (divergence > 0) {
      // Retail more long than pro = fade retail (go short)
      signal = 'fade_retail'
    } else {
      // Retail more short than pro = fade retail (go long)
      signal = 'fade_retail'
    }
  } else if (Math.abs(divergence) < 0.05) {
    // Pro and retail aligned = follow pro
    signal = 'follow_pro'
  }

  return {
    retailVsPro: isNaN(divergence) ? 0 : Math.max(-1, Math.min(1, divergence)),
    signal
  }
}

/**
 * Calculate long/short ratio indicators
 */
export function calculateLongShortRatioIndicators(
  ratioData: LongShortRatioData
): LongShortRatioIndicator {
  const sentiment = analyzeSentiment(ratioData)
  const contrarian = detectContrarian(ratioData)
  const extreme = detectExtreme(ratioData)
  const divergence = calculateDivergence(ratioData)

  return {
    sentiment,
    contrarian,
    extreme,
    divergence
  }
}

