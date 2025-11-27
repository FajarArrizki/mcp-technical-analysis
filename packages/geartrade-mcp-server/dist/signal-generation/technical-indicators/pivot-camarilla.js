/**
 * Camarilla Pivot Points Indicator
 * Calculates support and resistance levels using Camarilla equations
 */
/**
 * Calculate Camarilla Pivot Points
 * @param high Previous period's high price
 * @param low Previous period's low price
 * @param close Previous period's close price
 * @param currentPrice Current price (optional, for position analysis)
 * @returns CamarillaPivotData object
 */
export function calculateCamarillaPivots(high, low, close, currentPrice) {
    // Calculate range
    const range = high - low;
    // Calculate pivot point
    const pivot = (high + low + close) / 3;
    // Calculate resistance levels
    const r1 = close + (range * 1.1 / 12);
    const r2 = close + (range * 1.1 / 6);
    const r3 = close + (range * 1.1 / 4);
    const r4 = close + (range * 1.1 / 2);
    const r5 = close + (range * 1.1 / 1.5); // Extended projection
    // Calculate support levels
    const s1 = close - (range * 1.1 / 12);
    const s2 = close - (range * 1.1 / 6);
    const s3 = close - (range * 1.1 / 4);
    const s4 = close - (range * 1.1 / 2);
    const s5 = close - (range * 1.1 / 1.5); // Extended projection
    // Determine position if current price is provided
    let position = 'at_pp';
    let nearestResistance = null;
    let nearestSupport = null;
    let distanceToResistance = 0;
    let distanceToSupport = 0;
    if (currentPrice) {
        if (currentPrice > r5) {
            position = 'above_r5';
            nearestResistance = null;
            nearestSupport = r5;
            distanceToResistance = 0;
            distanceToSupport = ((currentPrice - r5) / currentPrice) * 100;
        }
        else if (currentPrice > r4) {
            position = 'between_r4_r5';
            nearestResistance = r5;
            nearestSupport = r4;
            distanceToResistance = ((r5 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - r4) / currentPrice) * 100;
        }
        else if (currentPrice > r3) {
            position = 'between_r3_r4';
            nearestResistance = r4;
            nearestSupport = r3;
            distanceToResistance = ((r4 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - r3) / currentPrice) * 100;
        }
        else if (currentPrice > r2) {
            position = 'between_r2_r3';
            nearestResistance = r3;
            nearestSupport = r2;
            distanceToResistance = ((r3 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - r2) / currentPrice) * 100;
        }
        else if (currentPrice > r1) {
            position = 'between_r1_r2';
            nearestResistance = r2;
            nearestSupport = r1;
            distanceToResistance = ((r2 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - r1) / currentPrice) * 100;
        }
        else if (currentPrice > pivot) {
            position = 'between_pp_r1';
            nearestResistance = r1;
            nearestSupport = pivot;
            distanceToResistance = ((r1 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - pivot) / currentPrice) * 100;
        }
        else if (currentPrice < pivot && currentPrice > s1) {
            position = 'between_pp_s1';
            nearestResistance = pivot;
            nearestSupport = s1;
            distanceToResistance = ((pivot - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - s1) / currentPrice) * 100;
        }
        else if (currentPrice > s2) {
            position = 'between_s1_s2';
            nearestResistance = s1;
            nearestSupport = s2;
            distanceToResistance = ((s1 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - s2) / currentPrice) * 100;
        }
        else if (currentPrice > s3) {
            position = 'between_s2_s3';
            nearestResistance = s2;
            nearestSupport = s3;
            distanceToResistance = ((s2 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - s3) / currentPrice) * 100;
        }
        else if (currentPrice > s4) {
            position = 'between_s3_s4';
            nearestResistance = s3;
            nearestSupport = s4;
            distanceToResistance = ((s3 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - s4) / currentPrice) * 100;
        }
        else if (currentPrice > s5) {
            position = 'between_s4_s5';
            nearestResistance = s4;
            nearestSupport = s5;
            distanceToResistance = ((s4 - currentPrice) / currentPrice) * 100;
            distanceToSupport = ((currentPrice - s5) / currentPrice) * 100;
        }
        else {
            position = 'below_s5';
            nearestResistance = s5;
            nearestSupport = null;
            distanceToResistance = ((s5 - currentPrice) / currentPrice) * 100;
            distanceToSupport = 0;
        }
    }
    // Determine breakout signals
    const bullishBreakout = currentPrice ? currentPrice > r4 : false;
    const bearishBreakout = currentPrice ? currentPrice < s4 : false;
    // Assess level strength based on range
    let levelStrength = 'moderate';
    const rangePercent = (range / close) * 100;
    if (rangePercent < 1) {
        levelStrength = 'weak';
    }
    else if (rangePercent > 3) {
        levelStrength = 'very_strong';
    }
    else if (rangePercent > 2) {
        levelStrength = 'strong';
    }
    // Calculate breakout targets
    let breakoutTarget = null;
    if (bullishBreakout) {
        breakoutTarget = r5;
    }
    else if (bearishBreakout) {
        breakoutTarget = s5;
    }
    return {
        pivot,
        r1, r2, r3, r4, r5,
        s1, s2, s3, s4, s5,
        position,
        nearestResistance,
        nearestSupport,
        distanceToResistance,
        distanceToSupport,
        bullishBreakout,
        bearishBreakout,
        levelStrength,
        breakoutTarget
    };
}
/**
 * Get Camarilla pivot signal
 * @param pivots CamarillaPivotData object
 * @returns Trading signal
 */
