/**
 * Formatters for Order Book Depth Data
 * Extracted from index.ts for better modularity
 */

import type { OrderBookDepth } from '../signal-generation/analysis/orderbook'

/**
 * Format order book depth data
 */
export function formatOrderBookDepth(orderBookDepth: OrderBookDepth | null) {
  if (!orderBookDepth) return null

  return {
    bidPrice: orderBookDepth.bidPrice,
    askPrice: orderBookDepth.askPrice,
    midPrice: orderBookDepth.midPrice,
    spread: orderBookDepth.spread,
    spreadPercent: orderBookDepth.spreadPercent,
    bidDepth: orderBookDepth.bidDepth,
    askDepth: orderBookDepth.askDepth,
    imbalance: orderBookDepth.imbalance,
    supportZones: orderBookDepth.supportZones,
    resistanceZones: orderBookDepth.resistanceZones,
    liquidityScore: orderBookDepth.liquidityScore,
    timestamp: orderBookDepth.timestamp,
  }
}
