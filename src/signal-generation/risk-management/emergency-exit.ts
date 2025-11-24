/**
 * Emergency Exit System
 * Auto-exit positions on critical conditions (liquidation risk, funding extreme, BTC shock)
 */

import { PositionState } from '../types'
import { FuturesMarketData, BTCCorrelationData } from '../types/futures-types'
import { calculateLiquidationPrice } from './anti-liquidation'
import { isBTCMoveSignificant, getBTCCurrentPrice } from '../analysis/btc-correlation'

export interface EmergencyExitCondition {
  triggered: boolean
  reason: 'liquidation_risk' | 'funding_extreme' | 'btc_shock' | 'none'
  message: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  recommendedAction: 'close_all' | 'reduce_50' | 'reduce_25' | 'hold'
}

// BTC price cache for shock detection
let btcPriceHistory: Array<{ price: number; timestamp: number }> = []
// const BTC_SHOCK_THRESHOLD = 5 // 5% BTC move in short time

/**
 * Check liquidation risk
 */
export function checkLiquidationRisk(
  position: PositionState,
  minBuffer: number = 5 // 5% minimum buffer
): EmergencyExitCondition {
  try {
    const liquidationCalc = calculateLiquidationPrice(
      position.entryPrice,
      position.leverage,
      position.side,
      0 // No margin buffer for emergency check
    )

    // Calculate current liquidation distance
    const currentPrice = position.currentPrice || position.current_price || 0
    if (currentPrice <= 0) {
      return {
        triggered: false,
        reason: 'none',
        message: 'Current price unavailable',
        urgency: 'low',
        recommendedAction: 'hold'
      }
    }

    const liquidationPrice = liquidationCalc.liquidationPrice
    const distance = Math.abs(currentPrice - liquidationPrice) / currentPrice * 100

    if (distance < minBuffer) {
      return {
        triggered: true,
        reason: 'liquidation_risk',
        message: `CRITICAL: Liquidation distance only ${distance.toFixed(2)}% (minimum: ${minBuffer}%)`,
        urgency: 'critical',
        recommendedAction: 'close_all'
      }
    } else if (distance < minBuffer * 2) {
      return {
        triggered: true,
        reason: 'liquidation_risk',
        message: `WARNING: Liquidation distance ${distance.toFixed(2)}% (low buffer)`,
        urgency: 'high',
        recommendedAction: 'reduce_50'
      }
    }

    return {
      triggered: false,
      reason: 'none',
      message: `Liquidation distance OK: ${distance.toFixed(2)}%`,
      urgency: 'low',
      recommendedAction: 'hold'
    }
  } catch (error: any) {
    return {
      triggered: false,
      reason: 'none',
      message: `Error checking liquidation risk: ${error.message}`,
      urgency: 'low',
      recommendedAction: 'hold'
    }
  }
}

/**
 * Check funding rate extreme
 */
export function checkFundingRateExtreme(
  futuresData: FuturesMarketData,
  threshold: number = 0.002 // 0.2% threshold
): EmergencyExitCondition {
  const fundingRate = futuresData.fundingRate.current

  if (Math.abs(fundingRate) > threshold) {
    const side = fundingRate > 0 ? 'LONG' : 'SHORT'
    // const reason = fundingRate > 0 ? 'SHORT' : 'LONG' // Opposite side is at risk

    return {
      triggered: true,
      reason: 'funding_extreme',
      message: `EXTREME funding rate: ${(fundingRate * 10000).toFixed(2)}bps (threshold: ${(threshold * 10000).toFixed(2)}bps). ${side} positions at risk.`,
      urgency: fundingRate > threshold * 2 ? 'critical' : 'high',
      recommendedAction: fundingRate > threshold * 2 ? 'close_all' : 'reduce_50'
    }
  }

  return {
    triggered: false,
    reason: 'none',
    message: `Funding rate OK: ${(fundingRate * 10000).toFixed(2)}bps`,
    urgency: 'low',
    recommendedAction: 'hold'
  }
}

/**
 * Check BTC correlation shock
 */
