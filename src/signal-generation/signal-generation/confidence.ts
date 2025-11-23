/**
 * Confidence Score Calculation
 * calculateConfidenceScore function
 */

import { Signal, TrendAlignment, MarketRegime, ExternalData } from '../types'
import { TechnicalIndicators } from '../technical-indicators/aggregator'
import { calculateFuturesConfidence, FuturesSignalScores } from '../analysis/futures-confidence'
import { FuturesMarketData, BTCCorrelationData } from '../types/futures-types'

export interface ConfidenceResult {
  confidence: number
  totalScore: number
  maxScore: number
  breakdown: string[]
  autoRejected: boolean
  rejectionReason?: string
  partialConfidenceApplied?: boolean
}

export function calculateConfidenceScore(
  signal: Signal,
  indicators: TechnicalIndicators | null | undefined,
  trendAlignment: TrendAlignment | null | undefined,
  marketRegime: MarketRegime | null | undefined,
  riskRewardRatio: number,
  externalData: ExternalData | null | undefined = null,
  assetRank: number | null = null,
  qualityScore: number | null = null
): ConfidenceResult {
  let score = 0
  let maxScore = 0
  const breakdown: string[] = []
  let trendScore = 0
  
  // 1. Trend Alignment (0-25 points) - GATEKEEPER (must be ≥15 to proceed)
  maxScore += 25
  
  if (trendAlignment) {
    let dailyTrendScore = 0
    if (trendAlignment.trend) {
      const signalMatchesDailyTrend = (signal.signal === 'buy_to_enter' || signal.signal === 'add') 
        ? trendAlignment.trend === 'uptrend'
        : (signal.signal === 'sell_to_enter')
        ? trendAlignment.trend === 'downtrend'
        : false
      
      if (signalMatchesDailyTrend) {
        dailyTrendScore = 10
      } else if (trendAlignment.trend === 'neutral') {
        dailyTrendScore = 0
      } else {
        dailyTrendScore = 0 // Contradiction - no score
      }
    }
    
    // Use alignmentScore if available (0-100), convert to 0-25 points
    const alignmentScore = (trendAlignment as any).alignmentScore || 0
    const h4Aligned = (trendAlignment as any).h4Aligned || false
    const h1Aligned = (trendAlignment as any).h1Aligned || false
    const dailyTrend = (trendAlignment as any).dailyTrend || trendAlignment.trend
    
    let h4TrendScore = 0
    if (h4Aligned) {
      h4TrendScore = 8
    }
    
    let h1TrendScore = 0
    if (h1Aligned) {
      h1TrendScore = 7
    }
    
    if (alignmentScore > 0) {
      const signalMatchesTrend = (signal.signal === 'buy_to_enter' || signal.signal === 'add') 
        ? dailyTrend === 'uptrend'
        : (signal.signal === 'sell_to_enter')
        ? dailyTrend === 'downtrend'
        : false
      
      if (signalMatchesTrend) {
        trendScore = Math.round((alignmentScore / 100) * 25)
      } else if (dailyTrend !== 'neutral') {
        trendScore = Math.round((alignmentScore / 100) * 10) // Reduced score (40% of full)
      } else {
        trendScore = 0
      }
    } else {
      trendScore = dailyTrendScore + h4TrendScore + h1TrendScore
    }
  } else if (indicators) {
    // Fallback: Calculate basic trend alignment from primary timeframe
    if (indicators.ema20 && indicators.ema50 && indicators.price) {
      const price = indicators.price
      const ema20 = indicators.ema20
      const ema50 = indicators.ema50
      const ema200 = indicators.ema200
      
      let dailyTrendScore = 0
      const isUptrend = price > ema20 && ema20 > ema50
      const isDowntrend = price < ema20 && ema20 < ema50
      
      if (isUptrend && (signal.signal === 'buy_to_enter' || signal.signal === 'add')) {
        dailyTrendScore = 10
      } else if (isDowntrend && signal.signal === 'sell_to_enter') {
        dailyTrendScore = 10
      }
      
      let h4TrendScore = 0
      if (ema200) {
        if ((isUptrend && price > ema200 && ema50 > ema200 && (signal.signal === 'buy_to_enter' || signal.signal === 'add')) ||
            (isDowntrend && price < ema200 && ema50 < ema200 && signal.signal === 'sell_to_enter')) {
          h4TrendScore = 8
        }
      }
      
      let h1TrendScore = 0
      if ((isUptrend && (signal.signal === 'buy_to_enter' || signal.signal === 'add')) ||
          (isDowntrend && signal.signal === 'sell_to_enter')) {
        h1TrendScore = 7
      }
      
      trendScore = dailyTrendScore + h4TrendScore + h1TrendScore
    }
  }
  
  // CRITICAL FIX: Remove strict gatekeeper - let confidence threshold handle filtering instead
  // Reason: Gatekeeper was too strict and rejected valid signals. Let confidence system handle all filtering.
  // Relaxed: Only reject if trend alignment is 0 (completely contradictory)
  // Signals with low trend alignment will naturally get lower confidence scores
  const TREND_ALIGNMENT_MINIMUM = 0 // Only reject if completely contradictory (0 points)
  if (trendScore <= TREND_ALIGNMENT_MINIMUM) {
    // Only reject if trend alignment is 0 (completely contradictory)
    // Signals with low trend alignment (1-9 points) will get lower confidence but not auto-rejected
    const MIN_CONFIDENCE_FOR_REJECTION = 0.1
    return {
      confidence: MIN_CONFIDENCE_FOR_REJECTION,
      totalScore: trendScore,
      maxScore: maxScore,
      breakdown: [`Trend Alignment: ${trendScore}/25 (COMPLETELY CONTRADICTORY - 0 points)`],
      autoRejected: true,
      rejectionReason: `Trend alignment score ${trendScore}/25 is completely contradictory (0 points)`
    }
  }
  
  // PHASE 1 & 3: Add quality bonus for top-ranked assets to trend alignment
  let trendAlignmentBonus = 0
  if (assetRank !== null && assetRank <= 5) {
    // Add bonus for top-ranked assets (+5-10 points)
    if (assetRank === 1) {
      trendAlignmentBonus = 10 // Rank #1 gets +10 points
      breakdown.push(`Trend Alignment Bonus (Rank #1): +${trendAlignmentBonus} points`)
    } else if (assetRank <= 3) {
      trendAlignmentBonus = 7 // Rank #2-3 get +7 points
      breakdown.push(`Trend Alignment Bonus (Rank #${assetRank}): +${trendAlignmentBonus} points`)
    } else if (assetRank <= 5) {
      trendAlignmentBonus = 5 // Rank #4-5 get +5 points
      breakdown.push(`Trend Alignment Bonus (Rank #${assetRank}): +${trendAlignmentBonus} points`)
    }
  }
  
  trendScore = Math.min(trendScore + trendAlignmentBonus, 25) // Cap at max 25
  score += trendScore
  breakdown.push(`Trend Alignment: ${trendScore}/25${trendAlignmentBonus > 0 ? ` (+${trendAlignmentBonus} bonus for top rank)` : ''}`)
  
  // 2. Risk/Reward Quality (0-20 points)
  maxScore += 20
  let rrScore = 0
  
  // R/R Ratio: 15 points (scale: 2.0=10, 2.5=12, 3.0=15)
  if (riskRewardRatio) {
    if (riskRewardRatio >= 3.0) rrScore += 15
    else if (riskRewardRatio >= 2.5) rrScore += 12
    else if (riskRewardRatio >= 2.0) rrScore += 10
    else if (riskRewardRatio >= 1.5) rrScore += 7
    else if (riskRewardRatio >= 1.0) rrScore += 3
  }
  
  // SL Tightness (≤1.5%): 5 points
  if (signal.stop_loss && signal.entry_price) {
    const entryPrice = signal.entry_price
    const stopLoss = signal.stop_loss
    const slDistance = Math.abs(entryPrice - stopLoss) / entryPrice * 100
    
    if (slDistance <= 1.5) {
      rrScore += 5
    } else if (slDistance <= 2.0) {
      rrScore += 3
    } else if (slDistance <= 2.5) {
      rrScore += 1
    }
  }
  
  score += rrScore
  breakdown.push(`Risk/Reward: ${rrScore}/20`)
  
  // 3. Technical Consensus (0-30 points)
  maxScore += 30
  let technicalScore = 0
  
  if (!indicators) {
    // No indicators available - assign minimum score
    technicalScore = 0
  } else {
    // Price vs EMA20/50/200: 8 points
    if (indicators.ema20 && indicators.ema50 && indicators.ema200 && indicators.price) {
      const price = indicators.price
      const ema20 = indicators.ema20
      const ema50 = indicators.ema50
      const ema200 = indicators.ema200
      
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (price > ema20 && ema20 > ema50 && price > ema200 && ema50 > ema200) {
          technicalScore += 8 // Perfect alignment
        } else if (price > ema20 && ema20 > ema50) {
          technicalScore += 6 // Good alignment
        } else if (price > ema20) {
          technicalScore += 4 // Price above EMA20
        } else if (price > ema50) {
          technicalScore += 2 // Price above EMA50
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (price < ema20 && ema20 < ema50 && price < ema200 && ema50 < ema200) {
          technicalScore += 8 // Perfect alignment
        } else if (price < ema20 && ema20 < ema50) {
          technicalScore += 6 // Good alignment
        } else if (price < ema20) {
          technicalScore += 4 // Price below EMA20
        } else if (price < ema50) {
          technicalScore += 2 // Price below EMA50
        }
      }
    }
    
    // Price vs VWAP: 5 points
    if (indicators.vwap && indicators.price) {
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (indicators.price > indicators.vwap) {
          technicalScore += 5
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (indicators.price < indicators.vwap) {
          technicalScore += 5
        }
      }
    }
    
    // Bollinger Position: 5 points
    if (indicators.bollingerBands && indicators.price) {
      const price = indicators.price
      const bbMiddle = indicators.bollingerBands.middle
      
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (price < bbMiddle) {
          technicalScore += 4
        } else {
          technicalScore += 1
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (price > bbMiddle) {
          technicalScore += 4
        } else {
          technicalScore += 1
        }
      }
    }
    
    // Parabolic SAR: 4 points
    if (indicators.parabolicSAR && indicators.price) {
      const price = indicators.price
      const sar = indicators.parabolicSAR
      
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (price > sar) {
          technicalScore += 4
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (price < sar) {
          technicalScore += 4
        }
      }
    }
    
    // OBV Direction: 4 points
    if (indicators.obv !== null && indicators.obv !== undefined) {
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (indicators.obv > 0) {
          technicalScore += 4
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (indicators.obv < 0) {
          technicalScore += 4
        }
      }
    }
    
    // Stochastic/Williams: 4 points
    if (indicators.stochastic && indicators.stochastic.k !== undefined) {
      const stochK = indicators.stochastic.k
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (stochK < 20) technicalScore += 4
        else if (stochK < 30) technicalScore += 2
        else if (stochK > 80) technicalScore += 0
        else technicalScore += 1
      } else if (signal.signal === 'sell_to_enter') {
        if (stochK > 80) technicalScore += 4
        else if (stochK > 70) technicalScore += 2
        else if (stochK < 20) technicalScore += 0
        else technicalScore += 1
      }
    } else if (indicators.williamsR !== null && indicators.williamsR !== undefined) {
      const williamsR = indicators.williamsR
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (williamsR < -80) technicalScore += 4
        else if (williamsR < -70) technicalScore += 2
        else if (williamsR > -20) technicalScore += 0
        else technicalScore += 1
      } else if (signal.signal === 'sell_to_enter') {
        if (williamsR > -20) technicalScore += 4
        else if (williamsR > -30) technicalScore += 2
        else if (williamsR < -80) technicalScore += 0
        else technicalScore += 1
      }
    }
  }
  
  score += technicalScore
  breakdown.push(`Technical Consensus: ${technicalScore}/30`)
  
  // 4. Market Context (0-10 points)
  maxScore += 10
  let marketContextScore = 0
  
  if (marketRegime) {
    if (marketRegime.regime === 'trending') {
      marketContextScore += 5
    } else if (marketRegime.regime === 'neutral') {
      marketContextScore += 3
    } else if (marketRegime.regime === 'choppy') {
      marketContextScore += 2
    }
  }
  
  if (indicators?.atr && indicators?.price) {
    const atrPercent = (indicators.atr / indicators.price) * 100
    if (atrPercent >= 1 && atrPercent <= 3) {
      marketContextScore += 5 // Optimal volatility
    } else if (atrPercent < 1 || (atrPercent > 3 && atrPercent <= 5)) {
      marketContextScore += 3 // Moderate volatility
    } else {
      marketContextScore += 1 // Extreme volatility
    }
  }
  
  score += marketContextScore
  breakdown.push(`Market Context: ${marketContextScore}/10`)
  
  // 5. External Confirmation (0-30 points base + up to 50 futures bonus = 80 max)
  maxScore += 30 // Base external score
  let externalScore = 0
  
  if (externalData && indicators) {
    const price = indicators.price || 0
    const isBuySignal = signal.signal === 'buy_to_enter' || signal.signal === 'add'
    const isSellSignal = signal.signal === 'sell_to_enter'
    
    // Funding Rate: 3 points
    if (externalData.hyperliquid && externalData.hyperliquid.fundingRate !== undefined) {
      const fundingRate = externalData.hyperliquid.fundingRate
      if (isBuySignal) {
        if (fundingRate < 0) {
          externalScore += 3 // Negative funding (bullish)
        } else if (Math.abs(fundingRate) < 0.0001) {
          externalScore += 2 // Neutral
        } else {
          externalScore += 1 // Positive funding
        }
      } else if (isSellSignal) {
        if (fundingRate > 0) {
          externalScore += 3 // Positive funding (bearish)
        } else if (Math.abs(fundingRate) < 0.0001) {
          externalScore += 2 // Neutral
        } else {
          externalScore += 1 // Negative funding
        }
      }
    }
    
    // Open Interest Trend: 3 points
    if (externalData.hyperliquid && externalData.hyperliquid.oiTrend) {
      const oiTrend = externalData.hyperliquid.oiTrend
      if (oiTrend === 'increasing') {
        externalScore += 3
      } else if (oiTrend === 'stable') {
        externalScore += 1
      }
    }
    
    // COB (Order Book Depth): 4 points
    const orderBook = (externalData as any).orderBook
    if (orderBook && price > 0) {
      if (isBuySignal && orderBook.imbalance > 0.1) {
        externalScore += 2
      } else if (isSellSignal && orderBook.imbalance < -0.1) {
        externalScore += 2
      } else if (Math.abs(orderBook.imbalance) < 0.05) {
        externalScore += 1
      }
      
      if (orderBook.supportZones && orderBook.supportZones.length > 0 && isBuySignal) {
        const support = orderBook.supportZones[0]
        if (support.distance < price * 0.02) {
          externalScore += 2
        }
      }
      if (orderBook.resistanceZones && orderBook.resistanceZones.length > 0 && isSellSignal) {
        const resistance = orderBook.resistanceZones[0]
        if (resistance.distance < price * 0.02) {
          externalScore += 2
        }
      }
    }
    
    // SVP (Session Volume Profile): 3 points
    const volumeProfile = (externalData as any).volumeProfile
    if (volumeProfile && volumeProfile.session && price > 0) {
      const svp = volumeProfile.session
      const priceToPoc = Math.abs((price - svp.poc) / svp.poc) * 100
      if (priceToPoc < 1) {
        externalScore += 3
      } else if (priceToPoc < 2) {
        externalScore += 2
      } else if (price >= svp.val && price <= svp.vah) {
        externalScore += 1
      }
    }
    
    // CRVP (Composite Volume Profile): 2 points
    if (volumeProfile && volumeProfile.composite && price > 0) {
      const crvp = volumeProfile.composite
      if (crvp.accumulationZone && isBuySignal) {
        const accZone = crvp.accumulationZone
        if (price >= accZone.priceRange[0] && price <= accZone.priceRange[1]) {
          externalScore += 2
        }
      }
      if (crvp.distributionZone && isSellSignal) {
        const distZone = crvp.distributionZone
        if (price >= distZone.priceRange[0] && price <= distZone.priceRange[1]) {
          externalScore += 2
        }
      }
    }
    
    // COC (Change of Character): 4 points
    const marketStructure = (externalData as any).marketStructure
    if (marketStructure && marketStructure.coc) {
      const coc = marketStructure.coc
      if (coc.coc === 'bullish' && coc.reversalSignal && isBuySignal) {
        externalScore += 4
      } else if (coc.coc === 'bullish' && isBuySignal) {
        externalScore += 2
      }
      if (coc.coc === 'bearish' && coc.reversalSignal && isSellSignal) {
        externalScore += 4
      } else if (coc.coc === 'bearish' && isSellSignal) {
        externalScore += 2
      }
    }
    
    // CVD (Cumulative Volume Delta): 2 points
    const volumeDelta = (externalData as any).volumeDelta
    if (volumeDelta && volumeDelta.cvdTrend) {
      if (volumeDelta.cvdTrend === 'rising' && isBuySignal) {
        externalScore += 2
      } else if (volumeDelta.cvdTrend === 'falling' && isSellSignal) {
        externalScore += 2
      }
    }
    
    // Exchange Flow: 2 points
    if (externalData.blockchain && externalData.blockchain.estimatedExchangeFlow !== undefined) {
      const exchangeFlow = externalData.blockchain.estimatedExchangeFlow
      if (exchangeFlow < 0 && isBuySignal) {
        externalScore += 2 // Outflow (bullish)
      } else if (exchangeFlow > 0 && isSellSignal) {
        externalScore += 2 // Inflow (bearish)
      }
    }
    
    // Whale Activity: 2 points
    if (externalData.blockchain && externalData.blockchain.whaleActivityScore !== undefined) {
      const whaleScore = externalData.blockchain.whaleActivityScore
      if (whaleScore > 0 && isBuySignal) {
        externalScore += 2 // Bullish whale activity
      } else if (whaleScore < 0 && isSellSignal) {
        externalScore += 2 // Bearish whale activity
      }
    }
    
    // Premium to Oracle: 2 points
    if (externalData.hyperliquid && externalData.hyperliquid.premium !== undefined) {
      const premium = externalData.hyperliquid.premium
      if (premium < 0 && isBuySignal) {
        externalScore += 2 // Undervalued (bullish)
      } else if (premium > 0 && isSellSignal) {
        externalScore += 2 // Overvalued (bearish)
      }
    }
    
    // FUTURES CONFIDENCE SCORING: Integrate comprehensive futures analysis (up to 50 bonus points)
    // This replaces and enhances the basic funding/OI checks above
    if (externalData.futures && indicators && indicators.price) {
      try {
        const futuresData = externalData.futures as any
        const futuresMarketData: FuturesMarketData | null = futuresData ? {
          asset: signal.coin || '',
          price: indicators.price,
          fundingRate: futuresData.fundingRate || { current: 0, rate24h: 0, rate7d: 0, trend: 'neutral', momentum: 0, extreme: false, lastUpdate: Date.now() },
          openInterest: futuresData.openInterest || { current: 0, change24h: 0, change24hValue: 0, trend: 'neutral', momentum: 0, concentration: 0.5, lastUpdate: Date.now() },
          longShortRatio: futuresData.longShortRatio || { longPct: 50, shortPct: 50, retailLongPct: 50, retailShortPct: 50, proLongPct: 50, proShortPct: 50, extreme: false, sentiment: 'balanced', lastUpdate: Date.now() },
          liquidation: futuresData.liquidation || { longLiquidations24h: 0, shortLiquidations24h: 0, clusters: [], nearbyLongClusters: [], nearbyShortClusters: [], safeEntryZones: [], liquidationDistance: 10, lastUpdate: Date.now() },
          premiumIndex: futuresData.premiumIndex,
          timestamp: Date.now()
        } : null

        if (futuresMarketData) {
          const btcCorrelation: BTCCorrelationData | undefined = futuresData.btcCorrelation
          const whaleFlow = futuresData.whaleActivity?.smartMoneyFlow || 0
          const whaleScore = futuresData.whaleActivity?.whaleScore || 0

          const signalSide: 'LONG' | 'SHORT' = (isBuySignal) ? 'LONG' : 'SHORT'
          const priceChange24h = 0 // Would need historical data to calculate
          const volumeChange24h = indicators.volumeChangePercent || 0

          const futuresScores = calculateFuturesConfidence(
            futuresMarketData,
            btcCorrelation,
            whaleFlow,
            whaleScore,
            {
              signal: signalSide,
              currentPrice: indicators.price,
              priceChange24h,
              volumeChange24h
            }
          )

          // Add futures scores to external score (up to 50 bonus points)
          // Futures scoring is more comprehensive than basic funding/OI checks
          // Replace basic funding/OI score with futures score (which includes them)
          const futuresBonusScore = Math.round(futuresScores.totalScore / 2) // Scale 0-100 to 0-50
          externalScore += futuresBonusScore

          // Add breakdown
          breakdown.push(`Futures Analysis: ${futuresBonusScore}/50 (Funding: ${futuresScores.fundingRateScore}/20, OI: ${futuresScores.openInterestScore}/20, Liquidation: ${futuresScores.liquidationZoneScore}/15, L/S Ratio: ${futuresScores.longShortRatioScore}/15, BTC: ${futuresScores.btcCorrelationScore}/15, Whale: ${futuresScores.whaleActivityScore}/15)`)

          // Store futures scores in signal metadata
          if (!signal.metadata) {
            signal.metadata = {}
          }
          signal.metadata.futuresScores = futuresScores
        }
      } catch (error: any) {
        // Silent fail - futures scoring is optional enhancement
        // Don't break confidence calculation if futures scoring fails
      }
    }
  }
  
  // PHASE 2: Reduce external data penalty for top-ranked assets
  // If external data is missing and asset is top-ranked, reduce penalty
  // FUTURES MODE: External max score can go up to 80 (30 base + 50 futures bonus)
  const externalMaxScore = 30
  let effectiveExternalMaxScore = externalMaxScore
  let externalScoreAdjustment = 0
  
  if (externalScore <= 2 && (!externalData || Object.keys(externalData).length === 0)) {
    // External data missing or minimal
    if (assetRank !== null && assetRank <= 5) {
      // Top-ranked assets: reduce penalty by 50% (lose only 15 points instead of 30)
      effectiveExternalMaxScore = 15 // Adjusted max for top-ranked assets
      externalScoreAdjustment = 15 // Give 15 points as fallback
      breakdown.push(`External Data Bonus (Rank #${assetRank}): +${externalScoreAdjustment} points (50% penalty reduction)`)
    }
  }
  
  // Apply external score adjustment if applicable
  const adjustedExternalScore = externalScore + externalScoreAdjustment
  score += adjustedExternalScore
  
  // Adjust maxScore for external data if top-ranked
  if (effectiveExternalMaxScore < externalMaxScore) {
    maxScore = maxScore - externalMaxScore + effectiveExternalMaxScore
  }
  
  breakdown.push(`External Confirmation: ${adjustedExternalScore}/${effectiveExternalMaxScore}${externalScoreAdjustment > 0 ? ` (+${externalScoreAdjustment} bonus for top rank)` : ''}`)
  
  // PHASE 4: Support/Resistance - Increased weight for top-ranked assets (5 → 10 points)
  // Top-ranked assets get double S/R scoring weight
  const srMaxScore = (assetRank !== null && assetRank <= 5) ? 10 : 5
  maxScore += srMaxScore
  let srScore = 0
  
  if (indicators && indicators.supportResistance && indicators.price) {
    const price = indicators.price
    const support = indicators.supportResistance.support
    const resistance = indicators.supportResistance.resistance
    
    if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
      if (support && price > support) {
        const distanceToSupport = (price - support) / price
        if (distanceToSupport < 0.05) {
          srScore += (assetRank !== null && assetRank <= 5) ? 6 : 3 // Double for top-ranked
        } else if (distanceToSupport < 0.10) {
          srScore += (assetRank !== null && assetRank <= 5) ? 2 : 1
        } else if (assetRank !== null && assetRank <= 5 && distanceToSupport < 0.15) {
          srScore += 1 // Extra point for top-ranked with moderate distance
        }
      }
      // Additional S/R bonus for top-ranked assets near support
      if (assetRank !== null && assetRank <= 5 && support && price > support) {
        const distanceToSupport = (price - support) / price
        if (distanceToSupport < 0.02) {
          srScore += 2 // Very close to support = additional bonus
        }
      }
    } else if (signal.signal === 'sell_to_enter') {
      if (resistance && price < resistance) {
        const distanceToResistance = (resistance - price) / price
        if (distanceToResistance < 0.05) {
          srScore += (assetRank !== null && assetRank <= 5) ? 4 : 2 // Double for top-ranked
        } else if (distanceToResistance < 0.10) {
          srScore += (assetRank !== null && assetRank <= 5) ? 2 : 1
        } else if (assetRank !== null && assetRank <= 5 && distanceToResistance < 0.15) {
          srScore += 1 // Extra point for top-ranked with moderate distance
      }
    }
      // Additional S/R bonus for top-ranked assets near resistance
      if (assetRank !== null && assetRank <= 5 && resistance && price < resistance) {
        const distanceToResistance = (resistance - price) / price
        if (distanceToResistance < 0.02) {
          srScore += 2 // Very close to resistance = additional bonus
        }
      }
    }
  }
  
  // Cap S/R score at max
  srScore = Math.min(srScore, srMaxScore)
  score += srScore
  breakdown.push(`Support/Resistance: ${srScore}/${srMaxScore}${srMaxScore > 5 ? ' (increased for top rank)' : ''}`)
  
  // PHASE 4: Divergence & Momentum - Increased weight (10 → 15 points)
  const divergenceMaxScore = 15
  maxScore += divergenceMaxScore
  let divergenceScore = 0
  
  if (indicators) {
    // MACD Histogram Trend: 7.5 points (increased from 5)
    if (indicators.macd && indicators.macd.histogram !== null && indicators.macd.histogram !== undefined) {
      const macdHist = indicators.macd.histogram
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (macdHist > 0) {
          divergenceScore += 7.5
        } else if (macdHist > -0.1) {
          divergenceScore += 2 // Weak bullish momentum
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (macdHist < 0) {
          divergenceScore += 7.5
        } else if (macdHist < 0.1) {
          divergenceScore += 2 // Weak bearish momentum
        } else {
          divergenceScore += 1
        }
      }
    }
    
    // RSI vs Price: 7.5 points (increased from 5)
    if (indicators.rsi14 !== null && indicators.rsi14 !== undefined && indicators.price) {
      if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        if (indicators.rsi14 < 30) {
          divergenceScore += 7.5
        } else if (indicators.rsi14 < 40) {
          divergenceScore += 4
        } else if (indicators.rsi14 > 70) {
          divergenceScore += 0
        } else {
          divergenceScore += 2.5
        }
      } else if (signal.signal === 'sell_to_enter') {
        if (indicators.rsi14 > 70) {
          divergenceScore += 7.5
        } else if (indicators.rsi14 > 60) {
          divergenceScore += 4
        } else if (indicators.rsi14 < 30) {
          divergenceScore += 0
        } else {
          divergenceScore += 2.5
        }
      }
    }
  }
  
  // Cap divergence score at max
  divergenceScore = Math.min(divergenceScore, divergenceMaxScore)
  score += divergenceScore
  breakdown.push(`Divergence & Momentum: ${divergenceScore.toFixed(1)}/${divergenceMaxScore}`)
  
  // Calculate final confidence (0-1)
  // PHASE 2: Adjust maxScore based on external data availability
  // For top-ranked assets, we already adjusted maxScore above, so use that
  // For non-top-ranked assets, adjust maxScore if external data is completely missing
  const hasMinimalExternalData = adjustedExternalScore <= 2 && (!externalData || Object.keys(externalData).length === 0)
  let effectiveMaxScore = maxScore
  if (!(assetRank !== null && assetRank <= 5)) {
    // Only adjust for non-top-ranked assets (top-ranked already adjusted above)
    if (hasMinimalExternalData && adjustedExternalScore === 0) {
      effectiveMaxScore = maxScore - externalMaxScore // Subtract full external data points if completely missing
    }
  }
  
  // CRITICAL FIX: Ensure minimum confidence of 0.1 instead of 0
  // This prevents 0.0% confidence which indicates an error
  const MIN_CONFIDENCE = 0.1
  let confidence = effectiveMaxScore > 0 ? score / effectiveMaxScore : MIN_CONFIDENCE
  
  // Ensure confidence is never below minimum (unless explicitly rejected above)
  if (confidence < MIN_CONFIDENCE && confidence > 0) {
    confidence = MIN_CONFIDENCE
  }
  
  // CRITICAL FIX: Use ADDITIVE penalties with CAP instead of MULTIPLICATIVE
  // Multiplicative penalties compound too aggressively (e.g., 60% * 0.85 * 0.90 * 0.90 = 41%)
  // Additive penalties are more fair: totalPenalty = sum of all penalties, capped at max
  // This prevents confidence from dropping too low due to multiple minor issues
  const isBuySignal = signal.signal === 'buy_to_enter' || signal.signal === 'add'
  let totalPenalty = 0 // Track total penalty as percentage (0-1)
  const MAX_TOTAL_PENALTY = 0.50 // Cap total penalty at 50% (was unlimited with multiplicative)
  const penaltyDetails: string[] = []
  
  // Apply RSI overbought penalty for BUY_TO_ENTER signals (BALANCED - additive with cap)
  if (isBuySignal && indicators?.rsi14 !== null && indicators?.rsi14 !== undefined) {
    const rsi = indicators.rsi14
    if (rsi > 70) {
      let rsiPenalty = 0
      let penaltyReason = ''
      
      // BALANCED: Reduced penalties and use additive instead of multiplicative
      if (rsi > 80) {
        rsiPenalty = 0.15 // -15% penalty for extreme overbought (was -30% multiplicative)
        penaltyReason = `RSI extreme overbought (${rsi.toFixed(2)}) - HIGH reversal risk`
      } else if (rsi > 75) {
        rsiPenalty = 0.10 // -10% penalty for strong overbought (was -20% multiplicative)
        penaltyReason = `RSI strong overbought (${rsi.toFixed(2)}) - MEDIUM reversal risk`
      } else {
        rsiPenalty = 0.08 // -8% penalty for moderate overbought (was -15% multiplicative)
        penaltyReason = `RSI overbought (${rsi.toFixed(2)}) - caution advised`
      }
      
      totalPenalty += rsiPenalty
      penaltyDetails.push(`RSI Overbought: -${(rsiPenalty * 100).toFixed(0)}% (${penaltyReason})`)
      
      // Auto-reject only if EXTREME overbought (RSI > 80) AND total penalty would drop confidence below 30%
      const estimatedConfidenceAfterPenalty = confidence * (1 - Math.min(totalPenalty, MAX_TOTAL_PENALTY))
      if (rsi > 80 && estimatedConfidenceAfterPenalty < 0.3) {
        return {
          confidence: 0.1,
          totalScore: score,
          maxScore: effectiveMaxScore,
          breakdown: breakdown,
          autoRejected: true,
          rejectionReason: `RSI extreme overbought ${rsi.toFixed(2)}: Estimated confidence would drop below 30%`
        }
      }
    }
  }
  
  // Apply MACD histogram bearish penalty for BUY signals (BALANCED - additive with cap)
  if (isBuySignal && indicators?.macd?.histogram !== null && indicators?.macd?.histogram !== undefined) {
    const macdHist = indicators.macd.histogram
    if (macdHist < 0) {
      let macdPenalty = 0
      let macdPenaltyReason = ''
      
      // BALANCED: Reduced penalties and use additive instead of multiplicative
      if (macdHist < -0.5) {
        macdPenalty = 0.12 // -12% penalty for strongly bearish MACD (was -25% multiplicative)
        macdPenaltyReason = `MACD histogram strongly bearish (${macdHist.toFixed(4)}) - weak momentum`
      } else if (macdHist < -0.2) {
        macdPenalty = 0.08 // -8% penalty for moderately bearish MACD (was -15% multiplicative)
        macdPenaltyReason = `MACD histogram bearish (${macdHist.toFixed(4)}) - caution advised`
      } else {
        macdPenalty = 0.05 // -5% penalty for slightly bearish MACD (was -10% multiplicative)
        macdPenaltyReason = `MACD histogram negative (${macdHist.toFixed(4)}) - slight bearish momentum`
      }
      
      totalPenalty += macdPenalty
      penaltyDetails.push(`MACD Bearish: -${(macdPenalty * 100).toFixed(0)}% (${macdPenaltyReason})`)
      
      // Auto-reject only if EXTREMELY bearish (MACD < -1.0) AND total penalty would drop confidence below 30%
      const estimatedConfidenceAfterPenalty = confidence * (1 - Math.min(totalPenalty, MAX_TOTAL_PENALTY))
      if (macdHist < -1.0 && estimatedConfidenceAfterPenalty < 0.3) {
        return {
          confidence: 0.1,
          totalScore: score,
          maxScore: effectiveMaxScore,
          breakdown: breakdown,
          autoRejected: true,
          rejectionReason: `MACD histogram extremely bearish ${macdHist.toFixed(4)}: Estimated confidence would drop below 30%`
        }
      }
    }
  }
  
  // Apply COMPREHENSIVE volume analysis penalty (CONSOLIDATED - was 4 separate penalties)
  // FIX: Consolidated volume-related penalties into single comprehensive penalty to avoid quadruple penalty
  // This includes: volume recommendation, resistance zones, net delta, and volume trend all in one
  const extDataAny = externalData as any
  if (extDataAny?.comprehensiveVolumeAnalysis || extDataAny?.enhancedMetrics?.volumeTrend) {
    const volAnalysis = extDataAny?.comprehensiveVolumeAnalysis
    const volRecommendation = volAnalysis?.recommendations?.action
    const volConfidence = volAnalysis?.recommendations?.confidence || 0
    const price = indicators?.price || 0
    const volumeTrend = extDataAny?.enhancedMetrics?.volumeTrend
    
    let comprehensiveVolPenalty = 0
    const volPenaltyReasons: string[] = []
    
    // Check volume recommendation contradiction (for BUY signals)
    if (isBuySignal) {
      if (volRecommendation === 'hold' || volRecommendation === 'exit' || volRecommendation === 'wait') {
        if (volConfidence > 0.7) {
          comprehensiveVolPenalty += 0.08 // -8% for high-confidence opposing (was -10% separate)
          volPenaltyReasons.push(`Volume analysis strongly recommends ${volRecommendation.toUpperCase()} (${(volConfidence * 100).toFixed(0)}% confidence)`)
        } else if (volConfidence > 0.5) {
          comprehensiveVolPenalty += 0.04 // -4% for medium-confidence (was -5% separate)
          volPenaltyReasons.push(`Volume analysis recommends ${volRecommendation.toUpperCase()} (${(volConfidence * 100).toFixed(0)}% confidence)`)
        }
      }
      
      // Check resistance zone nearby (consolidated into volume penalty)
      if (volAnalysis?.liquidityZones && Array.isArray(volAnalysis.liquidityZones) && price > 0) {
        const nearbyResistance = volAnalysis.liquidityZones.find((zone: any) => {
          if (zone.type === 'resistance' && zone.priceRange && Array.isArray(zone.priceRange)) {
            const zoneStart = zone.priceRange[0]
            const zoneEnd = zone.priceRange[1]
            const distanceToZone = Math.min(Math.abs(price - zoneStart), Math.abs(price - zoneEnd))
            return distanceToZone / price < 0.02
          }
          return false
        })
        
        if (nearbyResistance) {
          // Reduced penalty since already part of comprehensive volume analysis
          if (nearbyResistance.strength === 'high') {
            comprehensiveVolPenalty += 0.04 // -4% (was -8% separate, now part of comprehensive)
          } else if (nearbyResistance.strength === 'medium') {
            comprehensiveVolPenalty += 0.02 // -2% (was -5% separate)
          }
          volPenaltyReasons.push(`Near ${nearbyResistance.strength} resistance zone`)
        }
      }
      
      // Check Net Delta (consolidated - already part of volume analysis)
      if (volAnalysis?.footprint?.netDelta && volAnalysis.footprint.netDelta < 0) {
        const netDeltaMagnitude = Math.abs(volAnalysis.footprint.netDelta)
        // Reduced penalty since already part of comprehensive volume analysis
        if (netDeltaMagnitude > 50000000) { // Only significant selling pressure
          comprehensiveVolPenalty += 0.03 // -3% (was -5% separate, now part of comprehensive)
          volPenaltyReasons.push(`Strong selling pressure (Net Delta: ${(volAnalysis.footprint.netDelta / 1000000).toFixed(2)}M)`)
        }
      }
      
      // Check volume trend (consolidated - part of volume analysis)
      if (volumeTrend === 'decreasing') {
        // Reduced penalty since already part of comprehensive volume analysis
        comprehensiveVolPenalty += 0.02 // -2% (was -5% separate, now part of comprehensive)
        volPenaltyReasons.push(`Volume trend decreasing`)
      }
    } else if (signal.signal === 'sell_to_enter') {
      // For SELL signals, penalize if volume recommends BUY/HOLD
      if (volRecommendation === 'enter' || volRecommendation === 'hold') {
        if (volConfidence > 0.7) {
          comprehensiveVolPenalty = 0.12 // -12% (reduced from -15%)
        } else if (volConfidence > 0.5) {
          comprehensiveVolPenalty = 0.06 // -6% (reduced from -8%)
        }
        volPenaltyReasons.push(`Volume analysis recommends ${volRecommendation.toUpperCase()} (${(volConfidence * 100).toFixed(0)}% confidence)`)
      }
    }
    
    // Apply comprehensive volume penalty (single penalty instead of 4 separate ones)
    // Cap at -15% max for all volume-related issues combined (was -28% possible with separate penalties)
    if (comprehensiveVolPenalty > 0) {
      const cappedVolPenalty = Math.min(comprehensiveVolPenalty, 0.15) // Max -15% for all volume issues
      totalPenalty += cappedVolPenalty
      penaltyDetails.push(`Volume Analysis (Comprehensive): -${(cappedVolPenalty * 100).toFixed(0)}% (${volPenaltyReasons.join(', ')})`)
      
      if (comprehensiveVolPenalty > 0.15) {
        penaltyDetails.push(`Note: Volume penalty capped at -15% (was ${(comprehensiveVolPenalty * 100).toFixed(0)}%)`)
      }
    }
  }
  
  // CRITICAL FIX: Apply total penalty once (additive, not multiplicative) with cap
  // Cap total penalty to prevent confidence from dropping too low
  const cappedPenalty = Math.min(totalPenalty, MAX_TOTAL_PENALTY)
  if (cappedPenalty > 0) {
    const oldConfidence = confidence
    confidence = confidence * (1 - cappedPenalty)
    
    // Add all penalty details to breakdown
    penaltyDetails.forEach(detail => breakdown.push(detail))
    
    // Log if penalty was capped
    if (totalPenalty > MAX_TOTAL_PENALTY) {
      breakdown.push(`Note: Total penalty capped at ${(MAX_TOTAL_PENALTY * 100).toFixed(0)}% (was ${(totalPenalty * 100).toFixed(0)}%)`)
    }
    
    breakdown.push(`Total Penalty Applied: -${(cappedPenalty * 100).toFixed(1)}% (Confidence: ${(oldConfidence * 100).toFixed(1)}% → ${(confidence * 100).toFixed(1)}%)`)
  }
  
  // Ensure confidence doesn't drop below minimum (unless auto-rejected)
  if (confidence < MIN_CONFIDENCE && confidence > 0) {
    confidence = MIN_CONFIDENCE
  }
  
  // PHASE 5: Add quality-based confidence boost multiplier
  let qualityMultiplier = 1.0
  if (assetRank !== null) {
    if (assetRank === 1) {
      qualityMultiplier = 1.10 // Rank #1: +10% confidence
      breakdown.push(`Quality Boost (Rank #1): +10% confidence multiplier`)
    } else if (assetRank <= 3) {
      qualityMultiplier = 1.07 // Rank #2-3: +7% confidence
      breakdown.push(`Quality Boost (Rank #${assetRank}): +7% confidence multiplier`)
    } else if (assetRank <= 5) {
      qualityMultiplier = 1.05 // Rank #4-5: +5% confidence
      breakdown.push(`Quality Boost (Rank #${assetRank}): +5% confidence multiplier`)
    } else if (assetRank <= 10) {
      qualityMultiplier = 1.03 // Rank #6-10: +3% confidence
      breakdown.push(`Quality Boost (Rank #${assetRank}): +3% confidence multiplier`)
    }
  } else if (qualityScore !== null && qualityScore >= 95) {
    // Fallback: Use quality score if rank not available
    qualityMultiplier = 1.05
    breakdown.push(`Quality Boost (Score ${qualityScore.toFixed(1)}): +5% confidence multiplier`)
  }
  
  // Apply quality multiplier (cap at 1.0 to prevent >100% confidence)
  const oldConfidence = confidence
  confidence = Math.min(confidence * qualityMultiplier, 1.0)
  
  if (qualityMultiplier > 1.0) {
    breakdown.push(`Quality Multiplier Applied: ${(oldConfidence * 100).toFixed(1)}% → ${(confidence * 100).toFixed(1)}%`)
  }
  
  // If we adjusted maxScore, add note to breakdown
  if (effectiveMaxScore < maxScore && !(assetRank !== null && assetRank <= 5)) {
    breakdown.push(`Note: External data missing, adjusted maxScore from ${maxScore} to ${effectiveMaxScore}`)
  }
  
  return {
    confidence: confidence,
    totalScore: score,
    maxScore: effectiveMaxScore, // Return adjusted maxScore for transparency
    breakdown: breakdown,
    autoRejected: false
  }
}

