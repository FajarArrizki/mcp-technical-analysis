/**
 * Chaikin Volatility Indicator
 * Measures the rate of change of the trading range (High - Low)
 */
/**
 * Calculate Chaikin Volatility
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param rocPeriod Period for rate of change calculation (default 10)
 * @param smoothingPeriod Period for EMA smoothing of range (default 10)
 * @returns ChaikinVolatilityData object
 */
export function calculateChaikinVolatility(highs, lows, rocPeriod = 10, smoothingPeriod = 10) {
    // Minimum 3 data points required
    if (highs.length !== lows.length || highs.length < 3) {
        return null;
    }
    // Use adaptive periods
    const dataRatio = Math.min(1, highs.length / (rocPeriod + smoothingPeriod));
    const effectiveRocPeriod = Math.max(2, Math.floor(rocPeriod * dataRatio));
    const effectiveSmoothingPeriod = Math.max(2, Math.floor(smoothingPeriod * dataRatio));
    // Calculate trading ranges (High - Low)
    const ranges = [];
    for (let i = 0; i < highs.length; i++) {
        ranges.push(highs[i] - lows[i]);
    }
    // Smooth the ranges with EMA
    const smoothedRanges = calculateEMA(ranges, effectiveSmoothingPeriod);
    if (smoothedRanges.length < 2) {
        // Fallback: use raw ranges
        const currentRange = ranges[ranges.length - 1];
        const previousRange = ranges[Math.max(0, ranges.length - effectiveRocPeriod - 1)];
        const volatility = previousRange > 0 ? ((currentRange - previousRange) / previousRange) * 100 : 0;
        return {
            volatility,
            currentRange,
            previousRange,
            rocPeriod: effectiveRocPeriod,
            trend: volatility > 5 ? 'increasing' : volatility < -5 ? 'decreasing' : 'stable',
            strength: Math.min(100, Math.abs(volatility) * 3),
            potentialBreakout: volatility > 15,
            overbought: volatility > 30,
            oversold: volatility < -30,
            signal: 'neutral',
            phase: volatility > 10 ? 'expansion' : volatility < -10 ? 'contraction' : 'stable'
        };
    }
    // Calculate rate of change of smoothed ranges
    const useRocPeriod = Math.min(effectiveRocPeriod, smoothedRanges.length - 1);
    const currentRange = smoothedRanges[smoothedRanges.length - 1];
    const previousRange = smoothedRanges[Math.max(0, smoothedRanges.length - 1 - useRocPeriod)];
    // Chaikin Volatility = ((Current Range - Previous Range) / Previous Range) * 100
    const volatility = previousRange > 0 ? ((currentRange - previousRange) / previousRange) * 100 : 0;
    // Determine trend
    let trend = 'stable';
    if (volatility > 5) {
        trend = 'increasing';
    }
    else if (volatility < -5) {
        trend = 'decreasing';
    }
    // Calculate signal strength based on volatility magnitude
    const strength = Math.min(100, Math.abs(volatility) * 3);
    // Check for potential breakouts (increasing volatility often precedes breakouts)
    const potentialBreakout = volatility > 15 && trend === 'increasing';
    // Check overbought/oversold levels
    const overbought = volatility > 30;
    const oversold = volatility < -30;
    // Generate trading signal
    let signal = 'neutral';
    if (potentialBreakout) {
        signal = 'buy'; // Breakouts can be in either direction
    }
    else if (overbought && trend === 'decreasing') {
        signal = 'sell'; // Volatility contraction after expansion
    }
    else if (oversold && trend === 'increasing') {
        signal = 'buy'; // Volatility expansion from low levels
    }
    // Determine volatility phase
    let phase = 'stable';
    if (volatility > 10) {
        phase = 'expansion';
    }
    else if (volatility < -10) {
        phase = 'contraction';
    }
    return {
        volatility,
        currentRange,
        previousRange,
        rocPeriod: effectiveRocPeriod,
        trend,
        strength,
        potentialBreakout,
        overbought,
        oversold,
        signal,
        phase
    };
}
/**
 * Helper function to calculate EMA with adaptive period
 */
