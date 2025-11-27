/**
 * Volume Profile Indicator
 * Analyzes volume distribution across price levels to identify institutional activity
 */
/**
 * Calculate Volume Profile
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volume data
 * @param priceBins Number of price bins to create (default 20)
 * @returns VolumeProfileData object
 */
export function calculateVolumeProfile(highs, lows, closes, volumes, priceBins = 20) {
    if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        return null;
    }
    if (highs.length < 10) {
        return null;
    }
    // Find price range
    const allPrices = [...highs, ...lows, ...closes];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    if (priceRange === 0) {
        return null;
    }
    // Create price bins
    const binSize = priceRange / priceBins;
    const priceLevels = [];
    // Initialize bins
    for (let i = 0; i < priceBins; i++) {
        const binPrice = minPrice + (i * binSize) + (binSize / 2); // Center of bin
        priceLevels.push({ price: binPrice, volume: 0, count: 0 });
    }
    // Distribute volume across price levels
    for (let i = 0; i < highs.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const close = closes[i];
        const volume = volumes[i];
        // Distribute volume across the price range of this candle
        const candleRange = high - low;
        if (candleRange === 0) {
            // Doji candle - put all volume at close price
            const binIndex = Math.floor((close - minPrice) / binSize);
            if (binIndex >= 0 && binIndex < priceBins) {
                priceLevels[binIndex].volume += volume;
                priceLevels[binIndex].count++;
            }
        }
        else {
            // Distribute volume proportionally across the candle range
            const volumePerPriceUnit = volume / candleRange;
            const startBin = Math.floor((low - minPrice) / binSize);
            const endBin = Math.floor((high - minPrice) / binSize);
            for (let bin = Math.max(0, startBin); bin <= Math.min(priceBins - 1, endBin); bin++) {
                const binStart = minPrice + (bin * binSize);
                const binEnd = binStart + binSize;
                // Calculate overlap with candle range
                const overlapStart = Math.max(binStart, low);
                const overlapEnd = Math.min(binEnd, high);
                const overlap = Math.max(0, overlapEnd - overlapStart);
                if (overlap > 0) {
                    const binVolume = volumePerPriceUnit * overlap;
                    priceLevels[bin].volume += binVolume;
                    priceLevels[bin].count++;
                }
            }
        }
    }
    // Calculate total volume and percentages
    const totalVolume = priceLevels.reduce((sum, level) => sum + level.volume, 0);
    const averageVolumePerLevel = totalVolume / priceBins;
    const levelsWithPercentage = priceLevels
        .map(level => ({
        ...level,
        percentage: totalVolume > 0 ? (level.volume / totalVolume) * 100 : 0
    }))
        .sort((a, b) => b.volume - a.volume); // Sort by volume descending
    // Find Point of Control (POC) - price level with maximum volume
    const pocLevel = levelsWithPercentage[0];
    const pointOfControl = pocLevel.price;
    // Calculate Value Area (70% of volume around POC)
    const targetVolume = totalVolume * 0.7;
    let accumulatedVolume = 0;
    let valueAreaLow = pointOfControl;
    let valueAreaHigh = pointOfControl;
    // Sort by price for value area calculation
    const sortedByPrice = [...priceLevels].sort((a, b) => a.price - b.price);
    // Find levels around POC that contain 70% of volume
    for (const level of sortedByPrice) {
        if (level.price <= pointOfControl) {
            accumulatedVolume += level.volume;
            if (accumulatedVolume <= targetVolume) {
                valueAreaLow = level.price;
            }
        }
    }
    accumulatedVolume = 0;
    for (let i = sortedByPrice.length - 1; i >= 0; i--) {
        const level = sortedByPrice[i];
        if (level.price >= pointOfControl) {
            accumulatedVolume += level.volume;
            if (accumulatedVolume <= targetVolume) {
                valueAreaHigh = level.price;
            }
        }
    }
    // Get current price
    const currentPrice = closes[closes.length - 1];
    // Determine position
    let position;
    if (Math.abs(currentPrice - pointOfControl) / pointOfControl < 0.001) {
        position = 'at_poc';
    }
    else if (currentPrice > valueAreaHigh) {
        position = 'above_vah';
    }
    else if (currentPrice < valueAreaLow) {
        position = 'below_val';
    }
    else {
        position = 'in_value_area';
    }
    // Find high and low volume nodes
    const highVolumeNodes = priceLevels
        .filter(level => level.volume > averageVolumePerLevel * 2)
        .map(level => level.price)
        .sort((a, b) => a - b);
    const lowVolumeNodes = priceLevels
        .filter(level => level.volume > 0 && level.volume < averageVolumePerLevel * 0.5)
        .map(level => level.price)
        .sort((a, b) => a - b);
    // Calculate imbalance ratio (volume above POC vs below POC)
    const volumeAbovePOC = priceLevels
        .filter(level => level.price > pointOfControl)
        .reduce((sum, level) => sum + level.volume, 0);
    const volumeBelowPOC = priceLevels
        .filter(level => level.price < pointOfControl)
        .reduce((sum, level) => sum + level.volume, 0);
    const imbalanceRatio = volumeBelowPOC > 0 ? volumeAbovePOC / volumeBelowPOC : volumeAbovePOC > 0 ? 2 : 1;
    // Calculate strength of key levels based on volume concentration
    const pocStrength = Math.min(100, (pocLevel.volume / averageVolumePerLevel) * 10);
    const vahLevel = priceLevels.find(l => Math.abs(l.price - valueAreaHigh) < binSize / 2);
    const valLevel = priceLevels.find(l => Math.abs(l.price - valueAreaLow) < binSize / 2);
    const vahStrength = vahLevel ? Math.min(100, (vahLevel.volume / averageVolumePerLevel) * 10) : 50;
    const valStrength = valLevel ? Math.min(100, (valLevel.volume / averageVolumePerLevel) * 10) : 50;
    return {
        priceLevels: levelsWithPercentage.map(({ count, ...level }) => level),
        valueAreaHigh,
        valueAreaLow,
        pointOfControl,
        totalVolume,
        averageVolumePerLevel,
        position,
        highVolumeNodes,
        lowVolumeNodes,
        imbalanceRatio,
        vahStrength,
        valStrength,
        pocStrength
    };
}
/**
 * Get Volume Profile signal
 * @param profile VolumeProfileData object
 * @returns Trading signal based on volume profile analysis
 */
