/**
 * Bounce Risk Management
 * calculateBounceTPTrail, calculateBounceSLOffset functions
 */
/**
 * Calculate Dynamic TP Trail for Bounce Signals
 * Trails TP based on EMA8 cross detection for faster exit
 */
export function calculateBounceTPTrail(_entryPrice, signal, indicators, historicalData, bounceTP) {
    if (!signal.bounce_mode || !indicators || !historicalData || historicalData.length < 2) {
        return {
            tpPrice: bounceTP,
            isTrailing: false,
            reason: 'Not a bounce signal or insufficient data'
        };
    }
    const isBuyBounce = signal.bounce_type === 'BUY_BOUNCE' ||
        (signal.signal === 'buy_to_enter' && signal.bounce_mode);
    const isSellBounce = signal.bounce_type === 'SELL_BOUNCE' ||
        (signal.signal === 'sell_to_enter' && signal.bounce_mode);
    if (!isBuyBounce && !isSellBounce) {
        return { tpPrice: bounceTP, isTrailing: false, reason: 'Not a bounce signal' };
    }
    const ema8 = indicators.ema8;
    if (!ema8 || ema8 === null) {
        return { tpPrice: bounceTP, isTrailing: false, reason: 'EMA8 not available' };
    }
    const currentPrice = historicalData[historicalData.length - 1].close;
    const previousPrice = historicalData[historicalData.length - 2].close;
    // const previousEma8 = indicators.ema8 // For simplicity, use current EMA8 (in real implementation, track EMA8 history)
    // For BUY bounce: TP trail = min(bounceTP, price when EMA8 crossdown occurs)
    if (isBuyBounce) {
        // Check if EMA8 crossdown occurred (price crossed below EMA8)
        if (previousPrice >= ema8 && currentPrice < ema8) {
            // EMA8 crossdown detected - use current price as trailing TP
            const trailingTP = currentPrice;
            if (trailingTP < bounceTP) {
                return {
                    tpPrice: trailingTP,
                    isTrailing: true,
                    reason: `EMA8 crossdown detected at $${trailingTP.toFixed(2)} (below bounce TP $${bounceTP.toFixed(2)}) - using trailing TP`,
                    emaLevel: ema8
                };
            }
        }
    }
    // For SELL bounce: If price crosses above EMA8, pullback failed - exit at current price
    // TP trail = current price when EMA8 crossup (faster exit than waiting for bounceTP)
    if (isSellBounce) {
        // Check if EMA8 crossup occurred (price crossed above EMA8)
        if (previousPrice <= ema8 && currentPrice > ema8) {
            // EMA8 crossup detected - pullback failed, exit at current price
            const trailingTP = currentPrice;
            // For SELL: Use trailing TP if it's above entry (means we can exit with profit or smaller loss)
            // This allows faster exit when momentum changes
            return {
                tpPrice: trailingTP,
                isTrailing: true,
                reason: `EMA8 crossup detected at $${trailingTP.toFixed(2)} (pullback failed, momentum changed) - using trailing TP for faster exit`,
                emaLevel: ema8
            };
        }
    }
    // No trailing TP - use original bounce TP
    return {
        tpPrice: bounceTP,
        isTrailing: false,
        reason: 'No EMA8 cross detected, using original bounce TP'
    };
}
/**
 * Calculate Dynamic SL Offset for Bounce Signals
 * ATR tinggi → SL × 1.5 (lebar untuk hindari shadow wick)
 * ATR rendah → SL × 0.8 (ketat)
 */
export function calculateBounceSLOffset(slDistance, indicators, entryPrice) {
    if (!indicators || !indicators.atr || !entryPrice) {
        return slDistance; // Return original if no ATR data
    }
    const atr = indicators.atr;
    const atrPercent = (atr / entryPrice) * 100;
    // High ATR (> 3%): Use wider SL (× 1.5) to avoid shadow wick
    if (atrPercent > 3.0) {
        return slDistance * 1.5;
    }
    // Low ATR (< 1.5%): Use tight SL (× 0.8)
    else if (atrPercent < 1.5) {
        return slDistance * 0.8;
    }
    // Normal ATR (1.5% - 3%): Use standard SL
    return slDistance;
}
