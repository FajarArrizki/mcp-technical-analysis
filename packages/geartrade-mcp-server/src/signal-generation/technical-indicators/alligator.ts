/**
 * Alligator Indicator (Bill Williams)
 * Three smoothed moving averages representing different phases of market
 */

export interface AlligatorData {
  jaw: number | null // Blue line: SMMA(13) shifted 8 bars right
  teeth: number | null // Red line: SMMA(8) shifted 5 bars right
  lips: number | null // Green line: SMMA(5) shifted 3 bars right
  phase: 'sleeping' | 'waking' | 'eating' | 'satiated' | null
  trend: 'bullish' | 'bearish' | 'neutral' | null
}

// Local SMMA helper function that calculates SMMA at a specific offset from the end
function calcSMMAAtOffset(values: number[], period: number, offset: number): number | null {
  // We need at least (period + offset) data points
  if (values.length < period + offset) {
    return null
  }
  
  // Calculate SMMA up to (length - offset) index
  const endIndex = values.length - offset
  const slicedValues = values.slice(0, endIndex)
  
  if (slicedValues.length < period) {
    return null
  }
  
  // Start with SMA for the first period
  let smma = slicedValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period
  
  // Continue with SMMA calculation
  for (let i = period; i < slicedValues.length; i++) {
    smma = (smma * (period - 1) + slicedValues[i]) / period
  }
  
  return smma
}

export function calculateAlligator(
  closes: number[],
  jawPeriod: number = 13,
  teethPeriod: number = 8,
  lipsPeriod: number = 5,
  jawShift: number = 8,
  teethShift: number = 5,
  lipsShift: number = 3
): AlligatorData {
  if (closes.length < jawPeriod + jawShift) {
    return {
      jaw: null,
      teeth: null,
      lips: null,
      phase: null,
      trend: null,
    }
  }

  // Calculate SMMA for each line with their respective offsets (shifts)
  const jaw = calcSMMAAtOffset(closes, jawPeriod, jawShift)
  const teeth = calcSMMAAtOffset(closes, teethPeriod, teethShift)
  const lips = calcSMMAAtOffset(closes, lipsPeriod, lipsShift)

  // Determine market phase based on Alligator lines
  let phase: 'sleeping' | 'waking' | 'eating' | 'satiated' | null = null
  let trend: 'bullish' | 'bearish' | 'neutral' | null = null

  if (jaw !== null && teeth !== null && lips !== null) {
    // Check if lines are intertwined (sleeping phase)
    const linesClose = Math.abs(jaw - teeth) < 0.001 && Math.abs(teeth - lips) < 0.001 && Math.abs(jaw - lips) < 0.001

    if (linesClose) {
      phase = 'sleeping'
      trend = 'neutral'
    } else {
      // Check order of lines
      if (lips > teeth && teeth > jaw) {
        phase = 'eating'
        trend = 'bullish'
      } else if (jaw > teeth && teeth > lips) {
        phase = 'satiated'
        trend = 'bearish'
      } else {
        phase = 'waking'
        trend = 'neutral'
      }
    }
  }

  return {
    jaw,
    teeth,
    lips,
    phase,
    trend,
  }
}
