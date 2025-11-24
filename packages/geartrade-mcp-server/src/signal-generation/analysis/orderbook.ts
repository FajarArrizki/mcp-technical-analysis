/**
 * Order Book Depth Analysis
 * calculateOrderBookDepth function
 */

export interface OrderBookDepth {
  bidPrice: number
  askPrice: number
  midPrice: number
  spread: number
  spreadPercent: number
  bidDepth: number
  askDepth: number
  imbalance: number
  supportZones: Array<{ price: number; depth: number; distance: number }>
  resistanceZones: Array<{ price: number; depth: number; distance: number }>
  liquidityScore: number
  timestamp: number
}

/**
 * Calculate Order Book Depth (COB) from impact prices
 * COB shows current order book depth and support/resistance zones
 */
export function calculateOrderBookDepth(
  impactPxs: any[],
  currentPrice: number,
  _assetCtx: any
): OrderBookDepth | null {
  if (!impactPxs || !Array.isArray(impactPxs) || impactPxs.length < 2 || !currentPrice || currentPrice <= 0) {
    return null
  }
  
  const bidPrice = parseFloat(impactPxs[0] || '0') // Impact price for buy side
  const askPrice = parseFloat(impactPxs[1] || '0') // Impact price for sell side
  // const midPx = assetCtx.midPx ? parseFloat(assetCtx.midPx) : (bidPrice + askPrice) / 2
  
  if (bidPrice <= 0 || askPrice <= 0) {
    return null
  }
  
  // Calculate bid/ask spread and imbalance
  const spread = askPrice - bidPrice
  const spreadPercent = (spread / currentPrice) * 100
  const midPrice = (bidPrice + askPrice) / 2
  
  // Calculate imbalance: negative = bearish (more asks), positive = bullish (more bids)
  // Use distance from current price to mid price
  // CRITICAL FIX: Check for division by zero - currentPrice must be > 0 (already checked at start)
  const priceToMid = currentPrice - midPrice
  const imbalance = priceToMid !== 0 && currentPrice > 0 
    ? (priceToMid / Math.abs(priceToMid)) * Math.min(1, Math.abs(priceToMid) / currentPrice * 100) 
    : 0
  
  // Identify support zones (bids below current price)
  // Support = large bids below price = strong buying interest
  const supportDistance = currentPrice - bidPrice
  const supportStrength = supportDistance > 0 ? Math.max(0, 1 - (supportDistance / currentPrice)) : 0
  const supportZones = supportDistance > 0 && supportDistance < currentPrice * 0.05 // Within 5% of price
    ? [{ price: bidPrice, depth: supportStrength, distance: supportDistance }]
    : []
  
  // Identify resistance zones (asks above current price)
  // Resistance = large asks above price = strong selling interest
  const resistanceDistance = askPrice - currentPrice
  const resistanceStrength = resistanceDistance > 0 ? Math.max(0, 1 - (resistanceDistance / currentPrice)) : 0
  const resistanceZones = resistanceDistance > 0 && resistanceDistance < currentPrice * 0.05 // Within 5% of price
    ? [{ price: askPrice, depth: resistanceStrength, distance: resistanceDistance }]
    : []
  
  // Calculate liquidity score (0-100)
  // Higher score = more liquidity (tighter spread, better depth)
  const liquidityScore = Math.max(0, Math.min(100, 100 - (spreadPercent * 100)))
  
  return {
    bidPrice: bidPrice,
    askPrice: askPrice,
    midPrice: midPrice,
    spread: spread,
    spreadPercent: spreadPercent,
    bidDepth: supportStrength * 100, // 0-100
    askDepth: resistanceStrength * 100, // 0-100
    imbalance: imbalance, // -1 to 1 (negative = bearish, positive = bullish)
    supportZones: supportZones,
    resistanceZones: resistanceZones,
    liquidityScore: liquidityScore, // 0-100
    timestamp: Date.now()
  }
}
