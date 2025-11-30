/**
 * Donchian Channels Indicator
 * Channels based on highest high and lowest low over a period
 */
export function calculateDonchianChannels(highs, lows, period = 20) {
    // Minimum 3 data points required
    if (highs.length < 3 || lows.length < 3) {
        return {
            upper: null,
            middle: null,
            lower: null,
            position: null,
        };
    }
    // Use adaptive period
    const effectivePeriod = Math.min(period, highs.length);
    // Calculate the most recent channel
    const recentHighs = highs.slice(-effectivePeriod);
    const recentLows = lows.slice(-effectivePeriod);
    const upper = Math.max(...recentHighs);
    const lower = Math.min(...recentLows);
    const middle = (upper + lower) / 2;
    return {
        upper,
        middle,
        lower,
        position: null, // Will be set by caller with current price
    };
}
