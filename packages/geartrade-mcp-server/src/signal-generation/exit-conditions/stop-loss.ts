/**
 * Stop Loss Exit Condition Checker
 * Check if current price hit stop loss level
 */

import { PositionState, ExitCondition, ExitReason } from '../types'

export interface StopLossConfig {
  enabled: boolean
  defaultStopLossPct: number
  usePercentageBased: boolean
  useFixedPrice: boolean
}

export function checkStopLoss(
  position: PositionState,
  currentPrice: number,
  config: StopLossConfig
): ExitCondition | null {
  if (!config.enabled || !position.stopLoss) {
    return null
  }

  const stopLossLevel = position.stopLoss
  const shouldExit = position.side === 'LONG'
    ? currentPrice <= stopLossLevel
    : currentPrice >= stopLossLevel

  if (!shouldExit) {
    return null
  }

  const distanceFromSL = position.side === 'LONG'
    ? ((currentPrice - stopLossLevel) / position.entryPrice) * 100
    : ((stopLossLevel - currentPrice) / position.entryPrice) * 100

  return {
    reason: 'STOP_LOSS' as ExitReason,
    priority: 2, // Second priority after EMERGENCY
    shouldExit: true,
    exitSize: 100, // Full exit
    exitPrice: stopLossLevel,
    metadata: {
      stopLossLevel,
      currentPrice,
      distanceFromSL,
      side: position.side
    },
    timestamp: Date.now(),
    description: `Stop loss hit at ${stopLossLevel.toFixed(4)} (current: ${currentPrice.toFixed(4)})`
  }
}

export function calculateStopLoss(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  stopLossPct?: number,
  defaultPct: number = 2
): number {
  const slPct = stopLossPct != null ? stopLossPct : defaultPct
  return side === 'LONG'
    ? entryPrice * (1 - slPct / 100)
    : entryPrice * (1 + slPct / 100)
}
