/**
 * Formatters for Position Data
 * Extracted from index.ts for better modularity
 */

import type { Position } from '../signal-generation/position-management/positions'
import { calculateMAE } from '../signal-generation/risk-management/mae'

/**
 * Format position data with PnL and MAE
 */
export function formatPosition(
  position: Position | null, 
  currentPrice: number | null, 
  maeResult: ReturnType<typeof calculateMAE> | null
) {
  if (!position || !currentPrice) {
    return null
  }

  const quantity = Math.abs(position.quantity)
  const entryPrice = position.entryPrice
  const side = position.side || (position.quantity > 0 ? 'LONG' : 'SHORT')
  
  // Calculate unrealized PnL
  let unrealizedPnl = 0
  let unrealizedPnlPct = 0
  if (side === 'LONG') {
    unrealizedPnl = (currentPrice - entryPrice) * quantity
    unrealizedPnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0
  } else {
    unrealizedPnl = (entryPrice - currentPrice) * quantity
    unrealizedPnlPct = entryPrice > 0 ? ((entryPrice - currentPrice) / entryPrice) * 100 : 0
  }

  // Calculate PnL based on margin (if leverage is available)
  const leverage = position.leverage || 1
  const positionValue = entryPrice * quantity
  const marginUsed = positionValue / leverage
  const pnlPctOnMargin = marginUsed > 0 ? (unrealizedPnl / marginUsed) * 100 : 0

  return {
    side,
    quantity,
    entryPrice,
    currentPrice,
    leverage,
    unrealizedPnl,
    unrealizedPnlPct,
    pnlPctOnMargin,
    mae: maeResult?.mae || null,
    worstPrice: maeResult?.worstPrice || null,
    entryTime: position.entryTime || null,
  }
}
