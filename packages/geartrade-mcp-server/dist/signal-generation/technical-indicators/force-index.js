/**
 * Force Index Indicator
 * Measures the force of bulls vs bears by combining price change and volume
 */
import { calculateEMA } from './moving-averages';
export function calculateForceIndex(closes, volumes, smoothingPeriod = 13) {
    if (closes.length < 2 || volumes.length < 2) {
        return {
            forceIndex: null,
            smoothedForceIndex: null,
            signal: null,
            strength: null,
        };
    }
    // Calculate raw Force Index: (Close - Close_prev) * Volume
    const rawForceIndex = [];
    for (let i = 1; i < closes.length; i++) {
        const priceChange = closes[i] - closes[i - 1];
        const volume = volumes[i] || 0;
        const forceIndexValue = priceChange * volume;
        rawForceIndex.push(forceIndexValue);
    }
    if (rawForceIndex.length === 0) {
        return {
            forceIndex: null,
            smoothedForceIndex: null,
            signal: null,
            strength: null,
        };
    }
    // Get current raw Force Index
    const currentForceIndex = rawForceIndex[rawForceIndex.length - 1];
    // Calculate smoothed Force Index using EMA
    let currentSmoothedForceIndex = null;
    if (rawForceIndex.length >= smoothingPeriod) {
        const smoothedValues = calculateEMA(rawForceIndex, smoothingPeriod);
        if (smoothedValues.length > 0) {
            currentSmoothedForceIndex = smoothedValues[smoothedValues.length - 1];
        }
    }
    // Determine signal based on Force Index direction
    let signal = null;
    if (currentForceIndex > 0)
        signal = 'bullish';
    else if (currentForceIndex < 0)
        signal = 'bearish';
    else
        signal = 'neutral';
    // Determine strength based on magnitude
    let strength = null;
    const absForceIndex = Math.abs(currentForceIndex);
    // These thresholds would need to be calibrated based on the asset and timeframe
    if (absForceIndex > 1000000)
        strength = 'strong'; // Very large volume * price change
    else if (absForceIndex > 100000)
        strength = 'moderate';
    else
        strength = 'weak';
    return {
        forceIndex: currentForceIndex,
        smoothedForceIndex: currentSmoothedForceIndex,
        signal,
        strength,
    };
}
