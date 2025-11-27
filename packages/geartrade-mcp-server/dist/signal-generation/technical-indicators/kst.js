/**
 * Know Sure Thing (KST) Indicator
 * Multi-timeframe momentum oscillator combining weighted ROC calculations
 */
/**
 * Calculate Know Sure Thing (KST)
 * @param prices Array of closing prices
 * @returns KSTData object
 */
export function calculateKST(prices) {
    // KST formula: ROC1×1 + ROC2×2 + ROC3×3 + ROC4×4
    // Where:
    // ROC1 = 10-period SMA of 10-period ROC
    // ROC2 = 10-period SMA of 15-period ROC
    // ROC3 = 10-period SMA of 20-period ROC
    // ROC4 = 15-period SMA of 30-period ROC
    if (prices.length < 45) { // Need at least 30 + 15 periods for calculations
        return null;
    }
    // Calculate individual ROC components
    const roc1 = calculateSmoothedROC(prices, 10, 10); // 10-period ROC, 10-period SMA
    const roc2 = calculateSmoothedROC(prices, 15, 10); // 15-period ROC, 10-period SMA
    const roc3 = calculateSmoothedROC(prices, 20, 10); // 20-period ROC, 10-period SMA
    const roc4 = calculateSmoothedROC(prices, 30, 15); // 30-period ROC, 15-period SMA
    if (roc1 === null || roc2 === null || roc3 === null || roc4 === null) {
        return null;
    }
    // Calculate KST: ROC1×1 + ROC2×2 + ROC3×3 + ROC4×4
    const kst = roc1 * 1 + roc2 * 2 + roc3 * 3 + roc4 * 4;
    // Calculate signal line (9-period SMA of KST)
    const kstHistory = calculateKSTHistory(prices);
    const signal = calculateSMA(kstHistory, 9);
    // Determine trend
    let trend = 'neutral';
    if (kst > 0) {
        trend = 'bullish';
    }
    else if (kst < 0) {
        trend = 'bearish';
    }
    // Calculate signal strength based on KST magnitude and trend consistency
    const magnitudeStrength = Math.min(50, Math.abs(kst) / 2);
    const trendStrength = kstHistory.length >= 5 ?
        checkTrendConsistency(kstHistory.slice(-5)) : 0;
    const strength = Math.min(100, magnitudeStrength + trendStrength);
    // Check for crossovers
    let bullishCrossover = false;
    let bearishCrossover = false;
    if (kstHistory.length >= 10) {
        const prevKST = kstHistory[kstHistory.length - 2];
        const prevSignal = calculateSMA(kstHistory.slice(0, -1), 9);
        if (prevKST <= prevSignal && kst > signal) {
            bullishCrossover = true;
        }
        else if (prevKST >= prevSignal && kst < signal) {
            bearishCrossover = true;
        }
    }
    // Check overbought/oversold levels
    const overbought = kst > 20;
    const oversold = kst < -20;
    // Simple divergence detection
    let divergence = 'none';
    if (prices.length >= 60 && kstHistory.length >= 30) {
        const recentPrices = prices.slice(-30);
        const prevPrices = prices.slice(-60, -30);
        const recentKST = kstHistory.slice(-30);
        const prevKST = calculateKSTHistory(prices.slice(-60, -30));
        const recentPricePeak = Math.max(...recentPrices);
        const prevPricePeak = Math.max(...prevPrices);
        const recentKSTPeak = Math.max(...recentKST);
        const prevKSTPeak = Math.max(...prevKST);
        // Bullish divergence: lower price peak but higher KST peak
        if (recentPricePeak < prevPricePeak && recentKSTPeak > prevKSTPeak) {
            divergence = 'bullish';
        }
        const recentPriceLow = Math.min(...recentPrices);
        const prevPriceLow = Math.min(...prevPrices);
        const recentKSTLow = Math.min(...recentKST);
        const prevKSTLow = Math.min(...prevKST);
        // Bearish divergence: higher price low but lower KST low
        if (recentPriceLow > prevPriceLow && recentKSTLow < prevKSTLow) {
            divergence = 'bearish';
        }
    }
    return {
        kst,
        signal: signal || kst, // Fallback if signal calculation fails
        roc1,
        roc2,
        roc3,
        roc4,
        trend,
        strength,
        bullishCrossover,
        bearishCrossover,
        overbought,
        oversold,
        divergence
    };
}
/**
 * Helper function to calculate smoothed ROC
 */
