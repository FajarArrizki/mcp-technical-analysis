/**
 * Ulcer Index
 * Measures downside volatility and risk by focusing on drawdowns from recent highs
 */
/**
 * Calculate Ulcer Index
 * @param closes Array of closing prices
 * @param period Period for calculation (default 14)
 * @returns UlcerIndexData object
 */
export function calculateUlcerIndex(closes, period = 14) {
    if (closes.length < period) {
        return null;
    }
    // Find the maximum price in the period for each point
    const maxPrices = [];
    for (let i = 0; i < closes.length; i++) {
        const startIndex = Math.max(0, i - period + 1);
        const periodPrices = closes.slice(startIndex, i + 1);
        maxPrices.push(Math.max(...periodPrices));
    }
    // Calculate drawdowns
    const drawdowns = [];
    let maxDrawdown = 0;
    for (let i = 0; i < closes.length; i++) {
        const drawdown = ((maxPrices[i] - closes[i]) / maxPrices[i]) * 100;
        drawdowns.push(drawdown);
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    // Calculate Ulcer Index: Square root of average of squared drawdowns
    const recentDrawdowns = drawdowns.slice(-period);
    const squaredDrawdowns = recentDrawdowns.map(d => d * d);
    const averageSquaredDrawdown = squaredDrawdowns.reduce((sum, d) => sum + d, 0) / period;
    const ulcerIndex = Math.sqrt(averageSquaredDrawdown);
    // Current drawdown
    const currentDrawdown = drawdowns[drawdowns.length - 1];
    // Assess risk level
    let riskLevel = 'low';
    if (ulcerIndex > 20) {
        riskLevel = 'extreme';
    }
    else if (ulcerIndex > 15) {
        riskLevel = 'high';
    }
    else if (ulcerIndex > 10) {
        riskLevel = 'moderate';
    }
    // Determine trend (improving vs deteriorating)
    let trend = 'stable';
    if (drawdowns.length >= period * 2) {
        const currentPeriodAvg = recentDrawdowns.reduce((sum, d) => sum + d, 0) / period;
        const previousPeriodDrawdowns = drawdowns.slice(-period * 2, -period);
        const previousPeriodAvg = previousPeriodDrawdowns.reduce((sum, d) => sum + d, 0) / period;
        if (currentPeriodAvg < previousPeriodAvg * 0.9) {
            trend = 'improving';
        }
        else if (currentPeriodAvg > previousPeriodAvg * 1.1) {
            trend = 'deteriorating';
        }
    }
    // Calculate signal strength based on Ulcer Index level
    const strength = Math.min(100, ulcerIndex * 5);
    // Calculate risk-adjusted return (if we have enough data)
    let riskAdjustedReturn = null;
    if (closes.length >= period * 2) {
        const startPrice = closes[closes.length - period * 2];
        const endPrice = closes[closes.length - 1];
        const totalReturn = ((endPrice - startPrice) / startPrice) * 100;
        riskAdjustedReturn = ulcerIndex > 0 ? totalReturn / ulcerIndex : totalReturn;
    }
    // Generate trading signal
    let signal = 'neutral';
    if (riskLevel === 'extreme' && trend === 'deteriorating') {
        signal = 'sell'; // High risk, deteriorating conditions
    }
    else if (riskLevel === 'low' && trend === 'improving') {
        signal = 'buy'; // Low risk, improving conditions
    }
    // Assess market stress
    let marketStress = 'low';
    if (ulcerIndex > 25) {
        marketStress = 'crisis';
    }
    else if (ulcerIndex > 18) {
        marketStress = 'high';
    }
    else if (ulcerIndex > 12) {
        marketStress = 'moderate';
    }
    return {
        ulcerIndex,
        currentDrawdown,
        maxDrawdown,
        period,
        riskLevel,
        trend,
        strength,
        riskAdjustedReturn,
        signal,
        marketStress
    };
}
/**
 * Calculate Ulcer Index for multiple periods
 * @param closes Array of closing prices
 * @param periods Array of periods to calculate Ulcer Index for
 * @returns Array of UlcerIndexData objects
 */
export function calculateMultipleUlcerIndex(closes, periods = [14, 28, 90]) {
    return periods
        .map(period => calculateUlcerIndex(closes, period))
        .filter((ulcer) => ulcer !== null);
}
/**
 * Get Ulcer Index interpretation
 * @param ulcer UlcerIndexData object
 * @returns Human-readable interpretation
 */
export function getUlcerIndexInterpretation(ulcer) {
    const { ulcerIndex, riskLevel, trend, marketStress, signal } = ulcer;
    let interpretation = `Ulcer Index: ${ulcerIndex.toFixed(2)}`;
    interpretation += ` - ${riskLevel} risk, ${trend} trend`;
    if (marketStress !== 'low') {
        interpretation += ` (${marketStress} market stress)`;
    }
    if (signal !== 'neutral') {
        interpretation += ` - ${signal.toUpperCase()} signal`;
    }
    return interpretation;
}
/**
 * Analyze risk-adjusted performance
 * @param ulcer UlcerIndexData object
 * @param returns Array of returns for comparison
 * @returns Risk-adjusted performance analysis
 */
export function analyzeRiskAdjustedPerformance(ulcer, returns) {
    if (returns.length === 0) {
        return {
            sharpeRatio: null,
            sortinoRatio: null,
            ulcerPerformance: 'fair',
            riskEfficiency: 50
        };
    }
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    // Sharpe Ratio (assuming 0% risk-free rate)
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : null;
    // Sortino Ratio (downside deviation only)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0 ?
        Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length) : 0;
    const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : null;
    // Ulcer Performance assessment
    let ulcerPerformance = 'fair';
    const ui = ulcer.ulcerIndex;
    if (ui < 5) {
        ulcerPerformance = 'excellent';
    }
    else if (ui < 10) {
        ulcerPerformance = 'good';
    }
    else if (ui > 20) {
        ulcerPerformance = 'poor';
    }
    // Risk efficiency score
    const riskEfficiency = Math.max(0, Math.min(100, 100 - ui * 2));
    return { sharpeRatio, sortinoRatio, ulcerPerformance, riskEfficiency };
}
/**
 * Calculate Ulcer Index trend analysis
 * @param closes Array of closing prices
 * @param periods Number of periods to analyze
 * @returns Trend analysis for risk assessment
 */
