/**
 * Accelerator Oscillator (AC) Indicator
 * Part of Bill Williams' trading system - measures acceleration/deceleration
 */
/**
 * Calculate Accelerator Oscillator
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @returns AcceleratorOscillatorData object
 */
export function calculateAcceleratorOscillator(highs, lows, closes) {
    if (highs.length !== lows.length || highs.length !== closes.length || highs.length < 10) {
        return null;
    }
    // Step 1: Calculate Awesome Oscillator (AO) with adaptive periods
    const ao = calculateAwesomeOscillatorAdaptive(highs, lows);
    if (!ao || ao.length < 3) {
        return null;
    }
    // Step 2: Calculate 5-period SMA of AO
    const aoSMA5 = calculateSMA(ao.slice(-5), 5);
    // Step 3: AC = AO - SMA(AO, 5)
    const ac = ao[ao.length - 1] - aoSMA5;
    // Determine trend based on AC value
    let trend = 'neutral';
    if (ac > 0) {
        trend = 'bullish';
    }
    else if (ac < 0) {
        trend = 'bearish';
    }
    // Calculate signal strength
    const strength = Math.min(100, Math.abs(ac) * 1000);
    // Check zero line crosses
    let bullishZeroCross = false;
    let bearishZeroCross = false;
    if (ao.length >= 7) {
        // Calculate previous SMA for comparison
        const prevAOSlice = ao.slice(-6, -1); // Last 5 AO values before current
        const prevSMA5 = calculateSMA(prevAOSlice, 5);
        const prevAO = ao[ao.length - 2];
        const prevAC = prevAO - prevSMA5;
        if (prevAC <= 0 && ac > 0) {
            bullishZeroCross = true;
        }
        else if (prevAC >= 0 && ac < 0) {
            bearishZeroCross = true;
        }
    }
    // Determine histogram color (simplified)
    let histogramColor = 'gray';
    if (ac > 0) {
        histogramColor = 'green';
    }
    else if (ac < 0) {
        histogramColor = 'red';
    }
    // Analyze acceleration
    let acceleration = 'neutral';
    if (ao.length >= 3) {
        const recentAO = ao.slice(-3);
        const aoChange1 = recentAO[1] - recentAO[0];
        const aoChange2 = recentAO[2] - recentAO[1];
        if (aoChange2 > aoChange1 && aoChange2 > 0) {
            acceleration = 'accelerating';
        }
        else if (aoChange2 < aoChange1 && aoChange2 < 0) {
            acceleration = 'decelerating';
        }
    }
    // Check for potential reversals (3 consecutive same-color histograms after extreme move)
    let potentialReversal = false;
    if (ao.length >= 8) {
        const recentAC = ao.slice(-8).map((aoVal, idx) => {
            const aoIndex = ao.length - 8 + idx;
            const aoSlice = ao.slice(Math.max(0, aoIndex - 4), aoIndex + 1);
            const smaValue = calculateSMA(aoSlice, Math.min(5, aoSlice.length));
            return aoVal - smaValue;
        });
        // Check for 3+ consecutive green after red extreme
        let consecutiveGreen = 0;
        let hadExtremeRed = false;
        for (let i = recentAC.length - 1; i >= 0; i--) {
            if (recentAC[i] < -0.01) { // Extreme red
                hadExtremeRed = true;
                break;
            }
            else if (recentAC[i] > 0) {
                consecutiveGreen++;
            }
            else {
                break;
            }
        }
        if (hadExtremeRed && consecutiveGreen >= 3) {
            potentialReversal = true;
        }
        // Check for 3+ consecutive red after green extreme
        let consecutiveRed = 0;
        let hadExtremeGreen = false;
        for (let i = recentAC.length - 1; i >= 0; i--) {
            if (recentAC[i] > 0.01) { // Extreme green
                hadExtremeGreen = true;
                break;
            }
            else if (recentAC[i] < 0) {
                consecutiveRed++;
            }
            else {
                break;
            }
        }
        if (hadExtremeGreen && consecutiveRed >= 3) {
            potentialReversal = true;
        }
    }
    // Generate trading signal
    let signal = 'neutral';
    if (bullishZeroCross) {
        signal = 'buy';
    }
    else if (bearishZeroCross) {
        signal = 'sell';
    }
    else if (potentialReversal) {
        // Reversal signals depend on current trend
        signal = trend === 'bullish' ? 'sell' : 'buy';
    }
    else if (acceleration === 'accelerating' && trend === 'bullish') {
        signal = 'buy';
    }
    else if (acceleration === 'decelerating' && trend === 'bearish') {
        signal = 'sell';
    }
    return {
        ac,
        trend,
        strength,
        bullishZeroCross,
        bearishZeroCross,
        histogramColor,
        acceleration,
        potentialReversal,
        signal
    };
}
/**
 * Helper function to calculate Awesome Oscillator with adaptive periods
 */
