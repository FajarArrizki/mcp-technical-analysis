/**
 * ZigZag Indicator
 * Filters out market noise and shows major price swings
 */

export interface ZigZagData {
  zigzag: number | null // Current ZigZag value
  direction: 'up' | 'down' | 'sideways' | null
  swingPoints: Array<{ index: number; value: number; type: 'high' | 'low' }>
  lastSwing: { index: number; value: number; type: 'high' | 'low' } | null
}

export function calculateZigZag(
  closes: number[],
  deviation: number = 5 // Minimum deviation in percentage
): ZigZagData {
  if (closes.length < 3) {
    return {
      zigzag: null,
      direction: null,
      swingPoints: [],
      lastSwing: null,
    }
  }

  const swingPoints: Array<{ index: number; value: number; type: 'high' | 'low' }> = []
  let lastSwing: { index: number; value: number; type: 'high' | 'low' } | null = null
  let trend: 'up' | 'down' = 'up' // Start assuming uptrend

  // First, find initial swing point
  let maxValue = closes[0]
  let minValue = closes[0]
  let maxValueIndex = 0
  let minValueIndex = 0

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > maxValue) {
      maxValue = closes[i]
      maxValueIndex = i
    }
    if (closes[i] < minValue) {
      minValue = closes[i]
      minValueIndex = i
    }
  }

  // Start with the first significant move
  if (maxValueIndex < minValueIndex) {
    // Started with up move
    swingPoints.push({ index: 0, value: closes[0], type: 'low' })
    lastSwing = { index: maxValueIndex, value: maxValue, type: 'high' }
    swingPoints.push(lastSwing)
    trend = 'down'
  } else {
    // Started with down move
    swingPoints.push({ index: 0, value: closes[0], type: 'high' })
    lastSwing = { index: minValueIndex, value: minValue, type: 'low' }
    swingPoints.push(lastSwing)
    trend = 'up'
  }

  // Process remaining data
  for (let i = lastSwing.index + 1; i < closes.length; i++) {
    const currentValue = closes[i]

    if (trend === 'down') {
      // Looking for lower low
      if (currentValue < lastSwing.value * (1 - deviation / 100)) {
        // Found new swing low
        lastSwing = { index: i, value: currentValue, type: 'low' }
        swingPoints.push(lastSwing)
        trend = 'up'
      } else if (currentValue > lastSwing.value) {
        // Price moved up significantly, update swing point
        lastSwing = { index: i, value: currentValue, type: 'high' }
        swingPoints[swingPoints.length - 1] = lastSwing
      }
    } else {
      // Looking for higher high
      if (currentValue > lastSwing.value * (1 + deviation / 100)) {
        // Found new swing high
        lastSwing = { index: i, value: currentValue, type: 'high' }
        swingPoints.push(lastSwing)
        trend = 'down'
      } else if (currentValue < lastSwing.value) {
        // Price moved down significantly, update swing point
        lastSwing = { index: i, value: currentValue, type: 'low' }
        swingPoints[swingPoints.length - 1] = lastSwing
      }
    }
  }

  // Determine current direction
  let direction: 'up' | 'down' | 'sideways' | null = null
  if (swingPoints.length >= 2) {
    const lastTwo = swingPoints.slice(-2)
    if (lastTwo[1].type === 'high' && lastTwo[1].value > lastTwo[0].value) {
      direction = 'up'
    } else if (lastTwo[1].type === 'low' && lastTwo[1].value < lastTwo[0].value) {
      direction = 'down'
    } else {
      direction = 'sideways'
    }
  }

  return {
    zigzag: lastSwing ? lastSwing.value : null,
    direction,
    swingPoints,
    lastSwing,
  }
}
