/**
 * R-Squared Indicator
 * Measures the goodness of fit of a regression line to the price data
 * Shows what percentage of price movement is explained by the trend
 */
/**
 * Calculate R-Squared for price series
 * @param prices Array of closing prices
 * @param period Period for regression calculation (default 20)
 * @returns RSquaredData object
 */
export function calculateRSquared(prices1, prices2, period = 20) {
    if (prices1.length < period || prices2.length < period) {
        return null;
    }
    // Use the most recent 'period' prices
    const data1 = prices1.slice(-period);
    const data2 = prices2.slice(-period);
    const n = data1.length;
    // Calculate means
    const meanX = data1.reduce((sum, price) => sum + price, 0) / n;
    const meanY = data2.reduce((sum, price) => sum + price, 0) / n;
    // Calculate regression line
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += data1[i];
        sumY += data2[i];
        sumXY += data1[i] * data2[i];
        sumX2 += data1[i] * data1[i];
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    // Calculate R-Squared
    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares
    for (let i = 0; i < n; i++) {
        const predicted = slope * data1[i] + intercept;
        const residual = data2[i] - predicted;
        ssRes += residual * residual;
        ssTot += Math.pow(data2[i] - meanY, 2);
    }
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    const rSquaredPercent = rSquared * 100;
    // Interpret trend strength
    let trendStrength;
    if (rSquared >= 0.8) {
        trendStrength = 'very_strong';
    }
    else if (rSquared >= 0.6) {
        trendStrength = 'strong';
    }
    else if (rSquared >= 0.4) {
        trendStrength = 'moderate';
    }
    else if (rSquared >= 0.2) {
        trendStrength = 'weak';
    }
    else {
        trendStrength = 'very_weak';
    }
    // Determine trend direction
    let trendDirection = 'sideways';
    if (Math.abs(slope) > 0.001) {
        trendDirection = slope > 0 ? 'uptrend' : 'downtrend';
    }
    // Calculate statistical significance using F-test approximation
    const fStatistic = (rSquared / (1 - rSquared)) * ((n - 2) / 1);
    let significance;
    if (fStatistic > 10.0) {
        significance = 'highly_significant';
    }
    else if (fStatistic > 4.0) {
        significance = 'significant';
    }
    else if (fStatistic > 2.0) {
        significance = 'marginally_significant';
    }
    else {
        significance = 'not_significant';
    }
    // Calculate confidence in trend
    const confidence = Math.min(100, rSquaredPercent * (significance === 'highly_significant' ? 1.2 : 1.0));
    // Generate trading signal
    let signal = 'neutral';
    if (trendStrength === 'strong' || trendStrength === 'very_strong') {
        if (trendDirection === 'uptrend' && significance !== 'not_significant') {
            signal = 'buy';
        }
        else if (trendDirection === 'downtrend' && significance !== 'not_significant') {
            signal = 'sell';
        }
    }
    // Determine market regime
    let regime = 'uncertain';
    if (rSquared > 0.5 && significance !== 'not_significant') {
        regime = 'trending';
    }
    else if (rSquared < 0.2) {
        regime = 'ranging';
    }
    return {
        rSquared,
        rSquaredPercent,
        trendStrength,
        period,
        slope,
        intercept,
        trendDirection,
        significance,
        confidence,
        signal,
        regime
    };
}
/**
 * Calculate R-Squared for multiple periods
 * @param prices Array of closing prices
 * @param periods Array of periods to calculate R-Squared for
 * @returns Array of RSquaredData objects
 */
export function calculateMultipleRSquared(prices1, prices2, periods = [10, 20, 30, 50]) {
    return periods
        .map(period => calculateRSquared(prices1, prices2, period))
        .filter((r2) => r2 !== null);
}
/**
 * Get R-Squared interpretation
 * @param r2 RSquaredData object
 * @returns Human-readable interpretation
 */
export function getRSquaredInterpretation(r2) {
    const { rSquaredPercent, trendStrength, trendDirection, significance, regime } = r2;
    let interpretation = `R²: ${rSquaredPercent.toFixed(1)}% (${trendStrength} ${trendDirection})`;
    interpretation += ` - ${significance} - ${regime} market`;
    return interpretation;
}
/**
 * Analyze trend consistency using R-Squared
 * @param prices Array of closing prices
 * @param analysisPeriod Number of periods to analyze
 * @returns Trend consistency analysis
 */
