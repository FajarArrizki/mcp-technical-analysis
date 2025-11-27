/**
 * Arms Index (TRIN - Trading Index)
 * Market breadth indicator comparing advancing/declining stocks to volume
 */
/**
 * Calculate Arms Index (TRIN)
 * @param advances Number of advancing stocks
 * @param declines Number of declining stocks
 * @param advancingVolume Volume of advancing stocks
 * @param decliningVolume Volume of declining stocks
 * @returns ArmsIndexData object
 */
export function calculateArmsIndex(advances, declines, advancingVolume, decliningVolume) {
    if (advances <= 0 || declines <= 0 || advancingVolume <= 0 || decliningVolume <= 0) {
        return null;
    }
    // Calculate advance-decline ratio
    const adRatio = advances / declines;
    // Calculate advance-decline volume ratio
    const advRatio = advancingVolume / decliningVolume;
    // Calculate TRIN: (advances/declines) / (advancingVolume/decliningVolume)
    const trin = adRatio / advRatio;
    // Interpret market condition based on TRIN value
    let condition;
    if (trin < 0.5) {
        condition = 'extremely_bullish';
    }
    else if (trin < 0.8) {
        condition = 'bullish';
    }
    else if (trin <= 1.2) {
        condition = 'neutral';
    }
    else if (trin <= 1.5) {
        condition = 'bearish';
    }
    else {
        condition = 'extremely_bearish';
    }
    // Calculate signal strength (inverse relationship - extreme TRIN = strong signal)
    const strength = Math.min(100, Math.abs(trin - 1) * 100);
    // Check overbought/oversold levels
    const overbought = trin < 0.5; // Heavy buying pressure
    const oversold = trin > 1.5; // Heavy selling pressure
    // TRIN signals (simplified - normally would compare to previous values)
    // Lower TRIN indicates more buying pressure relative to selling
    const bullishSignal = trin < 0.9;
    const bearishSignal = trin > 1.1;
    // Generate trading signal
    let signal = 'neutral';
    if (overbought) {
        signal = 'buy'; // Extreme buying pressure suggests bullish reversal potential
    }
    else if (oversold) {
        signal = 'sell'; // Extreme selling pressure suggests bearish continuation
    }
    else if (trin < 0.8) {
        signal = 'buy';
    }
    else if (trin > 1.2) {
        signal = 'sell';
    }
    // Determine market sentiment based on TRIN
    let sentiment;
    if (trin < 0.4) {
        sentiment = 'euphoria';
    }
    else if (trin < 0.7) {
        sentiment = 'optimism';
    }
    else if (trin <= 1.3) {
        sentiment = 'neutral';
    }
    else if (trin <= 1.6) {
        sentiment = 'pessimism';
    }
    else {
        sentiment = 'panic';
    }
    return {
        trin,
        adRatio,
        advRatio,
        advances,
        declines,
        advancingVolume,
        decliningVolume,
        condition,
        strength,
        overbought,
        oversold,
        bullishSignal,
        bearishSignal,
        signal,
        sentiment
    };
}
/**
 * Get Arms Index interpretation
 * @param trin ArmsIndexData object
 * @returns Human-readable interpretation
 */
export function getArmsIndexInterpretation(trin) {
    const { trin: value, condition, sentiment, signal } = trin;
    let interpretation = `TRIN: ${value.toFixed(3)} (${condition.replace('_', ' ')})`;
    interpretation += ` - ${sentiment} sentiment - ${signal.toUpperCase()} signal`;
    return interpretation;
}
/**
 * Analyze TRIN for market timing
 * @param advances Array of advancing stocks over time
 * @param declines Array of declining stocks over time
 * @param advancingVolumes Array of advancing volumes over time
 * @param decliningVolumes Array of declining volumes over time
 * @returns Market timing analysis
 */
