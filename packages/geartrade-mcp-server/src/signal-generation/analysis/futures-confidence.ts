/**
 * Futures Confidence Analysis
 * Simplified version without AI dependency
 */

import { FuturesMarketData, BTCCorrelationData } from '../types/futures-types'

export interface FuturesSignalContext {
  signal: 'LONG' | 'SHORT'
  currentPrice: number
  priceChange24h: number
  volumeChange24h: number
}

export interface FuturesConfidenceResult {
  fundingRateScore: number
  openInterestScore: number
  liquidationZoneScore: number
  longShortRatioScore: number
  btcCorrelationScore: number
  whaleActivityScore: number
  totalScore: number
  confidence: number
  strengths: string[]
  weaknesses: string[]
}

/**
 * Calculate futures confidence score
 * Simplified version that doesn't require AI
 */
export function calculateFuturesConfidence(
  futuresData: FuturesMarketData,
  btcCorrelation: BTCCorrelationData | null,
  whaleFlow: number,
  whaleScore: number,
  signalContext: FuturesSignalContext
): FuturesConfidenceResult {
  let fundingRateScore = 0
  let openInterestScore = 0
  let liquidationZoneScore = 0
  let longShortRatioScore = 0
  let btcCorrelationScore = 0
  let whaleActivityScore = 0

  const strengths: string[] = []
  const weaknesses: string[] = []

  // Funding rate scoring (0-20 points)
  if (futuresData.fundingRate) {
    const fundingRate = Math.abs(futuresData.fundingRate.current)
    if (fundingRate > 0.001) {
      fundingRateScore = 20
      strengths.push(`Strong funding rate: ${(futuresData.fundingRate.current * 100).toFixed(4)}%`)
    } else if (fundingRate > 0.0005) {
      fundingRateScore = 15
      strengths.push(`Moderate funding rate: ${(futuresData.fundingRate.current * 100).toFixed(4)}%`)
    } else {
      fundingRateScore = 5
      weaknesses.push(`Weak funding rate: ${(futuresData.fundingRate.current * 100).toFixed(4)}%`)
    }
  }

  // Open interest scoring (0-20 points)
  if (futuresData.openInterest) {
    const oiChange = Math.abs(futuresData.openInterest.change24h)
    if (oiChange > 5) {
      openInterestScore = 20
      strengths.push(`Strong OI change: ${futuresData.openInterest.change24h.toFixed(1)}%`)
    } else if (oiChange > 2) {
      openInterestScore = 15
      strengths.push(`Moderate OI change: ${futuresData.openInterest.change24h.toFixed(1)}%`)
    } else {
      openInterestScore = 5
      weaknesses.push(`Weak OI momentum`)
    }
  }

  // BTC correlation scoring (0-15 points)
  if (btcCorrelation) {
    const corr7d = btcCorrelation.correlation7d || 0
    if (Math.abs(corr7d) > 0.7) {
      btcCorrelationScore = 15
      strengths.push(`Strong BTC correlation: ${(corr7d * 100).toFixed(1)}%`)
    } else if (Math.abs(corr7d) > 0.5) {
      btcCorrelationScore = 10
      strengths.push(`Moderate BTC correlation: ${(corr7d * 100).toFixed(1)}%`)
    } else {
      btcCorrelationScore = 5
      weaknesses.push(`Weak BTC correlation: ${(corr7d * 100).toFixed(1)}%`)
    }
  }

  // Whale activity scoring (0-15 points)
  if (whaleScore > 0.7) {
    whaleActivityScore = 15
    strengths.push(`Strong whale activity: ${(whaleScore * 100).toFixed(1)}%`)
  } else if (whaleScore > 0.5) {
    whaleActivityScore = 10
    strengths.push(`Moderate whale activity: ${(whaleScore * 100).toFixed(1)}%`)
  }

  // Volume change scoring (add to existing scores)
  if (Math.abs(signalContext.volumeChange24h) > 30) {
    fundingRateScore = Math.min(fundingRateScore + 5, 20)
    strengths.push(`High volume: ${signalContext.volumeChange24h.toFixed(1)}%`)
  }

  // Price change scoring (add to existing scores)
  if (Math.abs(signalContext.priceChange24h) > 3) {
    openInterestScore = Math.min(openInterestScore + 5, 20)
    strengths.push(`Price momentum: ${signalContext.priceChange24h.toFixed(2)}%`)
  }

  const totalScore = fundingRateScore + openInterestScore + liquidationZoneScore +
                    longShortRatioScore + btcCorrelationScore + whaleActivityScore

  const confidence = Math.min(totalScore / 100, 1)

  return {
    fundingRateScore,
    openInterestScore,
    liquidationZoneScore,
    longShortRatioScore,
    btcCorrelationScore,
    whaleActivityScore,
    totalScore,
    confidence,
    strengths,
    weaknesses
  }
}
