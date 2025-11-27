/**
 * Falling Knife Detection
 * isCatchingFallingKnife function
 */
/**
 * Check if signal is catching a falling knife (dangerous counter-trend entry)
 * Returns true if all conditions are met for falling knife scenario
 */
export function isCatchingFallingKnife(_signal, indicators, trendAlignment) {
    if (!indicators || !trendAlignment) {
        return false;
    }
    // Check if all conditions for "catching falling knife" are met
    const allTimeframesDowntrend = trendAlignment?.alignmentScore === 100 &&
        trendAlignment?.dailyTrend === 'downtrend';
    const priceBelowAllEMAs = indicators.ema20 && indicators.ema50 && indicators.ema200 &&
        indicators.price && indicators.price < indicators.ema20 &&
        indicators.price < indicators.ema50 &&
        indicators.price < indicators.ema200;
    const macdBearish = indicators.macd?.histogram !== undefined && indicators.macd.histogram < -20;
    const obvVeryNegative = indicators.obv !== null && indicators.obv !== undefined &&
        (indicators.obv < -5000000 ||
            (indicators.obv < -1000000 && trendAlignment?.dailyTrend === 'downtrend'));
    return !!(allTimeframesDowntrend && priceBelowAllEMAs && macdBearish && obvVeryNegative);
}
