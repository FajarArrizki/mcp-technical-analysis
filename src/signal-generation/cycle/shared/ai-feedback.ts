/**
 * AI Feedback Loop
 * Compare AI predictions vs actual outcomes for model retraining
 */

import { AIFeedbackData, AIFeedbackFeatures, AIFeedbackPrediction, AIFeedbackOutcome, Signal, TradeRecord, MarketData } from '../../types'
import * as fs from 'fs'
import * as path from 'path'

export interface AIFeedbackConfig {
  trainingDataFile: string
  enabled: boolean
}

/**
 * Generate AI feedback data from signal and trade outcome
 */
export function generateAIFeedback(
  signal: Signal,
  trade: TradeRecord,
  entryMarketData: MarketData | null,
  _exitMarketData: MarketData | null,
  cycleId: string
): AIFeedbackData {
  // Extract features from entry market data
  const features = extractFeatures(signal, entryMarketData)

  // Extract prediction from signal
  const prediction: AIFeedbackPrediction = {
    direction: signal.signal === 'buy_to_enter' ? 'LONG' : signal.signal === 'sell_to_enter' ? 'SHORT' : 'NEUTRAL',
    confidence: signal.confidence || 50,
    expectedReturn: signal.expected_value || 0,
    entryPrice: trade.entryPrice,
    stopLoss: signal.stop_loss || 0,
    takeProfit: signal.take_profit || signal.profit_target || 0
  }

  // Extract actual outcome from trade
  const outcome: AIFeedbackOutcome = {
    pnlPct: trade.pnlPct,
    pnlUsd: trade.pnl,
    exitReason: trade.exitReason,
    exitPrice: trade.exitPrice,
    holdingTimeMinutes: trade.holdingTimeMinutes,
    maxAdverseExcursion: trade.maxAdverseExcursion || 0,
    maxFavorableExcursion: trade.maxFavorableExcursion || 0,
    rMultiple: trade.rMultiple,
    didHitStopLoss: trade.didHitStopLoss,
    didHitTakeProfit: trade.didHitTakeProfit,
    numExitConditionsTriggered: trade.numExitConditionsTriggered
  }

  return {
    features,
    prediction,
    actualOutcome: outcome,
    timestamp: Date.now(),
    cycleId,
    asset: signal.coin || ''
  }
}

/**
 * Extract features from market data and signal
 */
function extractFeatures(
  _signal: Signal,
  marketData: MarketData | null
): AIFeedbackFeatures {
  const indicators = marketData?.indicators || {}
  // const externalData = marketData?.externalData || {}
  const trendAlignment = marketData?.trendAlignment
  const marketRegime = marketData?.indicators?.marketRegime || marketData?.indicators?.regime

  // Determine market conditions
  let marketConditions: AIFeedbackFeatures['marketConditions'] = 'neutral'
  if (marketRegime) {
    if (marketRegime.regime === 'trending') {
      marketConditions = 'trending'
    } else if (marketRegime.regime === 'choppy') {
      marketConditions = 'choppy'
    } else if (marketRegime.volatility === 'high') {
      marketConditions = 'volatile'
    } else if (marketRegime.regime === 'neutral') {
      marketConditions = 'ranging'
    }
  }

  // Extract entry indicators
  const entryIndicators: AIFeedbackFeatures['entryIndicators'] = {}
  if (indicators.rsi14 != null) {
    entryIndicators.rsi14 = indicators.rsi14
  }
  if (indicators.macd != null) {
    const macd = indicators.macd
    entryIndicators.macdHistogram = macd.histogram || macd.MACD || 0
  }
  if (indicators.ema20 != null && marketData?.price) {
    const price = marketData.price
    const ema20 = indicators.ema20
    entryIndicators.ema20Trend = price > ema20 ? 'bullish' : price < ema20 ? 'bearish' : 'neutral'
  }
  if (indicators.atr != null && marketData?.price) {
    entryIndicators.atrPct = (indicators.atr / marketData.price) * 100
  }
  if (marketData?.volume24h && marketData?.historicalData && marketData.historicalData.length > 0) {
    const recentVolume = marketData.historicalData[marketData.historicalData.length - 1].volume
    const avgVolume = marketData.historicalData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / Math.min(20, marketData.historicalData.length)
    if (avgVolume > 0) {
      entryIndicators.volumeChangePct = ((recentVolume - avgVolume) / avgVolume) * 100
    }
  }
  if (indicators.bb != null && marketData?.price) {
    const bb = indicators.bb
    const price = marketData.price
    const upper = bb.upper || bb.upperBand || 0
    const lower = bb.lower || bb.lowerBand || 0
    // const middle = bb.middle || bb.middleBand || (upper + lower) / 2
    if (price >= upper) {
      entryIndicators.bbPosition = 'upper'
    } else if (price <= lower) {
      entryIndicators.bbPosition = 'lower'
    } else {
      entryIndicators.bbPosition = 'middle'
    }
  }

  // Volatility at entry
  const volatilityAtEntry = indicators.atr != null && marketData?.price
    ? (indicators.atr / marketData.price) * 100
    : 0

  // Volume profile
  let volumeProfile: AIFeedbackFeatures['volumeProfile'] = 'normal'
  if (marketData?.volume24h && marketData?.historicalData && marketData.historicalData.length > 0) {
    const avgVolume = marketData.historicalData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / Math.min(20, marketData.historicalData.length)
    if (marketData.volume24h > avgVolume * 1.5) {
      volumeProfile = 'high'
    } else if (marketData.volume24h < avgVolume * 0.5) {
      volumeProfile = 'low'
    }
  }

  // Time of day
  const hour = new Date().getUTCHours()
  let timeOfDay: AIFeedbackFeatures['timeOfDay'] = 'other'
  if (hour >= 0 && hour < 8) {
    timeOfDay = 'asia'
  } else if (hour >= 8 && hour < 16) {
    timeOfDay = 'europe'
  } else if (hour >= 16 && hour < 24) {
    timeOfDay = 'us'
  }

  return {
    marketConditions,
    entryIndicators,
    volatilityAtEntry,
    volumeProfile,
    timeOfDay,
    marketRegime: marketRegime?.regime || 'neutral',
    trendAlignmentScore: trendAlignment?.strength,
    assetRanking: 0, // Will be set by caller
    correlationMatrix: undefined // Will be set by caller if available
  }
}

/**
 * Save AI feedback data to file
 */
export function saveAIFeedback(
  feedback: AIFeedbackData,
  config: AIFeedbackConfig
): void {
  if (!config.enabled) {
    return
  }

  try {
    const fileDir = path.dirname(config.trainingDataFile)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }

    let trainingData: AIFeedbackData[] = []
    if (fs.existsSync(config.trainingDataFile)) {
      const content = fs.readFileSync(config.trainingDataFile, 'utf-8')
      trainingData = JSON.parse(content)
    }

    trainingData.push(feedback)

    // Keep only last 10000 records (to avoid file size issues)
    if (trainingData.length > 10000) {
      trainingData = trainingData.slice(-10000)
    }

    fs.writeFileSync(config.trainingDataFile, JSON.stringify(trainingData, null, 2))
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`Failed to save AI feedback data: ${errorMsg}`)
  }
}
