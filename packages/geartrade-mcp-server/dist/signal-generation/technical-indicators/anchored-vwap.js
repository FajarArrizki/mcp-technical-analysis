/**
 * Anchored VWAP (Volume Weighted Average Price) Indicator
 * VWAP calculated from a specific anchor point instead of session start
 */
/**
 * Calculate Anchored VWAP
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volume data
 * @param anchorIndex Index to anchor VWAP from (0 = start of data)
 * @param standardDeviations Number of SD for bands (default 1)
 * @returns AnchoredVWAPData object
 */
export function calculateAnchoredVWAP(highs, lows, closes, volumes, anchorIndex = 0, standardDeviations = 1) {
    if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        return null;
    }
    if (anchorIndex >= highs.length || anchorIndex < 0) {
        return null;
    }
    // Use data from anchor point onwards
    const anchoredHighs = highs.slice(anchorIndex);
    const anchoredLows = lows.slice(anchorIndex);
    const anchoredCloses = closes.slice(anchorIndex);
    const anchoredVolumes = volumes.slice(anchorIndex);
    // Minimum 1 data point after anchor
    if (anchoredHighs.length < 1) {
        return null;
    }
    // Calculate VWAP from anchor point
    let priceVolumeSum = 0;
    let volumeSum = 0;
    for (let i = 0; i < anchoredCloses.length; i++) {
        // Use typical price (H+L+C)/3 for VWAP calculation
        const typicalPrice = (anchoredHighs[i] + anchoredLows[i] + anchoredCloses[i]) / 3;
        priceVolumeSum += typicalPrice * anchoredVolumes[i];
        volumeSum += anchoredVolumes[i];
    }
    const anchoredVWAP = volumeSum > 0 ? priceVolumeSum / volumeSum : 0;
    // Get anchor price
    const anchorPrice = closes[anchorIndex];
    // Current price vs VWAP
    const currentPrice = closes[closes.length - 1];
    const priceVsVWAP = anchoredVWAP > 0 ? ((currentPrice - anchoredVWAP) / anchoredVWAP) * 100 : 0;
    let position = 'equal';
    if (currentPrice > anchoredVWAP * 1.0001) {
        position = 'above';
    }
    else if (currentPrice < anchoredVWAP * 0.9999) {
        position = 'below';
    }
    // Determine trend
    let trend = 'neutral';
    if (position === 'above') {
        trend = 'bullish';
    }
    else if (position === 'below') {
        trend = 'bearish';
    }
    // Calculate standard deviation for bands
    const deviations = [];
    for (let i = 0; i < anchoredCloses.length; i++) {
        const typicalPrice = (anchoredHighs[i] + anchoredLows[i] + anchoredCloses[i]) / 3;
        deviations.push(typicalPrice - anchoredVWAP);
    }
    const meanDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const variance = deviations.reduce((sum, dev) => sum + Math.pow(dev - meanDeviation, 2), 0) / deviations.length;
    const stdDev = Math.sqrt(variance);
    const upperBand = anchoredVWAP + (stdDev * standardDeviations);
    const lowerBand = anchoredVWAP - (stdDev * standardDeviations);
    // Determine band position
    let bandPosition;
    if (currentPrice > upperBand) {
        bandPosition = 'above_upper';
    }
    else if (currentPrice < lowerBand) {
        bandPosition = 'below_lower';
    }
    else if (Math.abs(currentPrice - anchoredVWAP) / anchoredVWAP < 0.001) {
        bandPosition = 'at_vwap';
    }
    else {
        bandPosition = 'between_bands';
    }
    // Calculate signal strength based on distance from VWAP
    const strength = Math.min(100, Math.abs(priceVsVWAP) * 2);
    // Generate trading signal
    let signal = 'neutral';
    if (bandPosition === 'below_lower' && trend === 'bullish') {
        signal = 'buy'; // Rejection of lower band in uptrend
    }
    else if (bandPosition === 'above_upper' && trend === 'bearish') {
        signal = 'sell'; // Rejection of upper band in downtrend
    }
    else if (position === 'above' && Math.abs(priceVsVWAP) > 0.5) {
        signal = 'buy'; // Sustained above VWAP
    }
    else if (position === 'below' && Math.abs(priceVsVWAP) > 0.5) {
        signal = 'sell'; // Sustained below VWAP
    }
    // Determine institutional bias
    let institutionalBias = 'neutral';
    if (currentPrice > anchoredVWAP && volumeSum > anchoredVolumes[anchoredVolumes.length - 1] * 10) {
        institutionalBias = 'bullish'; // Strong volume above VWAP
    }
    else if (currentPrice < anchoredVWAP && volumeSum > anchoredVolumes[anchoredVolumes.length - 1] * 10) {
        institutionalBias = 'bearish'; // Strong volume below VWAP
    }
    return {
        anchoredVWAP,
        anchorPrice,
        anchorIndex,
        priceVsVWAP,
        position,
        trend,
        upperBand,
        lowerBand,
        bandPosition,
        strength,
        signal,
        institutionalBias
    };
}
/**
 * Find optimal anchor points based on significant price levels
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @returns Array of potential anchor indices
 */
