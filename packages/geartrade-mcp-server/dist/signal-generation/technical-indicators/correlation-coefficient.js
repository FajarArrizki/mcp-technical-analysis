/**
 * Correlation Coefficient Indicator
 * Measures the statistical relationship between two price series
 */
/**
 * Calculate Correlation Coefficient between two price series
 * @param prices1 First price series (e.g., asset prices)
 * @param prices2 Second price series (e.g., benchmark prices)
 * @param period Period for correlation calculation (default 30)
 * @returns CorrelationCoefficientData object
 */
export function calculateCorrelationCoefficient(prices1, prices2, period = 30) {
    if (prices1.length !== prices2.length || prices1.length < period) {
        return null;
    }
    // Use the most recent 'period' prices
    const series1 = prices1.slice(-period);
    const series2 = prices2.slice(-period);
    // Calculate means
    const mean1 = series1.reduce((sum, price) => sum + price, 0) / period;
    const mean2 = series2.reduce((sum, price) => sum + price, 0) / period;
    // Calculate correlation coefficient
    let numerator = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    for (let i = 0; i < period; i++) {
        const diff1 = series1[i] - mean1;
        const diff2 = series2[i] - mean2;
        numerator += diff1 * diff2;
        sumSq1 += diff1 * diff1;
        sumSq2 += diff2 * diff2;
    }
    const denominator = Math.sqrt(sumSq1 * sumSq2);
    const correlation = denominator > 0 ? numerator / denominator : 0;
    // Interpret correlation strength
    const absCorrelation = Math.abs(correlation);
    let strength;
    if (absCorrelation >= 0.8) {
        strength = 'very_strong';
    }
    else if (absCorrelation >= 0.6) {
        strength = 'strong';
    }
    else if (absCorrelation >= 0.3) {
        strength = 'moderate';
    }
    else if (absCorrelation >= 0.1) {
        strength = 'weak';
    }
    else {
        strength = 'very_weak';
    }
    // Determine direction
    let direction = 'none';
    if (correlation > 0.1) {
        direction = 'positive';
    }
    else if (correlation < -0.1) {
        direction = 'negative';
    }
    // Calculate p-value approximation (simplified)
    const tStatistic = Math.abs(correlation) * Math.sqrt((period - 2) / (1 - correlation * correlation));
    // Approximate p-value using t-distribution (simplified)
    const pValue = tStatistic > 2.5 ? 0.01 : tStatistic > 2.0 ? 0.05 : 0.1;
    // Determine confidence level
    let confidence = 'low';
    if (pValue !== null && pValue < 0.05) {
        confidence = 'high';
    }
    else if (pValue !== null && pValue < 0.1) {
        confidence = 'medium';
    }
    // Analyze trend relationship
    let trendRelationship = 'neutral';
    if (prices1.length >= period * 2 && prices2.length >= period * 2) {
        const recentCorr = calculateCorrelationCoefficient(prices1.slice(-period), prices2.slice(-period), period);
        const olderCorr = calculateCorrelationCoefficient(prices1.slice(-period * 2, -period), prices2.slice(-period * 2, -period), period);
        if (recentCorr && olderCorr) {
            const corrChange = recentCorr.correlation - olderCorr.correlation;
            if (Math.abs(corrChange) > 0.2) {
                trendRelationship = corrChange > 0 ? 'converging' : 'diverging';
            }
        }
    }
    // Calculate signal strength
    const signalStrength = Math.min(100, absCorrelation * 100);
    // Generate trading signal based on correlation
    let signal = 'neutral';
    // This would typically be used for pairs trading or sector analysis
    if (strength === 'very_strong' && confidence === 'high') {
        if (direction === 'positive') {
            // Strong positive correlation - assets move together
            signal = 'neutral'; // No clear signal for individual asset
        }
        else if (direction === 'negative') {
            // Strong negative correlation - assets move opposite
            signal = 'neutral'; // Could be used for hedging strategies
        }
    }
    // Assess diversification benefit
    let diversificationBenefit = 'low';
    if (absCorrelation < 0.3) {
        diversificationBenefit = 'high';
    }
    else if (absCorrelation < 0.7) {
        diversificationBenefit = 'moderate';
    }
    return {
        correlation,
        strength,
        direction,
        period,
        pValue: pValue || null,
        confidence,
        trendRelationship,
        signalStrength,
        signal,
        diversificationBenefit
    };
}
/**
 * Calculate rolling correlation over multiple periods
 * @param prices1 First price series
 * @param prices2 Second price series
 * @param periods Array of periods to calculate correlation for
 * @returns Array of CorrelationCoefficientData objects
 */
