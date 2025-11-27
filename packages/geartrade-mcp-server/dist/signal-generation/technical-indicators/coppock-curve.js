/**
 * Coppock Curve Indicator
 * Long-term momentum indicator for identifying major market bottoms
 */
/**
 * Calculate Coppock Curve
 * @param closes Array of closing prices
 * @param roc1Period First ROC period (default 14)
 * @param roc2Period Second ROC period (default 11)
 * @param wmaPeriod WMA period (default 10)
 * @returns CoppockCurveData object
 */
export function calculateCoppockCurve(closes, roc1Period = 14, roc2Period = 11, wmaPeriod = 10) {
    const maxPeriod = Math.max(roc1Period, roc2Period) + wmaPeriod;
    if (closes.length < maxPeriod) {
        return null;
    }
    // Calculate ROC values
    const roc14 = calculateROC(closes, roc1Period);
    const roc11 = calculateROC(closes, roc2Period);
    if (!roc14 || !roc11) {
        return null;
    }
    // Sum the ROCs
    const rocSum = roc14 + roc11;
    // Apply 10-period Weighted Moving Average
    const rocSums = calculateROCsums(closes, roc1Period, roc2Period);
    const wma = calculateWMA(rocSums, wmaPeriod);
    if (!wma) {
        return null;
    }
    const coppock = wma;
    // Determine trend
    let trend = 'neutral';
    if (coppock > 0) {
        trend = 'bullish';
    }
    else if (coppock < 0) {
        trend = 'bearish';
    }
    // Calculate signal strength based on Coppock magnitude
    const strength = Math.min(100, Math.abs(coppock) * 2);
    // Check for zero line crosses
    let bullishSignal = false;
    let bearishSignal = false;
    if (closes.length >= maxPeriod + 1) {
        const prevCoppock = calculateCoppockCurve(closes.slice(0, -1), roc1Period, roc2Period, wmaPeriod);
        if (prevCoppock) {
            if (prevCoppock.coppock <= 0 && coppock > 0) {
                bullishSignal = true;
            }
            else if (prevCoppock.coppock >= 0 && coppock < 0) {
                bearishSignal = true;
            }
        }
    }
    // Check for major bottom signals (extreme negative turning up)
    let majorBottomSignal = false;
    if (coppock > -10 && coppock < 10) { // Near zero line
        // Check if recently came from extreme negative territory
        if (closes.length >= maxPeriod + 5) {
            let hadExtremeNegative = false;
            for (let i = 1; i <= 5; i++) {
                const pastCoppock = calculateCoppockCurve(closes.slice(0, -i), roc1Period, roc2Period, wmaPeriod);
                if (pastCoppock && pastCoppock.coppock < -20) {
                    hadExtremeNegative = true;
                    break;
                }
            }
            if (hadExtremeNegative && coppock > 0) {
                majorBottomSignal = true;
            }
        }
    }
    // Determine market phase based on Coppock value and trend
    let marketPhase = 'recovery';
    if (coppock > 10) {
        marketPhase = 'expansion';
    }
    else if (coppock < -10 && trend === 'bearish') {
        marketPhase = 'crisis';
    }
    else if (coppock < 0) {
        marketPhase = 'contraction';
    }
    // Generate trading signal
    let signal = 'neutral';
    if (majorBottomSignal) {
        signal = 'buy'; // Major bottom signal has highest priority
    }
    else if (bullishSignal) {
        signal = 'buy';
    }
    else if (bearishSignal) {
        signal = 'sell';
    }
    else if (marketPhase === 'expansion' && trend === 'bullish') {
        signal = 'buy';
    }
    else if (marketPhase === 'crisis' && trend === 'bearish') {
        signal = 'sell';
    }
    return {
        coppock,
        roc14,
        roc11,
        wma,
        trend,
        strength,
        bullishSignal,
        bearishSignal,
        majorBottomSignal,
        marketPhase,
        signal
    };
}
/**
 * Helper function to calculate ROC
 */
