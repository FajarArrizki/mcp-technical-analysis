/**
 * Open Interest Indicators
 * Analyze OI trends, divergence, momentum, concentration
 */
/**
 * Calculate OI trend
 */
function calculateTrend(oiData) {
    const change24h = oiData.change24h;
    const momentum = oiData.momentum;
    // Determine direction
    let direction = 'neutral';
    if (change24h > 2) {
        direction = 'rising';
    }
    else if (change24h < -2) {
        direction = 'falling';
    }
    // Strength: absolute change percentage
    const strength = Math.min(1, Math.abs(change24h) / 10); // Scale to 0-1 (max 10% change = 1.0)
    // Momentum score (normalize to 0-1)
    const momentumScore = Math.min(1, Math.abs(momentum) / 100);
    return {
        direction,
        strength: isNaN(strength) ? 0 : strength,
        momentum: isNaN(momentumScore) ? 0 : momentumScore
    };
}
/**
 * Detect OI vs Price divergence
 */
function detectPriceDivergence(oiData, priceChange24h) {
    const oiChange = oiData.change24h;
    // Bullish divergence: Price down but OI up (accumulation)
    // Bearish divergence: Price up but OI down (distribution)
    let detected = false;
    let type = 'none';
    let strength = 0;
    if (priceChange24h > 0 && oiChange < -3) {
        // Price up, OI down = bearish divergence (weak trend)
        detected = true;
        type = 'bearish';
        strength = Math.min(1, Math.abs(oiChange) / 10);
    }
    else if (priceChange24h < 0 && oiChange > 3) {
        // Price down, OI up = bullish divergence (accumulation)
        detected = true;
        type = 'bullish';
        strength = Math.min(1, Math.abs(oiChange) / 10);
    }
    return {
        detected,
        type,
        strength: isNaN(strength) ? 0 : strength
    };
}
/**
 * Detect OI vs Volume divergence
 */
function detectVolumeDivergence(oiData, volumeChange24h) {
    const oiChange = oiData.change24h;
    // If OI rising but volume falling = institutional accumulation
    // If OI falling but volume rising = distribution
    let detected = false;
    let type = 'none';
    let strength = 0;
    if (oiChange > 3 && volumeChange24h < -10) {
        // OI up, volume down = bullish (institutional)
        detected = true;
        type = 'bullish';
        strength = Math.min(1, Math.abs(oiChange) / 10);
    }
    else if (oiChange < -3 && volumeChange24h > 10) {
        // OI down, volume up = bearish (distribution)
        detected = true;
        type = 'bearish';
        strength = Math.min(1, Math.abs(oiChange) / 10);
    }
    return {
        detected,
        type,
        strength: isNaN(strength) ? 0 : strength
    };
}
/**
 * Calculate OI momentum
 */
function calculateMomentum(oiData) {
    const momentum = oiData.momentum;
    // Momentum score (normalize to 0-1)
    const score = Math.min(1, Math.abs(momentum) / 100);
    // Breakout: strong momentum change (>50% of average)
    const breakout = Math.abs(momentum) > 50;
    return {
        score: isNaN(score) ? 0 : score,
        breakout
    };
}
/**
 * Calculate OI concentration
 */
function calculateConcentration(oiData) {
    const concentration = oiData.concentration;
    // Risk level based on concentration
    let risk = 'low';
    if (concentration > 0.7) {
        risk = 'high'; // Highly concentrated = high risk
    }
    else if (concentration > 0.5) {
        risk = 'medium';
    }
    return {
        level: isNaN(concentration) ? 0.5 : Math.max(0, Math.min(1, concentration)),
        risk
    };
}
/**
 * Calculate OI vs Volume correlation
 */
function calculateVolumeCorrelation(oiData, volumeChange24h) {
    const oiChange = oiData.change24h;
    // Simple correlation: if both moving in same direction = positive
    // If moving opposite = negative
    let correlation = 0;
    if (oiChange !== 0 && volumeChange24h !== 0) {
        // Normalize both to same scale
        const normalizedOI = oiChange / 10; // Scale to -1 to 1
        const normalizedVolume = volumeChange24h / 100; // Scale to -1 to 1
        // Calculate correlation sign
        if (normalizedOI > 0 && normalizedVolume > 0) {
            correlation = Math.min(1, (Math.abs(normalizedOI) + Math.abs(normalizedVolume)) / 2);
        }
        else if (normalizedOI < 0 && normalizedVolume < 0) {
            correlation = Math.min(1, (Math.abs(normalizedOI) + Math.abs(normalizedVolume)) / 2);
        }
        else {
            correlation = -Math.min(1, (Math.abs(normalizedOI) + Math.abs(normalizedVolume)) / 2);
        }
    }
    // Signal: bullish if OI and volume both rising, bearish if both falling
    let signal = 'neutral';
    if (correlation > 0.3 && oiChange > 0) {
        signal = 'bullish';
    }
    else if (correlation < -0.3 && oiChange < 0) {
        signal = 'bearish';
    }
    return {
        vsVolume: isNaN(correlation) ? 0 : Math.max(-1, Math.min(1, correlation)),
        signal
    };
}
/**
 * Calculate open interest indicators
 */
export function calculateOpenInterestIndicators(oiData, priceChange24h, volumeChange24h) {
    const trend = calculateTrend(oiData);
    const divergence = {
        vsPrice: detectPriceDivergence(oiData, priceChange24h || 0),
        vsVolume: detectVolumeDivergence(oiData, volumeChange24h || 0)
    };
    const momentum = calculateMomentum(oiData);
    const concentration = calculateConcentration(oiData);
    const correlation = calculateVolumeCorrelation(oiData, volumeChange24h || 0);
    return {
        trend,
        divergence,
        momentum,
        concentration,
        correlation
    };
}
