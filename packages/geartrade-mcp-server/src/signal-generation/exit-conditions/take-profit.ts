/**
 * Take Profit Exit Condition Checker
 * Check if current price hit take profit targets (multiple levels with cumulative sizing)
 */

import { PositionState, ExitCondition, ExitReason } from '../types'

export interface TakeProfitConfig {
  enabled: boolean
  defaultTakeProfitPct: number
  levels: number[] // Percentages from entry (e.g., [2, 4, 6])
  sizes: number[] // Position sizes to close at each level (e.g., [50, 30, 20] = 50%, then 30%, then 20%)
  autoMoveStopLossToBreakeven: boolean
}

export interface TakeProfitLevel {
  level: number
  price: number
  sizePct: number
  cumulativeSizePct: number
  hit: boolean
}

export function checkTakeProfit(
  position: PositionState,
  currentPrice: number,
  config: TakeProfitConfig
): ExitCondition | null {
  if (!config.enabled || !position.takeProfit) {
    return null
  }

  // If single TP level (legacy support)
  if (!config.levels || config.levels.length === 0) {
    const tpLevel = position.takeProfit
    const shouldExit = position.side === 'LONG'
      ? currentPrice >= tpLevel
      : currentPrice <= tpLevel

    if (shouldExit) {
      return {
        reason: 'TAKE_PROFIT' as ExitReason,
        priority: 3,
        shouldExit: true,
        exitSize: 100,
        exitPrice: tpLevel,
        metadata: {
          tpLevel,
          currentPrice,
          side: position.side
        },
        timestamp: Date.now(),
        description: `Take profit hit at ${tpLevel.toFixed(4)} (current: ${currentPrice.toFixed(4)})`
      }
    }
    return null
  }

  // Multiple TP levels (cumulative)
  const tpLevels = calculateTakeProfitLevels(position, config)
  let exitLevel: TakeProfitLevel | null = null

  // Find highest level that's been hit but not yet closed
  for (let i = tpLevels.length - 1; i >= 0; i--) {
    const level = tpLevels[i]
    if (!level.hit) {
      const shouldHit = position.side === 'LONG'
        ? currentPrice >= level.price
        : currentPrice <= level.price

      if (shouldHit) {
        level.hit = true
        exitLevel = level
        break
      }
    }
  }

  if (!exitLevel) {
    return null
  }

  // Get already closed size from position metadata
  const alreadyClosedPct = (position.exitConditions || [])
    .filter(ec => ec.reason === 'TAKE_PROFIT')
    .reduce((sum, ec) => sum + ec.exitSize, 0)

  // Calculate how much to close at this level
  const newExitSize = exitLevel.cumulativeSizePct - alreadyClosedPct

  if (newExitSize <= 0) {
    // Already closed at this level
    return null
  }

  return {
    reason: 'TAKE_PROFIT' as ExitReason,
    priority: 3,
    shouldExit: true,
    exitSize: Math.min(newExitSize, 100), // Cap at 100%
    exitPrice: exitLevel.price,
    metadata: {
      tpLevel: exitLevel.level,
      tpPrice: exitLevel.price,
      currentPrice,
      exitSize: newExitSize,
      cumulativeSize: exitLevel.cumulativeSizePct,
      alreadyClosed: alreadyClosedPct,
      side: position.side,
      shouldMoveStopLoss: config.autoMoveStopLossToBreakeven && exitLevel.cumulativeSizePct >= config.sizes[0]
    },
    timestamp: Date.now(),
    description: `Take profit level ${exitLevel.level}% hit at ${exitLevel.price.toFixed(4)} (close ${newExitSize.toFixed(1)}%)`
  }
}

export function calculateTakeProfitLevels(
  position: PositionState,
  config: TakeProfitConfig
): TakeProfitLevel[] {
  const levels: TakeProfitLevel[] = []
  let cumulativeSize = 0

  const levelsLen = config.levels.length
  const sizesLen = config.sizes.length

  for (let i = 0; i < levelsLen; i++) {
    const levelPct = config.levels[i]
    const sizePct = i < sizesLen ? config.sizes[i] : 0
    cumulativeSize += sizePct

    const tpPrice = position.side === 'LONG'
      ? position.entryPrice * (1 + levelPct / 100)
      : position.entryPrice * (1 - levelPct / 100)

    // Check if this level was already hit (from position metadata)
    const alreadyHit = (position.exitConditions || [])
      .some(ec => ec.reason === 'TAKE_PROFIT' && 
            ec.metadata?.tpLevel === levelPct)

    levels.push({
      level: levelPct,
      price: tpPrice,
      sizePct,
      cumulativeSizePct: cumulativeSize,
      hit: alreadyHit
    })
  }

  return levels
}

export function calculateTakeProfit(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  takeProfitPct?: number,
  defaultPct: number = 5
): number {
  const tpPct = takeProfitPct != null ? takeProfitPct : defaultPct
  return side === 'LONG'
    ? entryPrice * (1 + tpPct / 100)
    : entryPrice * (1 - tpPct / 100)
}
