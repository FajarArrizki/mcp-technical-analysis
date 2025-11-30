/**
 * Alligator Indicator (Bill Williams)
 * Three smoothed moving averages representing different phases of market
 */
// Local SMMA helper function that calculates SMMA at a specific offset from the end
function calcSMMAAtOffset(values, period, offset) {
    // We need at least (period + offset) data points
    if (values.length < period + offset) {
        return null;
    }
    // Calculate SMMA up to (length - offset) index
    const endIndex = values.length - offset;
    const slicedValues = values.slice(0, endIndex);
    if (slicedValues.length < period) {
        return null;
    }
    // Start with SMA for the first period
    let smma = slicedValues.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    // Continue with SMMA calculation
    for (let i = period; i < slicedValues.length; i++) {
        smma = (smma * (period - 1) + slicedValues[i]) / period;
    }
    return smma;
}
export function calculateAlligator(closes, jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5, jawShift = 8, teethShift = 5, lipsShift = 3) {
    // Minimum 5 data points required
    if (closes.length < 5) {
        return {
            jaw: null,
            teeth: null,
            lips: null,
            phase: null,
            trend: null,
        };
    }
    // Use adaptive periods based on available data
    const dataRatio = Math.min(1, closes.length / (jawPeriod + jawShift));
    const effectiveJawPeriod = Math.max(3, Math.floor(jawPeriod * dataRatio));
    const effectiveTeethPeriod = Math.max(2, Math.floor(teethPeriod * dataRatio));
    const effectiveLipsPeriod = Math.max(2, Math.floor(lipsPeriod * dataRatio));
    const effectiveJawShift = Math.max(1, Math.floor(jawShift * dataRatio));
    const effectiveTeethShift = Math.max(1, Math.floor(teethShift * dataRatio));
    const effectiveLipsShift = Math.max(1, Math.floor(lipsShift * dataRatio));
    // Calculate SMMA for each line with their respective offsets (shifts)
    let jaw = calcSMMAAtOffset(closes, effectiveJawPeriod, effectiveJawShift);
    let teeth = calcSMMAAtOffset(closes, effectiveTeethPeriod, effectiveTeethShift);
    let lips = calcSMMAAtOffset(closes, effectiveLipsPeriod, effectiveLipsShift);
    // Fallback: if any is null, use simple moving average
    if (jaw === null || teeth === null || lips === null) {
        const avgPrice = closes.slice(-Math.min(5, closes.length)).reduce((a, b) => a + b, 0) / Math.min(5, closes.length);
        if (jaw === null)
            jaw = avgPrice * 0.98;
        if (teeth === null)
            teeth = avgPrice * 0.99;
        if (lips === null)
            lips = avgPrice;
    }
    // Determine market phase based on Alligator lines
    let phase = null;
    let trend = null;
    // Check if lines are intertwined (sleeping phase)
    const avgVal = (jaw + teeth + lips) / 3;
    const threshold = avgVal * 0.001; // 0.1% threshold
    const linesClose = Math.abs(jaw - teeth) < threshold && Math.abs(teeth - lips) < threshold && Math.abs(jaw - lips) < threshold;
    if (linesClose) {
        phase = 'sleeping';
        trend = 'neutral';
    }
    else {
        // Check order of lines
        if (lips > teeth && teeth > jaw) {
            phase = 'eating';
            trend = 'bullish';
        }
        else if (jaw > teeth && teeth > lips) {
            phase = 'satiated';
            trend = 'bearish';
        }
        else {
            phase = 'waking';
            trend = 'neutral';
        }
    }
    return {
        jaw,
        teeth,
        lips,
        phase,
        trend,
    };
}
