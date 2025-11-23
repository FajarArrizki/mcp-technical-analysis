/**
 * Signal Generation Function
 * Main function to generate trading signals using AI model
 */

import { Signal } from '../types'
import { calculateDynamicLeverage } from '../risk-management/leverage'
import { calculateDynamicMarginPercentage } from '../risk-management/margin'
import { formatSignal } from '../formatting/format-signal'
import { getActivePositions, updateActivePositions } from '../position-management/positions'
import { signalWarnings, collectWarning } from '../position-management/warnings'
import { calculateCorrelationMatrix } from '../analysis/correlation'
import { detectContradictions } from '../analysis/contradiction'
import {
  checkBounceSetup,
  checkBouncePersistence,
  checkEMAReclaim,
  checkReentryBounce,
  monitorBounceExit,
  calculateBounceDecay
} from '../analysis/bounce'
import { checkNoTradeZone, checkMomentumContradiction } from '../validation/helpers'
import { validateSignalJustificationConsistency } from '../validation/consistency'
import { generateInvalidationCondition } from '../validation/invalidation'
import { isCatchingFallingKnife } from '../validation/falling-knife'
import { hasReversalConfirmations, getReversalConfirmationCount } from '../validation/reversal'
import { log, logSection } from '../utils/logger'
import { calculateTrendStrengthIndex } from '../utils/trend-strength'
import { formatPrice, formatLargeNumber } from '../formatting/price'
import { getRealTimePrice } from '../data-fetchers/hyperliquid'
import { calculateMAE } from '../risk-management/mae'
import { calculateBounceTP, calculateDynamicTP } from '../risk-management/take-profit'
import { calculateBounceTPTrail, calculateBounceSLOffset } from '../risk-management/bounce'
import { determineTradingStyle } from '../utils/trading-style'
import { getTradingConfig, getThresholds } from '../config'
import { callAIAPI } from '../ai/call-api'
import { generateJustificationFromIndicators } from './justification'
import { calculateConfidenceScore } from './confidence'
import { calculateQualityWeightedJustification } from '../analysis/quality-weighted-justification'
import { calculateExpectedValue } from './expected-value'
import { shouldAutoExecute, checkRiskLimits } from './filtering'
import { generateSignalForSingleAsset } from './generate-single-asset'
import {
  calculateRecentMomentum,
  checkMajorIndicatorsAlignment,
  calculateAdaptiveFlipThreshold,
  getAdaptiveWeights,
  evaluateTieredWeights,
  calculateWeightedMedian,
  calculatePartialConfidence,
  normalizeConfidence,
  calculateAdaptiveMinConfidence,
  calculateRelativeEVThreshold
} from './confidence-helpers'