export function getCamarillaSignal(pivots) {
    const { position, bullishBreakout, bearishBreakout, levelStrength } = pivots;
    // Strong breakout signals
    if (bullishBreakout && levelStrength === 'strong') {
        return 'buy';
    }
    else if (bearishBreakout && levelStrength === 'strong') {
        return 'sell';
    }
    // Position-based signals for mean reversion
    if (position === 'above_r5') {
        return 'sell'; // Extreme overbought
    }
    else if (position === 'below_s5') {
        return 'buy'; // Extreme oversold
    }
    else if (position === 'between_r4_r5' || position === 'between_s4_s5') {
        // Near breakout levels - wait for confirmation
        return 'neutral';
    }
    // Bounce signals from key levels
    if (position === 'between_pp_r1' || position === 'between_pp_s1') {
        return 'neutral'; // Too close to pivot
    }
    return 'neutral';
}
/**
 * Calculate Camarilla pivots for multiple timeframes
 * @param dailyHigh Daily high
 * @param dailyLow Daily low
 * @param dailyClose Daily close
 * @param currentPrice Current price
 * @param intradayHigh Current intraday high (optional)
 * @param intradayLow Current intraday low (optional)
 * @returns Combined pivot analysis
 */
export function calculateMultiTimeframeCamarilla(dailyHigh, dailyLow, dailyClose, currentPrice, intradayHigh, intradayLow) {
    const daily = calculateCamarillaPivots(dailyHigh, dailyLow, dailyClose, currentPrice);
    let intraday;
    if (intradayHigh && intradayLow) {
        // Use current price as close for intraday calculation
        intraday = calculateCamarillaPivots(intradayHigh, intradayLow, currentPrice, currentPrice);
    }
    // Determine combined signal
    const dailySignal = getCamarillaSignal(daily);
    const intradaySignal = intraday ? getCamarillaSignal(intraday) : 'neutral';
    let combinedSignal = 'neutral';
    if (dailySignal === intradaySignal && dailySignal !== 'neutral') {
        combinedSignal = dailySignal;
    }
    else if (dailySignal !== 'neutral') {
        combinedSignal = dailySignal; // Favor daily signal
    }
    else if (intradaySignal !== 'neutral') {
        combinedSignal = intradaySignal;
    }
    // Check for confluence (price at same level on multiple timeframes)
    const confluence = intraday ? checkPivotConfluence(daily, intraday, currentPrice) : false;
    return {
        daily,
        intraday,
        combinedSignal,
        confluence
    };
}
/**
 * Helper function to check pivot confluence
 */
function checkPivotConfluence(daily, intraday, currentPrice) {
    const tolerance = 0.001; // 0.1% tolerance
    // Check if current price is near a pivot level on both timeframes
    const dailyLevels = [daily.r1, daily.r2, daily.r3, daily.r4, daily.pivot, daily.s1, daily.s2, daily.s3, daily.s4];
    const intradayLevels = [intraday.r1, intraday.r2, intraday.r3, intraday.r4, intraday.pivot, intraday.s1, intraday.s2, intraday.s3, intraday.s4];
    for (const dailyLevel of dailyLevels) {
        for (const intradayLevel of intradayLevels) {
            if (Math.abs(dailyLevel - intradayLevel) / dailyLevel < tolerance) {
                // Levels are close, check if current price is near this confluence
                if (Math.abs(currentPrice - dailyLevel) / currentPrice < 0.005) { // Within 0.5%
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Get Camarilla pivot interpretation
 * @param pivots CamarillaPivotData object
 * @returns Human-readable interpretation
 */
export function getCamarillaInterpretation(pivots) {
    const { position, levelStrength, bullishBreakout, bearishBreakout, breakoutTarget } = pivots;
    let interpretation = `Camarilla Pivots - Position: ${position.replace('_', ' ').toUpperCase()}`;
    if (bullishBreakout) {
        interpretation += ` - Bullish breakout above R4`;
        if (breakoutTarget) {
            interpretation += ` - Target: ${breakoutTarget.toFixed(4)}`;
        }
    }
    else if (bearishBreakout) {
        interpretation += ` - Bearish breakout below S4`;
        if (breakoutTarget) {
            interpretation += ` - Target: ${breakoutTarget.toFixed(4)}`;
        }
    }
    else {
        interpretation += ` - ${levelStrength} level strength`;
    }
    return interpretation;
}
