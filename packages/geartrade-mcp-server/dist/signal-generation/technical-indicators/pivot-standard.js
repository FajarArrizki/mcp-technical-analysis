/**
 * Pivot Points Standard Indicator
 * Support and resistance levels calculated from previous period OHLC data
 */
export function calculatePivotPoints(high, low, close) {
    // Pivot Point = (High + Low + Close) / 3
    const pivotPoint = (high + low + close) / 3;
    // Resistances
    const resistance1 = (2 * pivotPoint) - low;
    const resistance2 = pivotPoint + (high - low);
    const resistance3 = pivotPoint + 2 * (high - low);
    // Supports
    const support1 = (2 * pivotPoint) - high;
    const support2 = pivotPoint - (high - low);
    const support3 = pivotPoint - 2 * (high - low);
    return {
        pivotPoint,
        resistance1,
        resistance2,
        resistance3,
        support1,
        support2,
        support3,
        currentPosition: null, // Will be set by caller with current price
    };
}
export function getPricePositionRelativeToPivot(currentPrice, pivotData) {
    const { pivotPoint, resistance1, resistance2, resistance3, support1, support2, support3 } = pivotData;
    if (!pivotPoint || !resistance1 || !resistance2 || !resistance3 || !support1 || !support2 || !support3) {
        return 'between_pp_s1'; // Default neutral position
    }
    if (currentPrice >= resistance3)
        return 'above_r3';
    if (currentPrice >= resistance2)
        return 'between_r2_r3';
    if (currentPrice >= resistance1)
        return 'between_r1_r2';
    if (currentPrice >= pivotPoint)
        return 'between_pp_r1';
    if (currentPrice >= support1)
        return 'between_pp_s1';
    if (currentPrice >= support2)
        return 'between_s1_s2';
    if (currentPrice >= support3)
        return 'between_s2_s3';
    return 'below_s3';
}
