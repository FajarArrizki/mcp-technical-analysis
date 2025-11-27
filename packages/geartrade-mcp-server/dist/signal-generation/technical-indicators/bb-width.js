/**
 * Bollinger Bands Width Indicator
 * Measures the width between Bollinger Bands upper and lower bands
 */
import { calculateSMA } from './moving-averages';
export function calculateBBWidth(closes, period = 20, stdDev = 2) {
    if (closes.length < period) {
        return {
            width: null,
            squeeze: null,
            trend: null,
        };
    }
    // Calculate SMA for middle band
    const sma = calculateSMA(closes, period);
    if (sma.length === 0) {
        return {
            width: null,
            squeeze: null,
            trend: null,
        };
    }
    const middleBand = sma[sma.length - 1];
    // Calculate standard deviation
    const recentData = closes.slice(-period);
    const variance = recentData.reduce((sum, value) => {
        return sum + Math.pow(value - middleBand, 2);
    }, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    // Calculate bands
    const upperBand = middleBand + (standardDeviation * stdDev);
    const lowerBand = middleBand - (standardDeviation * stdDev);
    // Calculate width
    const width = (upperBand - lowerBand) / middleBand;
    // Determine squeeze level
    let squeeze = null;
    if (width < 0.02)
        squeeze = 'extreme'; // Very tight bands
    else if (width < 0.05)
        squeeze = 'tight'; // Tight bands
    else if (width > 0.15)
        squeeze = 'wide'; // Wide bands
    else
        squeeze = 'normal';
    // Determine trend (simplified - would need historical data for proper trend)
    let trend = null;
    if (closes.length >= period * 2) {
        // Compare with previous period
        const prevData = closes.slice(-(period * 2), -period);
        const prevSMA = calculateSMA(prevData, period);
        if (prevSMA.length > 0) {
            const prevMiddle = prevSMA[prevSMA.length - 1];
            const prevVariance = prevData.reduce((sum, value) => {
                return sum + Math.pow(value - prevMiddle, 2);
            }, 0) / period;
            const prevStdDev = Math.sqrt(prevVariance);
            const prevUpper = prevMiddle + (prevStdDev * stdDev);
            const prevLower = prevMiddle - (prevStdDev * stdDev);
            const prevWidth = (prevUpper - prevLower) / prevMiddle;
            if (width > prevWidth * 1.1)
                trend = 'expanding';
            else if (width < prevWidth * 0.9)
                trend = 'contracting';
            else
                trend = 'stable';
        }
    }
    return {
        width,
        squeeze,
        trend,
    };
}
