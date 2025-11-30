/**
 * Correlation Analysis Indicator
 * BTC Dominance and Altcoin Correlation Analysis
 */

import { calculateCorrelationCoefficient, CorrelationCoefficientData } from './correlation-coefficient'

export interface BTCDominanceData {
  dominance: number
  dominanceChange24h: number
  dominanceTrend: 'increasing' | 'decreasing' | 'stable'
  altcoinSeasonSignal: 'altcoin_season' | 'btc_season' | 'neutral'
  interpretation: string
}

export interface AltcoinCorrelationData {
  ticker: string
  correlationWithBTC: CorrelationCoefficientData | null
  beta: number | null
  relativeStrength: number | null
  decouplingSignal: 'decoupled' | 'coupled' | 'weakly_coupled'
  interpretation: string
}

export interface CorrelationAnalysisResult {
  timestamp: number
  btcDominance: BTCDominanceData | null
  altcoinCorrelations: AltcoinCorrelationData[]
  marketCorrelationAverage: number | null
  marketRegime: 'risk_on' | 'risk_off' | 'neutral'
  tradingRecommendation: string
}

/**
 * Fetch BTC Dominance from external API
 */
export async function fetchBTCDominance(): Promise<BTCDominanceData | null> {
  try {
    // Try CoinGecko API for BTC dominance
    const response = await fetch('https://api.coingecko.com/api/v3/global')
    
    if (!response.ok) {
      console.warn('Failed to fetch BTC dominance from CoinGecko')
      return null
    }
    
    const data = await response.json() as { data?: { market_cap_percentage?: { btc?: number }, market_cap_change_percentage_24h_usd?: number } }
    const dominance = data?.data?.market_cap_percentage?.btc ?? null
    const dominanceChange24h = data?.data?.market_cap_change_percentage_24h_usd ?? 0
    
    if (dominance === null) {
      return null
    }
    
    // Determine dominance trend
    let dominanceTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (dominanceChange24h > 1) {
      dominanceTrend = 'increasing'
    } else if (dominanceChange24h < -1) {
      dominanceTrend = 'decreasing'
    }
    
    // Altcoin season signal
    let altcoinSeasonSignal: 'altcoin_season' | 'btc_season' | 'neutral' = 'neutral'
    if (dominance < 40) {
      altcoinSeasonSignal = 'altcoin_season'
    } else if (dominance > 60) {
      altcoinSeasonSignal = 'btc_season'
    }
    
    // Interpretation
    let interpretation = ''
    if (altcoinSeasonSignal === 'altcoin_season') {
      interpretation = `BTC Dominance ${dominance.toFixed(1)}% - Altcoin Season: Capital flowing into altcoins. Consider altcoin exposure.`
    } else if (altcoinSeasonSignal === 'btc_season') {
      interpretation = `BTC Dominance ${dominance.toFixed(1)}% - BTC Season: Capital concentrating in BTC. Reduce altcoin exposure.`
    } else {
      interpretation = `BTC Dominance ${dominance.toFixed(1)}% - Neutral: Market in transition. Watch for breakout direction.`
    }
    
    return {
      dominance,
      dominanceChange24h,
      dominanceTrend,
      altcoinSeasonSignal,
      interpretation
    }
  } catch (error: any) {
    console.error('Error fetching BTC dominance:', error.message)
    return null
  }
}

/**
 * Calculate Beta (sensitivity to BTC movements)
 */
function calculateBeta(
  assetReturns: number[],
  btcReturns: number[]
): number | null {
  if (assetReturns.length !== btcReturns.length || assetReturns.length < 10) {
    return null
  }
  
  // Calculate means
  const meanAsset = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length
  const meanBtc = btcReturns.reduce((a, b) => a + b, 0) / btcReturns.length
  
  // Calculate covariance and variance
  let covariance = 0
  let varianceBtc = 0
  
  for (let i = 0; i < assetReturns.length; i++) {
    covariance += (assetReturns[i] - meanAsset) * (btcReturns[i] - meanBtc)
    varianceBtc += Math.pow(btcReturns[i] - meanBtc, 2)
  }
  
  if (varianceBtc === 0) return null
  
  return covariance / varianceBtc
}

