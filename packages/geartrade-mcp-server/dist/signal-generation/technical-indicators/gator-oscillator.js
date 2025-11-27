/**
 * Gator Oscillator Indicator
 * Based on Bill Williams' Alligator indicator - shows convergence/divergence
 */
/**
 * Calculate Gator Oscillator
 * @param closes Array of closing prices
 * @param jawPeriod Jaw period (default 13)
 * @param teethPeriod Teeth period (default 8)
 * @param lipsPeriod Lips period (default 5)
 * @returns GatorOscillatorData object
 */
export function calculateGatorOscillator(closes, jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5) {
    if (closes.length < jawPeriod) {
        return null;
    }
    // Calculate Alligator lines (SMMA - Smoothed Moving Average)
    const jaw = calculateSMMA(closes, jawPeriod);
    const teeth = calculateSMMA(closes, teethPeriod);
    const lips = calculateSMMA(closes, lipsPeriod);
    if (!jaw || !teeth || !lips) {
        return null;
    }
    // Calculate histograms
    const upperHistogram = teeth - jaw;
    const lowerHistogram = lips - teeth;
    // Determine histogram colors
    let upperColor = 'gray';
    let lowerColor = 'gray';
    if (upperHistogram > 0) {
        upperColor = 'green';
    }
    else if (upperHistogram < 0) {
        upperColor = 'red';
    }
    if (lowerHistogram > 0) {
        lowerColor = 'green';
    }
    else if (lowerHistogram < 0) {
        lowerColor = 'red';
    }
    // Determine convergence/divergence state
    let state = 'neutral';
    // Calculate the spread between lines
    const currentSpread = Math.abs(jaw - lips);
    if (closes.length >= jawPeriod + 5) {
        // Compare current spread with previous spread
        const prevJaw = calculateSMMA(closes.slice(0, -1), jawPeriod);
        const prevTeeth = calculateSMMA(closes.slice(0, -1), teethPeriod);
        const prevLips = calculateSMMA(closes.slice(0, -1), lipsPeriod);
        if (prevJaw && prevTeeth && prevLips) {
            const prevSpread = Math.abs(prevJaw - prevLips);
            if (currentSpread < prevSpread * 0.95) {
                state = 'converging';
            }
            else if (currentSpread > prevSpread * 1.05) {
                state = 'diverging';
            }
        }
    }
    // Calculate signal strength based on histogram magnitudes
    const strength = Math.min(100, (Math.abs(upperHistogram) + Math.abs(lowerHistogram)) * 50);
    // Determine trend direction
    let trend = 'sideways';
    if (lips > teeth && teeth > jaw) {
        trend = 'bullish';
    }
    else if (lips < teeth && teeth < jaw) {
        trend = 'bearish';
    }
    // Check for trading signals
    let bullishSignal = false;
    let bearishSignal = false;
    if (closes.length >= jawPeriod + 2) {
        // Check if lower histogram just turned green (bullish)
        const prevLowerHistogram = calculateGatorOscillator(closes.slice(0, -1), jawPeriod, teethPeriod, lipsPeriod);
        if (prevLowerHistogram) {
            if (prevLowerHistogram.lowerHistogram <= 0 && lowerHistogram > 0) {
                bullishSignal = true;
            }
            if (prevLowerHistogram.upperHistogram >= 0 && upperHistogram < 0) {
                bearishSignal = true;
            }
        }
    }
    // Generate final signal
    let signal = 'neutral';
    if (bullishSignal && state === 'converging') {
        signal = 'buy';
    }
    else if (bearishSignal && state === 'diverging') {
        signal = 'sell';
    }
    else if (trend === 'bullish' && state === 'diverging') {
        signal = 'buy';
    }
    else if (trend === 'bearish' && state === 'converging') {
        signal = 'sell';
    }
    return {
        upperHistogram,
        lowerHistogram,
        jaw,
        teeth,
        lips,
        upperColor,
        lowerColor,
        state,
        strength,
        trend,
        bullishSignal,
        bearishSignal,
        signal
    };
}
/**
 * Helper function to calculate SMMA (Smoothed Moving Average)
 * SMMA is similar to EMA but starts with SMA
 */
function calculateSMMA(values, period) {
    if (values.length < period) {
        return 0;
    }
    // Start with SMA for the first period
    let smma = values.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    // Continue with SMMA calculation
    for (let i = period; i < values.length; i++) {
        smma = (smma * (period - 1) + values[i]) / period;
    }
    return smma;
}
/**
 * Get Gator Oscillator interpretation
 * @param gator GatorOscillatorData object
 * @returns Human-readable interpretation
 */
