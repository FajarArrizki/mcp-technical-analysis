/**
 * Formatters for Multi-Timeframe Analysis
 * Extracted from index.ts for better modularity
 */

/**
 * Format multi-timeframe analysis data
 */
export function formatMultiTimeframe(assetData: any) {
  const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment
  const multiTimeframeIndicators = assetData?.data?.multiTimeframeIndicators || assetData?.multiTimeframeIndicators || {}

  if (!trendAlignment) {
    return null
  }

  return {
    dailyTrend: trendAlignment.dailyTrend || 'neutral',
    h4Aligned: trendAlignment.h4Aligned !== undefined ? trendAlignment.h4Aligned : null,
    h1Aligned: trendAlignment.h1Aligned !== undefined ? trendAlignment.h1Aligned : null,
    overall: trendAlignment.aligned ? 'Aligned' : 'Not Aligned',
    score: trendAlignment.alignmentScore !== undefined ? trendAlignment.alignmentScore : null,
    reason: trendAlignment.reason || null,
    // Additional timeframe data if available
    daily: multiTimeframeIndicators['1d'] ? {
      price: multiTimeframeIndicators['1d'].price || null,
      ema20: multiTimeframeIndicators['1d'].ema20 || null,
      ema50: multiTimeframeIndicators['1d'].ema50 || null,
      rsi14: multiTimeframeIndicators['1d'].rsi14 || null,
    } : null,
    h4: multiTimeframeIndicators['4h'] ? {
      price: multiTimeframeIndicators['4h'].price || null,
      ema20: multiTimeframeIndicators['4h'].ema20 || null,
      rsi14: multiTimeframeIndicators['4h'].rsi14 || null,
    } : null,
    h1: multiTimeframeIndicators['1h'] ? {
      price: multiTimeframeIndicators['1h'].price || null,
      ema20: multiTimeframeIndicators['1h'].ema20 || null,
      rsi14: multiTimeframeIndicators['1h'].rsi14 || null,
    } : null,
  }
}
