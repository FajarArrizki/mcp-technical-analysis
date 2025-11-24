/**
 * Signal Filtering Logic
 * shouldAutoExecute, checkRiskLimits functions
 */

import { Signal, TradingConfig } from '../types'
import { TechnicalIndicators } from '../technical-indicators/aggregator'

export interface AutoExecuteResult {
  execute: boolean
  level?: string
  positionMultiplier?: number
  warnings?: string[]
  autoTradeReason?: string
  reason?: string
}

export function shouldAutoExecute(
  signal: Signal,
  _indicators: TechnicalIndicators | null | undefined,
  _accountState: any = null,
  tradingConfig: TradingConfig | null = null
): AutoExecuteResult {
  const TRADING_CONFIG = tradingConfig || {
    mode: 'AUTONOMOUS' as const,
    thresholds: {
      confidence: {
        high: 0.50,
        medium: 0.40,
        low: 0.35,
        reject: 0.30
      },
      expected_value: 0.5
    },
    positionSizing: {
      highConfidence: 1.0,
      mediumConfidence: 0.7,
      lowConfidence: 0.5
    }
  }
  
  // OPTIMIZATION: Cache property access and calculations
  const confidence = signal.confidence ?? 0
  const expectedValue = signal.expected_value ?? 0
  const thresholds = TRADING_CONFIG.thresholds
  const positionSizing = TRADING_CONFIG.positionSizing
  
  // Thresholds - OPTIMIZATION: Cache property access
  const confidenceThresholds = thresholds.confidence
  const highConfidence = confidenceThresholds.high ?? 0.50
  const mediumConfidence = confidenceThresholds.medium ?? 0.40
  const lowConfidence = confidenceThresholds.low ?? 0.35
  const rejectConfidence = confidenceThresholds.reject ?? 0.30
  
  // Step 1: HIGH CONFIDENCE + HIGH EV = AUTO-TRADE
  // Support both formats: expectedValue.high or expected_value (for backward compatibility)
  // OPTIMIZATION: Cache typeof check and calculations
  const expectedValueConfig = thresholds.expectedValue
  const expectedValueIsObject = typeof expectedValueConfig === 'object'
  const expectedValueThreshold = expectedValueIsObject 
    ? (expectedValueConfig?.high ?? 0.8)
    : (thresholds.expected_value ?? 0.5)
  
  // OPTIMIZATION: Cache toFixed() results
  const confidencePercent = (confidence * 100).toFixed(2)
  const expectedValueFixed = expectedValue.toFixed(2)
  const expectedValueThresholdFixed = expectedValueThreshold.toFixed(2)
  
  if (confidence >= highConfidence && expectedValue >= expectedValueThreshold) {
    return {
      execute: true,
      level: 'HIGH_CONFIDENCE_HIGH_EV',
      positionMultiplier: positionSizing?.highConfidence ?? 1.0,
      autoTradeReason: `High confidence (${confidencePercent}%) + High EV ($${expectedValueFixed})`
    }
  }
  
  // Step 1.5: HIGH CONFIDENCE + MEDIUM/LOW EV = AUTO-TRADE WITH WARNING
  // Signal dengan confidence >= 60% harus tetap di-approve meski EV tidak tinggi
  if (confidence >= highConfidence && expectedValue > 0) {
    return {
      execute: true,
      level: 'HIGH_CONFIDENCE_MEDIUM_EV',
      positionMultiplier: positionSizing?.highConfidence ?? 1.0,
      warnings: [
        `High confidence (${confidencePercent}%)`,
        `EV: $${expectedValueFixed} (below high threshold of $${expectedValueThresholdFixed})`,
        'Consider monitoring EV during execution'
      ],
      autoTradeReason: `High confidence (${confidencePercent}%) + Medium EV ($${expectedValueFixed})`
    }
  }
  
  // Step 2: MEDIUM CONFIDENCE + POSITIVE EV = DISPLAY WITH WARNING
  if (confidence >= mediumConfidence && confidence < highConfidence && expectedValue > 0) {
    // OPTIMIZATION: Use cached positionSizing and toFixed() results
    return {
      execute: true,
      level: 'MEDIUM_CONFIDENCE_POSITIVE_EV',
      positionMultiplier: positionSizing?.mediumConfidence ?? 0.7,
      warnings: [
        `Medium confidence (${confidencePercent}%)`,
        `EV: $${expectedValueFixed}`,
        'Manual review recommended'
      ],
      autoTradeReason: `Medium confidence (${confidencePercent}%) + Positive EV ($${expectedValueFixed})`
    }
  }
  
  // Step 3: FUTURES TRADING: Allow low confidence signals with leverage
  // For futures, lower confidence is acceptable because leverage amplifies profit
  // OPTIMIZATION: Cache mode check
  const tradingMode = TRADING_CONFIG.mode
  const isAutonomous = tradingMode === 'AUTONOMOUS'
  
  if (isAutonomous && confidence >= rejectConfidence && confidence < mediumConfidence) {
    // FUTURES MODE: Allow low confidence signals (>= 10%) even without extreme conditions
    // OPTIMIZATION: Use cached positionSizing
    const basePositionMultiplier = (positionSizing?.lowConfidence ?? 0.5) * 0.5
    // const isCounterTrend = false // Simplified - can be enhanced
    
    return {
      execute: true,
      level: 'LOW_CONFIDENCE_FUTURES',
      positionMultiplier: basePositionMultiplier,
      warnings: [
        'LOW CONFIDENCE - Futures trading',
        `Confidence: ${confidencePercent}% (futures threshold: 10%+)`,
        'Position size reduced to 50% (low confidence)',
        'Monitor closely - exit quickly if invalidated',
        'Leverage amplifies risk - use caution'
      ],
      autoTradeReason: `Low confidence futures signal (Conf: ${confidencePercent}%, EV: $${expectedValueFixed})`
    }
  }
  
  // Step 4: REJECT - Confidence below minimum threshold
  // OPTIMIZATION: Use cached isAutonomous
  const minConfidenceForReject = isAutonomous ? rejectConfidence : lowConfidence
  const minConfidencePercent = (minConfidenceForReject * 100).toFixed(2)
  const modeStr = isAutonomous ? 'futures' : 'spot'
  
  return {
    execute: false,
    reason: `Signal quality insufficient: Confidence ${confidencePercent}% < ${minConfidencePercent}% (${modeStr} minimum threshold). EV: $${expectedValueFixed}`,
    level: 'MARGINAL_REJECTED'
  }
}