function calculateROC(closes, period) {
    if (closes.length < period + 1) {
        return null;
    }
    const currentPrice = closes[closes.length - 1];
    const pastPrice = closes[closes.length - 1 - period];
    return ((currentPrice - pastPrice) / pastPrice) * 100;
}
/**
 * Helper function to calculate ROC sums for WMA
 */
function calculateROCsums(closes, roc1Period, roc2Period) {
    const rocSums = [];
    const maxPeriod = Math.max(roc1Period, roc2Period);
    for (let i = maxPeriod; i < closes.length; i++) {
        const slice = closes.slice(0, i + 1);
        const roc1 = calculateROC(slice, roc1Period);
        const roc2 = calculateROC(slice, roc2Period);
        if (roc1 !== null && roc2 !== null) {
            rocSums.push(roc1 + roc2);
        }
    }
    return rocSums;
}
/**
 * Helper function to calculate Weighted Moving Average
 */
function calculateWMA(values, period) {
    if (values.length < period) {
        return null;
    }
    const recentValues = values.slice(-period);
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < period; i++) {
        const weight = i + 1; // Linear weighting (1, 2, 3, ..., n)
        weightedSum += recentValues[i] * weight;
        weightSum += weight;
    }
    return weightedSum / weightSum;
}
/**
 * Get Coppock Curve interpretation
 * @param coppock CoppockCurveData object
 * @returns Human-readable interpretation
 */
export function getCoppockInterpretation(coppock) {
    const { coppock: value, majorBottomSignal, marketPhase, bullishSignal, bearishSignal } = coppock;
    let interpretation = `Coppock Curve: ${value.toFixed(2)}`;
    if (majorBottomSignal) {
        interpretation += ' - MAJOR BOTTOM SIGNAL (High probability long-term buy)';
    }
    else if (bullishSignal) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishSignal) {
        interpretation += ' - Bearish zero line crossover';
    }
    else {
        interpretation += ` - ${marketPhase} phase`;
    }
    return interpretation;
}
/**
 * Analyze Coppock Curve for long-term market timing
 * @param coppock CoppockCurveData object
 * @returns Long-term market analysis
 */
export function analyzeCoppockLongTerm(coppock) {
    const { coppock: value, majorBottomSignal, marketPhase } = coppock;
    let longTermBias = 'neutral';
    let timeHorizon = 'medium';
    let confidenceLevel = 50;
    let recommendedAction = 'Monitor for signal confirmation';
    if (majorBottomSignal) {
        longTermBias = 'bullish';
        timeHorizon = 'long';
        confidenceLevel = 85;
        recommendedAction = 'Major bottom signal - consider long-term investment';
    }
    else if (value > 10) {
        longTermBias = 'bullish';
        timeHorizon = 'medium';
        confidenceLevel = 70;
        recommendedAction = 'Positive momentum - favorable for long positions';
    }
    else if (value < -10) {
        longTermBias = 'bearish';
        timeHorizon = 'medium';
        confidenceLevel = 70;
        recommendedAction = 'Negative momentum - consider defensive positions';
    }
    else if (value > 0) {
        longTermBias = 'bullish';
        timeHorizon = 'short';
        confidenceLevel = 60;
        recommendedAction = 'Moderately bullish - watch for continuation';
    }
    else {
        longTermBias = 'bearish';
        timeHorizon = 'short';
        confidenceLevel = 60;
        recommendedAction = 'Moderately bearish - consider reducing exposure';
    }
    return { longTermBias, timeHorizon, confidenceLevel, recommendedAction };
}
/**
 * Calculate Coppock Curve for different parameter sets
 * @param closes Array of closing prices
 * @param parameterSets Array of [roc1Period, roc2Period, wmaPeriod] combinations
 * @returns Array of CoppockCurveData objects
 */
export function calculateMultipleCoppock(closes, parameterSets = [[14, 11, 10], [21, 14, 10]]) {
    return parameterSets
        .map(([roc1Period, roc2Period, wmaPeriod]) => calculateCoppockCurve(closes, roc1Period, roc2Period, wmaPeriod))
        .filter((coppock) => coppock !== null);
}
