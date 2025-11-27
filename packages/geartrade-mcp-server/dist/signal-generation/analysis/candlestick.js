/**
 * Candlestick Pattern Detection
 * detectCandlestickPatterns function
 */
export function detectCandlestickPatterns(historicalData, lookbackPeriod = 5) {
    if (!historicalData || historicalData.length < lookbackPeriod) {
        return {
            patterns: []
        };
    }
    const patterns = [];
    const recentCandles = historicalData.slice(-lookbackPeriod);
    for (let i = 1; i < recentCandles.length; i++) {
        const current = recentCandles[i];
        const previous = recentCandles[i - 1];
        const bodySize = Math.abs(current.close - current.open);
        const upperShadow = current.high - Math.max(current.open, current.close);
        const lowerShadow = Math.min(current.open, current.close) - current.low;
        const totalRange = current.high - current.low;
        // Doji: Small body, long shadows
        if (bodySize < totalRange * 0.1 && (upperShadow > totalRange * 0.3 || lowerShadow > totalRange * 0.3)) {
            patterns.push({
                type: 'doji',
                index: i,
                bullish: current.close > current.open
            });
        }
        // Hammer: Small body at top, long lower shadow
        if (bodySize < totalRange * 0.3 && lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
            patterns.push({
                type: 'hammer',
                index: i,
                bullish: true
            });
        }
        // Engulfing: Current candle engulfs previous
        if (i > 0) {
            const prevBodySize = Math.abs(previous.close - previous.open);
            const currentBodySize = Math.abs(current.close - current.open);
            // Bullish engulfing
            if (previous.close < previous.open && current.close > current.open &&
                current.open < previous.close && current.close > previous.open &&
                currentBodySize > prevBodySize * 1.1) {
                patterns.push({
                    type: 'bullish_engulfing',
                    index: i,
                    bullish: true
                });
            }
            // Bearish engulfing
            if (previous.close > previous.open && current.close < current.open &&
                current.open > previous.close && current.close < previous.open &&
                currentBodySize > prevBodySize * 1.1) {
                patterns.push({
                    type: 'bearish_engulfing',
                    index: i,
                    bullish: false
                });
            }
        }
    }
    return {
        patterns: patterns
    };
}
