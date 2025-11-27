/**
 * Fisher Transform Indicator
 * Normalizes price data using Gaussian distribution for sharp reversal signals
 */
/**
 * Calculate Fisher Transform
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param period Period for highest/lowest calculation (default 10)
 * @param triggerPeriod Period for trigger line EMA (default 5)
 * @returns FisherTransformData object
 */
export function calculateFisherTransform(highs, lows, period = 10, triggerPeriod = 5) {
    if (highs.length < period || lows.length < period) {
        return null;
    }
    // Calculate the median price (typical price)
    const medianPrices = highs.map((high, i) => (high + lows[i]) / 2);
    // Find highest high and lowest low over the period
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    // Calculate the current median price
    const currentMedian = medianPrices[medianPrices.length - 1];
    // Calculate X value: 2 * ((Price - LowestLow) / (HighestHigh - LowestLow)) - 1
    const range = highestHigh - lowestLow;
    let x;
    if (range === 0) {
        x = 0; // Avoid division by zero
    }
    else {
        x = 2 * ((currentMedian - lowestLow) / range) - 1;
    }
    // Bound X between -0.999 and 0.999 to avoid log(0) or log(infinity)
    x = Math.max(-0.999, Math.min(0.999, x));
    // Calculate Fisher Transform: 0.5 * ln((1+X)/(1-X))
    const fisher = 0.5 * Math.log((1 + x) / (1 - x));
    // Calculate trigger line (EMA of Fisher)
    const fisherHistory = calculateFisherHistory(highs, lows, period);
    const trigger = calculateEMA(fisherHistory, triggerPeriod);
    // Determine trend
    let trend = 'neutral';
    if (fisher > 0.5) {
        trend = 'bullish';
    }
    else if (fisher < -0.5) {
        trend = 'bearish';
    }
    // Calculate signal strength based on Fisher magnitude
    const strength = Math.min(100, Math.abs(fisher) * 20);
    // Check overbought/oversold levels
    const overbought = fisher > 4.0;
    const oversold = fisher < -4.0;
    // Check for crossovers
    let bullishCrossover = false;
    let bearishCrossover = false;
    if (fisherHistory.length >= 2) {
        const prevFisher = fisherHistory[fisherHistory.length - 2];
        const prevTrigger = calculateEMA(fisherHistory.slice(0, -1), triggerPeriod);
        if (prevFisher <= prevTrigger && fisher > trigger) {
            bullishCrossover = true;
        }
        else if (prevFisher >= prevTrigger && fisher < trigger) {
            bearishCrossover = true;
        }
    }
    // Check for reversals from extreme levels
    const bullishReversal = oversold && (bullishCrossover || trend === 'bullish');
    const bearishReversal = overbought && (bearishCrossover || trend === 'bearish');
    // Simple divergence detection (requires price and fisher history)
    let divergence = 'none';
    if (highs.length >= period * 2 && fisherHistory.length >= period) {
        const recentPrices = highs.slice(-period);
        const prevPrices = highs.slice(-period * 2, -period);
        const recentFishers = fisherHistory.slice(-period);
        const prevFishers = calculateFisherHistory(highs.slice(-period * 2, -period), lows.slice(-period * 2, -period), period);
        const recentPricePeak = Math.max(...recentPrices);
        const prevPricePeak = Math.max(...prevPrices);
        const recentFisherPeak = Math.max(...recentFishers);
        const prevFisherPeak = Math.max(...prevFishers);
        // Bullish divergence: lower price high but higher Fisher high
        if (recentPricePeak < prevPricePeak && recentFisherPeak > prevFisherPeak) {
            divergence = 'bullish';
        }
        const recentPriceLow = Math.min(...recentPrices);
        const prevPriceLow = Math.min(...prevPrices);
        const recentFisherLow = Math.min(...recentFishers);
        const prevFisherLow = Math.min(...prevFishers);
        // Bearish divergence: higher price low but lower Fisher low
        if (recentPriceLow > prevPriceLow && recentFisherLow < prevFisherLow) {
            divergence = 'bearish';
        }
    }
    return {
        fisher,
        trigger: trigger || fisher, // Fallback to fisher if trigger calculation fails
        trend,
        strength,
        overbought,
        oversold,
        bullishCrossover,
        bearishCrossover,
        bullishReversal,
        bearishReversal,
        divergence
    };
}
/**
 * Helper function to calculate Fisher history for trigger line
 */
function calculateFisherHistory(highs, lows, period) {
    const fisherValues = [];
    for (let i = period; i <= highs.length; i++) {
        const sliceHighs = highs.slice(i - period, i);
        const sliceLows = lows.slice(i - period, i);
        const highestHigh = Math.max(...sliceHighs);
        const lowestLow = Math.min(...sliceLows);
        const currentMedian = (sliceHighs[sliceHighs.length - 1] + sliceLows[sliceLows.length - 1]) / 2;
        const range = highestHigh - lowestLow;
        let x;
        if (range === 0) {
            x = 0;
        }
        else {
            x = 2 * ((currentMedian - lowestLow) / range) - 1;
        }
        x = Math.max(-0.999, Math.min(0.999, x));
        const fisher = 0.5 * Math.log((1 + x) / (1 - x));
        fisherValues.push(fisher);
    }
    return fisherValues;
}
/**
 * Helper function to calculate EMA
 */
function calculateEMA(values, period) {
    if (values.length < period)
        return values[values.length - 1] || 0;
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
        ema = (values[i] - ema) * multiplier + ema;
    }
    return ema;
}
/**
 * Get Fisher Transform trading signal
 * @param fisher FisherTransformData object
 * @returns Trading signal
 */
export function getFisherTransformSignal(fisher) {
    const { bullishReversal, bearishReversal, bullishCrossover, bearishCrossover, overbought, oversold, divergence } = fisher;
    // Strong reversal signals from extreme levels
    if (bullishReversal)
        return 'buy';
    if (bearishReversal)
        return 'sell';
    // Crossover signals
    if (bullishCrossover)
        return 'buy';
    if (bearishCrossover)
        return 'sell';
    // Divergence signals
    if (divergence === 'bullish')
        return 'buy';
    if (divergence === 'bearish')
        return 'sell';
    // Extreme level signals (weaker)
    if (oversold)
        return 'buy';
    if (overbought)
        return 'sell';
    return 'neutral';
}
/**
 * Get Fisher Transform level description
 * @param fisher FisherTransformData object
 * @returns Human-readable level description
 */
export function getFisherLevelDescription(fisher) {
    const { fisher: value, overbought, oversold } = fisher;
    if (overbought)
        return 'Extreme Overbought (>4.0)';
    if (oversold)
        return 'Extreme Oversold (<-4.0)';
    if (value > 3.0)
        return 'Very Overbought (>3.0)';
    if (value < -3.0)
        return 'Very Oversold (<-3.0)';
    if (value > 1.5)
        return 'Overbought (>1.5)';
    if (value < -1.5)
        return 'Oversold (<-1.5)';
    if (value > 0.5)
        return 'Bullish (>0.5)';
    if (value < -0.5)
        return 'Bearish (<-0.5)';
    return 'Neutral (-0.5 to 0.5)';
}
