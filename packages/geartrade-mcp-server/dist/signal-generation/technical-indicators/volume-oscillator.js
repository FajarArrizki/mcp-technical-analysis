/**
 * Volume Oscillator
 * Compares short-term and long-term volume moving averages to identify volume trends
 */
/**
 * Calculate Volume Oscillator
 * @param volumes Array of volume data
 * @param shortPeriod Short-term MA period (default 14)
 * @param longPeriod Long-term MA period (default 28)
 * @returns VolumeOscillatorData object
 */
export function calculateVolumeOscillator(volumes, shortPeriod = 14, longPeriod = 28) {
    if (volumes.length < longPeriod) {
        return null;
    }
    // Calculate short-term MA
    const shortMA = volumes.slice(-shortPeriod).reduce((sum, vol) => sum + vol, 0) / shortPeriod;
    // Calculate long-term MA
    const longMA = volumes.slice(-longPeriod).reduce((sum, vol) => sum + vol, 0) / longPeriod;
    // Volume Oscillator = ((Short MA - Long MA) / Long MA) * 100
    const oscillator = longMA > 0 ? ((shortMA - longMA) / longMA) * 100 : 0;
    // Determine volume trend
    let trend = 'stable';
    if (oscillator > 2) {
        trend = 'increasing';
    }
    else if (oscillator < -2) {
        trend = 'decreasing';
    }
    // Calculate signal strength based on oscillator magnitude
    const strength = Math.min(100, Math.abs(oscillator) * 5);
    // Check overbought/oversold levels
    const overbought = oscillator > 10;
    const oversold = oscillator < -10;
    // Check for zero line crossovers
    let bullishSignal = false;
    let bearishSignal = false;
    if (volumes.length >= longPeriod + 1) {
        const prevVolumes = volumes.slice(-longPeriod - 1, -1);
        const prevOscillator = calculateVolumeOscillator(prevVolumes, shortPeriod, longPeriod);
        if (prevOscillator) {
            if (oscillator > 0 && prevOscillator.oscillator <= 0) {
                bullishSignal = true;
            }
            else if (oscillator < 0 && prevOscillator.oscillator >= 0) {
                bearishSignal = true;
            }
        }
    }
    // Generate trading signal
    let signal = 'neutral';
    if (bullishSignal && !overbought) {
        signal = 'buy';
    }
    else if (bearishSignal && !oversold) {
        signal = 'sell';
    }
    else if (overbought) {
        signal = 'sell';
    }
    else if (oversold) {
        signal = 'buy';
    }
    // Determine volume momentum
    let momentum = 'weak';
    if (Math.abs(oscillator) > 15) {
        momentum = 'strong';
    }
    else if (Math.abs(oscillator) > 5) {
        momentum = 'moderate';
    }
    return {
        oscillator,
        shortMA,
        longMA,
        trend,
        strength,
        overbought,
        oversold,
        bullishSignal,
        bearishSignal,
        signal,
        momentum
    };
}
/**
 * Calculate Volume Oscillator for multiple period combinations
 * @param volumes Array of volume data
 * @param periodCombos Array of [shortPeriod, longPeriod] combinations
 * @returns Array of VolumeOscillatorData objects
 */
export function calculateMultipleVolumeOscillators(volumes, periodCombos = [[14, 28], [5, 10], [21, 42]]) {
    return periodCombos
        .map(([shortPeriod, longPeriod]) => calculateVolumeOscillator(volumes, shortPeriod, longPeriod))
        .filter((vo) => vo !== null);
}
/**
 * Get Volume Oscillator interpretation
 * @param vo VolumeOscillatorData object
 * @returns Human-readable interpretation
 */
export function getVolumeOscillatorInterpretation(vo) {
    const { oscillator, trend, overbought, oversold, bullishSignal, bearishSignal, momentum } = vo;
    let interpretation = `Volume Oscillator: ${oscillator.toFixed(2)}%`;
    if (bullishSignal) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishSignal) {
        interpretation += ' - Bearish zero line crossover';
    }
    else if (overbought) {
        interpretation += ' - Volume overbought';
    }
    else if (oversold) {
        interpretation += ' - Volume oversold';
    }
    else {
        interpretation += ` - ${trend} volume trend`;
    }
    interpretation += ` (${momentum} momentum)`;
    return interpretation;
}
/**
 * Analyze volume trend consistency
 * @param volumes Array of volume data
 * @param period Number of periods to analyze
 * @returns Volume trend analysis
 */
export function analyzeVolumeTrend(volumes, period = 20) {
    if (volumes.length < period) {
        return { overallTrend: 'stable', trendStrength: 0, consistency: 0 };
    }
    const voData = calculateMultipleVolumeOscillators(volumes, [[5, 10], [14, 28], [21, 42]]);
    if (voData.length === 0) {
        return { overallTrend: 'stable', trendStrength: 0, consistency: 0 };
    }
    // Average trend across different periods
    let increasingCount = 0;
    let decreasingCount = 0;
    let totalStrength = 0;
    for (const vo of voData) {
        if (vo.trend === 'increasing')
            increasingCount++;
        if (vo.trend === 'decreasing')
            decreasingCount++;
        totalStrength += vo.strength;
    }
    const overallTrend = increasingCount > decreasingCount ? 'increasing' :
        decreasingCount > increasingCount ? 'decreasing' : 'stable';
    const trendStrength = totalStrength / voData.length;
    const consistency = Math.max(increasingCount, decreasingCount) / voData.length * 100;
    return { overallTrend, trendStrength, consistency };
}
/**
 * Calculate volume breakout signal
 * @param vo VolumeOscillatorData object
 * @param threshold Breakout threshold (%)
 * @returns Whether volume is breaking out
 */
export function getVolumeBreakoutSignal(vo, threshold = 20) {
    if (vo.oscillator > threshold) {
        return 'breakout';
    }
    else if (vo.oscillator < -threshold) {
        return 'breakdown';
    }
    return 'none';
}
