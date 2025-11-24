/**
 * Cycle Core
 * Main cycle loop logic, interval handling, and step coordination
 */

import { CycleState, CycleConfig, Signal, MarketData, PositionState } from '../../types'
import { generateSignals } from '../../signal-generation/generate-signals'
import { getMarketData } from '../../data-fetchers/market-data'
import { getAssetMetadata, getUserState } from '../../data-fetchers/hyperliquid'
import { rankAssetsByIndicatorQuality } from '../../analysis/indicator-quality'
import { countBullishBearishIndicators } from '../../analysis/count-indicators'
import { getHyperliquidAccountAddress } from '../../config'
import { updatePositionPrices } from './position-monitor'
import { checkAllExitConditions, getHighestPriorityExit, determineExitAction } from './exit-manager'
import { PerformanceTracker } from './performance-tracker'
// import { getBTCCurrentPrice } from '../../analysis/btc-correlation'
import { syncPositionsWithHyperliquid, reconcilePositionState } from './position-sync'
import { checkCircuitBreaker } from './circuit-breaker'

export interface CycleCoreConfig {
  cycleConfig: CycleConfig
  intervalMs: number
  stateFile: string
  performanceFile: string
  aiTrainingDataFile: string
  model: any
  executor: any // PaperExecutor or LiveExecutor
  isLive: boolean
  performanceTracker?: PerformanceTracker // Optional performance tracker
}

export interface CycleStepResult {
  success: boolean
  error?: string
  signals?: Signal[]
  rejectedSignals?: Array<{ signal: Signal; reason: string }>
  exitActions?: Array<{ position: PositionState; exitAction: any }>
  state?: Partial<CycleState>
  marketData?: Map<string, MarketData> | Record<string, MarketData>
  aiGeneratedCount?: number
}

/**
 * Main cycle execution
 */
