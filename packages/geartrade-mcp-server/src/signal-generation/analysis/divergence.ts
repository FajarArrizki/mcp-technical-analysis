/**
 * Divergence Detection
 * detectDivergence function
 */

export interface DivergenceResult {
  bullishDivergence: boolean
  bearishDivergence: boolean
  divergence: 'bullish' | 'bearish' | null
}

export function detectDivergence(
  prices: number[],
  indicatorValues: number[],
  lookbackPeriod: number = 20
): DivergenceResult {
  if (prices.length < lookbackPeriod || indicatorValues.length < lookbackPeriod) {
    return {
      bullishDivergence: false,
      bearishDivergence: false,
      divergence: null
    }
  }
  
  const recentPrices = prices.slice(-lookbackPeriod)
  const recentIndicators = indicatorValues.slice(-lookbackPeriod)
  
  // Find price and indicator extremes
  const priceHigh = Math.max(...recentPrices)
  const priceLow = Math.min(...recentPrices)
  const priceHighIndex = recentPrices.indexOf(priceHigh)
  const priceLowIndex = recentPrices.indexOf(priceLow)
  
  // const indicatorHigh = Math.max(...recentIndicators)
  // const indicatorLow = Math.min(...recentIndicators)
  // const indicatorHighIndex = recentIndicators.indexOf(indicatorHigh)
  // const indicatorLowIndex = recentIndicators.indexOf(indicatorLow)
  
  // Bullish divergence: Price makes lower low, but indicator makes higher low
  let bullishDivergence = false
  if (priceLowIndex > priceHighIndex) {
    // Price made lower low after high
    const priceBeforeLow = recentPrices[priceLowIndex - 1] || recentPrices[0]
    const indicatorBeforeLow = recentIndicators[priceLowIndex - 1] || recentIndicators[0]
    if (priceLow < priceBeforeLow && recentIndicators[priceLowIndex] > indicatorBeforeLow) {
      bullishDivergence = true
    }
  }
  
  // Bearish divergence: Price makes higher high, but indicator makes lower high
  let bearishDivergence = false
  if (priceHighIndex > priceLowIndex) {
    // Price made higher high after low
    const priceBeforeHigh = recentPrices[priceHighIndex - 1] || recentPrices[0]
    const indicatorBeforeHigh = recentIndicators[priceHighIndex - 1] || recentIndicators[0]
    if (priceHigh > priceBeforeHigh && recentIndicators[priceHighIndex] < indicatorBeforeHigh) {
      bearishDivergence = true
    }
  }
  
  let divergence: 'bullish' | 'bearish' | null = null
  if (bullishDivergence) {
    divergence = 'bullish'
  } else if (bearishDivergence) {
    divergence = 'bearish'
  }
  
  return {
    bullishDivergence: bullishDivergence,
    bearishDivergence: bearishDivergence,
    divergence: divergence
  }
}