export function getVolumeProfileSignal(profile) {
    const { position, imbalanceRatio, pocStrength, vahStrength, valStrength } = profile;
    // Strong signals based on position and strength
    if (position === 'above_vah' && vahStrength > 70) {
        return 'sell'; // Rejecting high volume area
    }
    if (position === 'below_val' && valStrength > 70) {
        return 'buy'; // Rejecting low volume area
    }
    if (position === 'at_poc' && pocStrength > 80) {
        // At POC - direction depends on imbalance
        return imbalanceRatio > 1.5 ? 'buy' : imbalanceRatio < 0.67 ? 'sell' : 'neutral';
    }
    // Moderate signals
    if (position === 'in_value_area') {
        return imbalanceRatio > 1.2 ? 'buy' : imbalanceRatio < 0.8 ? 'sell' : 'neutral';
    }
    return 'neutral';
}
/**
 * Get institutional activity level
 * @param profile VolumeProfileData object
 * @returns Activity level description
 */
export function getInstitutionalActivityLevel(profile) {
    const { pocStrength, vahStrength, valStrength, highVolumeNodes } = profile;
    const avgStrength = (pocStrength + vahStrength + valStrength) / 3;
    const nodeCount = highVolumeNodes.length;
    if (avgStrength > 80 && nodeCount > 3)
        return 'Very High';
    if (avgStrength > 60 && nodeCount > 2)
        return 'High';
    if (avgStrength > 40 && nodeCount > 1)
        return 'Moderate';
    if (avgStrength > 20)
        return 'Low';
    return 'Very Low';
}
