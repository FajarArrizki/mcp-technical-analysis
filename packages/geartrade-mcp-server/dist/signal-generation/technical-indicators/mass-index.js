/**
 * Mass Index Indicator
 * Uses EMA of High-Low range to identify potential reversals
 */
/**
 * Calculate Mass Index
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param emaPeriod EMA period for range calculation (default 9)
 * @param sumPeriod Period for summing EMA ratios (default 25)
 * @returns MassIndexData object
 */
export function calculateMassIndex(highs, lows, emaPeriod = 9, sumPeriod = 25) {
    // Minimum 3 data points required
    if (highs.length !== lows.length || highs.length < 3) {
        return null;
    }
    // Use adaptive periods
    const dataRatio = Math.min(1, highs.length / (emaPeriod * 2 + sumPeriod));
    const effectiveEmaPeriod = Math.max(2, Math.floor(emaPeriod * dataRatio));
    const effectiveSumPeriod = Math.max(3, Math.floor(sumPeriod * dataRatio));
    // Calculate High-Low ranges
    const ranges = [];
    for (let i = 0; i < highs.length; i++) {
        ranges.push(highs[i] - lows[i]);
    }
    // Calculate single EMA of ranges
    const singleEMA = calculateEMA(ranges, effectiveEmaPeriod);
    // Calculate double EMA of ranges (EMA of single EMA)
    const doubleEMA = calculateEMA(singleEMA, effectiveEmaPeriod);
    if (singleEMA.length < 1 || doubleEMA.length < 1) {
        // Fallback: calculate simple mass index
        const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
        return {
            massIndex: 25, // Neutral value
            singleEMA: avgRange,
            doubleEMA: avgRange,
            currentRange: ranges[ranges.length - 1],
            emaRatio: 1,
            reversalSignal: false,
            overbought: false,
            trend: 'stable',
            strength: 0,
            signal: 'neutral',
            reversalProbability: 'low'
        };
    }
    // Calculate EMA ratio and sum over effectiveSumPeriod
    let massIndex = 0;
    let emaRatioSum = 0;
    const useSumPeriod = Math.min(effectiveSumPeriod, Math.min(singleEMA.length, doubleEMA.length));
    for (let i = 0; i < useSumPeriod; i++) {
        const sIdx = singleEMA.length - 1 - i;
        const dIdx = doubleEMA.length - 1 - i;
        if (sIdx >= 0 && dIdx >= 0) {
            const ratio = doubleEMA[dIdx] > 0 ? singleEMA[sIdx] / doubleEMA[dIdx] : 1;
            emaRatioSum += ratio;
        }
    }
    massIndex = emaRatioSum;
    // Get current values
    const currentRange = ranges[ranges.length - 1];
    const currentSingleEMA = singleEMA[singleEMA.length - 1];
    const currentDoubleEMA = doubleEMA[doubleEMA.length - 1];
    const emaRatio = currentDoubleEMA > 0 ? currentSingleEMA / currentDoubleEMA : 1;
    // Check for reversal signal (Mass Index > 27)
    const reversalSignal = massIndex > 27;
    // Overbought level
    const overbought = massIndex > 27;
    // Determine trend
    let trend = 'stable';
    if (massIndex > 26.5) {
        trend = 'rising';
    }
    else if (massIndex < 26.0) {
        trend = 'falling';
    }
    // Calculate signal strength based on distance from reversal level
    const distanceFromReversal = Math.abs(massIndex - 27);
    const strength = overbought ? Math.min(100, (massIndex - 27) * 10) : Math.max(0, 100 - distanceFromReversal * 10);
    // Generate trading signal
    let signal = 'neutral';
    if (reversalSignal) {
        // Mass Index > 27 often precedes reversals
        signal = 'sell'; // Potential reversal signal
    }
    // Determine reversal probability
    let reversalProbability = 'low';
    if (massIndex > 27) {
        reversalProbability = 'high';
    }
    else if (massIndex > 26.5) {
        reversalProbability = 'moderate';
    }
    return {
        massIndex,
        singleEMA: currentSingleEMA,
        doubleEMA: currentDoubleEMA,
        currentRange,
        emaRatio,
        reversalSignal,
        overbought,
        trend,
        strength,
        signal,
        reversalProbability
    };
}
/**
 * Helper function to calculate EMA
 */
