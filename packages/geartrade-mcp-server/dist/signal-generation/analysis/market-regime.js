/**
 * Market Regime Detection
 * detectMarketRegime function
 */
import { calculateATR } from '../technical-indicators';
export function detectMarketRegime(adx, atr, currentPrice, historicalData = [], lookbackATR = 20) {
    let regime = 'neutral';
    let volatility = 'normal';
    // Determine trend strength from ADX
    if (adx && adx > 25) {
        regime = 'trending';
    }
    else if (adx && adx < 20) {
        regime = 'choppy';
    }
    else {
        regime = 'neutral';
    }
    // Determine volatility from ATR - compare current ATR to historical average
    if (atr && currentPrice > 0) {
        const atrPercent = (atr / currentPrice) * 100;
        // If we have historical data, calculate average ATR for comparison
        if (historicalData && historicalData.length >= lookbackATR) {
            const recentData = historicalData.slice(-lookbackATR);
            const atrValues = [];
            // Calculate ATR for each period in historical data
            for (let i = 14; i < recentData.length; i++) {
                const periodData = recentData.slice(i - 14, i);
                if (periodData.length === 14) {
                    const highs = periodData.map(d => d.high || d.close);
                    const lows = periodData.map(d => d.low || d.close);
                    const closes = periodData.map(d => d.close);
                    const periodATR = calculateATR(highs, lows, closes, 14);
                    if (periodATR && periodATR.length > 0) {
                        atrValues.push(periodATR[periodATR.length - 1]);
                    }
                }
            }
            if (atrValues.length > 0) {
                const avgATR = atrValues.reduce((a, b) => a + b, 0) / atrValues.length;
                const avgATRPercent = (avgATR / currentPrice) * 100;
                // Compare current ATR to average
                if (atrPercent > avgATRPercent * 1.5) {
                    volatility = 'high';
                }
                else if (atrPercent < avgATRPercent * 0.5) {
                    volatility = 'low';
                }
                else {
                    volatility = 'normal';
                }
            }
            else {
                // Fallback to simple percentage check
                if (atrPercent > 3) {
                    volatility = 'high';
                }
                else if (atrPercent < 1) {
                    volatility = 'low';
                }
                else {
                    volatility = 'normal';
                }
            }
        }
        else {
            // Fallback to simple percentage check if no historical data
            if (atrPercent > 3) {
                volatility = 'high';
            }
            else if (atrPercent < 1) {
                volatility = 'low';
            }
            else {
                volatility = 'normal';
            }
        }
    }
    // Calculate regime score (0-100) based on regime strength
    let regimeScore = 0;
    if (regime === 'trending') {
        regimeScore += 50; // Trending regime (50 points)
        if (adx && adx > 25) {
            regimeScore += 30; // Strong trend (ADX > 25)
        }
        else if (adx && adx > 20) {
            regimeScore += 20; // Moderate trend (ADX > 20)
        }
        else if (adx && adx > 15) {
            regimeScore += 10; // Weak trend (ADX > 15)
        }
    }
    else if (regime === 'choppy') {
        regimeScore += 20; // Choppy/ranging regime (20 points)
    }
    else if (regime === 'neutral') {
        regimeScore += 30; // Neutral regime (30 points)
    }
    // Add volatility score
    if (volatility === 'normal') {
        regimeScore += 20; // Normal volatility (20 points)
    }
    else if (volatility === 'low') {
        regimeScore += 10; // Low volatility (10 points)
    }
    else if (volatility === 'high') {
        regimeScore += 5; // High volatility (5 points - less predictable)
    }
    // Clamp to 0-100
    regimeScore = Math.max(0, Math.min(100, regimeScore));
    return {
        regime: regime,
        volatility: volatility,
        adx: adx || null,
        atrPercent: atr && currentPrice > 0 ? (atr / currentPrice) * 100 : null,
        regimeScore: regimeScore
    };
}