export function calculateMultipleCorrelations(prices1, prices2, periods = [20, 30, 60, 90]) {
    return periods
        .map(period => calculateCorrelationCoefficient(prices1, prices2, period))
        .filter((corr) => corr !== null);
}
/**
 * Get correlation interpretation
 * @param corr CorrelationCoefficientData object
 * @returns Human-readable interpretation
 */
export function getCorrelationInterpretation(corr) {
    const { correlation, strength, direction, confidence, diversificationBenefit } = corr;
    let interpretation = `Correlation: ${correlation.toFixed(4)} (${strength} ${direction})`;
    interpretation += ` - ${confidence} confidence`;
    if (diversificationBenefit === 'high') {
        interpretation += ' - High diversification benefit';
    }
    else if (diversificationBenefit === 'moderate') {
        interpretation += ' - Moderate diversification benefit';
    }
    else {
        interpretation += ' - Low diversification benefit';
    }
    return interpretation;
}
/**
 * Analyze correlation stability over time
 * @param prices1 First price series
 * @param prices2 Second price series
 * @param analysisPeriod Number of periods to analyze stability
 * @returns Correlation stability analysis
 */
export function analyzeCorrelationStability(prices1, prices2, analysisPeriod = 60) {
    if (prices1.length < analysisPeriod + 30 || prices2.length < analysisPeriod + 30) {
        return {
            stability: 'very_unstable',
            averageCorrelation: 0,
            correlationVolatility: 0,
            trendDirection: 'stable',
            recommendedStrategy: 'Insufficient data'
        };
    }
    const correlations = [];
    // Calculate correlations over rolling windows
    for (let i = 30; i <= prices1.length - analysisPeriod; i++) {
        const window1 = prices1.slice(i, i + analysisPeriod);
        const window2 = prices2.slice(i, i + analysisPeriod);
        const corr = calculateCorrelationCoefficient(window1, window2, analysisPeriod);
        if (corr) {
            correlations.push(corr.correlation);
        }
    }
    if (correlations.length === 0) {
        return {
            stability: 'very_unstable',
            averageCorrelation: 0,
            correlationVolatility: 0,
            trendDirection: 'stable',
            recommendedStrategy: 'Insufficient data'
        };
    }
    // Calculate statistics
    const averageCorrelation = correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;
    const correlationVolatility = Math.sqrt(correlations.reduce((sum, corr) => sum + Math.pow(corr - averageCorrelation, 2), 0) / correlations.length);
    // Determine stability
    let stability;
    if (correlationVolatility < 0.1) {
        stability = 'very_stable';
    }
    else if (correlationVolatility < 0.2) {
        stability = 'stable';
    }
    else if (correlationVolatility < 0.4) {
        stability = 'unstable';
    }
    else {
        stability = 'very_unstable';
    }
    // Determine trend direction
    const firstHalf = correlations.slice(0, Math.floor(correlations.length / 2));
    const secondHalf = correlations.slice(Math.floor(correlations.length / 2));
    const firstHalfAvg = firstHalf.reduce((sum, corr) => sum + corr, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, corr) => sum + corr, 0) / secondHalf.length;
    let trendDirection = 'stable';
    const trendChange = secondHalfAvg - firstHalfAvg;
    if (Math.abs(trendChange) > 0.1) {
        trendDirection = trendChange > 0 ? 'increasing' : 'decreasing';
    }
    // Recommend strategy
    let recommendedStrategy = 'Monitor correlation changes';
    if (stability === 'very_stable' && Math.abs(averageCorrelation) > 0.7) {
        recommendedStrategy = 'Strong relationship - consider pairs trading';
    }
    else if (stability === 'very_stable' && Math.abs(averageCorrelation) < 0.3) {
        recommendedStrategy = 'Low correlation - good for diversification';
    }
    else if (stability === 'unstable') {
        recommendedStrategy = 'Unstable relationship - avoid pairs trading';
    }
    return {
        stability,
        averageCorrelation,
        correlationVolatility,
        trendDirection,
        recommendedStrategy
    };
}
/**
 * Calculate correlation matrix for multiple assets
 * @param priceMatrix Matrix of price series [asset1[], asset2[], ...]
 * @param period Period for correlation calculation
 * @returns Correlation matrix
 */
export function calculateCorrelationMatrix(priceMatrix, period = 30) {
    const n = priceMatrix.length;
    const correlationMatrix = [];
    for (let i = 0; i < n; i++) {
        correlationMatrix[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                correlationMatrix[i][j] = 1; // Perfect correlation with itself
            }
            else {
                const corr = calculateCorrelationCoefficient(priceMatrix[i], priceMatrix[j], period);
                correlationMatrix[i][j] = corr ? corr.correlation : 0;
            }
        }
    }
    return correlationMatrix;
}
