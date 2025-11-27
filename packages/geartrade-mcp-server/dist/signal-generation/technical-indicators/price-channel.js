/**
 * Price Channel Indicator
 * Creates support and resistance channels based on highest high and lowest low
 */
/**
 * Calculate Price Channel
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period Period for channel calculation (default 20)
 * @returns PriceChannelData object
 */
export function calculatePriceChannel(highs, lows, closes, period = 20) {
    if (highs.length < period || lows.length < period || closes.length < period) {
        return null;
    }
    // Use the most recent 'period' data points
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    // Calculate channel boundaries
    const upperChannel = Math.max(...recentHighs);
    const lowerChannel = Math.min(...recentLows);
    const middleChannel = (upperChannel + lowerChannel) / 2;
    // Calculate channel dimensions
    const channelHeight = upperChannel - lowerChannel;
    const channelWidth = channelHeight > 0 ? (channelHeight / middleChannel) * 100 : 0;
    // Get current price
    const currentPrice = closes[closes.length - 1];
    const currentHigh = highs[highs.length - 1];
    const currentLow = lows[lows.length - 1];
    // Determine position within channel
    let position;
    if (currentPrice > upperChannel) {
        position = 'above_channel';
    }
    else if (currentPrice < lowerChannel) {
        position = 'below_channel';
    }
    else {
        const channelRange = upperChannel - lowerChannel;
        const positionFromBottom = currentPrice - lowerChannel;
        const relativePosition = positionFromBottom / channelRange;
        if (relativePosition > 0.67) {
            position = 'upper_third';
        }
        else if (relativePosition > 0.33) {
            position = 'middle_third';
        }
        else {
            position = 'lower_third';
        }
    }
    // Calculate distances
    const distanceFromUpper = ((currentPrice - upperChannel) / upperChannel) * 100;
    const distanceFromLower = ((lowerChannel - currentPrice) / lowerChannel) * 100;
    // Determine trend based on channel slope
    let trend = 'sideways';
    if (highs.length >= period + period && lows.length >= period + period) {
        // Compare with previous channel
        const prevHighs = highs.slice(-period * 2, -period);
        const prevLows = lows.slice(-period * 2, -period);
        const prevUpperChannel = Math.max(...prevHighs);
        const prevLowerChannel = Math.min(...prevLows);
        const currentSlope = (upperChannel - lowerChannel) / period;
        const prevSlope = (prevUpperChannel - prevLowerChannel) / period;
        if (upperChannel > prevUpperChannel && lowerChannel > prevLowerChannel) {
            trend = 'uptrend';
        }
        else if (upperChannel < prevUpperChannel && lowerChannel < prevLowerChannel) {
            trend = 'downtrend';
        }
    }
    // Check for breakouts
    const upperBreakout = currentHigh > upperChannel * 1.001; // Small tolerance for floating point
    const lowerBreakout = currentLow < lowerChannel * 0.999;
    // Calculate support/resistance strength based on touches
    let upperTouches = 0;
    let lowerTouches = 0;
    for (let i = 1; i < recentHighs.length; i++) {
        if (Math.abs(recentHighs[i] - upperChannel) / upperChannel < 0.001) {
            upperTouches++;
        }
        if (Math.abs(recentLows[i] - lowerChannel) / lowerChannel < 0.001) {
            lowerTouches++;
        }
    }
    const upperStrength = Math.min(100, (upperTouches / period) * 200);
    const lowerStrength = Math.min(100, (lowerTouches / period) * 200);
    return {
        upperChannel,
        lowerChannel,
        middleChannel,
        channelWidth,
        channelHeight,
        position,
        distanceFromUpper,
        distanceFromLower,
        trend,
        upperBreakout,
        lowerBreakout,
        upperStrength,
        lowerStrength
    };
}
/**
 * Get Price Channel signal
 * @param channel PriceChannelData object
 * @returns Trading signal
 */
export function getPriceChannelSignal(channel) {
    const { position, upperBreakout, lowerBreakout, trend } = channel;
    // Breakout signals have highest priority
    if (upperBreakout && trend === 'uptrend') {
        return 'buy'; // Continuation breakout
    }
    else if (lowerBreakout && trend === 'downtrend') {
        return 'sell'; // Continuation breakout
    }
    else if (upperBreakout) {
        return 'sell'; // Reversal breakout
    }
    else if (lowerBreakout) {
        return 'buy'; // Reversal breakout
    }
    // Position-based signals
    if (position === 'upper_third' && trend === 'downtrend') {
        return 'sell'; // Overbought in downtrend
    }
    else if (position === 'lower_third' && trend === 'uptrend') {
        return 'buy'; // Oversold in uptrend
    }
    else if (position === 'below_channel') {
        return 'buy'; // Extreme oversold
    }
    else if (position === 'above_channel') {
        return 'sell'; // Extreme overbought
    }
    return 'neutral';
}
/**
 * Calculate channel efficiency ratio
 * @param channel PriceChannelData object
 * @param closes Array of closing prices
 * @returns Efficiency ratio (0-100)
 */
export function getChannelEfficiencyRatio(channel, closes) {
    const recentCloses = closes.slice(-20); // Last 20 periods
    let efficientMoves = 0;
    for (let i = 1; i < recentCloses.length; i++) {
        const move = recentCloses[i] - recentCloses[i - 1];
        const channelRange = channel.upperChannel - channel.lowerChannel;
        if (Math.abs(move) > channelRange * 0.1) { // Moves larger than 10% of channel
            efficientMoves++;
        }
    }
    return (efficientMoves / recentCloses.length) * 100;
}