export function getGatorInterpretation(gator) {
    const { state, trend, upperColor, lowerColor, bullishSignal, bearishSignal } = gator;
    let interpretation = `Gator Oscillator - ${state} lines`;
    if (bullishSignal) {
        interpretation += ' - Bullish signal (lower histogram green)';
    }
    else if (bearishSignal) {
        interpretation += ' - Bearish signal (upper histogram red)';
    }
    else {
        interpretation += ` - ${trend} trend`;
    }
    interpretation += ` (Upper: ${upperColor}, Lower: ${lowerColor})`;
    return interpretation;
}
/**
 * Analyze Gator Oscillator patterns
 * @param closes Array of closing prices
 * @param periods Number of periods to analyze
 * @returns Pattern analysis
 */
export function analyzeGatorPatterns(closes, periods = 20) {
    if (closes.length < 50) {
        return {
            dominantPattern: 'sleeping',
            convergenceStrength: 0,
            trendReliability: 0,
            recommendedAction: 'Insufficient data'
        };
    }
    const gatorData = [];
    // Calculate Gator for last 'periods' points
    for (let i = 50; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        const gator = calculateGatorOscillator(slice);
        if (gator) {
            gatorData.push(gator);
        }
    }
    if (gatorData.length === 0) {
        return {
            dominantPattern: 'sleeping',
            convergenceStrength: 0,
            trendReliability: 0,
            recommendedAction: 'Insufficient data'
        };
    }
    // Analyze patterns
    let sleepingCount = 0;
    let awakeningCount = 0;
    let eatingCount = 0;
    let satiatedCount = 0;
    let convergenceSum = 0;
    let trendReliabilitySum = 0;
    for (const gator of gatorData) {
        convergenceSum += gator.state === 'converging' ? 1 : 0;
        trendReliabilitySum += gator.trend !== 'sideways' ? 1 : 0;
        // Classify patterns based on histogram colors and state
        if (gator.upperColor === 'gray' && gator.lowerColor === 'gray') {
            sleepingCount++;
        }
        else if (gator.state === 'converging' && (gator.upperColor !== gator.lowerColor)) {
            awakeningCount++;
        }
        else if (gator.state === 'diverging' && gator.upperColor === gator.lowerColor && gator.upperColor === 'green') {
            eatingCount++;
        }
        else if (gator.state === 'diverging' && gator.upperColor === gator.lowerColor && gator.upperColor === 'red') {
            satiatedCount++;
        }
    }
    // Determine dominant pattern
    const patternCounts = [sleepingCount, awakeningCount, eatingCount, satiatedCount];
    const maxCount = Math.max(...patternCounts);
    const patternIndex = patternCounts.indexOf(maxCount);
    const patterns = ['sleeping', 'awakening', 'eating', 'satiated'];
    const dominantPattern = patterns[patternIndex];
    const convergenceStrength = (convergenceSum / gatorData.length) * 100;
    const trendReliability = (trendReliabilitySum / gatorData.length) * 100;
    let recommendedAction = 'Monitor for pattern changes';
    switch (dominantPattern) {
        case 'sleeping':
            recommendedAction = 'Market is quiet - wait for awakening signal';
            break;
        case 'awakening':
            recommendedAction = 'Market is waking up - prepare for trend';
            break;
        case 'eating':
            recommendedAction = 'Bullish trend active - consider long positions';
            break;
        case 'satiated':
            recommendedAction = 'Bearish trend active - consider short positions';
            break;
    }
    return {
        dominantPattern,
        convergenceStrength,
        trendReliability,
        recommendedAction
    };
}
/**
 * Calculate Gator Oscillator for multiple parameter sets
 * @param closes Array of closing prices
 * @param parameterSets Array of [jawPeriod, teethPeriod, lipsPeriod] combinations
 * @returns Array of GatorOscillatorData objects
 */
export function calculateMultipleGator(closes, parameterSets = [[13, 8, 5], [21, 13, 8]]) {
    return parameterSets
        .map(([jawPeriod, teethPeriod, lipsPeriod]) => calculateGatorOscillator(closes, jawPeriod, teethPeriod, lipsPeriod))
        .filter((gator) => gator !== null);
}
