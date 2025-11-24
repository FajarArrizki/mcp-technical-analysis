/**
 * Position Monitor
 * Track PnL for all open positions and check exit conditions
 */

import { PositionState, MarketData } from '../../types'
import { Position } from '../../position-management/positions'

export interface PositionMonitorConfig {
  enabled: boolean
  updateIntervalMs?: number
}

/**
 * Update position state with current market prices
 */
export function updatePositionPrices(
  positions: Map<string, PositionState>,
  marketData: Map<string, MarketData> | Record<string, MarketData>
): Map<string, PositionState> {
  const updatedPositions = new Map<string, PositionState>()
  const isMap = marketData instanceof Map

  for (const [symbol, position] of positions.entries()) {
    const assetData = isMap ? marketData.get(symbol) : marketData[symbol]
    // CRITICAL FIX: Prioritize price from Hyperliquid (markPx), NOT from Binance historical data
    // Binance historical data is only for indicators, NOT for current price
    // Priority: 1. markPx (Hyperliquid real-time), 2. price (Hyperliquid), 3. position.currentPrice, 4. entryPrice
    const currentPrice = assetData?.markPx || assetData?.price || position.currentPrice || position.entryPrice

    // Calculate unrealized PnL
    const entryPrice = position.entryPrice
    const quantity = Math.abs(position.quantity)
    const leverage = position.leverage || 1
    const unrealizedPnl = position.side === 'LONG'
      ? (currentPrice - entryPrice) * quantity
      : (entryPrice - currentPrice) * quantity

    // For futures trading with leverage, calculate PnL % based on margin (not position value)
    const positionValue = entryPrice * quantity
    const margin = positionValue / leverage // Margin used for this position
    const unrealizedPnlPct = margin > 0 ? (unrealizedPnl / margin) * 100 : 0

    // Calculate R-multiple (PnL / Risk)
    // Risk is the distance from entry to stop loss
    const stopLoss = position.stopLoss
    let rMultiple: number | undefined
    if (stopLoss) {
      const riskAmount = position.side === 'LONG'
        ? (entryPrice - stopLoss) * quantity
        : (stopLoss - entryPrice) * quantity

      if (riskAmount > 0) {
        rMultiple = unrealizedPnl / riskAmount
      }
    }

    // Calculate liquidation distance (for leveraged positions)
    // let liquidationDistance: number | undefined
    if (position.leverage > 1) {
      // Simplified: liquidation at 100% loss (should use actual Hyperliquid liquidation price)
      // const liquidationPrice = position.side === 'LONG'
      //   ? entryPrice * (1 - 1 / position.leverage)
      //   : entryPrice * (1 + 1 / position.leverage)

      // liquidationDistance = position.side === 'LONG'
      //   ? ((currentPrice - liquidationPrice) / currentPrice) * 100
      //   : ((liquidationPrice - currentPrice) / currentPrice) * 100
    }

    updatedPositions.set(symbol, {
      ...position,
      currentPrice,
      current_price: currentPrice,
      unrealizedPnl,
      unrealized_pnl: unrealizedPnl,
      unrealizedPnlPct,
      rMultiple
    })
  }

  return updatedPositions
}

/**
 * Convert Position to PositionState
 */
export function convertToPositionState(
  position: Position,
  currentPrice: number,
  stopLoss?: number,
  takeProfit?: number
): PositionState {
  const entryPrice = position.entryPrice
  const quantity = Math.abs(position.quantity)
  
  // Calculate unrealized PnL
  const leverage = position.leverage || 1
  const unrealizedPnl = position.side === 'LONG'
    ? (currentPrice - entryPrice) * quantity
    : (entryPrice - currentPrice) * quantity

  // For futures trading with leverage, calculate PnL % based on margin (not position value)
  const positionValue = entryPrice * quantity
  const margin = positionValue / leverage // Margin used for this position
  const unrealizedPnlPct = margin > 0 ? (unrealizedPnl / margin) * 100 : 0

  // Calculate R-multiple
  let rMultiple: number | undefined
  if (stopLoss) {
    const riskAmount = position.side === 'LONG'
      ? (entryPrice - stopLoss) * quantity
      : (stopLoss - entryPrice) * quantity

    if (riskAmount > 0) {
      rMultiple = unrealizedPnl / riskAmount
    }
  }

  return {
    symbol: position.symbol,
    coin: position.coin,
    quantity: position.quantity,
    entryPrice: position.entryPrice,
    entry_price: position.entry_price,
    currentPrice,
    current_price: currentPrice,
    leverage: position.leverage,
    unrealizedPnl,
    unrealized_pnl: position.unrealizedPnl || position.unrealized_pnl,
    unrealizedPnlPct,
    side: position.side,
    entryTime: position.entryTime || position.entry_time || Date.now(),
    entry_time: position.entry_time,
    rMultiple,
    stopLoss,
    takeProfit,
    trailingStopActive: false,
    highestPrice: position.side === 'LONG' ? currentPrice : undefined,
    lowestPrice: position.side === 'SHORT' ? currentPrice : undefined,
    exitConditions: []
  }
}
