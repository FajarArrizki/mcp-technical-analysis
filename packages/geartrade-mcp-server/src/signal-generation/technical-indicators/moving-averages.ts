/**
 * Moving Average Indicators
 * SMA, EMA calculations
 */

export function calculateSMA(values: number[], period: number): number[] {
  if (values.length < period) return []
  
  const sma: number[] = []
  for (let i = period - 1; i < values.length; i++) {
    const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / period)
  }
  
  return sma
}

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length < period) return []
  
  const ema: number[] = []
  const multiplier = 2 / (period + 1)
  
  // Start with SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += values[i]
  }
  ema.push(sum / period)
  
  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }
  
  return ema
}