export function analyzeTrendConsistency(prices, analysisPeriod = 50) {
    if (prices.length < analysisPeriod + 20) {
        return {
            overallTrendStrength: 0,
            consistencyScore: 0,
            dominantRegime: 'mixed',
            trendReliability: 'low',
            recommendedApproach: 'Insufficient data'
        };
    }
    const r2Data = [];
    // Calculate R-Squared for different lookback periods
    for (let i = 20; i <= prices.length - analysisPeriod; i++) {
        const slice = prices.slice(i, i + analysisPeriod);
        const r2 = calculateRSquared(slice, slice, analysisPeriod);
        if (r2) {
            r2Data.push(r2);
        }
    }
    if (r2Data.length === 0) {
        return {
            overallTrendStrength: 0,
            consistencyScore: 0,
            dominantRegime: 'mixed',
            trendReliability: 'low',
            recommendedApproach: 'Insufficient data'
        };
    }
    // Analyze results
    const avgRSquared = r2Data.reduce((sum, r2) => sum + r2.rSquared, 0) / r2Data.length;
    const overallTrendStrength = avgRSquared * 100;
    // Count regime distribution
    let trendingCount = 0;
    let rangingCount = 0;
    r2Data.forEach(r2 => {
        if (r2.regime === 'trending')
            trendingCount++;
        if (r2.regime === 'ranging')
            rangingCount++;
    });
    // Determine dominant regime
    let dominantRegime = 'mixed';
    const trendingPct = trendingCount / r2Data.length;
    const rangingPct = rangingCount / r2Data.length;
    if (trendingPct > 0.6) {
        dominantRegime = 'trending';
    }
    else if (rangingPct > 0.6) {
        dominantRegime = 'ranging';
    }
    // Calculate consistency score (how consistent R-Squared values are)
    const rSquaredValues = r2Data.map(r2 => r2.rSquared);
    const meanRSquared = rSquaredValues.reduce((sum, r2) => sum + r2, 0) / rSquaredValues.length;
    const variance = rSquaredValues.reduce((sum, r2) => sum + Math.pow(r2 - meanRSquared, 2), 0) / rSquaredValues.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 100 - (stdDev * 200)); // Lower variance = higher consistency
    // Determine trend reliability
    let trendReliability = 'low';
    if (consistencyScore > 70 && overallTrendStrength > 60) {
        trendReliability = 'high';
    }
    else if (consistencyScore > 50 || overallTrendStrength > 40) {
        trendReliability = 'medium';
    }
    // Recommend trading approach
    let recommendedApproach = 'Use mixed strategies';
    if (dominantRegime === 'trending' && trendReliability === 'high') {
        recommendedApproach = 'Trend following strategies recommended';
    }
    else if (dominantRegime === 'ranging' && trendReliability === 'high') {
        recommendedApproach = 'Mean reversion strategies recommended';
    }
    else if (trendReliability === 'low') {
        recommendedApproach = 'Use caution - market conditions unclear';
    }
    return {
        overallTrendStrength,
        consistencyScore,
        dominantRegime,
        trendReliability,
        recommendedApproach
    };
}
/**
 * Calculate R-Squared based prediction intervals
 * @param r2 RSquaredData object
 * @param prices Array of prices
 * @param confidenceLevel Confidence level for prediction (default 95%)
 * @returns Prediction intervals for next price
 */
export function calculatePredictionIntervals(r2, prices, confidenceLevel = 95) {
    const { slope, intercept, period, rSquared } = r2;
    const n = prices.length;
    if (n < period) {
        return {
            predictedPrice: prices[n - 1],
            upperBound: prices[n - 1],
            lowerBound: prices[n - 1],
            confidenceInterval: 0
        };
    }
    // Predict next price using regression line
    const nextX = period; // Next period after our regression
    const predictedPrice = slope * nextX + intercept;
    // Calculate standard error of the estimate
    const data = prices.slice(-period);
    const mean = data.reduce((sum, price) => sum + price, 0) / period;
    let ssRes = 0;
    for (let i = 0; i < period; i++) {
        const predicted = slope * i + intercept;
        const residual = data[i] - predicted;
        ssRes += residual * residual;
    }
    const standardError = Math.sqrt(ssRes / (period - 2));
    // Calculate prediction interval
    const tValue = confidenceLevel === 95 ? 2.31 : 1.96; // Approximation for large n
    const marginOfError = tValue * standardError * Math.sqrt(1 + 1 / period + Math.pow(nextX - period / 2, 2) / ((period - 1) * period));
    const upperBound = predictedPrice + marginOfError;
    const lowerBound = predictedPrice - marginOfError;
    const confidenceInterval = marginOfError * 2;
    return {
        predictedPrice,
        upperBound,
        lowerBound,
        confidenceInterval
    };
}
