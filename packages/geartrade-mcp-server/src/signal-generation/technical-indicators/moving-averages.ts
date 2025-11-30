/**
 * Moving Average Indicators
 * SMA, EMA calculations
 */

export function calculateSMA(values: number[], period: number): number[] {
  if (values.length === 0) return []
  
  // Use adaptive period for small datasets
  const effectivePeriod = Math.min(period, values.length)
  
  const sma: number[] = []
  for (let i = effectivePeriod - 1; i < values.length; i++) {
    const sum = values.slice(i - effectivePeriod + 1, i + 1).reduce((a, b) => a + b, 0)
    sma.push(sum / effectivePeriod)
  }
  
  return sma
}

export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return []
  
  // Use adaptive period for small datasets
  const effectivePeriod = Math.min(period, values.length)
  
  const ema: number[] = []
  const multiplier = 2 / (effectivePeriod + 1)
  
  // Start with SMA
  let sum = 0
  for (let i = 0; i < effectivePeriod; i++) {
    sum += values[i]
  }
  ema.push(sum / effectivePeriod)
  
  // Calculate EMA for remaining values
  for (let i = effectivePeriod; i < values.length; i++) {
    const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }
  
  return ema
}

