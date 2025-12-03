/**
 * Formatters for Risk Management Calculations
 * Extracted from index.ts for better modularity
 */

import { calculateStopLoss } from '../signal-generation/exit-conditions/stop-loss'

/**
 * Format risk management calculations (stop loss, take profit, R:R ratio)
 */
export function formatRiskManagement(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  stopLossPct: number,
  takeProfitPct: number,
  positionSizeUsd: number,
  currentPrice?: number,
  indicators?: any
) {
  // Calculate stop loss
  const stopLossFixed = calculateStopLoss(entryPrice, side, stopLossPct)
  const stopLossFlexible = calculateStopLoss(entryPrice, side, stopLossPct * 0.385) // ~0.69% for 2% default

  // Calculate take profit levels (simplified)
  const takeProfitLevels = null

  // Calculate main take profit
  const takeProfit = side === 'LONG'
    ? entryPrice * (1 + takeProfitPct / 100)
    : entryPrice * (1 - takeProfitPct / 100)

  // Calculate potential loss/profit
  const quantity = positionSizeUsd / entryPrice

  let potentialLoss = 0
  let potentialProfit = 0
  if (side === 'LONG') {
    potentialLoss = (entryPrice - stopLossFixed) * quantity
    potentialProfit = (takeProfit - entryPrice) * quantity
  } else {
    potentialLoss = (stopLossFixed - entryPrice) * quantity
    potentialProfit = (entryPrice - takeProfit) * quantity
  }

  // Calculate R:R ratio
  const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0

  // Calculate trailing stop if current price is provided
  let trailingStopInfo = null
  if (currentPrice) {
    // Simple trailing stop calculation
    const trailPercent = 5
    const activationGain = 1 // Activate after 1% gain
    const gainPct = side === 'LONG'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100

    if (gainPct >= activationGain) {
      const trailingStopPrice = side === 'LONG'
        ? currentPrice * (1 - trailPercent / 100)
        : currentPrice * (1 + trailPercent / 100)
      trailingStopInfo = {
        active: true,
        price: trailingStopPrice,
        trailPercent,
      }
    }
  }

  // Check signal reversal if indicators are provided
  let signalReversalCheck = null
  if (indicators) {
    // Simple signal reversal check based on RSI and MACD divergence
    const rsi = indicators.rsi14 || indicators.rsi
    const macdHistogram = indicators.macd?.histogram
    const shouldReverse = (rsi && rsi > 70 && macdHistogram && macdHistogram < 0) ||
                         (rsi && rsi < 30 && macdHistogram && macdHistogram > 0)
    signalReversalCheck = {
      shouldReverse: shouldReverse || false,
      confidence: 0.6,
    }
  }

  return {
    stopLossFixed,
    stopLossFixedPct: stopLossPct,
    stopLossFlexible,
    stopLossFlexiblePct: stopLossPct * 0.385,
    takeProfit,
    takeProfitPct: takeProfitPct,
    takeProfitLevels,
    potentialLoss,
    potentialProfit,
    riskRewardRatio,
    trailingStop: trailingStopInfo,
    signalReversal: signalReversalCheck,
  }
}
