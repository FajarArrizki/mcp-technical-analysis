/**
 * Fibonacci Retracement Indicator
 * Calculates Fibonacci retracement levels and analyzes price position relative to these levels
 */

export interface FibonacciRetracement {
  // Fibonacci levels (standard retracement levels)
  level0: number      // 0% (High/Swing High)
  level236: number    // 23.6%
  level382: number    // 38.2%
  level500: number    // 50%
  level618: number    // 61.8%
  level786: number    // 78.6%
  level100: number    // 100% (Low/Swing Low)
  
  // Extension levels (beyond 100%)
  level1272: number   // 127.2% (extension)
  level1618: number   // 161.8% (golden ratio extension)
  level2000: number   // 200% (extension)
  
  // Current price analysis
  currentLevel: string | null  // Which level price is currently at
  distanceFromLevel: number | null  // Distance from nearest level (%)
  isNearLevel: boolean  // Whether price is within 1% of a Fibonacci level
  nearestLevel: string | null  // Nearest Fibonacci level
  nearestLevelPrice: number | null  // Price of nearest level
  
  // Trend context
  swingHigh: number   // The swing high used for calculation
  swingLow: number    // The swing low used for calculation
  range: number       // Price range (swingHigh - swingLow)
  direction: 'uptrend' | 'downtrend' | 'neutral'  // Overall trend direction
  
  // Signal strength
  strength: number    // 0-100: How strong the Fibonacci signal is
  signal: 'buy' | 'sell' | 'neutral' | null  // Trading signal based on Fibonacci
}

/**
 * Calculate Fibonacci Retracement levels
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param lookbackPeriod Number of periods to look back for swing high/low
 * @returns FibonacciRetracement object with levels and analysis
 */
