/**
 * Volume Weighted Moving Average (VWMA) Indicator
 * Moving average weighted by trading volume for better price representation
 */
/**
 * Calculate Volume Weighted Moving Average
 * @param prices Array of closing prices
 * @param volumes Array of volume data
 * @param period Period for VWMA calculation (default 20)
 * @returns VWMAData object
 */
export function calculateVWMA(prices, volumes, period = 20) {
    if (prices.length < period || volumes.length < period) {
        return null;
    }
    // Use the most recent 'period' data points
    const recentPrices = prices.slice(-period);
    const recentVolumes = volumes.slice(-period);
    // Calculate VWMA: Σ(Price × Volume) / Σ(Volume)
    let priceVolumeSum = 0;
    let volumeSum = 0;
    for (let i = 0; i < period; i++) {
        priceVolumeSum += recentPrices[i] * recentVolumes[i];
        volumeSum += recentVolumes[i];
    }
    const vwma = volumeSum > 0 ? priceVolumeSum / volumeSum : 0;
    // Calculate average volume
    const avgVolume = volumeSum / period;
    // Get current price
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];
    // Price vs VWMA
    const priceVsVwma = ((currentPrice - vwma) / vwma) * 100;
    let position = 'equal';
    if (currentPrice > vwma * 1.0001) {
        position = 'above';
    }
    else if (currentPrice < vwma * 0.9999) {
        position = 'below';
    }
    // Determine trend based on VWMA slope (compare with previous VWMA)
    let trend = 'neutral';
    if (prices.length >= period + 1 && volumes.length >= period + 1) {
        const prevPrices = prices.slice(-period - 1, -1);
        const prevVolumes = volumes.slice(-period - 1, -1);
        let prevPriceVolumeSum = 0;
        let prevVolumeSum = 0;
        for (let i = 0; i < period; i++) {
            prevPriceVolumeSum += prevPrices[i] * prevVolumes[i];
            prevVolumeSum += prevVolumes[i];
        }
        const prevVwma = prevVolumeSum > 0 ? prevPriceVolumeSum / prevVolumeSum : 0;
        if (vwma > prevVwma * 1.0001) {
            trend = 'bullish';
        }
        else if (vwma < prevVwma * 0.9999) {
            trend = 'bearish';
        }
    }
    // Calculate volume efficiency (ratio of current volume to average)
    const volumeEfficiency = currentVolume / avgVolume;
    // Calculate trend strength based on volume confirmation
    let strength = 0;
    if (trend !== 'neutral') {
        // Base strength on VWMA slope and volume confirmation
        const slopeStrength = Math.abs(priceVsVwma) * 2;
        const volumeStrength = Math.min(volumeEfficiency, 2) * 25; // Max 50 from volume
        strength = Math.min(100, slopeStrength + volumeStrength);
    }
    return {
        vwma,
        priceVsVwma,
        position,
        trend,
        avgVolume,
        volumeEfficiency,
        strength
    };
}
/**
 * Calculate multiple VWMAs for different periods
 * @param prices Array of closing prices
 * @param volumes Array of volume data
 * @param periods Array of periods to calculate VWMA for
 * @returns Array of VWMAData objects
 */
export function calculateMultipleVWMA(prices, volumes, periods = [10, 20, 50]) {
    return periods
        .map(period => calculateVWMA(prices, volumes, period))
        .filter((vwma) => vwma !== null);
}
/**
 * Get VWMA crossover signal
 * @param fastVwma Fast VWMA data
 * @param slowVwma Slow VWMA data
 * @returns Crossover signal
 */
export function getVWMACrossoverSignal(fastVwma, slowVwma) {
    // Check if fast VWMA crosses above slow VWMA (bullish)
    // or below slow VWMA (bearish)
    const fastAboveSlow = fastVwma.vwma > slowVwma.vwma;
    const priceAboveFast = fastVwma.position === 'above';
    if (fastAboveSlow && priceAboveFast) {
        return 'bullish_crossover';
    }
    else if (!fastAboveSlow && fastVwma.position === 'below') {
        return 'bearish_crossover';
    }
    return 'neutral';
}
