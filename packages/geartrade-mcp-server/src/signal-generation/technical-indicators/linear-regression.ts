/**
 * Linear Regression Indicator
 * Calculates linear regression line and related statistical measures for trend analysis
 */

export interface LinearRegressionData {
  // Linear regression line values
  slope: number           // Slope of the regression line
  intercept: number       // Y-intercept of the regression line
  regressionLine: number   // Current regression line value

  // Statistical measures
  rSquared: number        // R-squared (coefficient of determination)
  standardError: number   // Standard error of the regression
  correlation: number     // Correlation coefficient

  // Trend analysis
  trend: 'bullish' | 'bearish' | 'neutral'
  strength: number        // Trend strength (0-100)

  // Support/Resistance levels
  upperBand: number       // Upper regression band (+2 SD)
  lowerBand: number       // Lower regression band (-2 SD)

  // Current position
  priceVsRegression: number  // Price vs regression line (%)
  position: 'above' | 'below' | 'on_line'
}

/**
 * Calculate Linear Regression for price data
 * @param prices Array of prices (typically closes)
 * @param period Period for regression calculation (default 20)
 * @returns LinearRegressionData object
 */
export function calculateLinearRegression(
  prices: number[],
  period: number = 20
): LinearRegressionData | null {
  if (prices.length < period) {
    return null
  }

  // Use the most recent 'period' prices
  const data = prices.slice(-period)

  // Calculate linear regression using least squares method
  const n = data.length
  const sumX = (n * (n - 1)) / 2  // Sum of x values (0 to n-1)
  const sumY = data.reduce((sum, price) => sum + price, 0)
  const sumXY = data.reduce((sum, price, index) => sum + (price * index), 0)
  const sumXX = data.reduce((sum, _, index) => sum + (index * index), 0)

  // Calculate slope and intercept
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Current regression line value (at the last point)
  const regressionLine = intercept + slope * (n - 1)

  // Calculate R-squared
  const yMean = sumY / n
  const ssTot = data.reduce((sum, price) => sum + Math.pow(price - yMean, 2), 0)
  const ssRes = data.reduce((sum, price, index) => {
    const predicted = intercept + slope * index
    return sum + Math.pow(price - predicted, 2)
  }, 0)
  const rSquared = 1 - (ssRes / ssTot)

  // Calculate standard error
  const standardError = Math.sqrt(ssRes / (n - 2))

  // Calculate correlation coefficient
  const correlation = Math.sqrt(Math.max(0, rSquared)) * (slope >= 0 ? 1 : -1)

  // Calculate regression bands (2 standard deviations)
  const upperBand = regressionLine + (2 * standardError)
  const lowerBand = regressionLine - (2 * standardError)

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (slope > 0.001) {
    trend = 'bullish'
  } else if (slope < -0.001) {
    trend = 'bearish'
  }

  // Calculate trend strength (based on slope magnitude and R-squared)
  const slopeStrength = Math.min(100, Math.abs(slope) * 1000)
  const strength = Math.round((slopeStrength + rSquared * 100) / 2)

  // Current price vs regression line
  const currentPrice = data[data.length - 1]
  const priceVsRegression = ((currentPrice - regressionLine) / regressionLine) * 100

  let position: 'above' | 'below' | 'on_line' = 'on_line'
  if (currentPrice > regressionLine * 1.001) {
    position = 'above'
  } else if (currentPrice < regressionLine * 0.999) {
    position = 'below'
  }

  return {
    slope,
    intercept,
    regressionLine,
    rSquared,
    standardError,
    correlation,
    trend,
    strength,
    upperBand,
    lowerBand,
    priceVsRegression,
    position
  }
}

/**
 * Calculate Linear Regression Channel
 * @param prices Array of prices
 * @param period Period for regression
 * @param deviations Number of standard deviations for channel (default 2)
 * @returns Channel data with upper and lower bounds
 */
export function calculateLinearRegressionChannel(
  prices: number[],
  period: number = 20,
  deviations: number = 2
): { upper: number; middle: number; lower: number } | null {
  const regression = calculateLinearRegression(prices, period)
  if (!regression) {
    return null
  }

  return {
    upper: regression.regressionLine + (deviations * regression.standardError),
    middle: regression.regressionLine,
    lower: regression.regressionLine - (deviations * regression.standardError)
  }
}
