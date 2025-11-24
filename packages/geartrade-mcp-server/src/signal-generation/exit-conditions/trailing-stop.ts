/**
 * Trailing Stop Exit Condition Checker
 * Track highest/lowest price since entry and update trailing stop dynamically
 */

import { PositionState, ExitCondition, ExitReason } from '../types'

export interface TrailingStopConfig {
  enabled: boolean
  distancePct: number // Distance percentage (e.g., 1%)
  activateAfterGainPct?: number // Only activate trailing stop after X% gain (default: 1%)
}

export function checkTrailingStop(
  position: PositionState,
  currentPrice: number,
  config: TrailingStopConfig
): ExitCondition | null {
  if (!config.enabled) {
    return null
  }

  const activateAfterGain = config.activateAfterGainPct != null ? config.activateAfterGainPct : 1
  const entryPrice = position.entryPrice

  // Check if position is in profit enough to activate trailing stop
  const gainPct = position.side === 'LONG'
    ? ((currentPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - currentPrice) / entryPrice) * 100

  if (gainPct < activateAfterGain) {
    // Not enough gain yet, don't activate trailing stop
    return null
  }

  // Update highest/lowest price
  const highestPrice = position.highestPrice != null
    ? Math.max(position.highestPrice, currentPrice)
    : currentPrice
  const lowestPrice = position.lowestPrice != null
    ? Math.min(position.lowestPrice, currentPrice)
    : currentPrice

  // Calculate trailing stop level
  const trailingStopLevel = position.side === 'LONG'
    ? highestPrice * (1 - config.distancePct / 100)
    : lowestPrice * (1 + config.distancePct / 100)

  // Check if current price hit trailing stop
  const shouldExit = position.side === 'LONG'
    ? currentPrice <= trailingStopLevel
    : currentPrice >= trailingStopLevel

  if (!shouldExit) {
    return null
  }

  return {
    reason: 'TRAILING_STOP' as ExitReason,
    priority: 4, // After take profit
    shouldExit: true,
    exitSize: 100, // Full exit
    exitPrice: trailingStopLevel,
    metadata: {
      trailingStopLevel,
      currentPrice,
      highestPrice: position.side === 'LONG' ? highestPrice : undefined,
      lowestPrice: position.side === 'SHORT' ? lowestPrice : undefined,
      distancePct: config.distancePct,
      gainPct,
      side: position.side
    },
    timestamp: Date.now(),
    description: `Trailing stop hit at ${trailingStopLevel.toFixed(4)} (current: ${currentPrice.toFixed(4)}, ${config.distancePct}% from ${position.side === 'LONG' ? 'high' : 'low'})`
  }
}

export function updateTrailingStop(
  position: PositionState,
  currentPrice: number,
  config: TrailingStopConfig
): PositionState {
  const activateAfterGain = config.activateAfterGainPct != null ? config.activateAfterGainPct : 1
  const entryPrice = position.entryPrice

  // Check if position is in profit enough to activate trailing stop
  const gainPct = position.side === 'LONG'
    ? ((currentPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - currentPrice) / entryPrice) * 100

  if (gainPct < activateAfterGain) {
    // Not enough gain yet
    return position
  }

  // Update highest/lowest price
  const highestPrice = position.highestPrice != null
    ? Math.max(position.highestPrice, currentPrice)
    : currentPrice
  const lowestPrice = position.lowestPrice != null
    ? Math.min(position.lowestPrice, currentPrice)
    : currentPrice

  // Calculate trailing stop level
  const trailingStopLevel = position.side === 'LONG'
    ? highestPrice * (1 - config.distancePct / 100)
    : lowestPrice * (1 + config.distancePct / 100)

  return {
    ...position,
    highestPrice,
    lowestPrice,
    trailingStop: trailingStopLevel,
    trailingStopActive: true
  }
}
