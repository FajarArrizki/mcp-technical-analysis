/**
 * Price Volume Trend (PVT) Indicator
 * Accumulates volume based on price percentage changes
 */
/**
 * Calculate Price Volume Trend
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @returns PriceVolumeTrendData object
 */
export function calculatePriceVolumeTrend(closes, volumes) {
    if (closes.length !== volumes.length || closes.length < 2) {
        return null;
    }
    // Calculate PVT incrementally
    let pvt = 0;
    for (let i = 1; i < closes.length; i++) {
        const priceChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
        const volumeChange = priceChange * volumes[i];
        pvt += volumeChange;
    }
    // Calculate current price change
    const currentPriceChange = ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;
    // Determine volume trend
    let volumeTrend = 'stable';
    if (volumes.length >= 5) {
        const recentVolumes = volumes.slice(-5);
        const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
        const currentVolume = volumes[volumes.length - 1];
        if (currentVolume > avgVolume * 1.1) {
            volumeTrend = 'increasing';
        }
        else if (currentVolume < avgVolume * 0.9) {
            volumeTrend = 'decreasing';
        }
    }
    // Determine trend based on PVT direction and slope
    let trend = 'neutral';
    if (closes.length >= 10) {
        const recentPVT = calculatePVTForPeriod(closes.slice(-10), volumes.slice(-10));
        const olderPVT = calculatePVTForPeriod(closes.slice(-20, -10), volumes.slice(-20, -10));
        if (recentPVT > olderPVT * 1.001) {
            trend = 'bullish';
        }
        else if (recentPVT < olderPVT * 0.999) {
            trend = 'bearish';
        }
    }
    // Calculate signal strength based on PVT magnitude and trend consistency
    const magnitudeStrength = Math.min(50, Math.abs(pvt) / 1000000);
    const trendStrength = trend !== 'neutral' ? 30 : 0;
    const strength = Math.min(100, magnitudeStrength + trendStrength);
    // Check for zero line crossovers
    let bullishSignal = false;
    let bearishSignal = false;
    if (closes.length >= 3 && volumes.length >= 3) {
        const prevPVT = calculatePriceVolumeTrend(closes.slice(0, -1), volumes.slice(0, -1));
        if (prevPVT) {
            if (pvt > 0 && prevPVT.pvt <= 0) {
                bullishSignal = true;
            }
            else if (pvt < 0 && prevPVT.pvt >= 0) {
                bearishSignal = true;
            }
        }
    }
    // Generate trading signal
    let signal = 'neutral';
    if (bullishSignal && volumeTrend === 'increasing') {
        signal = 'buy';
    }
    else if (bearishSignal && volumeTrend === 'decreasing') {
        signal = 'sell';
    }
    else if (trend === 'bullish' && volumeTrend === 'increasing') {
        signal = 'buy';
    }
    else if (trend === 'bearish' && volumeTrend === 'decreasing') {
        signal = 'sell';
    }
    // Determine momentum
    let momentum = 'weak';
    const absPVT = Math.abs(pvt);
    if (absPVT > 1000000) {
        momentum = 'strong';
    }
    else if (absPVT > 500000) {
        momentum = 'moderate';
    }
    // Volume confirmation
    const volumeConfirmed = volumeTrend === 'increasing' && trend === 'bullish' ||
        volumeTrend === 'decreasing' && trend === 'bearish';
    return {
        pvt,
        priceChange: currentPriceChange,
        volumeTrend,
        trend,
        strength,
        bullishSignal,
        bearishSignal,
        signal,
        momentum,
        volumeConfirmed
    };
}
/**
 * Helper function to calculate PVT for a specific period
 */
function calculatePVTForPeriod(closes, volumes) {
    if (closes.length !== volumes.length || closes.length < 2) {
        return 0;
    }
    let pvt = 0;
    for (let i = 1; i < closes.length; i++) {
        const priceChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
        const volumeChange = priceChange * volumes[i];
        pvt += volumeChange;
    }
    return pvt;
}
/**
 * Get PVT interpretation
 * @param pvt PriceVolumeTrendData object
 * @returns Human-readable interpretation
 */
export function getPVTInterpretation(pvt) {
    const { pvt: value, bullishSignal, bearishSignal, volumeTrend, momentum, trend } = pvt;
    let interpretation = `PVT: ${value.toLocaleString()}`;
    if (bullishSignal) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishSignal) {
        interpretation += ' - Bearish zero line crossover';
    }
    else {
        interpretation += ` - ${trend} trend with ${volumeTrend} volume`;
    }
    interpretation += ` (${momentum} momentum)`;
    return interpretation;
}
/**
 * Calculate PVT slope
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @param period Period to calculate slope over
 * @returns PVT slope value
 */
export function calculatePVTSlope(closes, volumes, period = 5) {
    if (closes.length < period * 2 || volumes.length < period * 2) {
        return 0;
    }
    const pvtValues = [];
    // Calculate PVT for each period in the slope window
    for (let i = period; i <= closes.length; i++) {
        const sliceCloses = closes.slice(0, i);
        const sliceVolumes = volumes.slice(0, i);
        const pvt = calculatePVTForPeriod(sliceCloses, sliceVolumes);
        pvtValues.push(pvt);
    }
    if (pvtValues.length < 2) {
        return 0;
    }
    // Calculate slope using linear regression
    const n = pvtValues.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += pvtValues[i];
        sumXY += i * pvtValues[i];
        sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}
/**
 * Analyze PVT trend consistency
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @param periods Number of periods to analyze
 * @returns Trend consistency analysis
 */
export function analyzePVTTrendConsistency(closes, volumes, periods = 10) {
    if (closes.length < periods * 2 || volumes.length < periods * 2) {
        return { consistency: 0, dominantTrend: 'neutral', volumePriceDivergence: false };
    }
    const pvtData = [];
    // Calculate PVT for different periods
    for (let i = periods; i <= closes.length; i++) {
        const sliceCloses = closes.slice(0, i);
        const sliceVolumes = volumes.slice(0, i);
        const pvt = calculatePriceVolumeTrend(sliceCloses, sliceVolumes);
        if (pvt) {
            pvtData.push(pvt);
        }
    }
    if (pvtData.length < periods) {
        return { consistency: 0, dominantTrend: 'neutral', volumePriceDivergence: false };
    }
    // Analyze trend consistency
    let bullishCount = 0;
    let bearishCount = 0;
    for (const pvt of pvtData.slice(-periods)) {
        if (pvt.trend === 'bullish')
            bullishCount++;
        if (pvt.trend === 'bearish')
            bearishCount++;
    }
    const dominantTrend = bullishCount > bearishCount * 1.2 ? 'bullish' :
        bearishCount > bullishCount * 1.2 ? 'bearish' : 'neutral';
    const consistency = Math.max(bullishCount, bearishCount) / periods * 100;
    // Check for volume-price divergence
    const recentPVT = pvtData[pvtData.length - 1];
    const priceChange = recentPVT.priceChange;
    const pvtDirection = recentPVT.pvt > 0 ? 1 : -1;
    const priceDirection = priceChange > 0 ? 1 : -1;
    const volumePriceDivergence = pvtDirection !== priceDirection;
    return { consistency, dominantTrend, volumePriceDivergence };
}