export function findAnchorPoints(highs, lows, closes) {
    const anchors = [];
    // Find swing highs and lows as potential anchors
    for (let i = 2; i < highs.length - 2; i++) {
        // Swing high: higher than previous 2 and next 2 periods
        if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] &&
            highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
            anchors.push(i);
        }
        // Swing low: lower than previous 2 and next 2 periods
        if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] &&
            lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
            anchors.push(i);
        }
    }
    // Remove duplicates and sort
    return [...new Set(anchors)].sort((a, b) => a - b);
}
/**
 * Calculate multiple anchored VWAPs from different anchor points
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volume data
 * @param anchorIndices Array of anchor indices
 * @returns Array of AnchoredVWAPData objects
 */
export function calculateMultipleAnchoredVWAP(highs, lows, closes, volumes, anchorIndices) {
    return anchorIndices
        .map(anchorIndex => calculateAnchoredVWAP(highs, lows, closes, volumes, anchorIndex))
        .filter((vwap) => vwap !== null);
}
/**
 * Get Anchored VWAP interpretation
 * @param vwap AnchoredVWAPData object
 * @returns Human-readable interpretation
 */
export function getAnchoredVWAPInterpretation(vwap) {
    const { anchoredVWAP, position, bandPosition, institutionalBias, signal } = vwap;
    let interpretation = `Anchored VWAP: ${anchoredVWAP.toFixed(4)}`;
    if (bandPosition === 'above_upper') {
        interpretation += ' - Above upper band';
    }
    else if (bandPosition === 'below_lower') {
        interpretation += ' - Below lower band';
    }
    else if (bandPosition === 'at_vwap') {
        interpretation += ' - At VWAP level';
    }
    else {
        interpretation += ` - ${position} VWAP`;
    }
    if (institutionalBias !== 'neutral') {
        interpretation += ` (${institutionalBias} institutional bias)`;
    }
    if (signal !== 'neutral') {
        interpretation += ` - ${signal.toUpperCase()} signal`;
    }
    return interpretation;
}
/**
 * Analyze VWAP trend strength
 * @param vwap AnchoredVWAPData object
 * @returns Trend strength analysis
 */
export function analyzeVWAPTrendStrength(vwap) {
    const { strength, institutionalBias, bandPosition } = vwap;
    let trendStrength = strength;
    let institutionalConfidence = 0;
    let recommendation = 'Monitor price action around VWAP';
    // Adjust strength based on band position
    if (bandPosition === 'above_upper' || bandPosition === 'below_lower') {
        trendStrength += 20; // Extreme positions add strength
    }
    // Institutional confidence based on bias
    if (institutionalBias === 'bullish') {
        institutionalConfidence = 80;
        recommendation = 'Strong institutional buying - bullish bias';
    }
    else if (institutionalBias === 'bearish') {
        institutionalConfidence = 80;
        recommendation = 'Strong institutional selling - bearish bias';
    }
    else {
        institutionalConfidence = 50;
    }
    return { trendStrength, institutionalConfidence, recommendation };
}