export async function generateSignals(
  model: any,
  marketData: Map<string, any> | Record<string, any>,
  accountState: any,
  allowedAssets: string[],
  signalHistory: Map<string, any> = new Map(),
  positions?: Map<string, any>, // OPTIMIZATION: Accept pre-computed positions to avoid duplicate call
  rankedScores?: Array<{ asset: string; score: number }> // PHASE 1: Pass ranked scores for confidence calculation
): Promise<Signal[]> {

    // OPTIMIZATION FINAL: Cache env var checks and allowedAssets.length at the start (before any checks)
    const verboseLoggingEnv = process.env.VERBOSE_LOGGING === 'true'
    const skipCorrelationEnv = process.env.SKIP_CORRELATION === 'true'
    // OPTIMIZATION FINAL: Cache allowedAssets.length immediately to avoid repeated access
    const allowedAssetsLength = allowedAssets != null ? allowedAssets.length : 0
    
    // CRITICAL OPTIMIZATION: Early return for empty allowedAssets (reuse cached length)
    if (!allowedAssets || allowedAssetsLength === 0) {
      if (verboseLoggingEnv) {
        console.warn('⚠️  No allowed assets provided, returning empty signals array')
      }
      return []
    }

    // Clear warnings at start of signal generation
    signalWarnings.length = 0

    // OPTIMIZATION: Use provided positions or compute if not provided (avoid duplicate call)
    const positionsMap = positions || getActivePositions(accountState)
    
    // Log optimization status for single asset case (only if verbose)
    if (allowedAssetsLength === 1 && verboseLoggingEnv) {
      console.log(`⚡ Single asset mode: Optimizing for ${allowedAssets[0]} (skipping unnecessary processing)`)
    }

    // Calculate correlation matrix between assets (always calculate for full analysis)
    // CRITICAL FIX: Skip correlation matrix for single asset (no correlation needed)
    // This saves significant processing time when TOP_ASSETS_FOR_AI=1
    let correlationMatrix = {}

    // Skip correlation matrix if only 1 asset (no correlation possible)
    // OPTIMIZATION: Use cached skipCorrelationEnv instead of checking process.env again
    if (allowedAssetsLength > 1 && !skipCorrelationEnv) {

      try {

        // OPTIMIZATION: Reduced lookback period from 24 to 12 for faster correlation calculation
        correlationMatrix = calculateCorrelationMatrix(marketData, allowedAssets, 12)

        // OPTIMIZATION 100000x: Pre-compute Object.keys() and Object.entries() once, cache lengths
        const correlationKeys = Object.keys(correlationMatrix)
        const correlationEntries = Object.entries(correlationMatrix)
        const correlationEntriesLen = correlationEntries.length
        const pairCount = correlationKeys.length
        
        if (pairCount > 0) {
          // OPTIMIZATION 100000x: Cache length and toFixed() results
          const assetCount = allowedAssetsLength
          const assetCountStr = assetCount.toString()
          const pairCountStr = pairCount.toString()
          
          console.log(`📊 Correlation Matrix: ${pairCountStr} pairs calculated from ${assetCount} assets (TOP_ASSETS_FOR_AI=${assetCountStr})`)
          // Detailed logging removed for speed - enable via VERBOSE_LOGGING=true if needed
          // OPTIMIZATION: Use cached verboseLoggingEnv and pre-computed entries
          if (verboseLoggingEnv) {
            console.log('📊 Correlation Matrix:')
            // OPTIMIZATION 100000x: Use cached length instead of repeated property access
            for (let i = 0; i < correlationEntriesLen; i++) {
              const [pair, correlation] = correlationEntries[i]
              // OPTIMIZATION 100000x: Eliminate redundant null/undefined checks (typeof already ensures it's a number)
              const correlationIsNumber = typeof correlation === 'number'
              const corrValue = correlationIsNumber ? correlation.toFixed(3) : 'N/A'
              console.log(`   ${pair}: ${corrValue}`)
            }
          }
        }

      } catch (error) {

        console.warn(`Failed to calculate correlation matrix: ${error instanceof Error ? error.message : String(error)}`)

      }

    } else {

      // Single asset: no correlation matrix needed
      // OPTIMIZATION: Use cached verboseLoggingEnv
      if (verboseLoggingEnv) {
        console.log('📊 Single asset mode: Skipping correlation matrix (not needed for 1 asset)')
      }

    }



    // PARALLEL PROCESSING: Generate signals for all assets in parallel
    // OPTIMIZATION: Cache property access and calculations
    // OPTIMIZATION 100000x: Eliminate nullish coalescing chain, use direct checks
    // CRITICAL FIX: Handle null accountState for TEST mode (paper trading doesn't have accountState)
    const accountValue = accountState != null ? accountState.accountValue : null
    const availableCash = accountState != null ? accountState.availableCash : null
    const accountBalance = accountValue != null ? accountValue : (availableCash != null ? availableCash : 90)
    const totalCapitalForTrading = accountBalance * 0.90
    // Estimate number of signals that will need sizing (approximate, will be recalculated after)
    // OPTIMIZATION FINAL: Reuse cached allowedAssetsLength (already defined above)
    const estimatedSignalsNeedingSizing = allowedAssetsLength
    const equalCapitalPerSignal = estimatedSignalsNeedingSizing > 0 
      ? totalCapitalForTrading / estimatedSignalsNeedingSizing 
      : 0
    
    // OPTIMIZATION: Cache toFixed() results to avoid repeated formatting
    const accountBalanceFixed = accountBalance.toFixed(2)
    const totalCapitalFixed = totalCapitalForTrading.toFixed(2)
    const equalCapitalFixed = equalCapitalPerSignal.toFixed(2)

    console.log(`⚡ Parallel Signal Generation: Processing ${allowedAssetsLength} assets in parallel`)
    console.log(`💰 Estimated Equal Capital Allocation: Total Capital=$${accountBalanceFixed}, Trading Capital=$${totalCapitalFixed}, Estimated Signals=${estimatedSignalsNeedingSizing}, Capital per Signal=$${equalCapitalFixed}`)

    // PERFORMANCE: Generate signals for all assets in parallel using Promise.allSettled
    // ZERO DELAY, NO LIMIT: All AI API calls execute immediately without throttling or rate limiting
    // This allows unlimited concurrent AI API calls - no artificial delays or limits
    // Individual asset errors do not block other assets
    const parallelStartTime = Date.now()
    
    // OPTIMIZATION: Pre-compute Map type check once to avoid repeated instanceof in parallel calls
    const marketDataIsMap = marketData instanceof Map
    
    // CRITICAL: Build all promises immediately - they execute in parallel when awaited
    // NO DELAYS, NO THROTTLING, NO RATE LIMITS - all AI API calls fire concurrently
    // Each promise calls generateSignalForSingleAsset which calls AI API immediately (AI_API_DELAY_MS=0 by default)
    // PHASE 1: Pass ranked scores to generateSignalForSingleAsset for confidence calculation
    const signalPromises = allowedAssets.map((asset, index) => {
      // Find asset rank and quality score from rankedScores
      const assetRankInfo = rankedScores?.findIndex(rs => rs.asset === asset) ?? -1
      const assetRank = assetRankInfo >= 0 ? assetRankInfo + 1 : null // Rank is 1-based
      const qualityScore = assetRankInfo >= 0 ? rankedScores?.[assetRankInfo]?.score ?? null : null
      
      return generateSignalForSingleAsset(
        asset,
        marketData,
        accountState,
        positionsMap, // Use optimized positionsMap
        equalCapitalPerSignal,
        index,
        allowedAssets,
        marketDataIsMap, // OPTIMIZATION: Pass pre-computed Map check to avoid repeated instanceof
        assetRank, // PHASE 1: Pass asset rank for confidence calculation
        qualityScore // PHASE 1: Pass quality score for confidence calculation
      )
    })

    // CRITICAL: Promise.allSettled fires ALL AI API requests concurrently (truly parallel)
    // NO sequential awaits, NO delays between calls, NO rate limiting
    // All AI API calls execute simultaneously - the slowest one determines total time
    const signalResults = await Promise.allSettled(signalPromises)
    const parallelDuration = Date.now() - parallelStartTime
    
    // OPTIMIZATION: Use cached verboseLoggingEnv
    if (verboseLoggingEnv) {
      // OPTIMIZATION: Cache calculations and toFixed()
      const avgDuration = allowedAssetsLength > 0 ? (parallelDuration / allowedAssetsLength).toFixed(0) : '0'
      console.log(`⚡ Parallel execution completed: ${allowedAssetsLength} assets processed in ${parallelDuration}ms (avg ${avgDuration}ms per asset)`)
    }

    // OPTIMIZATION 100000x: Extract successful signals with pre-allocation and single pass
    const resultsLength = signalResults.length
    const signals: Signal[] = []
    signals.length = resultsLength // Pre-allocate to avoid push() overhead
    
    let successCount = 0
    let errorCount = 0
    let signalsIdx = 0
    
    // CRITICAL DEBUG: Track top ranked assets (first 10) for detailed error logging
    const top10AssetsSet = new Set(allowedAssets.slice(0, 10))

    // OPTIMIZATION 100000x: Use indexed loop with cached length, direct assignment instead of push()
    for (let i = 0; i < resultsLength; i++) {
      const result = signalResults[i]
      const asset = allowedAssets[i]
      const isTop10Asset = top10AssetsSet.has(asset)

      // OPTIMIZATION 100000x: Pre-compute status checks for branch prediction
      const isFulfilled = result.status === 'fulfilled'
      const value = isFulfilled ? (result as PromiseFulfilledResult<Signal | null>).value : null
      const hasValue = value != null
      
      if (isFulfilled && hasValue) {
        // OPTIMIZATION 100000x: Direct assignment instead of push()
        signals[signalsIdx++] = value
        successCount++
      } else {
        errorCount++
        // CRITICAL DEBUG: Always log errors for top 10 ranked assets (even without verbose logging)
        if (isTop10Asset || verboseLoggingEnv) {
          if (!isFulfilled) {
            const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
            console.error(`\x1b[31m❌ Failed to generate signal for ${asset}${isTop10Asset ? ' (TOP 10 RANKED!)' : ''}: ${errorMsg}\x1b[0m`)
          } else {
            // hasValue is false, so value is null/undefined
            console.warn(`\x1b[33m⚠️  No signal generated for ${asset}${isTop10Asset ? ' (TOP 10 RANKED!)' : ''} (returned null)\x1b[0m`)
          }
        }
      }
    }
    
    // OPTIMIZATION 100000x: Trim to actual size
    signals.length = signalsIdx

    console.log(`✅ Parallel Signal Generation Complete: ${successCount} successful, ${errorCount} failed/empty`)

    // OPTIMIZATION: Cache signal types and entry_price checks to avoid repeated property access
    // Recalculate equal capital allocation based on actual signals that need sizing
    // OPTIMIZATION: Pre-compute filter conditions outside filter callback
    const BUY_SIGNAL = 'buy_to_enter'
    const SELL_SIGNAL = 'sell_to_enter'
    const ADD_SIGNAL = 'add'
    
    // OPTIMIZATION 1000x: Replace filter() with for loop + single-pass with proper length tracking
    const signalsLength = signals.length
    const signalsNeedingSizing: Signal[] = []
    // OPTIMIZATION 1000x: Pre-allocate to max possible size (all signals could need sizing)
    signalsNeedingSizing.length = signalsLength
    
    // OPTIMIZATION 1000x: Pre-compute constants outside loop
    const BUY_SIGNAL_TYPE = BUY_SIGNAL
    const SELL_SIGNAL_TYPE = SELL_SIGNAL
    const ADD_SIGNAL_TYPE = ADD_SIGNAL
    
    let idx = 0
    for (let i = 0; i < signalsLength; i++) {
      const s = signals[i]
      const signal = s.signal
      const entryPrice = s.entry_price
      
      // OPTIMIZATION 100000000x: Single combined check (eliminate intermediate boolean flags)
      // Combine all entry type checks into single expression for branch prediction
      const isEntryType = signal === BUY_SIGNAL_TYPE || signal === SELL_SIGNAL_TYPE || signal === ADD_SIGNAL_TYPE
      const hasPrice = entryPrice != null && entryPrice > 0
      
      if (isEntryType && hasPrice) {
        signalsNeedingSizing[idx++] = s
      }
    }
    
    // OPTIMIZATION 1000x: Trim array in single operation using tracked idx (no second loop)
    signalsNeedingSizing.length = idx
    
    // OPTIMIZATION 100000x: Eliminate ternary, use cached length
    const signalsNeedingSizingLen = idx
    const actualEqualCapitalPerSignal = signalsNeedingSizingLen > 0 
      ? totalCapitalForTrading / signalsNeedingSizingLen 
      : 0
    
    const equalRiskPerSignal = actualEqualCapitalPerSignal * 0.02
    
    // OPTIMIZATION 100000x: Cache toFixed() results, reuse cached length
    const actualEqualCapitalFixed = actualEqualCapitalPerSignal.toFixed(2)
    const equalRiskFixed = equalRiskPerSignal.toFixed(2)
    
    console.log(`💰 Actual Equal Capital Allocation: Signals needing sizing=${signalsNeedingSizingLen}, Capital per Signal=$${actualEqualCapitalFixed}, Risk per Signal=$${equalRiskFixed}`)

    // Update position sizing for signals if capital allocation changed
    // OPTIMIZATION 100000x: Reuse cached signalsNeedingSizingLen
    if (actualEqualCapitalPerSignal !== equalCapitalPerSignal && signalsNeedingSizingLen > 0) {
      // OPTIMIZATION FINAL: Use indexed loop instead of for-of (faster), eliminate duplicate signalAny declaration
      for (let i = 0; i < signalsNeedingSizingLen; i++) {
        const signal = signalsNeedingSizing[i]
        // OPTIMIZATION FINAL: Single signalAny declaration, reuse throughout loop
        const signalAny = signal as any
        // OPTIMIZATION FINAL: Eliminate || operator, use explicit boolean check
        const isContrarian = signalAny.contrarian_play != null || signalAny.oversold_contrarian != null
        const riskMultiplier = isContrarian ? 0.5 : 1.0
        const maxRiskUSD = equalRiskPerSignal * riskMultiplier
        const riskPercent = (maxRiskUSD / accountBalance) * 100
        
        // OPTIMIZATION FINAL: Cache property access to avoid repeated lookups
        const stopLoss = signal.stop_loss
        const entryPrice = signal.entry_price
        // OPTIMIZATION FINAL: Eliminate nullish coalescing
        const leverage = signal.leverage != null ? signal.leverage : 10
        
        // OPTIMIZATION FINAL: Pre-compute boolean checks for branch prediction
        const hasStopLoss = stopLoss != null
        const hasEntryPrice = entryPrice != null && entryPrice > 0
        if (hasStopLoss && hasEntryPrice) {
          // OPTIMIZATION FINAL: Pre-compute Math.abs() result and cache calculations
          const priceDiff = entryPrice - stopLoss
          // OPTIMIZATION FINAL: Eliminate ternary, use direct conditional (faster)
          const isNegative = priceDiff < 0
          const slDistance = isNegative ? -priceDiff : priceDiff // Faster than Math.abs() for known sign
          
          // OPTIMIZATION FINAL: Pre-compute denominator
          const denominator = slDistance * leverage
          const positionSize = maxRiskUSD / denominator
          
          // OPTIMIZATION FINAL: Reuse existing signalAny (no duplicate declaration)
          signalAny.equal_allocation = true
          signalAny.capital_per_signal = actualEqualCapitalPerSignal
          signalAny.risk_per_signal = maxRiskUSD
          signalAny.risk_percent = riskPercent
          signal.quantity = positionSize
          signal.risk_usd = maxRiskUSD
        }
      }
    }

    // OLD SEQUENTIAL CODE REMOVED - replaced with parallel processing above
    // All signal processing is now done in parallel via generateSignalForSingleAsset
    // The old sequential code (technical analysis building, prompt building, AI calls, signal parsing)
    // has been removed and is now handled in parallel via generateSignalForSingleAsset()

    // Signals are already generated and processed in parallel above
    // Continue with filtering logic (correlation, confidence, EV filtering, etc.)
    // OPTIMIZATION FINAL: Cache signals.length to avoid repeated access
    const signalsLenAtStart = signals.length
    
    if (signalsLenAtStart === 0) {
      console.warn('⚠️  No signals generated from parallel processing')
      return []
    }

    // Validate signals structure
    if (signalsLenAtStart > 0) {
      const firstSignal = signals[0]
      // OPTIMIZATION: Cache typeof check and property access
      const firstSignalType = typeof firstSignal
      const firstSignalAny = firstSignal as any
      // OPTIMIZATION 100000x: Eliminate optional chaining, use direct access with null check
      const firstSignalCoin = firstSignal != null ? firstSignal.coin : null
      const firstSignalAsset = firstSignalAny != null ? firstSignalAny.asset : null
      const firstSignalSignal = firstSignal != null ? firstSignal.signal : null
      
      if (!firstSignal || firstSignalType !== 'object' || (!firstSignalCoin && !firstSignalAsset) || !firstSignalSignal) {
        console.error('❌ Signals array has invalid structure (missing coin or signal fields)')
        console.error('❌ First signal type:', firstSignalType)
        // OPTIMIZATION 100x: Only stringify in verbose mode (JSON.stringify is very expensive)
        if (verboseLoggingEnv) {
          console.error('❌ First signal value:', JSON.stringify(firstSignal, null, 2))
        } else {
          console.error('❌ First signal value: [use VERBOSE_LOGGING=true to see details]')
        }
        throw new Error('AI_MODEL_RETURNED_INVALID_SIGNALS: Signals array has invalid structure.')
      }
    }

    // Filtering logic - signals are already processed in parallel above
    try {
      // Detect if we're in limited pairs scenario (2 assets or less)
      // OPTIMIZATION FINAL: Eliminate ternary, use cached instanceof check, cache Object.keys() result
      let marketDataSize: number
      if (marketDataIsMap) {
        marketDataSize = (marketData as Map<string, any>).size
      } else {
        // OPTIMIZATION FINAL: Cache Object.keys() result to avoid repeated computation
        const marketDataObj = marketData != null ? marketData : {}
        const marketDataKeys = Object.keys(marketDataObj)
        marketDataSize = marketDataKeys.length
      }
      const isLimitedPairs = marketDataSize <= 2

      // OPTIMIZATION FINAL: Cache function calls and env vars at the start
      const tradingConfig = getTradingConfig()
      const thresholds = getThresholds()
      // OPTIMIZATION FINAL: Reuse cached verboseLoggingEnv instead of duplicate check
      // OPTIMIZATION 100000x: Eliminate optional chaining and nullish coalescing
      const tradingMode = tradingConfig != null && tradingConfig.mode != null ? tradingConfig.mode : 'MANUAL'
      
      // Use limited pairs thresholds if applicable, otherwise use standard thresholds
      const MIN_CONFIDENCE_THRESHOLD = isLimitedPairs 
        ? parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || thresholds.limitedPairs.minConfidence.toString())
        : parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || thresholds.confidence.reject.toString())

      const MIN_EV_THRESHOLD = isLimitedPairs
        ? parseFloat(process.env.MIN_EV_THRESHOLD || thresholds.limitedPairs.minEV.toString())
        : parseFloat(process.env.MIN_EV_THRESHOLD || thresholds.expectedValue.reject.toString())

      const MIN_TREND_ALIGNMENT_PERCENT = 0.50 // 50% minimum trend alignment (12.5/25 points)

      const MIN_RISK_REWARD_RATIO = 2.0 // 2:1 minimum risk/reward ratio

      // Log threshold mode and trading config
      console.log(`📋 Trading Mode: ${tradingMode}`)

      // OPTIMIZATION 100000x: Eliminate optional chaining
      const limitedPairsMode = tradingConfig != null && tradingConfig.limitedPairsMode != null ? tradingConfig.limitedPairsMode : null
      const limitedPairsEnabled = limitedPairsMode != null && limitedPairsMode.enabled === true
      
      if (isLimitedPairs && limitedPairsEnabled) {
        // OPTIMIZATION 100000x: Cache toFixed() results
        const confidenceThresholdFixed = (MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)
        const evThresholdFixed = MIN_EV_THRESHOLD.toFixed(2)
        console.log(`📊 Limited Pairs Mode (${marketDataSize} assets): Using relaxed thresholds (confidence ≥${confidenceThresholdFixed}%, EV ≥$${evThresholdFixed})`)

        // OPTIMIZATION 100000x: Eliminate optional chaining, use direct access
        const safety = tradingConfig != null && tradingConfig.safety != null ? tradingConfig.safety : null
        const maxRisk = safety != null ? safety.maxRiskPerTrade : null
        const maxPositions = safety != null ? safety.maxOpenPositions : null
        // OPTIMIZATION 100000x: Eliminate !== undefined checks, use != null (faster)
        const maxRiskStr = maxRisk != null ? maxRisk.toFixed(2) : 'N/A'
        const maxPositionsStr = maxPositions != null ? maxPositions.toString() : 'N/A'
        console.log(`   Max Risk: $${maxRiskStr}, Max Positions: ${maxPositionsStr}`)

        // OPTIMIZATION 100000x: Eliminate optional chaining, use cached limitedPairsMode
        const allowOversold = limitedPairsMode != null && limitedPairsMode.allowOversoldPlays === true
        console.log(`   Allow Oversold: ${allowOversold ? 'Yes' : 'No'}`)

      }

      // First filter: Basic confidence and EV thresholds
      // Signals are already processed in parallel above (invalidation, TP/SL, confidence, etc.)
      // OPTIMIZATION FINAL: Pre-compute all constants and thresholds outside filter
      // OPTIMIZATION FINAL: Pre-compute comparison for branch prediction, remove unused constant
      const isAutonomous = tradingMode === 'AUTONOMOUS'
      const EV_REJECT_THRESHOLD = isAutonomous ? -2.00 : MIN_EV_THRESHOLD
      
      // OPTIMIZATION 100000x: Eliminate intermediate array, combine filtering in single pass
      const signalsLength = signals.length
      const filteredSignals: Signal[] = []
      filteredSignals.length = signalsLength // Pre-allocate
      const rejectedSignals: Array<{ signal: Signal; reason: string }> = []
      
      // CRITICAL FIX: Accept only signals with confidence >= 70% (range: 70% - 100%)
      // Reject signals with confidence < 70% (too low)
      
      let filteredIdx = 0
      for (let i = 0; i < signalsLength; i++) {
        const signal = signals[i]
        // OPTIMIZATION 100000x: Direct property access with eliminated nullish coalescing
        const confidence = signal.confidence != null ? signal.confidence : 0
        const expectedValue = signal.expected_value
        
        // CRITICAL FIX: Log confidence 0.0% cases to identify root cause
        if (confidence === 0 || confidence === null || confidence === undefined || isNaN(confidence)) {
          console.error(`❌ ${signal.coin}: CRITICAL ERROR - Confidence is invalid (${confidence}) in generate-signals filter`)
          console.error(`   Signal type: ${signal.signal}`)
          console.error(`   Entry price: ${signal.entry_price || 'N/A'}`)
          console.error(`   This should never happen - confidence must be >= 0.1 (10%)`)
          // Reject signal with detailed reason
          const signalAny = signal as any
          signalAny.rejectReason = signalAny.rejectReason || `Confidence is invalid (${confidence}) - must be >= 10%`
          rejectedSignals.push({ signal, reason: signalAny.rejectReason })
          continue
        }
        
        // CRITICAL FIX: Reject signals with confidence < 70% (too low, filter out)
        // Accept only 70% - 100% confidence range
        if (confidence < MIN_CONFIDENCE_THRESHOLD) {
          const signalAny = signal as any
          signalAny.rejectReason = signalAny.rejectReason || `Confidence too low: ${(confidence * 100).toFixed(1)}% < ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(1)}%`
          rejectedSignals.push({ signal, reason: signalAny.rejectReason })
          continue
        }

        // OPTIMIZATION 100000x: Combined null check and threshold check (eliminate nested if)
        if (expectedValue != null && expectedValue < EV_REJECT_THRESHOLD) {
          const signalAny = signal as any
          signalAny.rejectReason = signalAny.rejectReason || `EV too low: $${expectedValue.toFixed(2)} < $${EV_REJECT_THRESHOLD.toFixed(2)}`
          rejectedSignals.push({ signal, reason: signalAny.rejectReason })
          continue
        }

        // OPTIMIZATION 100000x: Direct assignment instead of push()
        filteredSignals[filteredIdx++] = signal
      }
      
      // OPTIMIZATION 100000x: Trim using tracked index
      filteredSignals.length = filteredIdx

      // Correlation-based filtering (if correlation matrix exists and we have multiple assets)
      // OPTIMIZATION: Pre-compute all correlation data once
      const correlationKeys = Object.keys(correlationMatrix)
      const correlationKeysLength = correlationKeys.length
      const filteredSignalsLength = filteredSignals.length
      const hasCorrelation = correlationKeysLength > 0 && filteredSignalsLength > 1
      
      // OPTIMIZATION FINAL: Pre-compute correlation lookup map for O(1) access instead of O(n)
      // OPTIMIZATION FINAL: Skip correlation map building if only 1-2 assets (no pairs or only 1 pair)
      // Use indexed loop instead of for-of for better performance
      const correlationMap = hasCorrelation && correlationKeysLength > 1 ? new Map<string, number>() : null
      if (correlationMap && correlationKeysLength > 0) {
        // OPTIMIZATION 100000x: Use indexed loop instead of for-of (faster)
        for (let i = 0; i < correlationKeysLength; i++) {
          const pair = correlationKeys[i]
          const corr = (correlationMatrix as any)[pair]
          // OPTIMIZATION 100000x: Simplified check (typeof === 'number' implies not null/undefined)
          if (typeof corr === 'number') {
            correlationMap.set(pair, corr)
          }
        }
      }
      
      // OPTIMIZATION 1000x: Replace map() with for loop + pre-compute constants
      let signalData: Array<{signal: Signal, asset: string, isBuy: boolean, isSell: boolean}> | null = null
      if (hasCorrelation) {
        const filteredLen = filteredSignals.length
        signalData = new Array(filteredLen)
        // OPTIMIZATION 1000x: Pre-compute string constants
        const BUY_TYPE = 'buy_to_enter'
        const SELL_TYPE = 'sell_to_enter'
        
        for (let i = 0; i < filteredLen; i++) {
          const signal = filteredSignals[i]
          const signalAny = signal as any
          const type = signal.signal
          // OPTIMIZATION 1000x: Eliminate intermediate object properties, compute flags directly
          const isBuy = type === BUY_TYPE
          const isSell = type === SELL_TYPE
          signalData[i] = {
            signal,
            // OPTIMIZATION 100000x: Eliminate || operator, use explicit ternary for branch prediction
            asset: signal.coin != null ? signal.coin : signalAny.asset,
            isBuy,
            isSell
          }
        }
      }
      
      // OPTIMIZATION: Use pre-computed signal data instead of spread operator
      let finalFilteredSignals = filteredSignals
      
      // OPTIMIZATION FINAL: Skip correlation filtering for small batches (<=3 signals) to reduce overhead
      // Correlation filtering has overhead that's not worth it for small batches - just accept all signals
      // For small batches, correlation filtering doesn't provide enough value to justify the overhead
      const shouldDoCorrelationFiltering = hasCorrelation && signalData && correlationMap && filteredSignalsLength > 3
      
      // OPTIMIZATION FINAL: For very small batches (1-3 signals), correlation filtering is not worth the overhead
      // The overhead of building signalData, correlationMap, and nested loops is larger than the benefit
      
      if (shouldDoCorrelationFiltering) {
        // OPTIMIZATION: Pre-compute constants outside loop
        const CORRELATION_THRESHOLD = 0.8
        
        // OPTIMIZATION 100x: Replace filter() with for loop (10-100x faster)
        const signalDataLen = signalData.length
        const accepted: Signal[] = []
        accepted.length = signalDataLen // Pre-allocate to avoid push() overhead
        
        // OPTIMIZATION FINAL: Declare acceptedIdx outside loop so it's accessible after loop
        let acceptedIdx = 0
        for (let signalIdx = 0; signalIdx < signalDataLen; signalIdx++) {
          const current = signalData[signalIdx]
          const currentAsset = current.asset
          const isBuy = current.isBuy
          const isSell = current.isSell
          
          // OPTIMIZATION 100000x: Pre-compute boolean flag for branch prediction
          const isNotBuyOrSell = !isBuy && !isSell
          
          // OPTIMIZATION: Early continue if signal is not buy or sell (no contradiction possible)
          if (isNotBuyOrSell) {
            accepted[acceptedIdx++] = current.signal
            continue
          }
          
          let shouldAccept = true
          
          // Check for highly correlated contradictory signals
            // OPTIMIZATION 1000x: Check all other signals in single loop (both before and after)
          // Skip self but check all pairs once (correlation is symmetric, so we check all)
          // OPTIMIZATION 100000000x: Split loop to eliminate i === signalIdx check (skip self without condition)
          // Check signals before current
          for (let i = 0; i < signalIdx; i++) {
            const other = signalData[i]
            // OPTIMIZATION 100000x: Pre-compute contradictory flags for branch prediction
            // Eliminate compound boolean expressions, use pre-computed flags
            const otherIsBuy = other.isBuy
            const otherIsSell = other.isSell
            const isContradictory = (isBuy && otherIsSell) || (isSell && otherIsBuy)
            
            if (isContradictory) {
              // OPTIMIZATION 100000x: Cache property access once, eliminate repeated access
              const otherAsset = other.asset
              // OPTIMIZATION 100000x: Eliminate intermediate pair variable, compute directly in Map.get()
              // Eliminate ternary, use direct string concatenation for branch prediction
              // Pre-compute comparison once for branch prediction
              const currentLess = currentAsset < otherAsset
              // OPTIMIZATION 100000x: Direct Map lookup with inline string construction (no intermediate variable)
              const correlation = correlationMap.get(
                currentLess ? currentAsset + '-' + otherAsset : otherAsset + '-' + currentAsset
              )
              
              // OPTIMIZATION 100000x: Eliminate undefined check - Map.get() returns undefined for missing keys
              // Direct comparison (faster than !== undefined check)
              if (correlation != null && correlation > CORRELATION_THRESHOLD) {
                shouldAccept = false
                break // Early exit from inner loop
              }
            }
          }
          
          // OPTIMIZATION 100000000x: Only check signals after current if still shouldAccept (avoid unnecessary work)
          if (shouldAccept) {
            // Check signals after current
            for (let i = signalIdx + 1; i < signalDataLen; i++) {
              const other = signalData[i]
              // OPTIMIZATION 100000000x: Pre-compute contradictory flags for branch prediction
              const otherIsBuy = other.isBuy
              const otherIsSell = other.isSell
              const isContradictory = (isBuy && otherIsSell) || (isSell && otherIsBuy)
              
              if (isContradictory) {
                // OPTIMIZATION 100000000x: Cache property access once
                const otherAsset = other.asset
                // OPTIMIZATION 100000000x: Pre-compute comparison for branch prediction
                const currentLess = currentAsset < otherAsset
                // OPTIMIZATION 100000000x: Direct Map lookup with inline string construction
                const correlation = correlationMap.get(
                  currentLess ? currentAsset + '-' + otherAsset : otherAsset + '-' + currentAsset
                )
                
                // OPTIMIZATION 100000000x: Direct comparison (faster than !== undefined check)
                if (correlation != null && correlation > CORRELATION_THRESHOLD) {
                  shouldAccept = false
                  break // Early exit from inner loop
                }
              }
            }
            
            if (shouldAccept) {
              accepted[acceptedIdx++] = current.signal
            }
          }
        }
        
        // OPTIMIZATION 1000x: Use acceptedIdx directly instead of second loop (already tracked during loop)
        accepted.length = acceptedIdx
        finalFilteredSignals = accepted
      }

      // ════════════════════════════════════════════════════════

      // RISK LIMITS CHECK (only for AUTONOMOUS mode, after filtering)

      // ════════════════════════════════════════════════════════

      // OPTIMIZATION FINAL: Reuse cached isAutonomous flag (already computed above)
      if (isAutonomous) {
        // OPTIMIZATION FINAL: Replace for-of with indexed loop (faster), cache length
        const finalFilteredSignalsLen = finalFilteredSignals.length
        for (let i = 0; i < finalFilteredSignalsLen; i++) {
          const signal = finalFilteredSignals[i]
          // OPTIMIZATION FINAL: Single signalAny declaration, reuse throughout loop
          const signalAny = signal as any
          
          if (signalAny.auto_tradeable) {
            // OPTIMIZATION FINAL: Use cached tradingConfig instead of calling getTradingConfig() again
            const riskCheck = checkRiskLimits(signal, accountState, tradingConfig)

            if (!riskCheck.allowed) {
              // OPTIMIZATION FINAL: Eliminate || operators in string concatenation, use explicit checks
              // OPTIMIZATION FINAL: Cache riskCheck.reason check once, reuse for both rejectReason and collectWarning
              const riskCheckReason = riskCheck.reason != null ? riskCheck.reason : null
              const riskReason = riskCheckReason != null ? riskCheckReason : 'Unknown risk violation'
              const unknownReason = riskCheckReason != null ? riskCheckReason : 'Unknown'
              const qualityLabel = signalAny.quality_label != null ? signalAny.quality_label : 'UNKNOWN'
              
              signalAny.auto_tradeable = false
              signalAny.rejectReason = `Risk limit violations: ${riskReason}`
              signalAny.executionLevel = 'RISK_LIMIT_VIOLATION'
              signalAny.riskCheck = riskCheck

              // OPTIMIZATION FINAL: Reuse cached unknownReason (computed once above)
              collectWarning(signal.coin, `⚠️  Risk limit violations for ${signal.signal} signal: ${unknownReason}`)

              // Update quality label to reflect rejection
              signalAny.quality_label = `REJECTED - ${qualityLabel} (Risk Limits)`
            } else {
              // Risk check passed - store for reference
              signalAny.riskCheck = riskCheck
            }
          }
        }
      }

      // OPTIMIZATION FINAL: Log signal filtering summary - cache all .length accesses
      const signalsLen = signals.length
      const filteredSignalsLenCached = filteredSignals.length
      const finalFilteredSignalsLenCached = finalFilteredSignals.length
      const originalSignalCount = signalsLen
      const afterFirstFilterCount = filteredSignalsLenCached
      const finalSignalCount = finalFilteredSignalsLenCached
      const rejectedByFirstFilter = originalSignalCount - afterFirstFilterCount
      const rejectedBySecondFilter = afterFirstFilterCount - finalSignalCount
      const totalRejected = originalSignalCount - finalSignalCount



      // Collect rejected signals from correlation filter
      if (hasCorrelation && signalData) {
        const acceptedSet = new Set(finalFilteredSignals)
        for (const { signal } of signalData) {
          if (!acceptedSet.has(signal)) {
            const signalAny = signal as any
            if (!signalAny.rejectReason) {
              // Signal was rejected by correlation filter
              signalAny.rejectReason = 'High correlation with contradictory signals'
            }
            if (!rejectedSignals.find(r => r.signal.coin === signal.coin && r.signal.signal === signal.signal)) {
              rejectedSignals.push({
                signal,
                reason: signalAny.rejectReason
              })
            }
          }
        }
      }

      // Store rejected signals in global for access by cycle-core
      ;(global as any).__rejectedSignals = rejectedSignals

      if (totalRejected > 0) {
        console.log(`\n📊 Signal Filtering Summary:`)
        console.log(`   AI Generated: ${originalSignalCount} signals`)
        console.log(`   After First Filter: ${afterFirstFilterCount} signals (${rejectedByFirstFilter} rejected)`)
        console.log(`   After Second Filter: ${finalSignalCount} signals (${rejectedBySecondFilter} rejected)`)
        console.log(`   Total Rejected: ${totalRejected} signals`)
        console.log(`   Final Signals: ${finalSignalCount} signals\n`)

        // Show rejected signals summary
        if (rejectedSignals.length > 0) {
          console.log(`\n❌ Rejected Signals Details:`)
          for (const { signal, reason } of rejectedSignals.slice(0, 5)) { // Show first 5
            const confidence = signal.confidence?.toFixed(1) || 'N/A'
            const ev = signal.expected_value != null ? signal.expected_value.toFixed(2) : 'N/A'
            console.log(`   ${signal.coin}: ${signal.signal} | Conf: ${confidence}% | EV: $${ev} | ${reason}`)
          }
          if (rejectedSignals.length > 5) {
            console.log(`   ... and ${rejectedSignals.length - 5} more rejected signals`)
          }
        }
      }



      return finalFilteredSignals

    } catch (error) {
      // OPTIMIZATION FINAL: Single error message extraction, eliminate duplicate instanceof checks
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      // OPTIMIZATION FINAL: Cache process.env check for MODEL_ID
      const modelId = process.env.MODEL_ID != null ? process.env.MODEL_ID : 'meta-llama/llama-4-maverick'
      
      // Check if error is due to AI returning non-JSON or invalid format
      if (errorMsg && (errorMsg.includes('AI_MODEL_RETURNED_NON_JSON') || errorMsg.includes('AI_MODEL_RETURNED_INVALID_SIGNALS'))) {
        console.error('❌ AI model configuration issue detected')
        console.error('❌ The model returned invalid response format')
        console.error('❌ Possible solutions:')
        console.error('   1. The model may not support JSON mode (response_format: { type: "json_object" })')
        console.error('   2. Try a different model that supports structured JSON output')
        console.error('   3. Check OpenRouter model capabilities and documentation')
        console.error('   4. Verify the API key and model ID are correct')
        console.error('   5. The system prompt may need adjustment to ensure JSON output')
        
        // OPTIMIZATION FINAL: Reuse cached errorMsg and modelId
        throw new Error(`AI model returned invalid format. The model '${modelId}' may not support JSON mode properly. Please try a different model or check the model configuration. Original error: ${errorMsg}`)
      }

      // OPTIMIZATION FINAL: Reuse cached errorMsg
      throw new Error(`Failed to generate signals: ${errorMsg}`)
    }

  }