/**
 * Calculate price returns from price series
 */
function calculateReturns(prices: number[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] !== 0) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1] * 100)
    }
  }
  return returns
}

/**
 * Calculate Relative Strength vs BTC
 */
function calculateRelativeStrength(
  assetPrices: number[],
  btcPrices: number[],
  period: number = 14
): number | null {
  if (assetPrices.length < period || btcPrices.length < period) {
    return null
  }
  
  const assetRecent = assetPrices.slice(-period)
  const btcRecent = btcPrices.slice(-period)
  
  const assetChange = (assetRecent[assetRecent.length - 1] - assetRecent[0]) / assetRecent[0] * 100
  const btcChange = (btcRecent[btcRecent.length - 1] - btcRecent[0]) / btcRecent[0] * 100
  
  // Relative strength: positive = outperforming BTC, negative = underperforming
  return assetChange - btcChange
}

/**
 * Analyze altcoin correlation with BTC
 */
export function analyzeAltcoinCorrelation(
  ticker: string,
  assetPrices: number[],
  btcPrices: number[],
  period: number = 30
): AltcoinCorrelationData {
  // Calculate correlation
  const correlation = calculateCorrelationCoefficient(assetPrices, btcPrices, period)
  
  // Calculate returns for beta
  const assetReturns = calculateReturns(assetPrices)
  const btcReturns = calculateReturns(btcPrices)
  
  // Calculate beta
  const beta = calculateBeta(assetReturns, btcReturns)
  
  // Calculate relative strength
  const relativeStrength = calculateRelativeStrength(assetPrices, btcPrices, period)
  
  // Determine decoupling signal
  let decouplingSignal: 'decoupled' | 'coupled' | 'weakly_coupled' = 'coupled'
  if (correlation) {
    if (Math.abs(correlation.correlation) < 0.3) {
      decouplingSignal = 'decoupled'
    } else if (Math.abs(correlation.correlation) < 0.6) {
      decouplingSignal = 'weakly_coupled'
    }
  }
  
  // Generate interpretation
  let interpretation = ''
  if (correlation) {
    const corrStrength = correlation.correlation > 0.7 ? 'highly' : correlation.correlation > 0.4 ? 'moderately' : 'weakly'
    interpretation = `${ticker} is ${corrStrength} correlated with BTC (r=${correlation.correlation.toFixed(2)}). `
    
    if (beta !== null) {
      if (beta > 1.2) {
        interpretation += `High beta (${beta.toFixed(2)}) - amplified moves vs BTC. `
      } else if (beta < 0.8) {
        interpretation += `Low beta (${beta.toFixed(2)}) - dampened moves vs BTC. `
      } else {
        interpretation += `Neutral beta (${beta.toFixed(2)}) - moves similar to BTC. `
      }
    }
    
    if (relativeStrength !== null) {
      if (relativeStrength > 5) {
        interpretation += `Outperforming BTC by ${relativeStrength.toFixed(1)}%.`
      } else if (relativeStrength < -5) {
        interpretation += `Underperforming BTC by ${Math.abs(relativeStrength).toFixed(1)}%.`
      } else {
        interpretation += `Performing similar to BTC.`
      }
    }
  } else {
    interpretation = `Insufficient data for correlation analysis.`
  }
  
  return {
    ticker,
    correlationWithBTC: correlation,
    beta,
    relativeStrength,
    decouplingSignal,
    interpretation
  }
}

/**
 * Calculate market correlation average
 */