function calculateEMA(values, period) {
    if (values.length < 2) {
        return values;
    }
    // Use adaptive period for small datasets
    const effectivePeriod = Math.min(period, values.length);
    const ema = [];
    const multiplier = 2 / (effectivePeriod + 1);
    // First EMA value is the simple average of available data
    let sum = 0;
    for (let i = 0; i < effectivePeriod; i++) {
        sum += values[i];
    }
    ema.push(sum / effectivePeriod);
    // Calculate subsequent EMA values
    for (let i = effectivePeriod; i < values.length; i++) {
        const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
    }
    return ema;
}
/**
 * Calculate Chaikin Volatility for multiple periods
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param rocPeriods Array of ROC periods to calculate
 * @returns Array of ChaikinVolatilityData objects
 */
export function calculateMultipleChaikinVolatility(highs, lows, rocPeriods = [10, 20, 30]) {
    return rocPeriods
        .map(period => calculateChaikinVolatility(highs, lows, period))
        .filter((vol) => vol !== null);
}
/**
 * Get Chaikin Volatility interpretation
 * @param vol ChaikinVolatilityData object
 * @returns Human-readable interpretation
 */
export function getChaikinVolatilityInterpretation(vol) {
    const { volatility, trend, potentialBreakout, phase, signal } = vol;
    let interpretation = `Chaikin Volatility: ${volatility.toFixed(2)}%`;
    if (potentialBreakout) {
        interpretation += ' - Potential breakout signal';
    }
    else {
        interpretation += ` - ${trend} volatility (${phase} phase)`;
    }
    if (signal !== 'neutral') {
        interpretation += ` - ${signal.toUpperCase()} signal`;
    }
    return interpretation;
}
/**
 * Analyze volatility trends for breakout prediction
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param periods Number of periods to analyze
 * @returns Volatility trend analysis
 */
export function analyzeVolatilityTrends(highs, lows, periods = 20) {
    // Adaptive minimum - need at least 5 data points
    if (highs.length < 5) {
        return { overallTrend: 'stable', breakoutProbability: 50, recommendedAction: 'Insufficient data' };
    }
    const volatilityData = calculateMultipleChaikinVolatility(highs, lows, [10, 20, 30]);
    if (volatilityData.length === 0) {
        return { overallTrend: 'stable', breakoutProbability: 50, recommendedAction: 'Insufficient data' };
    }
    // Analyze overall volatility trend
    let expansionCount = 0;
    let contractionCount = 0;
    let breakoutSignals = 0;
    for (const vol of volatilityData) {
        if (vol.phase === 'expansion')
            expansionCount++;
        if (vol.phase === 'contraction')
            contractionCount++;
        if (vol.potentialBreakout)
            breakoutSignals++;
    }
    const overallTrend = expansionCount > contractionCount ? 'expansion' :
        contractionCount > expansionCount ? 'contraction' : 'stable';
    // Calculate breakout probability
    const breakoutProbability = Math.min(100, breakoutSignals / volatilityData.length * 100 + (overallTrend === 'expansion' ? 20 : 0));
    let recommendedAction;
    if (breakoutProbability > 70) {
        recommendedAction = 'High probability of breakout - prepare for volatility';
    }
    else if (breakoutProbability > 40) {
        recommendedAction = 'Moderate breakout probability - monitor closely';
    }
    else {
        recommendedAction = 'Low breakout probability - normal trading conditions';
    }
    return { overallTrend, breakoutProbability, recommendedAction };
}
/**
 * Calculate volatility expansion/contraction ratio
 * @param vol ChaikinVolatilityData object
 * @param historicalData Array of historical ChaikinVolatilityData
 * @returns Volatility analysis
 */
export function calculateVolatilityRatio(vol, historicalData) {
    if (historicalData.length === 0) {
        return { expansionRatio: 1, averageVolatility: vol.volatility, relativeStrength: 'moderate' };
    }
    const avgVolatility = historicalData.reduce((sum, v) => sum + Math.abs(v.volatility), 0) / historicalData.length;
    const expansionRatio = avgVolatility > 0 ? Math.abs(vol.volatility) / avgVolatility : 1;
    let relativeStrength = 'moderate';
    if (expansionRatio > 1.5) {
        relativeStrength = 'high';
    }
    else if (expansionRatio < 0.67) {
        relativeStrength = 'low';
    }
    return { expansionRatio, averageVolatility: avgVolatility, relativeStrength };
}
