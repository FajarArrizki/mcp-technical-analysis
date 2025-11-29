/**
 * Merged Oscillators Tool
 * Combines: stochastic_rsi, chande_momentum_oscillator, percentage_price_oscillator,
 * accelerator_oscillator, awesome_oscillator, gator_oscillator, elder_ray,
 * fisher_transform, know_sure_thing, schaff_trend_cycle, coppock_curve,
 * true_strength_index, relative_vigor_index, detrended_price_oscillator,
 * momentum_indicator, rate_of_change, ultimate_oscillator, trix
 */

import { z } from 'zod'
import {
  calculateStochasticRSI,
  calculateUltimateOscillator,
  calculateTRIX,
  calculateAwesomeOscillator,
  calculateGatorOscillator,
} from '../signal-generation/technical-indicators'
import { calculateChandeMomentum } from '../signal-generation/technical-indicators/chande-momentum'
import { calculatePercentagePriceOscillator } from '../signal-generation/technical-indicators/percentage-price-oscillator'
import { calculateAcceleratorOscillator } from '../signal-generation/technical-indicators/accelerator-oscillator'
import { calculateElderRay } from '../signal-generation/technical-indicators/elder-ray'
import { calculateFisherTransform } from '../signal-generation/technical-indicators/fisher-transform'
import { calculateKST } from '../signal-generation/technical-indicators/kst'
import { calculateSchaffTrendCycle } from '../signal-generation/technical-indicators/schaff-trend-cycle'
import { calculateCoppockCurve } from '../signal-generation/technical-indicators/coppock-curve'
import { calculateTrueStrengthIndex } from '../signal-generation/technical-indicators/true-strength-index'
import { calculateRelativeVigorIndex } from '../signal-generation/technical-indicators/relative-vigor-index'
import { calculateDetrendedPrice } from '../signal-generation/technical-indicators/detrended-price'
import { calculateMomentum } from '../signal-generation/technical-indicators/momentum-indicator'
import { calculateROC } from '../signal-generation/technical-indicators/roc'