function calculateEMA(values, period) {
    if (values.length < period) {
        return values;
    }
    const ema = [];
    const multiplier = 2 / (period + 1);
    // First EMA value is the simple average
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += values[i];
    }
    ema.push(sum / period);
    // Calculate subsequent EMA values
    for (let i = period; i < values.length; i++) {
        const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
    }
    return ema;
}
/**
 * Get Mass Index interpretation
 * @param mass MassIndexData object
 * @returns Human-readable interpretation
 */
export function getMassIndexInterpretation(mass) {
    const { massIndex, reversalSignal, reversalProbability, trend } = mass;
    let interpretation = `Mass Index: ${massIndex.toFixed(2)}`;
    if (reversalSignal) {
        interpretation += ' - Reversal signal triggered';
    }
    else {
        interpretation += ` - ${trend} trend`;
    }
    interpretation += ` (${reversalProbability} reversal probability)`;
    return interpretation;
}
/**
 * Calculate Mass Index reversal zones
 * @param mass MassIndexData object
 * @returns Reversal zone analysis
 */
export function calculateMassIndexReversalZones(mass) {
    const { massIndex, reversalSignal } = mass;
    let inReversalZone = false;
    let zoneType = 'neutral';
    let timeToReversal = 0;
    let recommendation = 'Monitor Mass Index levels';
    if (massIndex > 27) {
        inReversalZone = true;
        zoneType = 'bearish_setup'; // High Mass Index often precedes downward reversals
        timeToReversal = Math.max(0, massIndex - 27) * 2; // Rough estimate
        recommendation = 'Bearish reversal likely - consider reducing long positions';
    }
    else if (massIndex > 26.5) {
        inReversalZone = true;
        zoneType = 'bearish_setup';
        timeToReversal = (27 - massIndex) * 4; // Rough estimate
        recommendation = 'Approaching reversal zone - exercise caution';
    }
    else if (massIndex < 25) {
        zoneType = 'bullish_setup'; // Low Mass Index may precede upward moves
        recommendation = 'Potential bullish setup developing';
    }
    return { inReversalZone, zoneType, timeToReversal, recommendation };
}
/**
 * Analyze Mass Index trend consistency
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param periods Number of periods to analyze
 * @returns Trend consistency analysis
 */
export function analyzeMassIndexTrend(highs, lows, periods = 30) {
    // Adaptive minimum - need at least 5 data points
    if (highs.length < 5) {
        return { dominantTrend: 'neutral', reversalSignals: 0, averageMassIndex: 0, trendStrength: 0 };
    }
    const massData = [];
    const startIdx = Math.max(5, Math.min(50, highs.length - 1));
    // Calculate Mass Index for multiple periods
    for (let i = startIdx; i <= highs.length; i++) {
        const sliceHighs = highs.slice(0, i);
        const sliceLows = lows.slice(0, i);
        const mass = calculateMassIndex(sliceHighs, sliceLows);
        if (mass) {
            massData.push(mass);
        }
    }
    if (massData.length === 0) {
        return { dominantTrend: 'neutral', reversalSignals: 0, averageMassIndex: 0, trendStrength: 0 };
    }
    // Analyze trend
    const reversalSignals = massData.filter(m => m.reversalSignal).length;
    const averageMassIndex = massData.reduce((sum, m) => sum + m.massIndex, 0) / massData.length;
    let dominantTrend = 'neutral';
    if (reversalSignals > massData.length * 0.3) {
        dominantTrend = 'reversal_due';
    }
    else if (averageMassIndex > 26) {
        dominantTrend = 'continuation'; // High but not extreme levels suggest continuation
    }
    const trendStrength = Math.min(100, reversalSignals / massData.length * 100 + (averageMassIndex - 26) * 5);
    return { dominantTrend, reversalSignals, averageMassIndex, trendStrength };
}
