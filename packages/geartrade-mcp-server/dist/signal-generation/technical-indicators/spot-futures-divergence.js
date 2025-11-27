/**
 * Spot-Futures Divergence Indicators
 * Track premium/discount, arbitrage opportunities, mean reversion
 */
/**
 * Analyze premium
 */
function analyzePremium(premiumData) {
    const premiumPct = premiumData.premiumPct;
    // Level: high if >0.05%, low if <-0.05%, normal otherwise
    let level = 'normal';
    if (premiumPct > 0.0005) { // 0.05%
        level = 'high';
    }
    else if (premiumPct < -0.0005) {
        level = 'low';
    }
    return {
        current: isNaN(premiumPct) ? 0 : premiumPct,
        level,
        trend: premiumData.trend
    };
}
/**
 * Detect arbitrage opportunities
 */
function detectArbitrage(premiumData) {
    // Arbitrage: if premium is extreme, can profit from convergence
    // Long spot + short futures if premium too high
    // Short spot + long futures if premium too low
    const premiumPct = premiumData.premiumPct;
    let opportunity = false;
    let type = 'none';
    let profit = 0;
    if (premiumPct > 0.002) { // 0.2% premium
        // Premium too high = long spot, short futures
        opportunity = true;
        type = 'long_spot_short_futures';
        profit = premiumPct - 0.002; // Expected profit after convergence
    }
    else if (premiumPct < -0.002) { // -0.2% discount
        // Discount too high = short spot, long futures
        opportunity = true;
        type = 'short_spot_long_futures';
        profit = Math.abs(premiumPct) - 0.002;
    }
    return {
        opportunity,
        type,
        profit: isNaN(profit) ? 0 : Math.max(0, profit)
    };
}
/**
 * Detect mean reversion signal
 */
function detectMeanReversion(premiumData) {
    // Mean reversion: premium tends to revert to 7d average
    const premiumPct = premiumData.premiumPct;
    const avg7d = premiumData.premium7d;
    const deviation = Math.abs(premiumPct - avg7d);
    const avgAbs = Math.abs(avg7d);
    // Signal strength: higher deviation = stronger signal
    const strength = avgAbs > 0 ? Math.min(1, deviation / Math.max(0.0001, avgAbs)) : 0;
    const signal = strength > 0.5 && Math.abs(premiumPct) > 0.0005; // >0.05%
    // Direction: if premium high, expect it to drop (short futures)
    // If premium low, expect it to rise (long futures)
    let direction = 'neutral';
    if (signal) {
        if (premiumPct > avg7d * 1.2) {
            direction = 'short'; // Premium too high, expect drop
        }
        else if (premiumPct < avg7d * 0.8) {
            direction = 'long'; // Premium too low, expect rise
        }
    }
    return {
        signal,
        direction,
        strength: isNaN(strength) ? 0 : strength
    };
}
/**
 * Calculate divergence from average
 */
function calculateDivergence(premiumData) {
    const divergence = premiumData.divergence; // Already in standard deviations
    // Signal: bullish if premium rising above average, bearish if falling below
    let signal = 'neutral';
    if (divergence > 1) {
        signal = 'bullish'; // Premium well above average
    }
    else if (divergence < -1) {
        signal = 'bearish'; // Premium well below average
    }
    return {
        fromAverage: isNaN(divergence) ? 0 : divergence,
        signal
    };
}
/**
 * Calculate spot-futures divergence indicators
 */
export function calculateSpotFuturesDivergenceIndicators(premiumData) {
    const premium = analyzePremium(premiumData);
    const arbitrage = detectArbitrage(premiumData);
    const meanReversion = detectMeanReversion(premiumData);
    const divergence = calculateDivergence(premiumData);
    return {
        premium,
        arbitrage,
        meanReversion,
        divergence
    };
}