function calculateSmoothedROC(prices, rocPeriod, smoothingPeriod) {
    if (prices.length < rocPeriod + smoothingPeriod) {
        return null;
    }
    // Calculate ROC values
    const rocValues = [];
    for (let i = rocPeriod; i < prices.length; i++) {
        const currentPrice = prices[i];
        const pastPrice = prices[i - rocPeriod];
        const roc = ((currentPrice - pastPrice) / pastPrice) * 100;
        rocValues.push(roc);
    }
    // Apply smoothing (SMA)
    return calculateSMA(rocValues, smoothingPeriod);
}
/**
 * Helper function to calculate SMA
 */
function calculateSMA(values, period) {
    if (values.length < period) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    const sum = values.slice(-period).reduce((acc, val) => acc + val, 0);
    return sum / period;
}
/**
 * Helper function to calculate KST history for signal line
 */
function calculateKSTHistory(prices) {
    const kstValues = [];
    // Start from where we have enough data (45 periods minimum)
    for (let i = 45; i <= prices.length; i++) {
        const slice = prices.slice(0, i);
        const kst = calculateKST(slice);
        if (kst) {
            kstValues.push(kst.kst);
        }
    }
    return kstValues;
}
/**
 * Helper function to check trend consistency
 */
function checkTrendConsistency(kstValues) {
    if (kstValues.length < 2)
        return 0;
    let consistencyCount = 0;
    for (let i = 1; i < kstValues.length; i++) {
        if ((kstValues[i] > 0 && kstValues[i - 1] > 0) ||
            (kstValues[i] < 0 && kstValues[i - 1] < 0)) {
            consistencyCount++;
        }
    }
    return (consistencyCount / (kstValues.length - 1)) * 50; // Max 50 points for consistency
}
/**
 * Get KST trading signal
 * @param kst KSTData object
 * @returns Trading signal
 */
export function getKSTSignal(kst) {
    const { bullishCrossover, bearishCrossover, overbought, oversold, divergence, trend } = kst;
    // Strong crossover signals
    if (bullishCrossover)
        return 'buy';
    if (bearishCrossover)
        return 'sell';
    // Divergence signals
    if (divergence === 'bullish')
        return 'buy';
    if (divergence === 'bearish')
        return 'sell';
    // Extreme level signals
    if (oversold && trend === 'bullish')
        return 'buy';
    if (overbought && trend === 'bearish')
        return 'sell';
    // Trend continuation (weaker signals)
    if (trend === 'bullish' && !overbought)
        return 'buy';
    if (trend === 'bearish' && !oversold)
        return 'sell';
    return 'neutral';
}
/**
 * Get KST interpretation
 * @param kst KSTData object
 * @returns Human-readable interpretation
 */
export function getKSTInterpretation(kst) {
    const { kst: value, overbought, oversold, bullishCrossover, bearishCrossover } = kst;
    if (bullishCrossover)
        return 'Bullish crossover - potential buy signal';
    if (bearishCrossover)
        return 'Bearish crossover - potential sell signal';
    if (overbought)
        return 'Overbought - potential reversal down';
    if (oversold)
        return 'Oversold - potential reversal up';
    if (value > 10)
        return 'Strong bullish momentum';
    if (value < -10)
        return 'Strong bearish momentum';
    if (value > 0)
        return 'Bullish momentum';
    if (value < 0)
        return 'Bearish momentum';
    return 'Neutral momentum';
}
