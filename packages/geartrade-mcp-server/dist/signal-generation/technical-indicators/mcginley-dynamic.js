/**
 * McGinley Dynamic Indicator
 * Adaptive moving average that adjusts to market volatility and reduces lag
 */
/**
 * Calculate McGinley Dynamic
 * @param prices Array of closing prices
 * @param period Period for calculation (default 20)
 * @returns McGinleyDynamicData object
 */
export function calculateMcGinleyDynamic(prices, period = 20) {
    if (prices.length < period) {
        return null;
    }
    // Calculate volatility factor (standard deviation of recent prices)
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const volatility = Math.sqrt(variance);
    const volatilityFactor = volatility / mean; // Coefficient of variation
    // Adaptive K factor based on volatility
    // Higher volatility = faster adaptation (lower K)
    const baseK = 0.6; // Standard K factor
    const adaptiveK = baseK + (volatilityFactor * 0.4); // Adjust K based on volatility
    const k = Math.max(0.1, Math.min(0.9, adaptiveK)); // Keep K between 0.1 and 0.9
    // Calculate McGinley Dynamic recursively
    let mcgDyn;
    if (prices.length === period) {
        // First calculation - use simple average
        mcgDyn = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    }
    else {
        // Recursive calculation
        const prevPrices = prices.slice(-period - 1, -1);
        const prevMcgDyn = calculateMcGinleyDynamic(prevPrices, period);
        if (!prevMcgDyn) {
            mcgDyn = recentPrices.reduce((sum, price) => sum + price, 0) / period;
        }
        else {
            const currentPrice = prices[prices.length - 1];
            mcgDyn = prevMcgDyn.mcgDyn + (currentPrice - prevMcgDyn.mcgDyn) / (k * period * Math.pow(currentPrice / prevMcgDyn.mcgDyn, 4));
        }
    }
    // Get current price
    const currentPrice = prices[prices.length - 1];
    // Price vs McGinley Dynamic
    const priceVsMcgDyn = ((currentPrice - mcgDyn) / mcgDyn) * 100;
    let position = 'equal';
    if (currentPrice > mcgDyn * 1.0001) {
        position = 'above';
    }
    else if (currentPrice < mcgDyn * 0.9999) {
        position = 'below';
    }
    // Determine trend
    let trend = 'neutral';
    if (position === 'above') {
        trend = 'bullish';
    }
    else if (position === 'below') {
        trend = 'bearish';
    }
    // Calculate trend strength based on deviation and volatility
    const deviationStrength = Math.abs(priceVsMcgDyn) * 2;
    const volatilityStrength = volatilityFactor * 50;
    const strength = Math.min(100, deviationStrength + volatilityStrength);
    // Calculate lag reduction effectiveness vs SMA
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    const mcgDynLag = Math.abs(currentPrice - mcgDyn);
    const smaLag = Math.abs(currentPrice - sma);
    const lagReduction = smaLag > 0 ? ((smaLag - mcgDynLag) / smaLag) * 100 : 0;
    return {
        mcgDyn,
        trend,
        priceVsMcgDyn,
        position,
        adaptationRate: k,
        volatilityFactor,
        strength,
        lagReduction
    };
}
/**
 * Calculate McGinley Dynamic for multiple periods
 * @param prices Array of closing prices
 * @param periods Array of periods to calculate
 * @returns Array of McGinleyDynamicData objects
 */
export function calculateMultipleMcGinleyDynamic(prices, periods = [10, 20, 30]) {
    return periods
        .map(period => calculateMcGinleyDynamic(prices, period))
        .filter((mcg) => mcg !== null);
}
/**
 * Get McGinley Dynamic crossover signal
 * @param fastMcg Fast period McGinley Dynamic
 * @param slowMcg Slow period McGinley Dynamic
 * @returns Crossover signal
 */
export function getMcGinleyDynamicCrossoverSignal(fastMcg, slowMcg) {
    const fastAboveSlow = fastMcg.mcgDyn > slowMcg.mcgDyn;
    if (fastAboveSlow && fastMcg.position === 'above' && slowMcg.position === 'above') {
        return 'bullish_crossover';
    }
    else if (!fastAboveSlow && fastMcg.position === 'below' && slowMcg.position === 'below') {
        return 'bearish_crossover';
    }
    return 'neutral';
}
/**
 * Calculate McGinley Dynamic slope
 * @param mcg McGinleyDynamicData object
 * @param prices Array of prices for slope calculation
 * @param slopePeriod Period to calculate slope over
 * @returns Slope value
 */
export function calculateMcGinleyDynamicSlope(mcg, prices, slopePeriod = 5) {
    if (prices.length < slopePeriod) {
        return 0;
    }
    // Calculate slope using linear regression over recent McGinley values
    const recentPrices = prices.slice(-slopePeriod);
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < slopePeriod; i++) {
        const mcgValue = calculateMcGinleyDynamic(recentPrices.slice(0, i + 1), 20)?.mcgDyn || recentPrices[i];
        sumX += i;
        sumY += mcgValue;
        sumXY += i * mcgValue;
        sumXX += i * i;
    }
    const n = slopePeriod;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}