function calculateAwesomeOscillatorAdaptive(highs, lows) {
    const ao = [];
    // Adaptive slow period based on available data
    const slowPeriod = Math.min(34, Math.floor(highs.length * 0.7));
    const fastPeriod = Math.min(5, Math.floor(slowPeriod / 6));
    for (let i = 0; i < highs.length; i++) {
        // Need at least slowPeriod for AO calculation
        if (i >= slowPeriod - 1) {
            // Fast SMA of median
            const fastLen = Math.min(fastPeriod, i + 1);
            const smaFast = calculateSMA(Array.from({ length: fastLen }, (_, idx) => (highs[i - idx] + lows[i - idx]) / 2), fastLen);
            // Slow SMA of median
            const slowLen = Math.min(slowPeriod, i + 1);
            const smaSlow = calculateSMA(Array.from({ length: slowLen }, (_, idx) => (highs[i - idx] + lows[i - idx]) / 2), slowLen);
            ao.push(smaFast - smaSlow);
        }
    }
    return ao;
}
/**
 * Helper function to calculate SMA
 */
function calculateSMA(values, period) {
    if (values.length < period) {
        return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / period;
}
/**
 * Get Accelerator Oscillator interpretation
 * @param ac AcceleratorOscillatorData object
 * @returns Human-readable interpretation
 */
export function getACInterpretation(ac) {
    const { ac: value, bullishZeroCross, bearishZeroCross, histogramColor, acceleration, potentialReversal } = ac;
    let interpretation = `AC: ${value.toFixed(6)}`;
    if (bullishZeroCross) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishZeroCross) {
        interpretation += ' - Bearish zero line crossover';
    }
    else if (potentialReversal) {
        interpretation += ' - Potential reversal signal';
    }
    else {
        interpretation += ` - ${histogramColor} histogram, ${acceleration}`;
    }
    return interpretation;
}
/**
 * Analyze AC trend and momentum
 * @param ac AcceleratorOscillatorData object
 * @returns Trend analysis
 */
export function analyzeACTrend(ac) {
    const { strength, acceleration, potentialReversal, trend } = ac;
    let trendStrength = strength;
    let momentumDirection = 'sideways';
    if (acceleration === 'accelerating') {
        momentumDirection = 'increasing';
        trendStrength += 20;
    }
    else if (acceleration === 'decelerating') {
        momentumDirection = 'decreasing';
        trendStrength -= 20;
    }
    trendStrength = Math.max(0, Math.min(100, trendStrength));
    const reversalProbability = potentialReversal ? 75 : Math.max(0, 50 - trendStrength / 2);
    let recommendedAction = 'Monitor for signal confirmation';
    if (potentialReversal) {
        recommendedAction = 'Watch for trend reversal - use stop losses';
    }
    else if (trend === 'bullish' && acceleration === 'accelerating') {
        recommendedAction = 'Strong bullish momentum - consider long positions';
    }
    else if (trend === 'bearish' && acceleration === 'decelerating') {
        recommendedAction = 'Strong bearish momentum - consider short positions';
    }
    return { trendStrength, momentumDirection, reversalProbability, recommendedAction };
}
/**
 * Calculate AC for multiple periods (different AO calculations)
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @returns Array of AcceleratorOscillatorData objects
 */
export function calculateMultipleAC(highs, lows, closes) {
    // Currently only one standard calculation, but could be extended
    const ac = calculateAcceleratorOscillator(highs, lows, closes);
    return ac ? [ac] : [];
}
