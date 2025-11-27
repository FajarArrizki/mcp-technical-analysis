/**
 * Fractals Indicator (Bill Williams)
 * 5-bar patterns that identify potential reversal points
 */
export function calculateFractals(highs, lows, currentPrice = null) {
    if (highs.length < 5 || lows.length < 5) {
        return {
            bullishFractals: [],
            bearishFractals: [],
            currentBullishFractal: null,
            currentBearishFractal: null,
            signal: null,
        };
    }
    const bullishFractals = [];
    const bearishFractals = [];
    // Need at least 5 bars to check fractal pattern
    // Check each bar from index 2 to length-3 (to have 2 bars before and after)
    for (let i = 2; i < highs.length - 2; i++) {
        // Bullish Fractal: High[2] > High[1] AND High[2] > High[3] AND High[2] > High[4] AND High[2] > High[5]
        // (Note: array is 0-indexed, so High[2] is the center bar)
        const isBullishFractal = highs[i] > highs[i - 2] &&
            highs[i] > highs[i - 1] &&
            highs[i] > highs[i + 1] &&
            highs[i] > highs[i + 2];
        // Bearish Fractal: Low[2] < Low[1] AND Low[2] < Low[3] AND Low[2] < Low[4] AND Low[2] < Low[5]
        const isBearishFractal = lows[i] < lows[i - 2] &&
            lows[i] < lows[i - 1] &&
            lows[i] < lows[i + 1] &&
            lows[i] < lows[i + 2];
        if (isBullishFractal) {
            bullishFractals.push({ index: i, value: highs[i] });
        }
        if (isBearishFractal) {
            bearishFractals.push({ index: i, value: lows[i] });
        }
    }
    // Get most recent fractals
    const currentBullishFractal = bullishFractals.length > 0 ? bullishFractals[bullishFractals.length - 1].value : null;
    const currentBearishFractal = bearishFractals.length > 0 ? bearishFractals[bearishFractals.length - 1].value : null;
    // Determine signal based on current price position relative to recent fractals
    let signal = null;
    if (currentPrice && currentBullishFractal && currentBearishFractal) {
        // If price breaks above recent bullish fractal, potential bullish continuation
        if (currentPrice > currentBullishFractal) {
            signal = 'bullish_reversal';
        }
        // If price breaks below recent bearish fractal, potential bearish continuation
        else if (currentPrice < currentBearishFractal) {
            signal = 'bearish_reversal';
        }
        else {
            signal = 'neutral';
        }
    }
    return {
        bullishFractals,
        bearishFractals,
        currentBullishFractal,
        currentBearishFractal,
        signal,
    };
}