export function analyzeUlcerIndexTrend(closes, periods = 60) {
    if (closes.length < periods + 14) {
        return {
            overallRiskTrend: 'stable',
            riskMomentum: 0,
            recommendedPositionSize: 100,
            marketCondition: 'normal'
        };
    }
    const ulcerData = calculateMultipleUlcerIndex(closes, [14, 28, 90]);
    if (ulcerData.length === 0) {
        return {
            overallRiskTrend: 'stable',
            riskMomentum: 0,
            recommendedPositionSize: 100,
            marketCondition: 'normal'
        };
    }
    // Analyze risk trend
    const avgUlcer = ulcerData.reduce((sum, u) => sum + u.ulcerIndex, 0) / ulcerData.length;
    let overallRiskTrend = 'stable';
    let riskMomentum = 0;
    if (avgUlcer < 8) {
        overallRiskTrend = 'decreasing';
        riskMomentum = Math.max(0, 10 - avgUlcer);
    }
    else if (avgUlcer > 15) {
        overallRiskTrend = 'increasing';
        riskMomentum = Math.min(10, avgUlcer - 15);
    }
    // Recommended position size based on risk
    const recommendedPositionSize = Math.max(10, Math.min(100, 100 - avgUlcer * 3));
    // Market condition assessment
    let marketCondition = 'normal';
    if (avgUlcer < 5) {
        marketCondition = 'calm';
    }
    else if (avgUlcer > 20) {
        marketCondition = 'crisis';
    }
    else if (avgUlcer > 12) {
        marketCondition = 'volatile';
    }
    return { overallRiskTrend, riskMomentum, recommendedPositionSize, marketCondition };
}
