/**
 * Positive Volume Index (PVI)
 * Accumulates price changes on days when volume increases from the previous day
 */
/**
 * Calculate Positive Volume Index
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @param initialPVI Initial PVI value (default 1000)
 * @returns PositiveVolumeIndexData object
 */
export function calculatePositiveVolumeIndex(closes, volumes, initialPVI = 1000) {
    if (closes.length !== volumes.length || closes.length < 2) {
        return null;
    }
    let pvi = initialPVI;
    let lastVolume = volumes[0];
    // Calculate PVI up to the current period
    for (let i = 1; i < closes.length; i++) {
        const currentVolume = volumes[i];
        const volumeIncreasing = currentVolume > lastVolume;
        if (volumeIncreasing) {
            const priceChangePercent = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
            pvi = pvi + (pvi * priceChangePercent / 100);
        }
        lastVolume = currentVolume;
    }
    // Calculate current period data
    const currentVolume = volumes[volumes.length - 1];
    const previousVolume = volumes[volumes.length - 2];
    const volumeIncreasing = currentVolume > previousVolume;
    const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;
    const priceChange = ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;
    // Determine trend based on PVI slope
    let trend = 'neutral';
    let slope = 0;
    if (closes.length >= 5) {
        // Calculate slope over last 5 periods
        const recentPVI = calculatePVIHistory(closes.slice(-5), volumes.slice(-5), initialPVI);
        if (recentPVI.length >= 2) {
            slope = (recentPVI[recentPVI.length - 1] - recentPVI[0]) / (recentPVI.length - 1);
            if (slope > 1) {
                trend = 'bullish';
            }
            else if (slope < -1) {
                trend = 'bearish';
            }
        }
    }
    // Calculate signal strength based on slope magnitude
    const strength = Math.min(100, Math.abs(slope) * 10);
    // Generate trading signal
    let signal = 'neutral';
    if (volumeIncreasing && trend === 'bullish' && strength > 20) {
        signal = 'buy';
    }
    else if (volumeIncreasing && trend === 'bearish' && strength > 20) {
        signal = 'sell';
    }
    return {
        pvi,
        volumeChange,
        priceChange,
        trend,
        strength,
        slope,
        signal,
        volumeIncreasing
    };
}
/**
 * Calculate Negative Volume Index
 * @param closes Array of closing prices
 * @param volumes Array of volume data
 * @param initialNVI Initial NVI value (default 1000)
 * @returns NegativeVolumeIndexData object
 */
export function calculateNegativeVolumeIndex(closes, volumes, initialNVI = 1000) {
    if (closes.length !== volumes.length || closes.length < 2) {
        return null;
    }
    let nvi = initialNVI;
    let lastVolume = volumes[0];
    // Calculate NVI up to the current period
    for (let i = 1; i < closes.length; i++) {
        const currentVolume = volumes[i];
        const volumeDecreasing = currentVolume < lastVolume;
        if (volumeDecreasing) {
            const priceChangePercent = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
            nvi = nvi + (nvi * priceChangePercent / 100);
        }
        lastVolume = currentVolume;
    }
    // Calculate current period data
    const currentVolume = volumes[volumes.length - 1];
    const previousVolume = volumes[volumes.length - 2];
    const volumeDecreasing = currentVolume < previousVolume;
    const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;
    const priceChange = ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100;
    // Determine trend based on NVI slope
    let trend = 'neutral';
    let slope = 0;
    if (closes.length >= 5) {
        const recentNVI = calculateNVIHistory(closes.slice(-5), volumes.slice(-5), initialNVI);
        if (recentNVI.length >= 2) {
            slope = (recentNVI[recentNVI.length - 1] - recentNVI[0]) / (recentNVI.length - 1);
            if (slope > 1) {
                trend = 'bullish';
            }
            else if (slope < -1) {
                trend = 'bearish';
            }
        }
    }
    const strength = Math.min(100, Math.abs(slope) * 10);
    let signal = 'neutral';
    if (volumeDecreasing && trend === 'bullish' && strength > 20) {
        signal = 'buy';
    }
    else if (volumeDecreasing && trend === 'bearish' && strength > 20) {
        signal = 'sell';
    }
    return {
        nvi,
        volumeChange,
        priceChange,
        trend,
        strength,
        slope,
        signal,
        volumeDecreasing
    };
}
/**
 * Helper function to calculate PVI history
 */
