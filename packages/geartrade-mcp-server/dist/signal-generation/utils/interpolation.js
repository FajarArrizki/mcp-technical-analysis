/**
 * Data Interpolation Utilities
 * interpolateToHourly function
 */
export function interpolateToHourly(dailyData, targetCount) {
    if (!dailyData || dailyData.length === 0) {
        return [];
    }
    // Convert daily data to our format
    const dailyPoints = dailyData.map((candle) => ({
        time: candle[0], // timestamp
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: 0 // Daily data doesn't always include volume
    }));
    if (dailyPoints.length === 0) {
        return [];
    }
    // If we have enough daily data, spread it across targetCount hours
    const hourlyPoints = [];
    const hoursPerDay = 24;
    // const totalHours = dailyPoints.length * hoursPerDay
    // Simple linear interpolation between daily candles
    for (let i = 0; i < dailyPoints.length - 1; i++) {
        const current = dailyPoints[i];
        const next = dailyPoints[i + 1];
        // Interpolate between current and next day
        for (let h = 0; h < hoursPerDay && hourlyPoints.length < targetCount; h++) {
            const ratio = h / hoursPerDay;
            hourlyPoints.push({
                time: current.time + (h * 60 * 60 * 1000), // Add hours in milliseconds
                open: current.open + (next.open - current.open) * ratio,
                high: Math.max(current.high, next.high),
                low: Math.min(current.low, next.low),
                close: current.close + (next.close - current.close) * ratio,
                volume: current.volume / hoursPerDay // Distribute volume across hours
            });
        }
    }
    // Add last day
    if (hourlyPoints.length < targetCount && dailyPoints.length > 0) {
        const lastDay = dailyPoints[dailyPoints.length - 1];
        const remaining = targetCount - hourlyPoints.length;
        for (let h = 0; h < remaining; h++) {
            hourlyPoints.push({
                time: lastDay.time + (h * 60 * 60 * 1000),
                open: lastDay.open,
                high: lastDay.high,
                low: lastDay.low,
                close: lastDay.close,
                volume: lastDay.volume / hoursPerDay
            });
        }
    }
    return hourlyPoints.slice(0, targetCount);
}