export async function checkBTCShock(
  position: PositionState,
  correlationData: BTCCorrelationData,
  _futuresData: FuturesMarketData
): Promise<EmergencyExitCondition> {
  try {
    // Get current BTC price
    const currentBTCPrice = await getBTCCurrentPrice()
    const now = Date.now()

    // Update BTC price history
    btcPriceHistory.push({ price: currentBTCPrice, timestamp: now })

    // Keep only last 5 minutes
    btcPriceHistory = btcPriceHistory.filter(h => now - h.timestamp < 300000)

    if (btcPriceHistory.length < 2) {
      return {
        triggered: false,
        reason: 'none',
        message: 'Insufficient BTC price history',
        urgency: 'low',
        recommendedAction: 'hold'
      }
    }

    // Find oldest price in history (5 min ago)
    const oldestPrice = btcPriceHistory[0].price

    // Calculate BTC move percentage
    const btcMovePct = ((currentBTCPrice - oldestPrice) / oldestPrice) * 100

    // Check if move is significant and could affect position
    if (isBTCMoveSignificant(btcMovePct, correlationData, 2)) {
      // Calculate predicted impact on asset
      const predictedImpact = btcMovePct * correlationData.correlation7d * correlationData.impactMultiplier

      // Check if predicted impact opposes position
      const isOpposing = (position.side === 'LONG' && predictedImpact < -3) || 
                        (position.side === 'SHORT' && predictedImpact > 3)

      if (isOpposing) {
        return {
          triggered: true,
          reason: 'btc_shock',
          message: `BTC SHOCK: BTC moved ${btcMovePct.toFixed(2)}% in 5min. Predicted impact on ${position.symbol}: ${predictedImpact.toFixed(2)}% (opposes ${position.side} position)`,
          urgency: Math.abs(btcMovePct) > 10 ? 'critical' : 'high',
          recommendedAction: Math.abs(btcMovePct) > 10 ? 'close_all' : 'reduce_50'
        }
      } else {
        // Move favors position, but still alert
        return {
          triggered: true,
          reason: 'btc_shock',
          message: `BTC moved ${btcMovePct.toFixed(2)}% in 5min. Predicted impact: ${predictedImpact.toFixed(2)}% (favors ${position.side} position)`,
          urgency: 'medium',
          recommendedAction: 'hold'
        }
      }
    }

    return {
      triggered: false,
      reason: 'none',
      message: `BTC move OK: ${btcMovePct.toFixed(2)}% (insignificant)`,
      urgency: 'low',
      recommendedAction: 'hold'
    }
  } catch (error: any) {
    return {
      triggered: false,
      reason: 'none',
      message: `Error checking BTC shock: ${error.message}`,
      urgency: 'low',
      recommendedAction: 'hold'
    }
  }
}

/**
 * Check all emergency exit conditions
 */
export async function checkEmergencyExitConditions(
  position: PositionState,
  futuresData: FuturesMarketData,
  correlationData?: BTCCorrelationData
): Promise<EmergencyExitCondition[]> {
  const conditions: EmergencyExitCondition[] = []

  // Check liquidation risk
  const liquidationCheck = checkLiquidationRisk(position, 5)
  conditions.push(liquidationCheck)

  // Check funding rate extreme
  const fundingCheck = checkFundingRateExtreme(futuresData, 0.002)
  conditions.push(fundingCheck)

  // Check BTC shock (if correlation data available)
  if (correlationData) {
    const btcCheck = await checkBTCShock(position, correlationData, futuresData)
    conditions.push(btcCheck)
  }

  return conditions
}

/**
 * Determine if emergency exit should trigger
 */
export function shouldTriggerEmergencyExit(
  conditions: EmergencyExitCondition[]
): { shouldExit: boolean; reason: string; action: 'close_all' | 'reduce_50' | 'reduce_25' | 'hold' } {
  // Sort by urgency (critical first)
  const sorted = conditions
    .filter(c => c.triggered)
    .sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    })

  if (sorted.length === 0) {
    return {
      shouldExit: false,
      reason: 'No emergency conditions detected',
      action: 'hold'
    }
  }

  // Most urgent condition determines action
  const mostUrgent = sorted[0]

  return {
    shouldExit: true,
    reason: mostUrgent.message,
    action: mostUrgent.recommendedAction
  }
}