export function checkRiskLimits(
  signal: Signal,
  accountState: any,
  tradingConfig: TradingConfig | null = null
): { allowed: boolean; reason?: string } {
  const TRADING_CONFIG = tradingConfig || {
    safety: {
      maxRiskPerTrade: 2.0,
      maxOpenPositions: 2,
      dailyLossLimit: 5.0,
      consecutiveLosses: 3
    }
  }
  
  // Check max risk per trade
  const riskAmount = signal.risk_usd || 0
  const maxRiskPerTrade = TRADING_CONFIG.safety?.maxRiskPerTrade || 2.0
  if (riskAmount > maxRiskPerTrade) {
    return {
      allowed: false,
      reason: `Risk per trade ($${riskAmount.toFixed(2)}) exceeds maximum ($${maxRiskPerTrade.toFixed(2)})`
    }
  }
  
  // Check max open positions (if account state provided)
  if (accountState && accountState.positions) {
    const openPositions = Object.keys(accountState.positions).length
    const maxOpenPositions = TRADING_CONFIG.safety?.maxOpenPositions || 2
    if (openPositions >= maxOpenPositions && signal.signal !== 'hold' && signal.signal !== 'close_all') {
      return {
        allowed: false,
        reason: `Max open positions (${maxOpenPositions}) reached. Current: ${openPositions}`
      }
    }
  }
  
  return { allowed: true }
}