export function calculateMarketCorrelationAverage(
  correlations: AltcoinCorrelationData[]
): number | null {
  const validCorrelations = correlations
    .filter(c => c.correlationWithBTC !== null)
    .map(c => c.correlationWithBTC!.correlation)
  
  if (validCorrelations.length === 0) return null
  
  return validCorrelations.reduce((a, b) => a + b, 0) / validCorrelations.length
}

/**
 * Determine market regime based on correlations
 */
export function determineMarketRegime(
  avgCorrelation: number | null,
  btcDominance: BTCDominanceData | null
): 'risk_on' | 'risk_off' | 'neutral' {
  if (avgCorrelation === null) return 'neutral'
  
  // High correlation + increasing BTC dominance = risk_off (flight to quality)
  // Low correlation + decreasing BTC dominance = risk_on (altcoin speculation)
  
  if (avgCorrelation > 0.8) {
    return 'risk_off' // Everything moving together, usually down
  }
  
  if (avgCorrelation < 0.5 && btcDominance?.altcoinSeasonSignal === 'altcoin_season') {
    return 'risk_on' // Altcoins moving independently, speculation mode
  }
  
  return 'neutral'
}

/**
 * Generate trading recommendation based on correlation analysis
 */
export function generateTradingRecommendation(
  btcDominance: BTCDominanceData | null,
  avgCorrelation: number | null,
  marketRegime: 'risk_on' | 'risk_off' | 'neutral'
): string {
  const recommendations: string[] = []
  
  if (btcDominance) {
    if (btcDominance.altcoinSeasonSignal === 'altcoin_season') {
      recommendations.push('BTC dominance low - favorable for altcoin trades')
    } else if (btcDominance.altcoinSeasonSignal === 'btc_season') {
      recommendations.push('BTC dominance high - focus on BTC or reduce altcoin exposure')
    }
  }
  
  if (avgCorrelation !== null) {
    if (avgCorrelation > 0.8) {
      recommendations.push('High market correlation - systemic risk elevated, use tight stops')
    } else if (avgCorrelation < 0.4) {
      recommendations.push('Low market correlation - good for diversification, individual analysis important')
    }
  }
  
  if (marketRegime === 'risk_off') {
    recommendations.push('Risk-off environment - consider reducing leverage and position sizes')
  } else if (marketRegime === 'risk_on') {
    recommendations.push('Risk-on environment - momentum strategies may work well')
  }
  
  return recommendations.length > 0 
    ? recommendations.join('. ') 
    : 'No specific recommendation - continue standard analysis'
}

/**
 * Main correlation analysis function
 */
export async function performCorrelationAnalysis(
  tickers: string[],
  priceDataMap: Map<string, number[]>,
  btcPrices: number[],
  period: number = 30
): Promise<CorrelationAnalysisResult> {
  // Fetch BTC dominance
  const btcDominance = await fetchBTCDominance()
  
  // Analyze each altcoin correlation
  const altcoinCorrelations: AltcoinCorrelationData[] = []
  
  for (const ticker of tickers) {
    if (ticker.toUpperCase() === 'BTC') continue
    
    const assetPrices = priceDataMap.get(ticker.toUpperCase())
    if (assetPrices && assetPrices.length > 0) {
      const correlation = analyzeAltcoinCorrelation(ticker, assetPrices, btcPrices, period)
      altcoinCorrelations.push(correlation)
    }
  }
  
  // Calculate market average correlation
  const marketCorrelationAverage = calculateMarketCorrelationAverage(altcoinCorrelations)
  
  // Determine market regime
  const marketRegime = determineMarketRegime(marketCorrelationAverage, btcDominance)
  
  // Generate recommendation
  const tradingRecommendation = generateTradingRecommendation(
    btcDominance,
    marketCorrelationAverage,
    marketRegime
  )
  
  return {
    timestamp: Date.now(),
    btcDominance,
    altcoinCorrelations,
    marketCorrelationAverage,
    marketRegime,
    tradingRecommendation
  }
}
