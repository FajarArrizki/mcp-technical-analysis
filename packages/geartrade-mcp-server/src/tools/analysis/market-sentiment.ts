/**
 * Market Sentiment Tool
 * Get Fear & Greed Index + BTC Dominance + Funding Rate Summary
 * Uses free APIs: alternative.me (Fear & Greed), CoinGecko (BTC Dominance)
 */

import { z } from 'zod'

const marketSentimentInputSchema = z.object({
  includeFearGreed: z.boolean().default(true).describe('Include Fear & Greed Index (default: true)'),
  includeBtcDominance: z.boolean().default(true).describe('Include BTC Dominance (default: true)'),
  includeFundingSummary: z.boolean().default(true).describe('Include funding rate summary from Hyperliquid (default: true)'),
})

export type MarketSentimentInput = z.infer<typeof marketSentimentInputSchema>

interface FearGreedData {
  value: number
  classification: string
  timestamp: number
  previousValue?: number
  previousClassification?: string
  trend?: 'improving' | 'declining' | 'stable'
}

interface BtcDominanceData {
  dominance: number
  trend?: 'rising' | 'falling' | 'stable'
  altseasonSignal?: boolean
  interpretation?: string
}

interface FundingSummary {
  averageFunding: number
  positiveFunding: number
  negativeFunding: number
  extremePositive: string[]
  extremeNegative: string[]
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
}

interface MarketSentimentResult {
  success: boolean
  fearGreed?: FearGreedData
  btcDominance?: BtcDominanceData
  fundingSummary?: FundingSummary
  overallSentiment?: {
    score: number
    classification: string
    recommendation: string
  }
  error?: string
  timestamp?: number
}

async function fetchFearGreedIndex(): Promise<FearGreedData | null> {
  try {
    // alternative.me Fear & Greed Index API (FREE, no API key needed)
    const response = await fetch('https://api.alternative.me/fng/?limit=2')
    if (!response.ok) {
      console.error('Fear & Greed API error:', response.status)
      return null
    }
    
    const data = await response.json() as { data?: Array<{ value: string; value_classification: string; timestamp: string }> }
    if (!data.data || data.data.length === 0) {
      return null
    }

    const current = data.data[0]
    const previous = data.data[1]

    const currentValue = parseInt(current.value)
    const previousValue = previous ? parseInt(previous.value) : undefined

    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (previousValue !== undefined) {
      if (currentValue > previousValue + 5) trend = 'improving'
      else if (currentValue < previousValue - 5) trend = 'declining'
    }

    return {
      value: currentValue,
      classification: current.value_classification,
      timestamp: parseInt(current.timestamp) * 1000,
      previousValue,
      previousClassification: previous?.value_classification,
      trend,
    }
  } catch (error) {
    console.error('Error fetching Fear & Greed:', error)
    return null
  }
}

async function fetchBtcDominance(): Promise<BtcDominanceData | null> {
  try {
    // CoinGecko API (FREE tier, no API key needed for basic endpoints)
    const response = await fetch('https://api.coingecko.com/api/v3/global')
    if (!response.ok) {
      console.error('CoinGecko API error:', response.status)
      return null
    }

    const data = await response.json() as { data?: { market_cap_percentage?: { btc?: number } } }
    const dominance = data.data?.market_cap_percentage?.btc

    if (!dominance) {
      return null
    }

    // Interpret dominance
    let trend: 'rising' | 'falling' | 'stable' = 'stable'
    let altseasonSignal = false
    let interpretation = ''

    if (dominance > 55) {
      interpretation = 'BTC dominance high - money flowing to BTC, altcoins may underperform'
      trend = 'rising'
    } else if (dominance < 45) {
      interpretation = 'BTC dominance low - potential altseason, altcoins may outperform'
      altseasonSignal = true
      trend = 'falling'
    } else {
      interpretation = 'BTC dominance neutral - mixed market conditions'
    }

    return {
      dominance: parseFloat(dominance.toFixed(2)),
      trend,
      altseasonSignal,
      interpretation,
    }
  } catch (error) {
    console.error('Error fetching BTC Dominance:', error)
    return null
  }
}

async function fetchFundingSummary(): Promise<FundingSummary | null> {
  try {
    // Hyperliquid API (FREE)
    const response = await fetch('https://api.hyperliquid.xyz/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    })

    if (!response.ok) {
      console.error('Hyperliquid API error:', response.status)
      return null
    }

    const data = await response.json()
    const assetCtxs = data[1] || []

    if (assetCtxs.length === 0) {
      return null
    }

    const fundingRates: { symbol: string; rate: number }[] = []
    const meta = data[0]?.universe || []

    assetCtxs.forEach((ctx: any, index: number) => {
      const funding = parseFloat(ctx.funding || '0')
      const symbol = meta[index]?.name || `Asset${index}`
      fundingRates.push({ symbol, rate: funding })
    })

    // Calculate summary
    const validRates = fundingRates.filter(r => !isNaN(r.rate))
    const avgFunding = validRates.reduce((sum, r) => sum + r.rate, 0) / validRates.length
    const positiveFunding = validRates.filter(r => r.rate > 0).length
    const negativeFunding = validRates.filter(r => r.rate < 0).length

    // Find extreme funding rates (> 0.01% or < -0.01%)
    const extremePositive = validRates
      .filter(r => r.rate > 0.0001)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5)
      .map(r => `${r.symbol}: ${(r.rate * 100).toFixed(4)}%`)

    const extremeNegative = validRates
      .filter(r => r.rate < -0.0001)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5)
      .map(r => `${r.symbol}: ${(r.rate * 100).toFixed(4)}%`)

    // Determine overall sentiment
    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (avgFunding > 0.00005) {
      overallSentiment = 'bullish' // High positive funding = many longs = potentially overbought
    } else if (avgFunding < -0.00005) {
      overallSentiment = 'bearish' // High negative funding = many shorts = potentially oversold
    }

    return {
      averageFunding: parseFloat((avgFunding * 100).toFixed(4)),
      positiveFunding,
      negativeFunding,
      extremePositive,
      extremeNegative,
      overallSentiment,
    }
  } catch (error) {
    console.error('Error fetching funding summary:', error)
    return null
  }
}

