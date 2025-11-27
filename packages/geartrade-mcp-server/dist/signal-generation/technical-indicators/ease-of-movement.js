/**
 * Ease of Movement (EMV) Indicator
 * Measures how easily price moves by combining price change and volume
 */
/**
 * Calculate Ease of Movement
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param volumes Array of volume data
 * @param smoothingPeriod Period for EMV smoothing (default 14)
 * @returns EaseOfMovementData object
 */
export function calculateEaseOfMovement(highs, lows, volumes, smoothingPeriod = 14) {
    if (highs.length !== lows.length || highs.length !== volumes.length) {
        return null;
    }
    if (highs.length < 2) {
        return null;
    }
    // Calculate Distance Moved = (High + Low) / 2 - (High[-1] + Low[-1]) / 2
    const distanceMoved = ((highs[highs.length - 1] + lows[lows.length - 1]) / 2) -
        ((highs[highs.length - 2] + lows[lows.length - 2]) / 2);
    // Calculate Box Ratio = Volume / (High - Low)
    const currentRange = highs[highs.length - 1] - lows[highs.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    // Avoid division by zero
    const boxRatio = currentRange > 0 ? currentVolume / currentRange : 0;
    // Calculate EMV = Distance Moved / Box Ratio
    const emv = boxRatio > 0 ? distanceMoved / boxRatio : 0;
    // Calculate smoothed EMV (14-period MA)
    const emvHistory = calculateEMVHistory(highs, lows, volumes);
    const smoothedEMV = calculateSMA(emvHistory, smoothingPeriod);
    // Determine trend based on smoothed EMV
    let trend = 'neutral';
    if (smoothedEMV > 0.001) {
        trend = 'bullish';
    }
    else if (smoothedEMV < -0.001) {
        trend = 'bearish';
    }
    // Calculate signal strength based on EMV magnitude
    const strength = Math.min(100, Math.abs(smoothedEMV) * 10000);
    // Check for zero line crossovers
    let bullishSignal = false;
    let bearishSignal = false;
    if (emvHistory.length >= smoothingPeriod + 1) {
        const prevSmoothedEMV = calculateSMA(emvHistory.slice(0, -1), smoothingPeriod);
        if (smoothedEMV > 0 && prevSmoothedEMV <= 0) {
            bullishSignal = true;
        }
        else if (smoothedEMV < 0 && prevSmoothedEMV >= 0) {
            bearishSignal = true;
        }
    }
    // Generate trading signal
    let signal = 'neutral';
    if (bullishSignal) {
        signal = 'buy';
    }
    else if (bearishSignal) {
        signal = 'sell';
    }
    else if (trend === 'bullish' && Math.abs(smoothedEMV) > 0.005) {
        signal = 'buy';
    }
    else if (trend === 'bearish' && Math.abs(smoothedEMV) > 0.005) {
        signal = 'sell';
    }
    // Determine movement efficiency
    let efficiency = 'low';
    const absEMV = Math.abs(smoothedEMV);
    if (absEMV > 0.01) {
        efficiency = 'high';
    }
    else if (absEMV > 0.005) {
        efficiency = 'moderate';
    }
    return {
        emv,
        smoothedEMV: smoothedEMV || emv,
        distanceMoved,
        boxRatio,
        trend,
        strength,
        bullishSignal,
        bearishSignal,
        signal,
        efficiency
    };
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
 * Helper function to calculate EMV history
 */
function calculateEMVHistory(highs, lows, volumes) {
    const emvValues = [];
    for (let i = 1; i < highs.length; i++) {
        const sliceHighs = highs.slice(0, i + 1);
        const sliceLows = lows.slice(0, i + 1);
        const sliceVolumes = volumes.slice(0, i + 1);
        const emv = calculateEaseOfMovement(sliceHighs, sliceLows, sliceVolumes, 1); // No smoothing for history
        if (emv) {
            emvValues.push(emv.emv);
        }
    }
    return emvValues;
}
/**
 * Calculate Ease of Movement for multiple smoothing periods
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param volumes Array of volume data
 * @param periods Array of smoothing periods
 * @returns Array of EaseOfMovementData objects
 */
export function calculateMultipleEaseOfMovement(highs, lows, volumes, periods = [9, 14, 21]) {
    return periods
        .map(period => calculateEaseOfMovement(highs, lows, volumes, period))
        .filter((emv) => emv !== null);
}
/**
 * Get EMV interpretation
 * @param emv EaseOfMovementData object
 * @returns Human-readable interpretation
 */
export function getEMVInterpretation(emv) {
    const { smoothedEMV, bullishSignal, bearishSignal, efficiency, trend } = emv;
    let interpretation = `EMV: ${smoothedEMV.toFixed(6)}`;
    if (bullishSignal) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishSignal) {
        interpretation += ' - Bearish zero line crossover';
    }
    else {
        interpretation += ` - ${trend} trend with ${efficiency} efficiency`;
    }
    return interpretation;
}
/**
 * Analyze price movement efficiency
 * @param emv EaseOfMovementData object
 * @returns Efficiency analysis
 */
export function analyzeMovementEfficiency(emv) {
    const { boxRatio, distanceMoved, efficiency } = emv;
    // Efficiency score based on box ratio and distance moved
    const distanceScore = Math.abs(distanceMoved) * 1000;
    const volumeEfficiency = boxRatio > 0 ? 1 / boxRatio : 0;
    const efficiencyScore = Math.min(100, (distanceScore + volumeEfficiency) / 2);
    let interpretation;
    let recommendation;
    if (efficiency === 'high') {
        interpretation = 'Price is moving efficiently with good volume support';
        recommendation = 'Strong trend likely - consider trend-following strategies';
    }
    else if (efficiency === 'moderate') {
        interpretation = 'Price movement has moderate efficiency';
        recommendation = 'Monitor for trend continuation or reversal';
    }
    else {
        interpretation = 'Price movement is inefficient, high volume resistance';
        recommendation = 'Caution - potential reversal or consolidation';
    }
    return { efficiency: efficiencyScore, interpretation, recommendation };
}
/**
 * Get EMV trend strength
 * @param emv EaseOfMovementData object
 * @returns Trend strength rating (0-100)
 */
export function getEMVTrendStrength(emv) {
    const { smoothedEMV, strength, efficiency } = emv;
    let efficiencyMultiplier = 1;
    if (efficiency === 'high')
        efficiencyMultiplier = 1.5;
    else if (efficiency === 'moderate')
        efficiencyMultiplier = 1.0;
    else
        efficiencyMultiplier = 0.5;
    return Math.min(100, strength * efficiencyMultiplier);
}
