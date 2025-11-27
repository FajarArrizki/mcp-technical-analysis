/**
 * Trading Style Determination
 * determineTradingStyle function
 */
/**
 * Determine trading style (Long Term vs Short Term)
 */
export function determineTradingStyle(signal, indicators, trendAlignment, marketRegime) {
    if (!trendAlignment && !indicators)
        return 'Short Term'; // Default to short term if no data
    const signalType = signal.signal || signal;
    const isLongTerm = 
    // Daily trend aligned
    (trendAlignment &&
        (trendAlignment.dailyTrend || trendAlignment.trend) &&
        ((signalType === 'buy_to_enter' && (trendAlignment.dailyTrend || trendAlignment.trend) === 'uptrend') ||
            (signalType === 'sell_to_enter' && (trendAlignment.dailyTrend || trendAlignment.trend) === 'downtrend'))) &&
        // Multi-timeframe alignment
        (trendAlignment &&
            ((trendAlignment.h4Aligned && trendAlignment.h1Aligned) ||
                (trendAlignment.alignmentScore && trendAlignment.alignmentScore >= 75))) &&
        // Strong trend strength (ADX > 25)
        (indicators &&
            ((typeof indicators.adx === 'number' && indicators.adx > 25) ||
                (indicators.adx && typeof indicators.adx === 'object' && indicators.adx.adx > 25))) &&
        // Market regime is trending (not choppy)
        (marketRegime && marketRegime.regime === 'trending');
    return isLongTerm ? 'Long Term' : 'Short Term';
}