export function analyzeTrinTiming(advances, declines, advancingVolumes, decliningVolumes) {
    if (advances.length !== declines.length ||
        advancingVolumes.length !== decliningVolumes.length ||
        advances.length < 10) {
        return {
            shortTermBias: 'neutral',
            longTermTrend: 'neutral',
            marketStress: 'moderate',
            recommendedPosition: 'Insufficient data',
            confidence: 0
        };
    }
    const recentPeriod = Math.min(5, advances.length);
    const longPeriod = Math.min(20, advances.length);
    // Calculate TRIN values for analysis
    const trinValues = [];
    for (let i = 0; i < advances.length; i++) {
        const trin = calculateArmsIndex(advances[i], declines[i], advancingVolumes[i], decliningVolumes[i]);
        trinValues.push(trin ? trin.trin : 1);
    }
    // Analyze recent TRIN values
    const recentTrin = trinValues.slice(-recentPeriod);
    const recentAvg = recentTrin.reduce((sum, val) => sum + val, 0) / recentTrin.length;
    const longTrin = trinValues.slice(-longPeriod);
    const longAvg = longTrin.reduce((sum, val) => sum + val, 0) / longTrin.length;
    // Determine short-term bias
    let shortTermBias = 'neutral';
    if (recentAvg < 0.8) {
        shortTermBias = 'bullish';
    }
    else if (recentAvg > 1.2) {
        shortTermBias = 'bearish';
    }
    // Determine long-term trend
    let longTermTrend = 'neutral';
    if (longAvg < 0.9) {
        longTermTrend = 'bullish';
    }
    else if (longAvg > 1.1) {
        longTermTrend = 'bearish';
    }
    // Assess market stress
    let marketStress = 'moderate';
    const currentTrin = trinValues[trinValues.length - 1];
    if (currentTrin < 0.3 || currentTrin > 2.0) {
        marketStress = 'extreme';
    }
    else if (currentTrin < 0.5 || currentTrin > 1.5) {
        marketStress = 'high';
    }
    else if (currentTrin < 0.7 || currentTrin > 1.3) {
        marketStress = 'moderate';
    }
    else {
        marketStress = 'low';
    }
    // Generate recommendation
    let recommendedPosition = 'Monitor TRIN levels';
    let confidence = 50;
    if (shortTermBias === 'bullish' && longTermTrend === 'bullish') {
        recommendedPosition = 'Bullish bias - consider long positions';
        confidence = 70;
    }
    else if (shortTermBias === 'bearish' && longTermTrend === 'bearish') {
        recommendedPosition = 'Bearish bias - consider short positions';
        confidence = 70;
    }
    else if (marketStress === 'extreme') {
        recommendedPosition = 'Extreme market stress - exercise caution';
        confidence = 80;
    }
    return {
        shortTermBias,
        longTermTrend,
        marketStress,
        recommendedPosition,
        confidence
    };
}
/**
 * Calculate Arms Index over multiple periods
 * @param advances Array of advancing stocks
 * @param declines Array of declining stocks
 * @param advancingVolumes Array of advancing volumes
 * @param decliningVolumes Array of declining volumes
 * @returns Array of ArmsIndexData objects
 */
export function calculateMultipleArmsIndex(advances, declines, advancingVolumes, decliningVolumes) {
    if (advances.length !== declines.length ||
        advancingVolumes.length !== decliningVolumes.length) {
        return [];
    }
    const results = [];
    for (let i = 0; i < advances.length; i++) {
        const trin = calculateArmsIndex(advances[i], declines[i], advancingVolumes[i], decliningVolumes[i]);
        if (trin) {
            results.push(trin);
        }
    }
    return results;
}
/**
 * Calculate normalized TRIN (adjusted for market conditions)
 * @param trin Raw TRIN value
 * @param marketVolatility Current market volatility measure
 * @returns Normalized TRIN value
 */
export function normalizeTrin(trin, marketVolatility) {
    // Adjust TRIN based on market volatility
    // Higher volatility tends to produce more extreme TRIN values
    const volatilityAdjustment = Math.max(0.1, 1 - marketVolatility / 100);
    return trin * volatilityAdjustment;
}