function calculateOverallSentiment(
  fearGreed: FearGreedData | null,
  btcDominance: BtcDominanceData | null,
  fundingSummary: FundingSummary | null
): { score: number; classification: string; recommendation: string } {
  let totalScore = 50 // Neutral baseline
  let factors = 0

  // Fear & Greed contribution (0-100 scale)
  if (fearGreed) {
    totalScore += fearGreed.value - 50 // Adjust from 50 baseline
    factors++
  }

  // BTC Dominance contribution
  if (btcDominance) {
    if (btcDominance.dominance > 55) {
      totalScore -= 10 // High dominance = less risk appetite
    } else if (btcDominance.dominance < 45) {
      totalScore += 10 // Low dominance = risk-on
    }
    factors++
  }

  // Funding contribution
  if (fundingSummary) {
    if (fundingSummary.overallSentiment === 'bullish') {
      totalScore += 15 // But could be contrarian signal (too many longs)
    } else if (fundingSummary.overallSentiment === 'bearish') {
      totalScore -= 15
    }
    factors++
  }

  // Normalize score
  const normalizedScore = Math.max(0, Math.min(100, factors > 0 ? totalScore : 50))

  // Classification
  let classification: string
  let recommendation: string

  if (normalizedScore >= 75) {
    classification = 'Extreme Greed'
    recommendation = 'Market euphoria - consider taking profits, high risk of pullback'
  } else if (normalizedScore >= 55) {
    classification = 'Greed'
    recommendation = 'Bullish sentiment - trend following may work, watch for exhaustion'
  } else if (normalizedScore >= 45) {
    classification = 'Neutral'
    recommendation = 'Mixed signals - wait for clearer direction or trade ranges'
  } else if (normalizedScore >= 25) {
    classification = 'Fear'
    recommendation = 'Bearish sentiment - look for oversold bounces, accumulation zones'
  } else {
    classification = 'Extreme Fear'
    recommendation = 'Maximum fear - contrarian buy opportunities, but confirm with technicals'
  }

  return {
    score: Math.round(normalizedScore),
    classification,
    recommendation,
  }
}

export async function getMarketSentiment(input: MarketSentimentInput): Promise<MarketSentimentResult> {
  try {
    const results: MarketSentimentResult = {
      success: true,
      timestamp: Date.now(),
    }

    // Fetch data in parallel
    const [fearGreed, btcDominance, fundingSummary] = await Promise.all([
      input.includeFearGreed ? fetchFearGreedIndex() : null,
      input.includeBtcDominance ? fetchBtcDominance() : null,
      input.includeFundingSummary ? fetchFundingSummary() : null,
    ])

    if (fearGreed) results.fearGreed = fearGreed
    if (btcDominance) results.btcDominance = btcDominance
    if (fundingSummary) results.fundingSummary = fundingSummary

    // Calculate overall sentiment
    results.overallSentiment = calculateOverallSentiment(fearGreed, btcDominance, fundingSummary)

    return results
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
      timestamp: Date.now(),
    }
  }
}

export function registerMarketSentimentTool(server: any) {
  server.registerTool(
    'get_market_sentiment',
    {
      title: 'Get Market Sentiment',
      description: `Get comprehensive market sentiment analysis using free APIs.

Includes:
- Fear & Greed Index (alternative.me) - Market emotion indicator
- BTC Dominance (CoinGecko) - Altseason indicator
- Funding Rate Summary (Hyperliquid) - Derivatives sentiment

All data from FREE APIs, no API keys required.

Output:
- Individual metrics with interpretations
- Overall sentiment score (0-100)
- Trading recommendation based on combined signals`,
      inputSchema: marketSentimentInputSchema,
      outputSchema: z.object({
        success: z.boolean(),
        fearGreed: z.object({
          value: z.number(),
          classification: z.string(),
          timestamp: z.number(),
          previousValue: z.number().optional(),
          previousClassification: z.string().optional(),
          trend: z.enum(['improving', 'declining', 'stable']).optional(),
        }).optional(),
        btcDominance: z.object({
          dominance: z.number(),
          trend: z.enum(['rising', 'falling', 'stable']).optional(),
          altseasonSignal: z.boolean().optional(),
          interpretation: z.string().optional(),
        }).optional(),
        fundingSummary: z.object({
          averageFunding: z.number(),
          positiveFunding: z.number(),
          negativeFunding: z.number(),
          extremePositive: z.array(z.string()),
          extremeNegative: z.array(z.string()),
          overallSentiment: z.enum(['bullish', 'bearish', 'neutral']),
        }).optional(),
        overallSentiment: z.object({
          score: z.number(),
          classification: z.string(),
          recommendation: z.string(),
        }).optional(),
        error: z.string().optional(),
        timestamp: z.number().optional(),
      }),
    },
    async (input: MarketSentimentInput) => {
      try {
        const result = await getMarketSentiment(input)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorResult = { success: false, error: errorMessage, timestamp: Date.now() }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
          structuredContent: errorResult,
        }
      }
    }
  )
}