function calculatePVIHistory(closes, volumes, initialPVI) {
    const pviValues = [];
    let pvi = initialPVI;
    let lastVolume = volumes[0];
    pviValues.push(pvi);
    for (let i = 1; i < closes.length; i++) {
        const currentVolume = volumes[i];
        const volumeIncreasing = currentVolume > lastVolume;
        if (volumeIncreasing) {
            const priceChangePercent = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
            pvi = pvi + (pvi * priceChangePercent / 100);
        }
        pviValues.push(pvi);
        lastVolume = currentVolume;
    }
    return pviValues;
}
/**
 * Helper function to calculate NVI history
 */
function calculateNVIHistory(closes, volumes, initialNVI) {
    const nviValues = [];
    let nvi = initialNVI;
    let lastVolume = volumes[0];
    nviValues.push(nvi);
    for (let i = 1; i < closes.length; i++) {
        const currentVolume = volumes[i];
        const volumeDecreasing = currentVolume < lastVolume;
        if (volumeDecreasing) {
            const priceChangePercent = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
            nvi = nvi + (nvi * priceChangePercent / 100);
        }
        nviValues.push(nvi);
        lastVolume = currentVolume;
    }
    return nviValues;
}
/**
 * Get PVI interpretation
 * @param pvi PositiveVolumeIndexData object
 * @returns Human-readable interpretation
 */
export function getPVIInterpretation(pvi) {
    const { trend, volumeIncreasing, strength, signal } = pvi;
    let interpretation = `PVI: ${pvi.pvi.toFixed(2)}`;
    if (volumeIncreasing) {
        interpretation += ' (Volume ↑)';
    }
    else {
        interpretation += ' (Volume ↓)';
    }
    interpretation += ` - ${trend} trend`;
    if (strength > 50) {
        interpretation += ' (Strong)';
    }
    else if (strength > 20) {
        interpretation += ' (Moderate)';
    }
    else {
        interpretation += ' (Weak)';
    }
    if (signal !== 'neutral') {
        interpretation += ` - ${signal.toUpperCase()} signal`;
    }
    return interpretation;
}
/**
 * Get NVI interpretation
 * @param nvi Negative volume index data
 * @returns Human-readable interpretation
 */
export function getNVIInterpretation(nvi) {
    const { trend, volumeDecreasing, strength, signal } = nvi;
    let interpretation = `NVI: ${nvi.nvi.toFixed(2)}`;
    if (volumeDecreasing) {
        interpretation += ' (Volume ↓)';
    }
    else {
        interpretation += ' (Volume ↑)';
    }
    interpretation += ` - ${trend} trend`;
    if (strength > 50) {
        interpretation += ' (Strong)';
    }
    else if (strength > 20) {
        interpretation += ' (Moderate)';
    }
    else {
        interpretation += ' (Weak)';
    }
    if (signal !== 'neutral') {
        interpretation += ` - ${signal.toUpperCase()} signal`;
    }
    return interpretation;
}
/**
 * Analyze smart money vs public participation
 * @param pvi PositiveVolumeIndexData object
 * @param nvi Negative volume index data
 * @returns Analysis of market participation
 */
export function analyzeSmartMoneyParticipation(pvi, nvi) {
    const pviStrength = pvi.strength;
    const nviStrength = nvi.strength;
    let dominantForce;
    let confidence;
    let interpretation;
    if (nviStrength > pviStrength * 1.5) {
        dominantForce = 'smart_money';
        confidence = Math.min(100, nviStrength);
        interpretation = 'Smart money (institutional investors) are more active on down volume days';
    }
    else if (pviStrength > nviStrength * 1.5) {
        dominantForce = 'public';
        confidence = Math.min(100, pviStrength);
        interpretation = 'Public participation is higher on up volume days';
    }
    else {
        dominantForce = 'balanced';
        confidence = Math.min(100, (pviStrength + nviStrength) / 2);
        interpretation = 'Balanced participation between smart money and public';
    }
    return { dominantForce, confidence, interpretation };
}