export const oscillatorsInputSchema = z.object({
  type: z.enum([
    'stochastic_rsi',
    'chande_momentum',
    'percentage_price_oscillator',
    'accelerator_oscillator',
    'awesome_oscillator',
    'gator_oscillator',
    'elder_ray',
    'fisher_transform',
    'know_sure_thing',
    'schaff_trend_cycle',
    'coppock_curve',
    'true_strength_index',
    'relative_vigor_index',
    'detrended_price',
    'momentum',
    'rate_of_change',
    'ultimate_oscillator',
    'trix'
  ]).describe('Type of oscillator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).optional().describe('Array of high prices (required for some oscillators)'),
  lows: z.array(z.number()).optional().describe('Array of low prices (required for some oscillators)'),
  opens: z.array(z.number()).optional().describe('Array of open prices (required for relative_vigor_index)'),
  volumes: z.array(z.number()).optional().describe('Array of volume data (required for some oscillators)'),
  // Common parameters
  period: z.number().int().min(2).max(200).default(14).describe('Period for calculation (default: 14)'),
  // Stochastic RSI specific
  rsiPeriod: z.number().int().min(5).max(30).optional().describe('RSI period for stochastic_rsi (default: 14)'),
  stochPeriod: z.number().int().min(5).max(20).optional().describe('Stochastic period (default: 14)'),
  kPeriod: z.number().int().min(3).max(10).optional().describe('K smoothing period (default: 3)'),
  dPeriod: z.number().int().min(3).max(10).optional().describe('D smoothing period (default: 3)'),
  // PPO/MACD specific
  fastPeriod: z.number().int().min(2).max(50).optional().describe('Fast period (default: 12)'),
  slowPeriod: z.number().int().min(10).max(100).optional().describe('Slow period (default: 26)'),
  signalPeriod: z.number().int().min(2).max(20).optional().describe('Signal period (default: 9)'),
  // TSI specific
  longPeriod: z.number().int().min(10).max(50).optional().describe('Long period for TSI (default: 25)'),
  shortPeriod: z.number().int().min(5).max(20).optional().describe('Short period for TSI (default: 13)'),
  // Coppock specific
  rocPeriod1: z.number().int().min(5).max(20).optional().describe('First ROC period for Coppock (default: 14)'),
  rocPeriod2: z.number().int().min(5).max(20).optional().describe('Second ROC period for Coppock (default: 11)'),
  wmaPeriod: z.number().int().min(5).max(20).optional().describe('WMA period for Coppock (default: 10)'),
  // Ultimate Oscillator specific
  period1: z.number().int().min(2).max(20).optional().describe('First period for Ultimate Oscillator (default: 7)'),
  period2: z.number().int().min(5).max(30).optional().describe('Second period for Ultimate Oscillator (default: 14)'),
  period3: z.number().int().min(10).max(50).optional().describe('Third period for Ultimate Oscillator (default: 28)'),
})

export type OscillatorsInput = z.infer<typeof oscillatorsInputSchema>

export async function calculateOscillators(input: OscillatorsInput): Promise<any> {
  const {
    type, closes, highs, lows, opens, volumes,
    period = 14,
    rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3,
    fastPeriod = 12, slowPeriod = 26, signalPeriod = 9,
    longPeriod = 25, shortPeriod = 13,
    rocPeriod1 = 14, rocPeriod2 = 11, wmaPeriod = 10,
    period1 = 7, period2 = 14, period3 = 28
  } = input

  switch (type) {
    case 'stochastic_rsi': {
      const result = calculateStochasticRSI(closes, rsiPeriod, stochPeriod, kPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Stochastic RSI`)
      }
      return { type, ...result }
    }

    case 'chande_momentum': {
      const result = calculateChandeMomentum(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Chande Momentum`)
      }
      return { type, ...result }
    }

    case 'percentage_price_oscillator': {
      const result = calculatePercentagePriceOscillator(closes, fastPeriod, slowPeriod, signalPeriod)
      if (!result) {
        throw new Error(`Insufficient data for PPO`)
      }
      return { type, ...result }
    }

    case 'accelerator_oscillator': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Accelerator Oscillator')
      }
      const result = calculateAcceleratorOscillator(highs, lows, closes)
      if (!result) {
        throw new Error(`Insufficient data for Accelerator Oscillator`)
      }
      return { type, ...result }
    }

    case 'awesome_oscillator': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Awesome Oscillator')
      }
      const result = calculateAwesomeOscillator(highs, lows, 5, 34)
      if (!result) {
        throw new Error(`Insufficient data for Awesome Oscillator`)
      }
      return { type, ...result }
    }

    case 'gator_oscillator': {
      const result = calculateGatorOscillator(closes)
      if (!result) {
        throw new Error(`Insufficient data for Gator Oscillator`)
      }
      return { type, ...result }
    }

    case 'elder_ray': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Elder Ray')
      }
      const result = calculateElderRay(highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Elder Ray`)
      }
      return { type, ...result }
    }

    case 'fisher_transform': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Fisher Transform')
      }
      const result = calculateFisherTransform(highs, lows, period)
      if (!result) {
        throw new Error(`Insufficient data for Fisher Transform`)
      }
      return { type, ...result }
    }

    case 'know_sure_thing': {
      const result = calculateKST(closes)
      if (!result) {
        throw new Error(`Insufficient data for KST`)
      }
      return { type, ...result }
    }

    case 'schaff_trend_cycle': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Schaff Trend Cycle')
      }
      const result = calculateSchaffTrendCycle(highs, lows, closes, period, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Schaff Trend Cycle`)
      }
      return { type, ...result }
    }

    case 'coppock_curve': {
      const result = calculateCoppockCurve(closes, rocPeriod1, rocPeriod2, wmaPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Coppock Curve`)
      }
      return { type, ...result }
    }

    case 'true_strength_index': {
      const result = calculateTrueStrengthIndex(closes, longPeriod, shortPeriod)
      if (!result) {
        throw new Error(`Insufficient data for TSI`)
      }
      return { type, ...result }
    }

    case 'relative_vigor_index': {
      if (!opens || !highs || !lows) {
        throw new Error('Opens, highs, and lows arrays are required for Relative Vigor Index')
      }
      const result = calculateRelativeVigorIndex(opens, highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data for RVI`)
      }
      return { type, ...result }
    }

    case 'detrended_price': {
      const result = calculateDetrendedPrice(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Detrended Price Oscillator`)
      }
      return { type, ...result }
    }

    case 'momentum': {
      const result = calculateMomentum(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Momentum`)
      }
      return { type, ...result }
    }

    case 'rate_of_change': {
      const result = calculateROC(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Rate of Change`)
      }
      return { type, ...result }
    }

    case 'ultimate_oscillator': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Ultimate Oscillator')
      }
      const result = calculateUltimateOscillator(highs, lows, closes, period1, period2, period3)
      if (!result) {
        throw new Error(`Insufficient data for Ultimate Oscillator`)
      }
      return { type, ...result }
    }

    case 'trix': {
      const result = calculateTRIX(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for TRIX`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown oscillator type: ${type}`)
  }
}

export function registerOscillatorsTool(server: any) {
  // Stochastic RSI
  server.registerTool(
    'stochastic_rsi',
    {
      title: 'Stochastic RSI',
      description: 'Stochastic RSI - combines RSI with stochastic formula for overbought/oversold signals',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(200).default(14).describe('Period for RSI calculation (default: 14)'),
        kPeriod: z.number().int().min(2).max(50).default(14).describe('K period for stochastic (default: 14)'),
        dPeriod: z.number().int().min(2).max(20).default(3).describe('D period for stochastic (default: 3)'),
      }),
      outputSchema: z.object({
        stochRSI: z.number(),
        k: z.number(),
        d: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], period?: number, kPeriod?: number, dPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'stochastic_rsi', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Stochastic RSI calculation failed: ${error.message}`)
      }
    }
  )

  // Chande Momentum Oscillator
  server.registerTool(
    'chande_momentum',
    {
      title: 'Chande Momentum Oscillator',
      description: 'Chande Momentum Oscillator - measures momentum on both sides with range of -100 to +100',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(200).default(14).describe('Period for calculation (default: 14)'),
      }),
      outputSchema: z.object({
        cmo: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], period?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'chande_momentum', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Chande Momentum calculation failed: ${error.message}`)
      }
    }
  )

  // Percentage Price Oscillator
  server.registerTool(
    'percentage_price_oscillator',
    {
      title: 'Percentage Price Oscillator',
      description: 'Percentage Price Oscillator - MACD expressed as percentage for better cross-asset comparability',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        fastPeriod: z.number().int().min(2).max(50).default(12).describe('Fast EMA period (default: 12)'),
        slowPeriod: z.number().int().min(5).max(100).default(26).describe('Slow EMA period (default: 26)'),
        signalPeriod: z.number().int().min(2).max(20).default(9).describe('Signal line period (default: 9)'),
      }),
      outputSchema: z.object({
        ppo: z.number(),
        signal: z.number(),
        histogram: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'percentage_price_oscillator', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Percentage Price Oscillator calculation failed: ${error.message}`)
      }
    }
  )

  // Accelerator Oscillator
  server.registerTool(
    'accelerator_oscillator',
    {
      title: 'Accelerator Oscillator',
      description: 'Bill Williams Accelerator Oscillator - measures acceleration/deceleration of momentum',
      inputSchema: z.object({
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
      }),
      outputSchema: z.object({
        ac: z.number(),
      }).passthrough(),
    },
    async (input: { highs: number[], lows: number[], closes: number[] }) => {
      try {
        const result = await calculateOscillators({ type: 'accelerator_oscillator', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Accelerator Oscillator calculation failed: ${error.message}`)
      }
    }
  )

  // Awesome Oscillator
  server.registerTool(
    'awesome_oscillator',
    {
      title: 'Awesome Oscillator',
      description: 'Bill Williams Awesome Oscillator - shows momentum changes using simple moving averages of the median price',
      inputSchema: z.object({
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        fastPeriod: z.number().int().min(2).max(20).default(5).describe('Fast SMA period (default: 5)'),
        slowPeriod: z.number().int().min(10).max(50).default(34).describe('Slow SMA period (default: 34)'),
      }),
      outputSchema: z.object({
        ao: z.number(),
      }).passthrough(),
    },
    async (input: { highs: number[], lows: number[], fastPeriod?: number, slowPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'awesome_oscillator', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Awesome Oscillator calculation failed: ${error.message}`)
      }
    }
  )

  // Gator Oscillator
  server.registerTool(
    'gator_oscillator',
    {
      title: 'Gator Oscillator',
      description: 'Bill Williams Gator Oscillator - shows convergence/divergence of Alligator lines and identifies trend strength',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
      }),
      outputSchema: z.object({
        upperGator: z.number(),
        lowerGator: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[] }) => {
      try {
        const result = await calculateOscillators({ type: 'gator_oscillator', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Gator Oscillator calculation failed: ${error.message}`)
      }
    }
  )

  // Elder Ray
  server.registerTool(
    'elder_ray',
    {
      title: 'Elder Ray Index',
      description: 'Elder Ray Index - measures buying and selling pressure using Bull Power and Bear Power',
      inputSchema: z.object({
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(50).default(13).describe('EMA period (default: 13 as recommended by Elder)'),
      }),
      outputSchema: z.object({
        bullPower: z.number(),
        bearPower: z.number(),
      }).passthrough(),
    },
    async (input: { highs: number[], lows: number[], closes: number[], period?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'elder_ray', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Elder Ray calculation failed: ${error.message}`)
      }
    }
  )

  // Fisher Transform
  server.registerTool(
    'fisher_transform',
    {
      title: 'Fisher Transform',
      description: 'Fisher Transform - normalizes price data using Gaussian distribution for sharp reversal signals',
      inputSchema: z.object({
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        period: z.number().int().min(2).max(50).default(10).describe('Period for highest/lowest calculation (default: 10)'),
        triggerPeriod: z.number().int().min(2).max(20).default(5).describe('Period for trigger line EMA (default: 5)'),
      }),
      outputSchema: z.object({
        fisher: z.number(),
        trigger: z.number(),
      }).passthrough(),
    },
    async (input: { highs: number[], lows: number[], period?: number, triggerPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'fisher_transform', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Fisher Transform calculation failed: ${error.message}`)
      }
    }
  )

  // Know Sure Thing
  server.registerTool(
    'know_sure_thing',
    {
      title: 'Know Sure Thing',
      description: 'Know Sure Thing - combines multiple timeframe ROC calculations for momentum analysis',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
      }),
      outputSchema: z.object({
        kst: z.number(),
        signal: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[] }) => {
      try {
        const result = await calculateOscillators({ type: 'know_sure_thing', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Know Sure Thing calculation failed: ${error.message}`)
      }
    }
  )

  // Schaff Trend Cycle
  server.registerTool(
    'schaff_trend_cycle',
    {
      title: 'Schaff Trend Cycle',
      description: 'Schaff Trend Cycle - combines MACD with Stochastic oscillator and double smoothing for early trend signals',
      inputSchema: z.object({
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        cycleLength: z.number().int().min(5).max(50).default(23).describe('Cycle length for MACD (default: 23)'),
        fastLength: z.number().int().min(5).max(30).default(23).describe('Fast EMA length (default: 23)'),
        slowLength: z.number().int().min(10).max(60).default(50).describe('Slow EMA length (default: 50)'),
        kPeriod: z.number().int().min(2).max(20).default(10).describe('Stochastic K period (default: 10)'),
        dPeriod: z.number().int().min(2).max(10).default(3).describe('Stochastic D period (default: 3)'),
      }),
      outputSchema: z.object({
        stc: z.number(),
      }).passthrough(),
    },
    async (input: { highs: number[], lows: number[], closes: number[], cycleLength?: number, fastLength?: number, slowLength?: number, kPeriod?: number, dPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'schaff_trend_cycle', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Schaff Trend Cycle calculation failed: ${error.message}`)
      }
    }
  )

  // Coppock Curve
  server.registerTool(
    'coppock_curve',
    {
      title: 'Coppock Curve',
      description: 'Coppock Curve - combines two ROC periods for identifying major market bottoms and long-term momentum',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        roc1Period: z.number().int().min(5).max(30).default(14).describe('First ROC period (default: 14)'),
        roc2Period: z.number().int().min(5).max(30).default(11).describe('Second ROC period (default: 11)'),
        wmaPeriod: z.number().int().min(5).max(20).default(10).describe('WMA period (default: 10)'),
      }),
      outputSchema: z.object({
        coppock: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], roc1Period?: number, roc2Period?: number, wmaPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'coppock_curve', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Coppock Curve calculation failed: ${error.message}`)
      }
    }
  )

  // True Strength Index
  server.registerTool(
    'true_strength_index',
    {
      title: 'True Strength Index',
      description: 'True Strength Index - uses double-smoothed momentum to reduce noise and provide clearer signals',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        shortPeriod: z.number().int().min(5).max(30).default(25).describe('Short EMA period (default: 25)'),
        longPeriod: z.number().int().min(10).max(50).default(13).describe('Long EMA period (default: 13)'),
        signalPeriod: z.number().int().min(2).max(20).default(13).describe('Signal line period (default: 13)'),
      }),
      outputSchema: z.object({
        tsi: z.number(),
        signal: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], shortPeriod?: number, longPeriod?: number, signalPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'true_strength_index', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`True Strength Index calculation failed: ${error.message}`)
      }
    }
  )

  // Relative Vigor Index
  server.registerTool(
    'relative_vigor_index',
    {
      title: 'Relative Vigor Index',
      description: 'Relative Vigor Index - compares close vs open momentum to identify trend strength and reversals',
      inputSchema: z.object({
        opens: z.array(z.number()).min(5).describe('Array of opening prices'),
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
      }),
      outputSchema: z.object({
        rvi: z.number(),
        signal: z.number(),
      }).passthrough(),
    },
    async (input: { opens: number[], highs: number[], lows: number[], closes: number[] }) => {
      try {
        const result = await calculateOscillators({ type: 'relative_vigor_index', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Relative Vigor Index calculation failed: ${error.message}`)
      }
    }
  )

  // Detrended Price Oscillator
  server.registerTool(
    'detrended_price',
    {
      title: 'Detrended Price Oscillator',
      description: 'Detrended Price Oscillator - removes trend from price data to identify cycles and overbought/oversold conditions',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(5).max(50).default(20).describe('Period for moving average calculation (default: 20)'),
      }),
      outputSchema: z.object({
        dpo: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], period?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'detrended_price', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Detrended Price Oscillator calculation failed: ${error.message}`)
      }
    }
  )

  // Momentum
  server.registerTool(
    'momentum',
    {
      title: 'Momentum Indicator',
      description: 'Momentum Indicator - measures the rate of price change over a specified period',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(50).default(14).describe('Period for momentum calculation (default: 14)'),
      }),
      outputSchema: z.object({
        momentum: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], period?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'momentum', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Momentum calculation failed: ${error.message}`)
      }
    }
  )

  // Rate of Change
  server.registerTool(
    'rate_of_change',
    {
      title: 'Rate of Change',
      description: 'Rate of Change - measures the percentage change in price over a specified period',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(50).default(14).describe('Period for ROC calculation (default: 14)'),
      }),
      outputSchema: z.object({
        roc: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], period?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'rate_of_change', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Rate of Change calculation failed: ${error.message}`)
      }
    }
  )

  // Ultimate Oscillator
  server.registerTool(
    'ultimate_oscillator',
    {
      title: 'Ultimate Oscillator',
      description: 'Ultimate Oscillator - combines three different timeframes to reduce false signals',
      inputSchema: z.object({
        highs: z.array(z.number()).min(5).describe('Array of high prices'),
        lows: z.array(z.number()).min(5).describe('Array of low prices'),
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        shortPeriod: z.number().int().min(2).max(20).default(7).describe('Short period (default: 7)'),
        mediumPeriod: z.number().int().min(5).max(30).default(14).describe('Medium period (default: 14)'),
        longPeriod: z.number().int().min(10).max(50).default(28).describe('Long period (default: 28)'),
      }),
      outputSchema: z.object({
        ultimate: z.number(),
      }).passthrough(),
    },
    async (input: { highs: number[], lows: number[], closes: number[], shortPeriod?: number, mediumPeriod?: number, longPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'ultimate_oscillator', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Ultimate Oscillator calculation failed: ${error.message}`)
      }
    }
  )

  // TRIX
  server.registerTool(
    'trix',
    {
      title: 'TRIX',
      description: 'TRIX - shows the rate of change of a triple exponentially smoothed moving average',
      inputSchema: z.object({
        closes: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(5).max(50).default(15).describe('Period for TRIX calculation (default: 15)'),
        signalPeriod: z.number().int().min(2).max(20).default(9).describe('Signal line period (default: 9)'),
      }),
      outputSchema: z.object({
        trix: z.number(),
        signal: z.number(),
      }).passthrough(),
    },
    async (input: { closes: number[], period?: number, signalPeriod?: number }) => {
      try {
        const result = await calculateOscillators({ type: 'trix', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`TRIX calculation failed: ${error.message}`)
      }
    }
  )
}