export function calculateFibonacciRetracement(
  highs: number[],
  lows: number[],
  closes: number[],
  lookbackPeriod: number = 50
): FibonacciRetracement | null {
  if (highs.length < lookbackPeriod || lows.length < lookbackPeriod || closes.length < lookbackPeriod) {
    return null
  }
  
  // Find swing high and swing low within lookback period
  const recentHighs = highs.slice(-lookbackPeriod)
  const recentLows = lows.slice(-lookbackPeriod)
  
  // Use the highest high and lowest low in the period
  const swingHigh = Math.max(...recentHighs)
  const swingLow = Math.min(...recentLows)
  const range = swingHigh - swingLow
  
  if (range <= 0) {
    return null
  }
  
  // Determine trend direction based on price movement
  const firstClose = closes[closes.length - lookbackPeriod]
  const lastClose = closes[closes.length - 1]
  const trendDirection: 'uptrend' | 'downtrend' | 'neutral' = 
    lastClose > firstClose ? 'uptrend' : 
    lastClose < firstClose ? 'downtrend' : 
    'neutral'
  
  // Calculate Fibonacci retracement levels (from swing high to swing low)
  // For uptrend: retracement from high to low
  // For downtrend: retracement from low to high (inverted)
  const isUptrend = trendDirection === 'uptrend'
  const base = isUptrend ? swingHigh : swingLow
  const target = isUptrend ? swingLow : swingHigh
  const fibRange = Math.abs(swingHigh - swingLow)
  
  // Standard retracement levels
  const level0 = base
  const level236 = base - (fibRange * (isUptrend ? 0.236 : -0.236))
  const level382 = base - (fibRange * (isUptrend ? 0.382 : -0.382))
  const level500 = base - (fibRange * (isUptrend ? 0.500 : -0.500))
  const level618 = base - (fibRange * (isUptrend ? 0.618 : -0.618))
  const level786 = base - (fibRange * (isUptrend ? 0.786 : -0.786))
  const level100 = target
  
  // Extension levels (beyond 100%)
  const level1272 = base - (fibRange * (isUptrend ? 1.272 : -1.272))
  const level1618 = base - (fibRange * (isUptrend ? 1.618 : -1.618))
  const level2000 = base - (fibRange * (isUptrend ? 2.000 : -2.000))
  
  // Get current price
  const currentPrice = closes[closes.length - 1]
  
  // Determine which level price is currently at
  const levels = [
    { name: '0%', price: level0 },
    { name: '23.6%', price: level236 },
    { name: '38.2%', price: level382 },
    { name: '50%', price: level500 },
    { name: '61.8%', price: level618 },
    { name: '78.6%', price: level786 },
    { name: '100%', price: level100 },
    { name: '127.2%', price: level1272 },
    { name: '161.8%', price: level1618 },
    { name: '200%', price: level2000 }
  ]
  
  // Find nearest level
  let nearestLevel: { name: string; price: number } | null = null
  let minDistance = Infinity
  
  for (const level of levels) {
    const distance = Math.abs(currentPrice - level.price)
    if (distance < minDistance) {
      minDistance = distance
      nearestLevel = level
    }
  }
  
  // Calculate distance from nearest level as percentage of range
  const distanceFromLevel = nearestLevel ? 
    ((minDistance / range) * 100) : null
  
  // Check if price is near a level (within 1% of range)
  const isNearLevel = distanceFromLevel !== null && distanceFromLevel < 1.0
  
  // Determine current level
  let currentLevel: string | null = null
  if (isNearLevel && nearestLevel) {
    currentLevel = nearestLevel.name
  } else {
    // Find which range price is in
    const sortedLevels = [...levels].sort((a, b) => b.price - a.price)
    for (let i = 0; i < sortedLevels.length - 1; i++) {
      if (currentPrice >= sortedLevels[i + 1].price && currentPrice <= sortedLevels[i].price) {
        currentLevel = `${sortedLevels[i].name} - ${sortedLevels[i + 1].name}`
        break
      }
    }
  }
  
  // Generate signal based on Fibonacci levels
  let signal: 'buy' | 'sell' | 'neutral' | null = null
  let strength = 0
  
  if (isNearLevel && nearestLevel) {
    const levelName = nearestLevel.name
    
    // Key support/resistance levels
    if (levelName === '38.2%' || levelName === '50%' || levelName === '61.8%') {
      // These are key retracement levels
      if (isUptrend) {
        // In uptrend, retracement to these levels = potential buy
        if (currentPrice <= nearestLevel.price * 1.01) { // Within 1% above level
          signal = 'buy'
          strength = levelName === '61.8%' ? 80 : levelName === '50%' ? 70 : 60
        }
      } else {
        // In downtrend, bounce from these levels = potential sell
        if (currentPrice >= nearestLevel.price * 0.99) { // Within 1% below level
          signal = 'sell'
          strength = levelName === '61.8%' ? 80 : levelName === '50%' ? 70 : 60
        }
      }
    } else if (levelName === '23.6%') {
      // Shallow retracement - continuation signal
      if (isUptrend) {
        signal = 'buy'
        strength = 50
      } else {
        signal = 'sell'
        strength = 50
      }
    } else if (levelName === '78.6%' || levelName === '100%') {
      // Deep retracement - potential reversal
      if (isUptrend) {
        signal = 'buy'
        strength = 75
      } else {
        signal = 'sell'
        strength = 75
      }
    } else if (levelName === '0%') {
      // At swing high - potential reversal
      if (isUptrend) {
        signal = 'sell'
        strength = 60
      }
    }
    
    // Adjust strength based on distance
    if (distanceFromLevel !== null) {
      strength = Math.max(0, strength - (distanceFromLevel * 10))
    }
  }
  
  return {
    level0,
    level236,
    level382,
    level500,
    level618,
    level786,
    level100,
    level1272,
    level1618,
    level2000,
    currentLevel,
    distanceFromLevel,
    isNearLevel,
    nearestLevel: nearestLevel?.name || null,
    nearestLevelPrice: nearestLevel?.price || null,
    swingHigh,
    swingLow,
    range,
    direction: trendDirection,
    strength,
    signal
  }
}

/**
 * Get Fibonacci level name from percentage
 */
export function getFibonacciLevelName(percentage: number): string {
  const levelMap: Record<number, string> = {
    0: '0%',
    23.6: '23.6%',
    38.2: '38.2%',
    50: '50%',
    61.8: '61.8%',
    78.6: '78.6%',
    100: '100%',
    127.2: '127.2%',
    161.8: '161.8%',
    200: '200%'
  }
  return levelMap[percentage] || `${percentage}%`
}