export async function executeCycle(
  currentState: Partial<CycleState>,
  config: CycleCoreConfig
): Promise<CycleStepResult> {
  const cycleId = `cycle_${Date.now()}`
  const now = Date.now()

  try {
    // Step 1: Check circuit breaker
    const circuitBreakerCheck = checkCircuitBreaker(
      currentState.circuitBreaker || { status: 'NORMAL', dailyPnL: 0, consecutiveLosses: 0, apiErrorRate: 0 },
      {
        dailyLossLimitPct: 5,
        consecutiveLossesLimit: 5,
        apiErrorRateThreshold: 50
      },
      currentState.trades || [],
      config.executor.getApiErrorRate ? config.executor.getApiErrorRate() : 0,
      config.executor.getApiRequestCount ? config.executor.getApiRequestCount() : 0
    )

    if (circuitBreakerCheck.status !== 'NORMAL') {
      return {
        success: false,
        error: `Circuit breaker ${circuitBreakerCheck.status}: ${circuitBreakerCheck.reason}`
      }
    }

    // Step 2: Sync positions (LIVE mode only)
    if (config.isLive && currentState.positions) {
      try {
        const syncResult = await syncPositionsWithHyperliquid(
          currentState.positions,
          getHyperliquidAccountAddress(),
          { enabled: true, importManualOpens: false }
        )

        if (syncResult.manualCloses.length > 0 || syncResult.sizeMismatches.length > 0) {
          const reconciled = reconcilePositionState(currentState.positions, syncResult)
          currentState.positions = reconciled.updatedPositions

          // Record manual closes as trades
          for (const _close of reconciled.closedPositions) {
            // Would create TradeRecord for manual closes
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.warn(`Position sync failed: ${errorMsg}`)
      }
    }

    // Step 3: Load market data for ALL assets (for ranking)
    const metadata = await getAssetMetadata()
    const allowedAssets = getAssetsForCycle(config.cycleConfig.topNAssets, metadata)
    console.log(`\x1b[36m📊 Loading market data for ${allowedAssets.length} assets (will rank all, then select top ${config.cycleConfig.topNAssets} for signal generation)\x1b[0m`)
    const marketDataResult = await getMarketData(allowedAssets, metadata)

    const marketData = marketDataResult.marketDataMap || marketDataResult
    if (!marketData || (marketData instanceof Map ? marketData.size === 0 : Object.keys(marketData).length === 0)) {
      return {
        success: false,
        error: 'Failed to fetch market data'
      }
    }

    // Step 4: Rank ALL assets, then select top N
    console.log(`\x1b[36m🏆 Ranking ${allowedAssets.length} assets by indicator quality...\x1b[0m`)
    const rankedScores = rankAssetsByIndicatorQuality(marketData, allowedAssets)
    console.log(`\x1b[36m📊 Ranked ${rankedScores.length} assets total (will display top 70)\x1b[0m`)
    
    // CRITICAL FIX: Display top 70 ranked assets with detailed scores for debugging
    const displayCount = Math.min(70, rankedScores.length)
    console.log(`\x1b[36m📊 Top ${displayCount} Ranked Assets (with detailed scores):\x1b[0m`)
    
    // Store actions for each asset (for filtering later)
    const rankedActions = new Map<string, 'LONG' | 'SHORT' | 'WAIT'>()
    // Single Table: Detailed with price
    console.log(`\x1b[90m${'─'.repeat(296)}\x1b[0m`)
    console.log(`\x1b[90m#${' '.repeat(3)}${'Asset'.padEnd(10)}${'Price'.padEnd(16)}${'Score'.padEnd(10)}${'Quality'.padEnd(12)}${'Indicators'.padEnd(18)}${'Coverage%'.padEnd(12)}${'Strengths'.padEnd(30)}${'Weaknesses'.padEnd(16)}${'Strengths#'.padEnd(12)}${'Momo(5/15/60m)'.padEnd(26)}${'Align%'.padEnd(10)}${'Comp%'.padEnd(8)}${'Agg%'.padEnd(8)}${'Conf%'.padEnd(12)}${'VolRatio'.padEnd(12)}${'Fund%'.padEnd(10)}${'S/R Dist'.padEnd(12)}${'M60%'.padEnd(8)}${'MACD'.padEnd(12)}${'BTC%'.padEnd(12)}${'Signal'.padEnd(10)}${'Action'.padEnd(10)}\x1b[0m`)
    console.log(`\x1b[90m${'─'.repeat(296)}\x1b[0m`)
    // Helpers
    const pctChangeOverMinutes = (assetData: any, minutes: number): number | null => {
      try {
        const candles = Array.isArray(assetData?.historicalData) ? assetData.historicalData : []
        if (candles.length < 2) return null
        const last = candles[candles.length - 1]
        const lastTs = last?.timestamp || last?.time || last?.t
        const lastClose = last?.close ?? last?.c ?? last?.price
        if (!lastTs || typeof lastClose !== 'number') return null
        const targetTs = lastTs - minutes * 60_000
        let base = null as any
        for (let j = candles.length - 2; j >= 0; j--) {
          const ts = candles[j]?.timestamp || candles[j]?.time || candles[j]?.t
          if (!ts) continue
          if (ts <= targetTs) { base = candles[j]; break }
        }
        if (!base) base = candles[0]
        const baseClose = base?.close ?? base?.c ?? base?.price
        if (typeof baseClose !== 'number' || baseClose <= 0) return null
        return ((lastClose - baseClose) / baseClose) * 100
      } catch { return null }
    }
    let computeExpectedConfidenceFn: ((asset: string, data: any) => { expected: number }) | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../../analysis/expected-confidence')
      computeExpectedConfidenceFn = mod.computeExpectedConfidence
    } catch { /* no-op */ }

    // Precompute BTC price for indicator column using btc-correlation indicator (fallback to marketData)
    // let _btcPriceStr = '$-'
    // try {
    //   const btcPrice = await getBTCCurrentPrice()
    //   if (typeof btcPrice === 'number' && isFinite(btcPrice) && btcPrice > 0) {
    //     _btcPriceStr = `$${btcPrice.toFixed(2)}`
    //   }
    // } catch {
    //   const btcDataObj = marketData instanceof Map ? marketData.get('BTC') : (marketData as any)['BTC']
    //   const btcv = btcDataObj?.price ?? btcDataObj?.markPx ?? btcDataObj?.data?.price ?? btcDataObj?.data?.markPx
    //   const btcn = typeof btcv === 'string' ? parseFloat(btcv) : (typeof btcv === 'number' ? btcv : 0)
    //   _btcPriceStr = (isFinite(btcn) && btcn > 0) ? `$${btcn.toFixed(2)}` : '$-'
    // }
    // Removed verbose BTC correlation explanation output per user request
    for (let i = 0; i < displayCount; i++) {
      const ranked = rankedScores[i]
      const score = ranked.score || 0
      const quality = ranked.quality || 'unknown'
      const qualityColor = quality === 'excellent' ? '\x1b[32m' : quality === 'good' ? '\x1b[36m' : quality === 'fair' ? '\x1b[33m' : '\x1b[31m'
      const indicatorsCount = ranked.indicatorsCount || 0
      const INDICATORS_TOTAL = parseInt(process.env.INDICATORS_TOTAL || '20')
      const indicatorsDisplay = `${indicatorsCount}/${INDICATORS_TOTAL}`.padEnd(18)
      const coveragePctNum = INDICATORS_TOTAL > 0 ? Math.round((indicatorsCount / INDICATORS_TOTAL) * 100) : 0
      const coverageDisplay = `${coveragePctNum}%`.padEnd(12)
      const strengths = (ranked.strengths || []).slice(0, 2).join(', ') || 'None'
      // Align counts to indicators: Strengths# == indicatorsCount, Weaknesses == total - indicatorsCount
      const strengthsCount = indicatorsCount
      const weaknessesCountDisplay = Math.max(0, INDICATORS_TOTAL - indicatorsCount)
      const weaknessesStr = (weaknessesCountDisplay > 0 ? `${weaknessesCountDisplay} issues` : 'None').padEnd(16)
      const strengthsCountStr = `${strengthsCount}`.padEnd(12)
      const scoreColor = score >= 80 ? '\x1b[32m' : score >= 60 ? '\x1b[36m' : score >= 40 ? '\x1b[33m' : '\x1b[31m'
      // Prepare asset and price for detailed table
      const assetDataObj = marketData instanceof Map ? marketData.get(ranked.asset) : (marketData as any)[ranked.asset]
      const vpx = assetDataObj?.price ?? assetDataObj?.markPx ?? assetDataObj?.data?.price ?? assetDataObj?.data?.markPx
      const npx = typeof vpx === 'string' ? parseFloat(vpx) : (typeof vpx === 'number' ? vpx : 0)
      
      // CRITICAL FIX: Always use priceString/markPxString from Hyperliquid for accurate price display
      // This ensures price in ranking table matches Hyperliquid UI exactly (same as signal generation)
      const rawPriceString =
        (assetDataObj as any)?.data?.priceString ||
        (assetDataObj as any)?.data?.markPxString ||
        (assetDataObj as any)?.priceString ||
        (assetDataObj as any)?.markPxString ||
        (isFinite(npx) && npx > 0 ? npx.toString() : '-')
      
      const assetStr = ranked.asset.padEnd(10)
      // Truncate price if too long (max 15 chars including $ sign to fit in 16-char column)
      const priceDisplay = rawPriceString.length > 15 ? rawPriceString.substring(0, 15) : rawPriceString
      const priceStr = (`$${priceDisplay}`).padEnd(16)
      const scorePadded = score.toFixed(1).padEnd(10)
      const scoreStr = `${scoreColor}${scorePadded}\x1b[0m`
      const qualityPadded = quality.padEnd(12)
      const qualityStr = `${qualityColor}${qualityPadded}\x1b[0m`
      const strengthsStr = strengths.substring(0, 28).padEnd(30)
      // New columns
      // Prefer Hyperliquid-provided momentum if available in externalData
      const hl = assetDataObj?.externalData?.hyperliquid || {}
      const hl5 = typeof hl.momentum5m === 'number' ? hl.momentum5m : null
      const hl15 = typeof hl.momentum15m === 'number' ? hl.momentum15m : null
      const hl60 = typeof hl.momentum60m === 'number' ? hl.momentum60m : null
      const m5 = hl5 != null ? hl5 : pctChangeOverMinutes(assetDataObj, 5)
      const m15 = hl15 != null ? hl15 : pctChangeOverMinutes(assetDataObj, 15)
      const m60 = hl60 != null ? hl60 : pctChangeOverMinutes(assetDataObj, 60)
      const fmt = (v: number | null) => v == null ? '-' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
      const momoStr = `${fmt(m5)} / ${fmt(m15)} / ${fmt(m60)}`.padEnd(26)
      let confPctDisplay = '--'.padEnd(12)
      const alignPctDisplay = `${Math.max(0, Math.min(100, (ranked as any).trendAlignmentScore || 0)).toFixed(0)}%`.padEnd(10)
      const compPctDisplay = `${Math.max(0, Math.min(100, Math.round(((ranked as any).compositeScore || 0) * 100)))}%`.padEnd(8)
      const aggrPctDisplay = `${Math.max(0, Math.min(100, Math.round(((ranked as any).aggressivePercent || 0))))}%`.padEnd(8)
      if (computeExpectedConfidenceFn && assetDataObj) {
        try {
          const ec = computeExpectedConfidenceFn(ranked.asset, assetDataObj)
          const ecVal = typeof ec?.expected === 'number' ? Math.max(0, Math.min(100, ec.expected)) : 0
          confPctDisplay = `${Math.round(ecVal)}%`.padEnd(12)
        } catch { /* no-op */ }
      }
      // Additional columns: Volume Ratio, Funding Rate, S/R Distance, M60%
      const externalData = assetDataObj?.externalData || assetDataObj?.data?.externalData || {}
      let volRatioVal = externalData?.comprehensiveVolumeAnalysis?.volumeConfirmation?.volumeRatio
      // Fallback compute Volume Ratio if missing: last candle volume / avg of last 20 candle volumes
      if (!(typeof volRatioVal === 'number' && isFinite(volRatioVal))) {
        const hist = assetDataObj?.historicalData || assetDataObj?.data?.historicalData || []
        if (Array.isArray(hist) && hist.length > 1) {
          const lastVol = typeof hist[hist.length - 1]?.volume === 'number' ? hist[hist.length - 1].volume : null
          const candlesToUse = Math.min(20, hist.length - 1)
          let sumVol = 0
          let countVol = 0
          for (let k = hist.length - 1 - candlesToUse; k < hist.length - 1; k++) {
            const cv = hist[k]?.volume
            if (typeof cv === 'number' && isFinite(cv) && cv > 0) {
              sumVol += cv
              countVol++
            }
          }
          const avgVol = countVol > 0 ? sumVol / countVol : 0
          if (avgVol > 0 && typeof lastVol === 'number' && isFinite(lastVol) && lastVol > 0) {
            volRatioVal = lastVol / avgVol
          }
        }
      }
      const volRatioStrRaw = typeof volRatioVal === 'number' && isFinite(volRatioVal) ? `${volRatioVal.toFixed(2)}x` : '--'
      const fundingVal = externalData?.hyperliquid?.fundingRate
      const fundingStrRaw = typeof fundingVal === 'number' && isFinite(fundingVal) ? `${(fundingVal * 100).toFixed(4)}%` : '--'
      // S/R Distance (% to nearest support/resistance)
      const indicatorsObj = assetDataObj?.indicators || assetDataObj?.data?.indicators || {}
      const support = indicatorsObj?.supportResistance?.support
      const resistance = indicatorsObj?.supportResistance?.resistance
      const currentPx = npx > 0 ? npx : (assetDataObj?.price ?? assetDataObj?.markPx ?? 0)
      let srDistPct: number | null = null
      if (typeof currentPx === 'number' && isFinite(currentPx) && currentPx > 0) {
        const dists: number[] = []
        if (typeof support === 'number' && isFinite(support) && support > 0) dists.push(Math.abs((currentPx - support) / currentPx) * 100)
        if (typeof resistance === 'number' && isFinite(resistance) && resistance > 0) dists.push(Math.abs((resistance - currentPx) / currentPx) * 100)
        if (dists.length > 0) srDistPct = Math.min(...dists)
      }
      const srDistStrRaw = srDistPct != null ? `${srDistPct.toFixed(2)}%` : '--'
      const m60StrRaw = (typeof m60 === 'number' && isFinite(m60)) ? `${m60.toFixed(1)}%` : '--'

      // Color helpers
      const green = (s: string) => `\x1b[32m${s}\x1b[0m`
      const red = (s: string) => `\x1b[31m${s}\x1b[0m`
      const base = (s: string) => s
      // Color rules
      const coloredAlign = (() => {
        const raw = alignPctDisplay.trim()
        const padded = raw.padEnd(10)
        const v = parseFloat(raw)
        if (!isNaN(v)) {
          if (v >= 60) return green(padded)
          if (v <= 30) return red(padded)
        }
        return base(padded)
      })()
      const coloredComp = (() => {
        const raw = compPctDisplay.trim()
        const padded = raw.padEnd(8)
        const v = parseFloat(raw)
        if (!isNaN(v)) {
          if (v >= 70) return green(padded)
          if (v <= 50) return red(padded)
        }
        return base(padded)
      })()
      const coloredAgg = (() => {
        const raw = aggrPctDisplay.trim()
        const padded = raw.padEnd(8)
        const v = parseFloat(raw)
        if (!isNaN(v)) {
          if (v >= 60) return green(padded)
          if (v <= 45) return red(padded)
        }
        return base(padded)
      })()
      const coloredConf = (() => {
        const raw = confPctDisplay.trim()
        const padded = raw.padEnd(12)
        const v = parseFloat(raw)
        if (!isNaN(v)) {
          if (v >= 60) return green(padded)
          if (v <= 50) return red(padded)
        }
        return base(padded)
      })()
      const coloredVolRatio = (() => {
        const padded = volRatioStrRaw.padEnd(12)
        const v = typeof volRatioVal === 'number' ? volRatioVal : NaN
        if (!isNaN(v)) {
          if (v >= 1.2) return green(padded)
          if (v <= 0.8) return red(padded)
        }
        return base(padded)
      })()
      const coloredFunding = (() => {
        const padded = fundingStrRaw.padEnd(10)
        const v = typeof fundingVal === 'number' ? Math.abs(fundingVal) * 100 : NaN
        if (!isNaN(v)) {
          if (v < 0.05) return green(padded) // near-neutral funding is good
          if (v > 0.15) return red(padded) // elevated funding = risk
        }
        return base(padded)
      })()
      const coloredSRDist = (() => {
        const padded = srDistStrRaw.padEnd(12)
        const v = srDistPct
        if (v != null) {
          if (v < 0.3) return red(padded) // too close = risky
          if (v >= 0.3 && v <= 2.5) return green(padded) // actionable zone
        }
        return base(padded)
      })()
      const coloredM60 = (() => {
        const padded = m60StrRaw.padEnd(8)
        const v = typeof m60 === 'number' ? m60 : NaN
        if (!isNaN(v)) {
          if (v > 0) return green(padded)
          if (v < 0) return red(padded)
        }
        return base(padded)
      })()
      const coloredMACD = (() => {
        const macdFmt = (x: number) => {
          const ax = Math.abs(x)
          if (ax >= 1000) return x.toExponential(2)
          if (ax >= 1) return x.toFixed(3)
          return x.toFixed(4)
        }
        const raw = (typeof indicatorsObj?.macd?.histogram === 'number' && isFinite(indicatorsObj.macd.histogram))
          ? macdFmt(indicatorsObj.macd.histogram)
          : '--'
        const padded = raw.padEnd(12)
        const v = indicatorsObj?.macd?.histogram
        if (typeof v === 'number' && isFinite(v)) {
          if (v > 0) return green(padded)
          if (v < 0) return red(padded)
        }
        return base(padded)
      })()
      // BTC indicator as percent move (60m) for context
      const btcAssetObj = marketData instanceof Map ? marketData.get('BTC') : (marketData as any)['BTC']
      const btcPct60 = pctChangeOverMinutes(btcAssetObj, 60)
      const btcRaw = (typeof btcPct60 === 'number' && isFinite(btcPct60)) ? `${btcPct60 >= 0 ? '+' : ''}${btcPct60.toFixed(1)}%` : '--'
      const btcPadded = btcRaw.padEnd(12)
      const coloredBTC = (() => {
        if (typeof btcPct60 === 'number' && isFinite(btcPct60)) {
          if (btcPct60 > 0) return `\x1b[32m${btcPadded}\x1b[0m`
          if (btcPct60 < 0) return `\x1b[31m${btcPadded}\x1b[0m`
        }
        return btcPadded
      })()
      // Rule-based directional inference using all indicators
      const priceInd = indicatorsObj?.price || 0
      
      // Use countBullishBearishIndicators to get all 13 technical indicators
      const indicatorCount = countBullishBearishIndicators(indicatorsObj, priceInd)
      const bullishCount = indicatorCount.bullishCount
      const bearishCount = indicatorCount.bearishCount
      const summaryDir = indicatorCount.summaryDir
      
      // Calculate count difference (base signal strength)
      let countDiff = bullishCount - bearishCount
      
      // Add momentum boost (m5, m15, m60) to countDiff
      // Momentum adds to countDiff but doesn't override indicator consensus
      if (typeof m60 === 'number' && isFinite(m60)) {
        if (m60 > 0.5) countDiff += 1 // Strong bullish momentum
        else if (m60 < -0.5) countDiff -= 1 // Strong bearish momentum
      }
      if (typeof m15 === 'number' && isFinite(m15)) {
        if (m15 > 0) countDiff += 0.5 // Bullish momentum
        else if (m15 < 0) countDiff -= 0.5 // Bearish momentum
      }
      if (typeof m5 === 'number' && isFinite(m5)) {
        // M5 only adds if it confirms direction (reduces noise)
        if ((countDiff > 0 && m5 > 0) || (countDiff < 0 && m5 < 0)) {
          countDiff += m5 > 0 ? 0.5 : -0.5
        }
      }
      
      // Add volume confirmation boost if volRatio > 1.3
      if (typeof volRatioVal === 'number' && isFinite(volRatioVal)) {
        if (volRatioVal > 1.3 && countDiff !== 0) {
          // High volume confirms direction
          countDiff += countDiff > 0 ? 0.5 : -0.5
        } else if (volRatioVal < 0.7 && countDiff !== 0) {
          // Low volume weakens signal (reduce by 20%)
          countDiff = Math.round(countDiff * 0.8)
        }
      }
      
      // Rule-based label with strength indicator:
      // BUY/LONG, SELL/SHORT, else WAIT (avoid using HOLD here to not confuse with real positions)
      let signalRB = 'WAIT'
      let signalStrength = ''
      
      // Determine signal based on countDiff and summaryDir
      // CRITICAL FIX: Require minimum countDiff threshold to avoid too many signals
      // Only generate signal if countDiff is significant enough (>= 2 for weak, >= 3 for strong)
      // This ensures WAIT is used when indicators are mixed or weak
      if (summaryDir === 'BUY' && countDiff >= 2) {
        // Very strong (++): countDiff >= 5 or (countDiff >= 4 with strong momentum)
        if (countDiff >= 5 || (countDiff >= 4 && typeof m60 === 'number' && isFinite(m60) && Math.abs(m60) > 0.5)) {
          signalRB = 'BUY'
          signalStrength = '++'
        }
        // Strong (+): countDiff >= 4 or (countDiff >= 3 with momentum)
        else if (countDiff >= 4 || (countDiff >= 3 && typeof m15 === 'number' && isFinite(m15) && m15 !== 0)) {
          signalRB = 'BUY'
          signalStrength = '+'
        }
        // Weak signal: countDiff >= 2 (minimum threshold to avoid too many weak signals)
        else if (countDiff >= 2) {
          signalRB = 'BUY'
          signalStrength = ''
        }
      } else if (summaryDir === 'SELL' && countDiff <= -2) {
        // Very strong (++): countDiff <= -5 or (countDiff <= -4 with strong momentum)
        if (countDiff <= -5 || (countDiff <= -4 && typeof m60 === 'number' && isFinite(m60) && Math.abs(m60) > 0.5)) {
          signalRB = 'SELL'
          signalStrength = '++'
        }
        // Strong (+): countDiff <= -4 or (countDiff <= -3 with momentum)
        else if (countDiff <= -4 || (countDiff <= -3 && typeof m15 === 'number' && isFinite(m15) && m15 !== 0)) {
          signalRB = 'SELL'
          signalStrength = '+'
        }
        // Weak signal: countDiff <= -2 (minimum threshold to avoid too many weak signals)
        else if (countDiff <= -2) {
          signalRB = 'SELL'
          signalStrength = ''
        }
      }
      // If summaryDir is MIXED, countDiff is between -2 and 2, or indicators are weak, signalRB remains 'WAIT'
      
      const actionRB = signalRB === 'BUY' ? 'LONG' : (signalRB === 'SELL' ? 'SHORT' : 'WAIT')
      
      // Store action for this asset (for filtering later)
      rankedActions.set(ranked.asset, actionRB)
      
      // Format with strength indicator (no emoji)
      const signalDisplay = signalStrength ? `${signalRB}${signalStrength}` : signalRB
      const signalPadded = signalDisplay.padEnd(10)
      const actionPadded = actionRB.padEnd(10)
      
      const signalCol = (signalRB === 'BUY' ? green(signalPadded) : signalRB === 'SELL' ? red(signalPadded) : signalPadded)
      const actionCol = (actionRB === 'LONG' ? green(actionPadded) : actionRB === 'SHORT' ? red(actionPadded) : actionPadded)
      
      // Color rank number based on action
      // Header: "#   " (1 char # + 3 spaces = 4 chars total)
      // Row: rankNum (3 chars max) + 1 space = 4 chars total to match header
      const rankNum = `${i + 1}`.padEnd(3)
      const rankCol = actionRB === 'LONG' 
        ? green(rankNum) 
        : actionRB === 'SHORT' 
        ? red(rankNum) 
        : `\x1b[90m${rankNum}\x1b[0m` // Base color for WAIT
      
      console.log(`${rankCol} ${assetStr}${priceStr}${scoreStr}${qualityStr}${indicatorsDisplay}${coverageDisplay}${strengthsStr}${weaknessesStr}${strengthsCountStr}${momoStr}${coloredAlign}${coloredComp}${coloredAgg}${coloredConf}${coloredVolRatio}${coloredFunding}${coloredSRDist}${coloredM60}${coloredMACD}${coloredBTC}${signalCol}${actionCol}`)
    }
    console.log(`\x1b[90m${'─'.repeat(296)}\x1b[0m`)
    console.log(`\x1b[36m✓ Displayed ${displayCount} assets in ranking table (total ranked: ${rankedScores.length})\x1b[0m`)
    
    // CRITICAL FIX: Add detailed validation logging for top 5 assets with indicator breakdown
    if (process.env.VERBOSE_RANKING === 'true' && rankedScores.length > 0) {
      console.log(`\x1b[36m📋 Detailed Ranking Validation (Top 5):\x1b[0m`)
      for (let i = 0; i < Math.min(5, rankedScores.length); i++) {
        const ranked = rankedScores[i]
        console.log(`\n\x1b[33m${i + 1}. ${ranked.asset}\x1b[0m - Score: \x1b[32m${ranked.score.toFixed(1)}\x1b[0m | Quality: \x1b[32m${ranked.quality}\x1b[0m | Indicators: ${ranked.indicatorsCount}`)
        console.log(`   \x1b[32m✓ Strengths (${ranked.strengths.length}):\x1b[0m ${ranked.strengths.slice(0, 5).join(', ')}`)
        if (ranked.weaknesses.length > 0) {
          console.log(`   \x1b[31m✗ Weaknesses (${ranked.weaknesses.length}):\x1b[0m ${ranked.weaknesses.slice(0, 5).join(', ')}`)
        }
      }
      console.log('')
    }
    
    // CRITICAL FIX: Select assets based on Action filter (from env variable) instead of top N
    // ACTION_FILTER can be: "LONG", "SHORT", "WAIT", "LONG,SHORT", "LONG,SHORT,WAIT", etc.
    // Default: "LONG,SHORT" (exclude WAIT)
    // ACTION_FILTER_LIMIT: Number of assets to select (default: 1)
    // Logic: Loop through ranked assets (in ranking order) and take first N assets that match Action filter
    // This ensures we get the highest-ranked assets with the desired Action (LONG or SHORT), whichever comes first
    const actionFilterEnv = process.env.ACTION_FILTER || 'LONG,SHORT'
    const allowedActions = actionFilterEnv.split(',').map(a => a.trim().toUpperCase()).filter(a => ['LONG', 'SHORT', 'WAIT'].includes(a))
    const hasActionFilter = allowedActions.length > 0
    const actionFilterLimit = parseInt(process.env.ACTION_FILTER_LIMIT || '1')
    
    // Find first N assets that match Action filter (in ranking order)
    const selectedAssets: string[] = []
    if (hasActionFilter && rankedActions.size > 0) {
      // Loop through ranked assets in order (highest rank first)
      for (const ranked of rankedScores) {
        if (selectedAssets.length >= actionFilterLimit) {
          break // Stop after finding N matching assets
        }
        const assetAction = rankedActions.get(ranked.asset)
        if (assetAction && allowedActions.includes(assetAction)) {
          // Found matching asset - add it
          selectedAssets.push(ranked.asset)
        }
      }
    } else {
      // Fallback: use top N if no action filter or no actions stored
      selectedAssets.push(...rankedScores.slice(0, config.cycleConfig.topNAssets).map(s => s.asset))
    }
    
    const topAssets = selectedAssets
    const actionFilterDisplay = hasActionFilter 
      ? ` (Action filter: ${allowedActions.join(', ')}, limit: ${actionFilterLimit})` 
      : ` (top ${config.cycleConfig.topNAssets})`
    console.log(`\x1b[32m✅ Selected ${topAssets.length} asset(s) based on Action${actionFilterDisplay}: ${topAssets.join(', ')}\x1b[0m`)

    // Step 5: Update position prices
    let positions = currentState.positions || new Map<string, PositionState>()
    if (positions.size > 0) {
      positions = updatePositionPrices(positions, marketData)
    }

    // Step 6: Generate signals FIRST (before checking positions)
    // For TEST mode, use mock account state; for LIVE mode, fetch from API
    let accountState: any = null
    if (config.isLive) {
      const address = getHyperliquidAccountAddress()
      if (address) {
        accountState = await getUserState(address, 3, 1000).catch(() => null)
      }
    } else {
      // TEST mode: Use mock account state with default values
      accountState = {
        accountValue: 10000,
        availableCash: 10000,
        totalReturnPercent: 0,
        activePositions: [],
        sharpeRatio: 0
      }
    }

    // Step 6.1: Filter assets by market regime (sideways/choppy market)
    // CRITICAL FIX: Don't trade in low volatility + low trend (choppy/sideways market)
    // PHASE 6: EXCEPTION: Top-ranked assets (top 5) bypass filter (they have excellent quality scores)
    // Increased from top 3 to top 5 to allow more top assets through
    const filteredAssets: string[] = []
    const TOP_RANKED_BYPASS_COUNT = 5 // Top 5 ranked assets bypass market regime filter (increased from 3)
    
    for (let i = 0; i < topAssets.length; i++) {
      const asset = topAssets[i]
      const assetRank = i + 1 // Rank 1, 2, 3, etc.
      const isTopRanked = assetRank <= TOP_RANKED_BYPASS_COUNT
      
      const assetData = marketData instanceof Map ? marketData.get(asset) : marketData[asset]
      if (!assetData || !assetData.indicators) {
        filteredAssets.push(asset) // Include if no indicator data (will be handled later)
        continue
      }

      const indicators = assetData.indicators
      const atrPercent = indicators?.atrPercent || 0
      
      // ADX can be object {adx, plusDI, minusDI} or just number
      let adx = 0
      if (indicators?.adx) {
        if (typeof indicators.adx === 'object' && 'adx' in indicators.adx) {
          adx = indicators.adx.adx || 0
        } else if (typeof indicators.adx === 'number') {
          adx = indicators.adx
        }
      }

      // Market regime filter: Avoid choppy/sideways markets
      // CRITICAL FIX: Relaxed thresholds - ATR < 1.0% (was 1.5%) AND ADX < 20 (was 25) = choppy/sideways market
      // Only filter if both conditions are true AND we have valid indicator data
      // More relaxed to prevent filtering all top assets during normal market conditions
      // EXCEPTION: Top-ranked assets (top 3) bypass filter (they have excellent quality scores)
      const isLowVolatility = atrPercent > 0 && atrPercent < 1.0 // Relaxed from 1.5% to 1.0%
      const isLowTrend = adx > 0 && adx < 20 // Relaxed from 25 to 20
      const isChoppyMarket = isLowVolatility && isLowTrend && atrPercent > 0 && adx > 0

      if (isChoppyMarket && !isTopRanked) {
        console.log(`\x1b[33m⏭️  ${asset}: Skipping (choppy market - ATR ${atrPercent.toFixed(2)}%, ADX ${adx.toFixed(1)}) - wait for clearer trend\x1b[0m`)
        continue // Skip this asset (don't push to filteredAssets)
      } else if (isChoppyMarket && isTopRanked) {
        console.log(`\x1b[32m✓ ${asset} (Rank #${assetRank}): Bypassing market regime filter (top-ranked asset with excellent quality)\x1b[0m`)
        // Continue to push this asset (top-ranked bypasses filter)
      }

      // Push asset to filtered list (either not choppy, or top-ranked bypassing filter)
      filteredAssets.push(asset)
    }

    console.log(`\x1b[36m📊 Market regime filter: ${topAssets.length} → ${filteredAssets.length} assets (removed ${topAssets.length - filteredAssets.length} choppy markets)\x1b[0m`)
    
    // CRITICAL FIX: Better fallback logic - if too many assets filtered, use top N anyway
    // Market regime filter should not prevent trading entirely
    // If >50% of top assets filtered OR all filtered, use top assets anyway
    const filteredPercent = topAssets.length > 0 ? (topAssets.length - filteredAssets.length) / topAssets.length : 0
    const useTopAssetsFallback = filteredAssets.length === 0 || (filteredPercent > 0.5 && topAssets.length > 0)
    
    let assetsToUse: string[] = []
    if (useTopAssetsFallback) {
      // Use top N assets anyway (fallback)
      // Prioritize top-ranked assets even if market regime is choppy
      assetsToUse = topAssets.slice(0, Math.min(config.cycleConfig.topNAssets, topAssets.length))
      if (filteredAssets.length === 0) {
        console.log(`\x1b[33m⚠️  All assets filtered by market regime - using top ${assetsToUse.length} assets anyway (fallback)\x1b[0m`)
      } else {
        console.log(`\x1b[33m⚠️  ${(filteredPercent * 100).toFixed(0)}% of top assets filtered by market regime - using top ${assetsToUse.length} assets anyway (fallback)\x1b[0m`)
      }
    } else {
      // Use filtered assets (normal flow)
      assetsToUse = filteredAssets
    }
    
    console.log(`\x1b[36m🤖 Generating signals for ${assetsToUse.length} assets (after market regime filter, TOP_ASSETS_FOR_AI=${config.cycleConfig.topNAssets})\x1b[0m`)
    
    // DEBUG: Log which top ranked assets will get signals
    console.log(`\x1b[90m   Top ${Math.min(10, assetsToUse.length)} assets for signal generation: ${assetsToUse.slice(0, 10).join(', ')}\x1b[0m`)
    
    const signals = await generateSignals(
      config.model,
      marketData,
      accountState,
      assetsToUse, // Use filtered assets (or fallback to topAssets if all filtered)
      new Map(), // signalHistory
      undefined, // Don't pass positions to AI - we'll check after generation
      rankedScores // PHASE 1: Pass ranked scores for confidence calculation
    )
    
    // DEBUG: Log signal generation results for top ranked assets
    console.log(`\x1b[36m📊 Signal Generation Results:\x1b[0m`)
    console.log(`   Total signals generated: ${signals.length}`)
    
    // Check which top 10 ranked assets got signals vs didn't
    const top10RankedAssets = rankedScores.slice(0, 10).map(rs => rs.asset)
    const top10AssetsWithSignals = signals.filter(s => top10RankedAssets.includes(s.coin || ''))
    const top10AssetsWithoutSignals = top10RankedAssets.filter(asset => !signals.some(s => s.coin === asset))
    
    if (top10AssetsWithSignals.length > 0) {
      console.log(`\x1b[32m   ✓ Top 10 ranked assets WITH signals (${top10AssetsWithSignals.length}):\x1b[0m`)
      for (const signal of top10AssetsWithSignals) {
        const rank = rankedScores.findIndex(rs => rs.asset === signal.coin) + 1
        const confidence = (signal.confidence || 0) * 100
        const confidenceColor = confidence >= 60 ? '\x1b[32m' : confidence >= 50 ? '\x1b[33m' : '\x1b[31m'
        const signalType = signal.signal?.toUpperCase() || 'HOLD'
        console.log(`     Rank #${rank}: ${signal.coin} - ${signalType} - ${confidenceColor}Conf: ${confidence.toFixed(1)}%\x1b[0m`)
      }
    }
    
    if (top10AssetsWithoutSignals.length > 0) {
      console.log(`\x1b[31m   ✗ Top 10 ranked assets WITHOUT signals (${top10AssetsWithoutSignals.length}):\x1b[0m`)
      for (const asset of top10AssetsWithoutSignals) {
        const rank = rankedScores.findIndex(rs => rs.asset === asset) + 1
        const rankScore = rankedScores[rank - 1]?.score || 0
        
        // Check if asset was filtered by market regime
        const wasInAssetsToUse = assetsToUse.includes(asset)
        const reason = wasInAssetsToUse 
          ? 'Signal generation failed/returned null (check AI API errors)' 
          : 'Filtered out by market regime (choppy market)'
        
        console.log(`     Rank #${rank}: ${asset} (Score: ${rankScore.toFixed(1)}) - ${reason}\x1b[0m`)
      }
    }
    
    if (top10AssetsWithSignals.length === 0 && top10AssetsWithoutSignals.length === 0) {
      console.log(`   \x1b[33m⚠️  No top 10 ranked assets found in signals list (unexpected)\x1b[0m`)
    }
    
    // Step 7.0: Validate confidence -> signal mapping (CRITICAL FIX)
    // High confidence (>60%) should NOT be HOLD - should be BUY/SELL
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i]
      const confidence = signal.confidence || 0
      const signalType = signal.signal || 'hold'
      
      // CRITICAL FIX: Confidence > 60% dengan bullish/bearish score tinggi seharusnya BUY/SELL, bukan HOLD
      if (signalType === 'hold' && confidence >= 0.60) {
        // Check if this should be a directional signal
        // If confidence is high, convert HOLD to appropriate direction based on context
        const symbol = signal.coin || ''
        const existingPosition = positions.get(symbol)
        
        if (!existingPosition) {
          // High confidence but HOLD without position = WRONG LOGIC
          // This should be BUY or SELL based on market direction
          // For now, log warning - AI should fix this in prompt
          console.log(`\x1b[33m⚠️  ${symbol}: High confidence (${(confidence * 100).toFixed(1)}%) but HOLD signal - should be directional signal (BUY/SELL)\x1b[0m`)
        }
      }
    }

    // Step 7.1: Adjust signals based on existing positions
    // Flow: Generate signal → Check if position exists → Decision: HOLD/CLOSE/EXECUTE
    console.log(`\x1b[36m🔍 Checking ${signals.length} signals against ${positions.size} existing positions...\x1b[0m`)
    
    let adjustedCount = 0
    let holdCount = 0
    let reversalCount = 0
    let holdWithoutPositionRemoved = 0
    
    // CRITICAL FIX: Remove HOLD signals without position IMMEDIATELY (before processing)
    // Filter out HOLD signals that don't have positions - they should not exist
    const validSignals: typeof signals = []
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i]
      const symbol = signal.coin || ''
      const signalType = signal.signal || ''
      const existingPosition = positions.get(symbol)
      
      // CRITICAL FIX: Remove HOLD signals without position from signals array
      // HOLD should only exist if there's a position - otherwise it's invalid
      if (signalType === 'hold' && !existingPosition) {
        console.log(`\x1b[33m⏭️  Signal ${symbol}: HOLD (no position) - REMOVING from signals (should be BUY/SELL)\x1b[0m`)
        holdWithoutPositionRemoved++
        continue // Skip this signal - don't add to validSignals
      }
      
      validSignals.push(signal)
    }
    
    // Replace signals array with filtered valid signals
    signals.length = 0
    signals.push(...validSignals)
    
    console.log(`\x1b[36m📊 Removed ${holdWithoutPositionRemoved} HOLD signals without position (${signals.length} valid signals remaining)\x1b[0m`)
    
    // Now process remaining valid signals
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i]
      const symbol = signal.coin || ''
      const signalType = signal.signal || ''
      const existingPosition = positions.get(symbol)
      
      // At this point, all HOLD signals should have positions (we filtered them out above)
      if (!existingPosition) {
        // No position exists - signal must be BUY/SELL/ADD (not HOLD - we filtered those out)
        // These signals are valid for execution
        continue
      }
      
      // Position exists - adjust signal based on position vs signal direction
      const positionSide = existingPosition.side || 'LONG'
      
      // Case 1: Signal same as position (BUY signal + LONG position OR SELL signal + SHORT position) → HOLD
      if ((signalType === 'buy_to_enter' && positionSide === 'LONG') ||
          (signalType === 'sell_to_enter' && positionSide === 'SHORT')) {
        console.log(`\x1b[36m✓ Signal ${symbol}: ${signalType.toUpperCase()} → HOLD (already have ${positionSide} position @ $${(existingPosition.entryPrice || existingPosition.entry_price || 0).toFixed(4)})\x1b[0m`)
        signal.signal = 'hold'
        adjustedCount++
        holdCount++
        continue
      }
      
      // Case 2: Signal opposite of position (BUY signal + SHORT position OR SELL signal + LONG position) → Mark for CLOSE
      if ((signalType === 'buy_to_enter' && positionSide === 'SHORT') ||
          (signalType === 'sell_to_enter' && positionSide === 'LONG')) {
        console.log(`\x1b[33m🔄 Signal ${symbol}: ${signalType.toUpperCase()} (opposite to ${positionSide} position @ $${(existingPosition.entryPrice || existingPosition.entry_price || 0).toFixed(4)}) → Will trigger SIGNAL_REVERSAL exit\x1b[0m`)
        // Signal reversal will be handled by exit condition check (signalReversal)
        // Keep signal as-is - exit manager will detect reversal and close position
        reversalCount++
        continue
      }
      
      // Case 3: Signal is HOLD and position exists → Keep HOLD
      if (signalType === 'hold') {
        console.log(`\x1b[36m✓ Signal ${symbol}: HOLD (maintain ${positionSide} position @ $${(existingPosition.entryPrice || existingPosition.entry_price || 0).toFixed(4)})\x1b[0m`)
        holdCount++
        continue
      }
      
      // Case 4: Other signals (ADD, REDUCE, CLOSE_ALL) → Keep as-is
    }
    
    // Summary
    console.log(`\x1b[36m📊 Signal adjustment summary: ${holdWithoutPositionRemoved} HOLD removed (no position), ${adjustedCount} converted to HOLD, ${holdCount} total HOLD signals (with position), ${reversalCount} reversal signals detected\x1b[0m`)

    // Step 7: Check exit conditions for existing positions (AFTER signal generation)
    const exitActions: Array<{ position: PositionState; exitAction: any }> = []
    if (positions.size > 0) {
      for (const [symbol, position] of positions.entries()) {
        const assetMarketData = marketData instanceof Map ? marketData.get(symbol) : marketData[symbol]
        const currentRanking = rankedScores.findIndex(s => s.asset === symbol) + 1 || null

        // Find matching signal for this position (for signal reversal check)
        const matchingSignal = signals.find(s => (s.coin || '') === symbol)
        
        const exitConditions = checkAllExitConditions(
          position,
          position.currentPrice,
          matchingSignal || null, // Pass signal for signal reversal check
          currentRanking,
          assetMarketData || null,
          {
            stopLoss: { enabled: config.cycleConfig.enabledExitConditions.stopLoss, defaultStopLossPct: 2, usePercentageBased: true, useFixedPrice: false },
            takeProfit: { enabled: config.cycleConfig.enabledExitConditions.takeProfit, defaultTakeProfitPct: 5, levels: [2, 4, 6], sizes: [50, 30, 20], autoMoveStopLossToBreakeven: true },
            trailingStop: { enabled: config.cycleConfig.enabledExitConditions.trailingStop, distancePct: 1, activateAfterGainPct: 1 },
            signalReversal: { enabled: config.cycleConfig.enabledExitConditions.signalReversal, confidenceThreshold: 50 }, // Lower threshold for testing (50% instead of 60%)
            rankingDrop: { enabled: config.cycleConfig.enabledExitConditions.rankingDrop, topN: config.cycleConfig.topNAssets, confirmationCycles: 2, useBuffer: true, bufferSize: 2 },
            indicatorBased: { enabled: config.cycleConfig.enabledExitConditions.indicatorBased, strict: false, requireConfirmation: false, rsiThreshold: 70, macdCrossover: true, emaBreak: true, supportResistanceBreak: true, atrExpansion: true, atrExpansionThreshold: 2.5 },
            enabled: true
          }
        )

        const exitCondition = getHighestPriorityExit(exitConditions)
        if (exitCondition) {
          const exitAction = determineExitAction(exitCondition, position)
          if (exitAction.shouldExit) {
            exitActions.push({ position, exitAction })
            // Log exit decision (always show, not just verbose)
            console.log(`\x1b[33m⚠️  EXIT DECISION: ${symbol} - ${exitCondition.reason} - ${exitCondition.description}\x1b[0m`)
          }
        }
      }
    }

    // Step 8: Execute exit actions
    const positionsBeforeExit = positions.size
    if (exitActions.length > 0) {
      console.log(`\x1b[36m📤 Executing ${exitActions.length} exit action(s)... (Current positions: ${positionsBeforeExit})\x1b[0m`)
    }
    
    for (const { position, exitAction } of exitActions) {
      if (!config.executor.executeExit) {
        console.warn(`⚠️  Exit executor not available for ${position.symbol}`)
        continue
      }

      try {
        const symbol = position.symbol || position.coin || 'UNKNOWN'
        console.log(`\x1b[33m🔄 Closing ${symbol} (${exitAction.exitSize}%) - Reason: ${exitAction.reason}\x1b[0m`)
        
        const order = await config.executor.executeExit(
          position,
          exitAction.exitSize,
          exitAction.reason,
          exitAction.exitPrice
        )

        if (order.status === 'FILLED' || order.status === 'PARTIAL_FILLED') {
          console.log(`\x1b[32m✅ Exit order FILLED: ${symbol} (${exitAction.exitSize}%)\x1b[0m`)
          
          // Update or remove position from state
          const exitQuantity = order.filledQuantity || order.quantity || 0
          const totalQuantity = Math.abs(position.quantity || 0)
          const remainingQuantity = totalQuantity - exitQuantity
          
          if (remainingQuantity < 0.0001) {
            // Fully closed - remove position
            positions.delete(symbol)
            console.log(`\x1b[32m✓ Position ${symbol} fully closed and removed from state\x1b[0m`)
          } else {
            // Partial close - update quantity
            const side = position.side || 'LONG'
            position.quantity = side === 'LONG' ? remainingQuantity : -remainingQuantity
            position.unrealizedPnl = 0 // Reset, will be recalculated in next cycle
            position.unrealizedPnlPct = 0
            console.log(`\x1b[33m⚠ Position ${symbol} partially closed: ${remainingQuantity.toFixed(4)} remaining (${(remainingQuantity / totalQuantity * 100).toFixed(1)}%)\x1b[0m`)
          }
          
          // Create trade record for performance tracking
          const performanceTracker = config.performanceTracker
          if (!performanceTracker) {
            console.warn(`\x1b[33m⚠️  PerformanceTracker not available - trade will not be recorded for ${symbol}\x1b[0m`)
          } else {
            const entryPrice = position.entryPrice || position.entry_price || 0
            const exitPrice = order.filledPrice || order.price || exitAction.exitPrice
            const side = position.side || 'LONG'
            const leverage = position.leverage || 1
            const holdingTimeMinutes = position.entryTime ? Math.floor((Date.now() - position.entryTime) / 60000) : 0
            
            // Calculate PnL
            const pnl = side === 'LONG'
              ? (exitPrice - entryPrice) * exitQuantity
              : (entryPrice - exitPrice) * exitQuantity
            
            // For futures trading with leverage, calculate PnL % based on margin (not position value)
            const positionValueAtEntry = entryPrice * exitQuantity
            const marginUsed = positionValueAtEntry / leverage
            const pnlPct = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0
            
            // Calculate R-Multiple (assuming 2% risk per trade)
            const riskAmount = (entryPrice * exitQuantity) * 0.02
            const rMultiple = riskAmount > 0 ? pnl / riskAmount : 0
            
            // Map exitReason to ExitReason type
            const exitReason = exitAction.reason || 'UNKNOWN'
            
            // Determine if stop loss or take profit was hit
            const didHitStopLoss = exitReason === 'STOP_LOSS' || exitReason === 'STOP_LOSS_HIT'
            const didHitTakeProfit = exitReason === 'TAKE_PROFIT' || exitReason === 'TAKE_PROFIT_HIT' || exitReason === 'TAKE_PROFIT_LEVEL_1' || exitReason === 'TAKE_PROFIT_LEVEL_2' || exitReason === 'TAKE_PROFIT_LEVEL_3'
            
            const tradeRecord: any = {
              id: order.id || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              cycleId: currentState.cycleId || cycleId || 'unknown',
              symbol,
              side,
              entryPrice,
              exitPrice,
              quantity: exitQuantity,
              leverage: position.leverage || 1,
              entryTime: position.entryTime || position.entry_time || Date.now(),
              exitTime: Date.now(),
              holdingTimeMinutes,
              pnl,
              pnlPct,
              rMultiple,
              exitReason,
              exitReasonDetails: exitAction.description || undefined,
              didHitStopLoss,
              didHitTakeProfit,
              numExitConditionsTriggered: 1
            }
            
            console.log(`\x1b[36m📊 Creating trade record for ${symbol}: PnL=${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%), R=${rMultiple.toFixed(2)}, Holding=${holdingTimeMinutes}m\x1b[0m`)
            performanceTracker.addTrade(tradeRecord)
            console.log(`\x1b[32m✓ Trade recorded: ${symbol} (ID: ${tradeRecord.id})\x1b[0m`)
          }
        } else {
          console.warn(`⚠️  Exit order ${order.status}: ${symbol} - ${(order as any).rejectedReason || 'Unknown reason'}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const symbol = position.symbol || position.coin || 'UNKNOWN'
        console.error(`❌ Failed to execute exit order for ${symbol}: ${errorMsg}`)
      }
    }
    
    // Log exit execution summary
    const positionsAfterExit = positions.size
    if (exitActions.length > 0) {
      console.log(`\x1b[36m✓ Exit execution complete: ${positionsBeforeExit} → ${positionsAfterExit} positions (${positionsBeforeExit - positionsAfterExit} closed)\x1b[0m`)
    }

    // Step 9: Execute entry signals (if circuit breaker allows)
    // Only execute signals that are NOT HOLD
    if (!circuitBreakerCheck.shouldPauseEntries) {
      for (const signal of signals) {
        // Skip HOLD signals (no action needed)
        if (signal.signal === 'hold') {
          continue
        }
        
        // Skip other non-entry signals
        if (signal.signal !== 'buy_to_enter' && signal.signal !== 'sell_to_enter' && signal.signal !== 'add') {
          continue
        }
        
        // Pre-trade guard: block counter-trend entries without short-term momentum confirmation
        // Evaluate trend alignment (daily + 4H/1H) and short-term momentum (5m, 15m)
        try {
          const assetMarketData = marketData instanceof Map ? marketData.get(signal.coin || '') : marketData[signal.coin || '']
          const trendAlignment = assetMarketData?.trendAlignment || assetMarketData?.data?.trendAlignment
          const historicalData = assetMarketData?.historicalData || assetMarketData?.data?.historicalData || []
          const externalData = assetMarketData?.externalData || assetMarketData?.data?.externalData || {}
          const indicators = assetMarketData?.indicators || assetMarketData?.data?.indicators || {}
          // Prefer Hyperliquid external momentum if available
          const hl = externalData?.hyperliquid || {}
          const m5 = typeof hl?.momentum5m === 'number' ? hl.momentum5m : computePctChangeOverMinutesFromHistorical(historicalData, 5)
          const m15 = typeof hl?.momentum15m === 'number' ? hl.momentum15m : computePctChangeOverMinutesFromHistorical(historicalData, 15)
          const m60 = typeof hl?.momentum60m === 'number' ? hl.momentum60m : computePctChangeOverMinutesFromHistorical(historicalData, 60)

          // Support/Resistance distance (nearest level, in %)
          const sr = indicators?.supportResistance || {}
          const currentPx = assetMarketData?.price || assetMarketData?.markPx || assetMarketData?.data?.price || assetMarketData?.data?.markPx || 0
          const srDistPct = (() => {
            const px = currentPx
            if (typeof px !== 'number' || !isFinite(px) || px <= 0) return null
            const sup = typeof sr.support === 'number' && isFinite(sr.support) && sr.support > 0 ? sr.support : null
            const res = typeof sr.resistance === 'number' && isFinite(sr.resistance) && sr.resistance > 0 ? sr.resistance : null
            const dists: number[] = []
            if (sup != null) dists.push(Math.abs((px - sup) / px) * 100)
            if (res != null) dists.push(Math.abs((res - px) / px) * 100)
            return dists.length > 0 ? Math.min(...dists) : null
          })()

          // RSI guard (use main RSI14)
          const rsi = typeof indicators?.rsi14 === 'number' && isFinite(indicators.rsi14) ? indicators.rsi14 : null
          const rsiOverbought = parseFloat(process.env.GUARD_RSI_OVERBOUGHT || '85') // Relaxed from 80 to 85
          const rsiOversold = parseFloat(process.env.GUARD_RSI_OVERSOLD || '15') // Relaxed from 20 to 15
          const isRSIOverbought = typeof rsi === 'number' && rsi >= rsiOverbought
          const isRSIOversold = typeof rsi === 'number' && rsi <= rsiOversold
          const dailyTrend = trendAlignment?.dailyTrend
          const h4Aligned = trendAlignment?.h4Aligned
          const h1Aligned = trendAlignment?.h1Aligned
          
          // BUY guard: require not daily downtrend, intraday alignment (if available), and positive short-term momentum
          if (signal.signal === 'buy_to_enter') {
            const failsDaily = dailyTrend === 'downtrend'
            const failsIntraday = (h4Aligned === false) || (h1Aligned === false)
            const failsMomentum = (typeof m5 === 'number' && m5 <= 0) || (typeof m15 === 'number' && m15 <= 0)
            const srMinLong = parseFloat(process.env.GUARD_SR_MIN_LONG || '0.3') // Relaxed from 0.5% to 0.3% (min distance from nearest S/R)
            const tooCloseSRLong = typeof srDistPct === 'number' && srDistPct < srMinLong
            const failsRSI = isRSIOverbought
            // Anti-FOMO pump guard: avoid chasing blow-off tops
            // Pattern: 60m pump besar, 5m & 15m sudah positif, volume jauh di atas rata-rata.
            let volRatioLong: number | null = null
            const volConfLong = externalData?.comprehensiveVolumeAnalysis?.volumeConfirmation
            if (volConfLong && typeof volConfLong.volumeRatio === 'number' && isFinite(volConfLong.volumeRatio)) {
              volRatioLong = volConfLong.volumeRatio
            } else if (Array.isArray(historicalData) && historicalData.length > 1) {
              const last = historicalData[historicalData.length - 1]
              const lastVol = typeof last?.volume === 'number' ? last.volume : null
              const useN = Math.min(20, historicalData.length - 1)
              let sum = 0
              let cnt = 0
              for (let i = historicalData.length - 1 - useN; i < historicalData.length - 1; i++) {
                const v = historicalData[i]?.volume
                if (typeof v === 'number' && isFinite(v) && v > 0) {
                  sum += v
                  cnt++
                }
              }
              const avg = cnt > 0 ? sum / cnt : 0
              if (avg > 0 && typeof lastVol === 'number' && isFinite(lastVol) && lastVol > 0) {
                volRatioLong = lastVol / avg
              }
            }
            const pumpM60Threshold = parseFloat(process.env.PUMP_M60_THRESHOLD || '2') // Lowered from 3% to 2% to catch smaller pumps
            const pumpVolMin = parseFloat(process.env.PUMP_VOLRATIO_MIN || '1.5')
            const isPumpPattern =
              typeof m60 === 'number' && isFinite(m60) && m60 >= pumpM60Threshold &&
              typeof m5 === 'number' && isFinite(m5) && m5 > 0 &&
              typeof m15 === 'number' && isFinite(m15) && m15 > 0 &&
              typeof volRatioLong === 'number' && isFinite(volRatioLong) && volRatioLong > pumpVolMin

            // Guard: Price near resistance (avoid buying at resistance level)
            // Block if price is within 0.5% of resistance (more aggressive than S/R distance guard)
            const resistance = sr?.resistance
            const nearResistance = 
              typeof resistance === 'number' && isFinite(resistance) && resistance > 0 &&
              typeof currentPx === 'number' && isFinite(currentPx) && currentPx > 0 &&
              currentPx >= resistance * 0.995 && currentPx <= resistance * 1.01 // Within 0.5% of resistance

            // Guard: Momentum exhaustion (short-term positive but longer-term weakening)
            // Pattern: m5/m15 positive but m60 small (< 1.5%) = momentum running out
            const momentumExhaustion = 
              typeof m5 === 'number' && m5 > 0 &&
              typeof m15 === 'number' && m15 > 0 &&
              typeof m60 === 'number' && m60 > 0 && m60 < 1.5 // Positive but weak momentum

            if (failsDaily || failsIntraday || failsMomentum || isPumpPattern || failsRSI || tooCloseSRLong || nearResistance || momentumExhaustion) {
              const d = failsDaily ? 'daily downtrend' : null
              const ia = failsIntraday ? `intraday not aligned${h4Aligned === false ? ' (4H)' : ''}${h1Aligned === false ? ' (1H)' : ''}` : null
              const mo = failsMomentum ? `momo 5m=${m5?.toFixed?.(2) ?? 'N/A'}%, 15m=${m15?.toFixed?.(2) ?? 'N/A'}%` : null
              const pump = isPumpPattern
                ? `extended pump: m60=${m60?.toFixed?.(2) ?? 'N/A'}%, volRatio=${volRatioLong != null ? volRatioLong.toFixed(2) : 'N/A'}x`
                : null
              const rsiLog = failsRSI ? `RSI overbought (${rsi != null ? rsi.toFixed(1) : 'N/A'})` : null
              const srLog = tooCloseSRLong ? `too close to S/R (dist=${srDistPct != null ? srDistPct.toFixed(2) : 'N/A'}%)` : null
              const nearResLog = nearResistance ? `near resistance (price=${currentPx?.toFixed(2) ?? 'N/A'} vs res=${resistance?.toFixed(2) ?? 'N/A'})` : null
              const exhaustionLog = momentumExhaustion ? `momentum exhaustion (m60=${m60?.toFixed(2) ?? 'N/A'}% < 1.5%)` : null
              const reason = [d, ia, mo, pump, rsiLog, srLog, nearResLog, exhaustionLog].filter(Boolean).join(' | ')
              console.log(`\x1b[33m⏭️  ${signal.coin}: Block BUY by pre-trade guard → ${reason}\x1b[0m`)
              continue
            }
          }
          
          // SELL guard: require not daily uptrend, intraday alignment (if available), and negative short-term momentum
          if (signal.signal === 'sell_to_enter') {
            const failsDaily = dailyTrend === 'uptrend'
            const failsIntraday = (h4Aligned === false) || (h1Aligned === false)
            const failsMomentum = (typeof m5 === 'number' && m5 >= 0) || (typeof m15 === 'number' && m15 >= 0)
            const srMinShort = parseFloat(process.env.GUARD_SR_MIN_SHORT || '0.3') // Relaxed from 0.5% to 0.3%
            const tooCloseSRShort = typeof srDistPct === 'number' && srDistPct < srMinShort
            const failsRSIShort = isRSIOversold

            // Additional bleed-pattern guard for shorts:
            // Hindari short di ujung bleed: M60 turun besar, 5m & 15m sudah negatif, volume di bawah rata-rata.
            let volRatio: number | null = null
            const volConf = externalData?.comprehensiveVolumeAnalysis?.volumeConfirmation
            if (volConf && typeof volConf.volumeRatio === 'number' && isFinite(volConf.volumeRatio)) {
              volRatio = volConf.volumeRatio
            } else if (Array.isArray(historicalData) && historicalData.length > 1) {
              const last = historicalData[historicalData.length - 1]
              const lastVol = typeof last?.volume === 'number' ? last.volume : null
              const useN = Math.min(20, historicalData.length - 1)
              let sum = 0
              let cnt = 0
              for (let i = historicalData.length - 1 - useN; i < historicalData.length - 1; i++) {
                const v = historicalData[i]?.volume
                if (typeof v === 'number' && isFinite(v) && v > 0) {
                  sum += v
                  cnt++
                }
              }
              const avg = cnt > 0 ? sum / cnt : 0
              if (avg > 0 && typeof lastVol === 'number' && isFinite(lastVol) && lastVol > 0) {
                volRatio = lastVol / avg
              }
            }

            const bleedM60Threshold = parseFloat(process.env.BLEED_M60_THRESHOLD || '-3') // Relaxed from -2% to -3%
            const bleedVolMax = parseFloat(process.env.BLEED_VOLRATIO_MAX || '1')
            const isBleedPattern =
              typeof m60 === 'number' && isFinite(m60) && m60 <= bleedM60Threshold &&
              typeof m5 === 'number' && isFinite(m5) && m5 < 0 &&
              typeof m15 === 'number' && isFinite(m15) && m15 < 0 &&
              typeof volRatio === 'number' && isFinite(volRatio) && volRatio < bleedVolMax

            if (failsDaily || failsIntraday || failsMomentum || isBleedPattern || failsRSIShort || tooCloseSRShort) {
              const d = failsDaily ? 'daily uptrend' : null
              const ia = failsIntraday ? `intraday not aligned${h4Aligned === false ? ' (4H)' : ''}${h1Aligned === false ? ' (1H)' : ''}` : null
              const mo = failsMomentum ? `momo 5m=${m5?.toFixed?.(2) ?? 'N/A'}%, 15m=${m15?.toFixed?.(2) ?? 'N/A'}%` : null
              const bleed = isBleedPattern
                ? `extended bleed: m60=${m60?.toFixed?.(2) ?? 'N/A'}%, volRatio=${volRatio != null ? volRatio.toFixed(2) : 'N/A'}x`
                : null
              const rsiLog = failsRSIShort ? `RSI oversold (${rsi != null ? rsi.toFixed(1) : 'N/A'})` : null
              const srLog = tooCloseSRShort ? `too close to S/R (dist=${srDistPct != null ? srDistPct.toFixed(2) : 'N/A'}%)` : null
              const reason = [d, ia, mo, bleed, rsiLog, srLog].filter(Boolean).join(' | ')
              console.log(`\x1b[33m⏭️  ${signal.coin}: Block SELL by pre-trade guard → ${reason}\x1b[0m`)
              continue
            }
          }
        } catch (guardErr) {
          // If guard evaluation fails, do not block by default, but log warning
          const errMsg = guardErr instanceof Error ? guardErr.message : String(guardErr)
          console.log(`\x1b[33m⚠️  Pre-trade guard evaluation failed for ${signal.coin}: ${errMsg} (skipping guard)\x1b[0m`)
        }
        
        // OPTIMIZATION: Removed early confidence filter here - consolidated with final filter below
        // This avoids duplicate filtering logic and reduces code complexity
        // Final filter at line 746 handles all confidence < 60% rejections in one place
        
        if (!config.executor.executeEntry) continue

        try {
          const assetMarketData = marketData instanceof Map ? marketData.get(signal.coin || '') : marketData[signal.coin || '']
          const currentPrice = assetMarketData?.price || assetMarketData?.markPx || signal.entry_price || 0

          const order = await config.executor.executeEntry(signal, currentPrice)

          if (order.status === 'FILLED' || order.status === 'PARTIAL_FILLED') {
            // Create PositionState from filled order
            const symbol = signal.coin || order.symbol
            const filledQuantity = order.filledQuantity || order.quantity || 0
            const filledPrice = order.filledPrice || order.price || currentPrice
            // Default leverage: 10x (matching generate-signals.ts default)
            // Signal leverage should be set by AI, but fallback to order leverage or default 10x
            const leverage = signal.leverage ?? order.leverage ?? 10
            const side = order.side === 'LONG' ? 'LONG' : 'SHORT'
            
            // Check if position already exists (for partial fills or adds)
            const existingPosition = positions.get(symbol)
            if (existingPosition) {
              // Update existing position (add to quantity)
              const oldQuantity = existingPosition.quantity
              const quantityChange = side === existingPosition.side ? filledQuantity : -filledQuantity
              const newQuantity = oldQuantity + quantityChange
              
              if (Math.abs(newQuantity) < 0.0001) {
                // Position closed
                positions.delete(symbol)
              } else {
                // Calculate weighted average entry price for futures trading
                const oldQuantityAbs = Math.abs(oldQuantity)
                const oldEntryPrice = existingPosition.entryPrice
                const newQuantityAbs = Math.abs(newQuantity)
                
                // Weighted average: (oldEntryPrice * oldQuantity + filledPrice * filledQuantity) / newQuantity
                // Handle sign: if sides match, add quantities; if opposite, subtract
                const weightedEntryPrice = (oldEntryPrice * oldQuantityAbs + filledPrice * filledQuantity) / newQuantityAbs
                
                // Update position with weighted average entry price
                existingPosition.quantity = newQuantity
                existingPosition.entryPrice = weightedEntryPrice
                existingPosition.entry_price = weightedEntryPrice
                existingPosition.currentPrice = currentPrice
                existingPosition.leverage = leverage // Update leverage if changed
                
                // Recalculate total unrealized PnL from current price using new average entry
                const newQuantityAbsValue = Math.abs(newQuantity)
                const unrealizedPnl = existingPosition.side === 'LONG'
                  ? (currentPrice - weightedEntryPrice) * newQuantityAbsValue
                  : (weightedEntryPrice - currentPrice) * newQuantityAbsValue
                
                existingPosition.unrealizedPnl = unrealizedPnl
                existingPosition.unrealized_pnl = unrealizedPnl
                
                // Calculate PnL % based on margin (for futures with leverage)
                const positionValueAtEntry = weightedEntryPrice * newQuantityAbsValue
                const margin = positionValueAtEntry / leverage
                existingPosition.unrealizedPnlPct = margin > 0 ? (unrealizedPnl / margin) * 100 : 0
              }
            } else {
              // Create new position
              const positionState: PositionState = {
                symbol,
                coin: symbol,
                quantity: side === 'LONG' ? filledQuantity : -filledQuantity,
                entryPrice: filledPrice,
                entry_price: filledPrice,
                currentPrice: currentPrice,
                current_price: currentPrice,
                leverage,
                unrealizedPnl: 0,
                unrealized_pnl: 0,
                unrealizedPnlPct: 0,
                side,
                entryTime: Date.now(),
                entry_time: Date.now(),
                stopLoss: signal.stop_loss || order.stopLoss,
                takeProfit: signal.take_profit || signal.profit_target || order.takeProfit,
                rMultiple: 0
              }
              positions.set(symbol, positionState)
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`Failed to execute entry order for ${signal.coin}: ${errorMsg}`)
        }
      }
    }

    // Collect rejected signals from global (set by generateSignals during filtering)
    const rejectedSignals: Array<{ signal: Signal; reason: string }> = (global as any).__rejectedSignals || []
    // Clear global after reading to avoid memory leak
    if ((global as any).__rejectedSignals) {
      delete (global as any).__rejectedSignals
    }
    
    // Update state with new positions (explicitly include updated positions Map)
    // OPTIMIZED: Consolidated final filter - single pass instead of multiple filters
    // CRITICAL FIX: Lower confidence threshold from 70% to 60% for futures trading
    // Reason: 70% threshold was too strict and rejected too many valid signals
    // 60% threshold is more appropriate for futures trading with leverage
    // Filter signals with confidence < 60% AND HOLD signals without position before returning
    // Accept only signals with confidence >= 60% (range: 60% - 100%)
    // Reject signals with confidence < 60% (0% - 59.99%)
        // Reject HOLD signals without position (should be BUY/SELL, not HOLD)
        // This ensures that result.signals only contains valid executable signals
    
    // Normalize signal confidence to [0,1] range for consistent filtering/printing
    for (const s of signals || []) {
      if (s && typeof s.confidence === 'number') {
        let c = s.confidence
        if (c > 1) c = c / 100 // handle percentage inputs like 72.3 → 0.723
        if (c < 0) c = 0
        if (c > 1) c = 1
        s.confidence = c
      }
    }
    
    const filteredSignalsForReturn: Signal[] = []
    const rejectedSignalsList: Array<{ signal: Signal; reason: string }> = []
    
    // Single pass filtering - more efficient than multiple filter() calls
    for (const signal of signals || []) {
          const confidence = signal.confidence || 0
          const signalType = signal.signal || 'hold'
          const symbol = signal.coin || ''
          const hasPosition = positions.has(symbol)
      const rankInfo = rankedScores.findIndex(s => s.asset === signal.coin) + 1
      const rankStr = rankInfo > 0 ? ` (Rank #${rankInfo})` : ''
          
      // Filter 1: Confidence must be >= 60% (lowered from 70%)
      if (confidence < 0.60) {
          // Log rejection for top-ranked assets (rank <= 10) with detailed breakdown
          if (rankInfo > 0 && rankInfo <= 10) {
            console.log(`\x1b[33m⏭️  Signal ${signal.coin}: REJECTED - Confidence ${(confidence * 100).toFixed(1)}% < 60%${rankStr}\x1b[0m`)
          console.log(`\x1b[90m   📊 Confidence Breakdown for ${signal.coin} (Rank #${rankInfo}):\x1b[0m`)
          
          // Get market data for this asset to analyze confidence factors
          const assetData = marketData instanceof Map ? marketData.get(signal.coin) : marketData[signal.coin]
          if (assetData) {
            const indicators = assetData.indicators || {}
            const trendAlignment = assetData.trendAlignment
            const externalData = assetData.externalData || {}
            
            // Check trend alignment
            if (trendAlignment) {
              const aligned = trendAlignment.aligned || false
              const strength = (trendAlignment.strength || 0) * 100
              const trend = trendAlignment.trend || 'unknown'
              console.log(`   ${aligned ? '\x1b[32m✓' : '\x1b[31m✗'} Trend Alignment: ${aligned ? 'Aligned' : 'NOT Aligned'} (${strength.toFixed(0)}% strength, ${trend})\x1b[0m`)
            } else {
              console.log(`   \x1b[31m✗ Trend Alignment: MISSING (no multi-timeframe data)\x1b[0m`)
            }
            
            // Check external data
            const hasExternalData = externalData && Object.keys(externalData).length > 0
            console.log(`   ${hasExternalData ? '\x1b[32m✓' : '\x1b[31m✗'} External Data: ${hasExternalData ? 'Available' : 'MISSING (costing ~30 points)'}\x1b[0m`)
            
            // Check key indicators
            const hasRSI = indicators.rsi14 != null && indicators.rsi14 !== undefined
            const hasMACD = indicators.macd && indicators.macd.histogram !== undefined
            const hasEMA = indicators.ema20 && indicators.ema50
            const hasADX = indicators.adx != null && indicators.adx !== undefined
            console.log(`   Indicators: ${hasRSI ? 'RSI' : ''} ${hasMACD ? 'MACD' : ''} ${hasEMA ? 'EMA' : ''} ${hasADX ? 'ADX' : ''} ${hasRSI || hasMACD || hasEMA || hasADX ? '✓' : '✗ MISSING'}`)
            
            // Check R/R ratio if available
            if (signal.take_profit && signal.stop_loss && signal.entry_price) {
              const risk = Math.abs(signal.entry_price - signal.stop_loss)
              const reward = Math.abs(signal.take_profit - signal.entry_price)
              const rr = risk > 0 ? reward / risk : 0
              console.log(`   Risk/Reward: ${rr.toFixed(2)}:1 ${rr >= 2 ? '✓' : rr >= 1 ? '⚠️' : '✗'}`)
            }
          }
        }
        
          rejectedSignalsList.push({ signal, reason: `Confidence ${(confidence * 100).toFixed(1)}% < 60%` })
        continue // Skip to next signal
          }
          
          // Filter 2: HOLD signals without position should be rejected
          // HOLD should only be accepted if there's an existing position
          if (signalType === 'hold' && !hasPosition) {
        rejectedSignalsList.push({ signal, reason: `HOLD signal without existing position` })
        continue // Skip to next signal
      }
      
      // Signal passes all filters
      filteredSignalsForReturn.push(signal)
    }
    
    // Combine all rejected signals (from generateSignals + final filter)
        const allRejectedSignals = [
          ...(rejectedSignals || []),
      ...rejectedSignalsList
        ]
    
    const newState: Partial<CycleState> = {
      ...currentState,
      positions, // Explicitly include updated positions Map (with deletions/updates from exit execution)
      cycleId,
      lastRankingTime: now,
      topNAssets: config.cycleConfig.topNAssets
    }
    
    return {
      success: true,
      signals: filteredSignalsForReturn, // Only signals with confidence >= 60%
      rejectedSignals: allRejectedSignals.length > 0 ? allRejectedSignals : undefined, // Include low confidence signals in rejected list
      exitActions: exitActions || [],
      state: newState,
      marketData,
      aiGeneratedCount: (signals?.length || 0) + (rejectedSignals?.length || 0) // Total AI generated (includes low confidence)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: errorMsg
    }
  }
}

/**
 * Get assets for cycle based on top N
 */
function getAssetsForCycle(_topN: number, metadata: any): string[] {
  let universe: any[] = []

  if (Array.isArray(metadata) && metadata.length >= 2) {
    const metaObj = metadata[0]
    if (metaObj && metaObj.universe) {
      universe = metaObj.universe || []
    }
  } else if (metadata && metadata.data) {
    universe = metadata.data.universe || []
  }

  const allAssets = universe
    .map((item: string | { name?: string; symbol?: string; isDelisted?: boolean }) => {
      if (typeof item === 'object' && item.isDelisted === true) {
        return null
      }
      if (typeof item === 'string') return item
      return item.name || item.symbol || ''
    })
    .filter((name: string | null) => name && name.length > 0) as string[]

  // CRITICAL FIX: Fetch ALL assets for ranking, then select top N
  // Flow: Fetch all market data → Rank all assets → Select top N → Generate signals only for top N
  // This ensures we get the best assets based on ranking, not just first N in universe
  // Signal generation is expensive (AI API), so we only generate signals for top N selected assets
  // This saves AI API costs while ensuring best quality asset selection
  
  // Fetch all assets for ranking (typically 221 assets from Hyperliquid universe)
  // No limit - we want to rank all available assets to find the best ones
  return allAssets
}

/**
 * Compute percentage change over last N minutes from historical candles
 * Uses close prices and timestamps (ms). Returns percent, e.g., 1.23 for +1.23%.
 */
function computePctChangeOverMinutesFromHistorical(historicalData: any[], minutes: number): number | null {
  try {
    const candles = Array.isArray(historicalData) ? historicalData : []
    if (candles.length < 2) return null
    const last = candles[candles.length - 1]
    const lastTs = last?.timestamp || last?.time || last?.t
    const lastClose = last?.close ?? last?.c ?? last?.price
    if (!lastTs || typeof lastClose !== 'number') return null
    const targetTs = lastTs - minutes * 60_000
    let base: any = null
    for (let j = candles.length - 2; j >= 0; j--) {
      const ts = candles[j]?.timestamp || candles[j]?.time || candles[j]?.t
      if (!ts) continue
      if (ts <= targetTs) { base = candles[j]; break }
    }
    if (!base) base = candles[0]
    const baseClose = base?.close ?? base?.c ?? base?.price
    if (typeof baseClose !== 'number' || baseClose <= 0) return null
    return ((lastClose - baseClose) / baseClose) * 100
  } catch {
    return null
  }
}
