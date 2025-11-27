/**
 * Volume Zone Oscillator
 * Analyzes volume distribution across price zones to identify accumulation/distribution
 */
/**
 * Calculate Volume Zone Oscillator
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @param period Period for volume flow calculation (default 14)
 * @returns VolumeZoneOscillatorData object
 */
export function calculateVolumeZoneOscillator(closes, volumes, period = 14) {
    if (closes.length !== volumes.length || closes.length < period + 1) {
        return null;
    }
    // Calculate volume flow (rising volume on up day = positive, etc.)
    const volumeFlows = [];
    let totalBuyingPressure = 0;
    let totalSellingPressure = 0;
    for (let i = 1; i < closes.length; i++) {
        const priceChange = closes[i] - closes[i - 1];
        const volume = volumes[i];
        let volumeFlow = 0;
        if (priceChange > 0) {
            // Up day
            volumeFlow = volume;
            totalBuyingPressure += volume;
        }
        else if (priceChange < 0) {
            // Down day
            volumeFlow = -volume;
            totalSellingPressure += Math.abs(volume);
        }
        // No change = 0 volume flow
        volumeFlows.push(volumeFlow);
    }
    // Calculate VZO as EMA of volume flow
    const vzo = calculateEMA(volumeFlows, period);
    if (!vzo) {
        return null;
    }
    const finalVzo = vzo;
    const volumeFlow = volumeFlows[volumeFlows.length - 1];
    // Determine trend based on VZO
    let trend = 'neutral';
    if (finalVzo > 15) {
        trend = 'accumulation';
    }
    else if (finalVzo < -15) {
        trend = 'distribution';
    }
    // Calculate signal strength
    const strength = Math.min(100, Math.abs(finalVzo) * 1.5);
    // Check overbought/oversold levels
    const overbought = finalVzo > 60;
    const oversold = finalVzo < -60;
    // Check zero line crosses
    let bullishSignal = false;
    let bearishSignal = false;
    if (volumeFlows.length >= period + 1) {
        const prevVolumeFlows = volumeFlows.slice(-period - 1, -1);
        const prevVzo = calculateEMA(prevVolumeFlows, period);
        if (prevVzo && prevVzo <= 0 && finalVzo > 0) {
            bullishSignal = true;
        }
        else if (prevVzo && prevVzo >= 0 && finalVzo < 0) {
            bearishSignal = true;
        }
    }
    // Analyze volume zones
    const accumulationZone = finalVzo > 40 && trend === 'accumulation';
    const distributionZone = finalVzo < -40 && trend === 'distribution';
    // Generate trading signal
    let signal = 'neutral';
    if (bullishSignal && accumulationZone) {
        signal = 'buy';
    }
    else if (bearishSignal && distributionZone) {
        signal = 'sell';
    }
    else if (overbought) {
        signal = 'sell';
    }
    else if (oversold) {
        signal = 'buy';
    }
    // Determine market condition
    let marketCondition = 'sideways';
    if (finalVzo > 20) {
        marketCondition = 'bullish';
    }
    else if (finalVzo < -20) {
        marketCondition = 'bearish';
    }
    return {
        vzo: finalVzo,
        volumeFlow,
        buyingPressure: totalBuyingPressure,
        sellingPressure: totalSellingPressure,
        trend,
        strength,
        overbought,
        oversold,
        bullishSignal,
        bearishSignal,
        accumulationZone,
        distributionZone,
        signal,
        marketCondition
    };
}
/**
 * Get VZO interpretation
 * @param vzo VolumeZoneOscillatorData object
 * @returns Human-readable interpretation
 */
export function getVZOInterpretation(vzo) {
    const { vzo: value, trend, accumulationZone, distributionZone, bullishSignal, bearishSignal } = vzo;
    let interpretation = `Volume Zone Oscillator: ${value.toFixed(2)}`;
    if (accumulationZone) {
        interpretation += ' - Strong accumulation zone';
    }
    else if (distributionZone) {
        interpretation += ' - Strong distribution zone';
    }
    else {
        interpretation += ` - ${trend} trend`;
    }
    if (bullishSignal) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishSignal) {
        interpretation += ' - Bearish zero line crossover';
    }
    return interpretation;
}
/**
 * Calculate volume zone analysis
 * @param vzo VolumeZoneOscillatorData object
 * @returns Volume zone analysis
 */
export function analyzeVolumeZones(vzo) {
    const { accumulationZone, distributionZone, strength, buyingPressure, sellingPressure } = vzo;
    let zoneStrength = strength;
    let institutionalActivity = 'low';
    let recommendedAction = 'Monitor volume patterns';
    let confidence = 50;
    // Analyze buying vs selling pressure
    const totalPressure = buyingPressure + sellingPressure;
    const pressureRatio = totalPressure > 0 ? Math.abs(buyingPressure - sellingPressure) / totalPressure : 0;
    if (accumulationZone && pressureRatio > 0.3) {
        zoneStrength += 20;
        institutionalActivity = 'high';
        recommendedAction = 'Accumulation likely - consider long positions';
        confidence = 75;
    }
    else if (distributionZone && pressureRatio > 0.3) {
        zoneStrength += 20;
        institutionalActivity = 'high';
        recommendedAction = 'Distribution likely - consider short positions';
        confidence = 75;
    }
    else if (pressureRatio > 0.2) {
        institutionalActivity = 'moderate';
        confidence = 60;
    }
    zoneStrength = Math.min(100, zoneStrength);
    return { zoneStrength, institutionalActivity, recommendedAction, confidence };
}
/**
 * Helper function to calculate EMA
 */
function calculateEMA(values, period) {
    if (values.length < period) {
        return 0;
    }
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
        ema = (values[i] - ema) * multiplier + ema;
    }
    return ema;
}
/**
 * Calculate VZO for multiple periods
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @param periods Array of periods to calculate VZO for
 * @returns Array of VolumeZoneOscillatorData objects
 */
export function calculateMultipleVZO(closes, volumes, periods = [14, 21, 28]) {
    return periods
        .map(period => calculateVolumeZoneOscillator(closes, volumes, period))
        .filter((vzo) => vzo !== null);
}
