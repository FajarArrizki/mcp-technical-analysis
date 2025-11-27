/**
 * Alligator Indicator (Bill Williams)
 * Three smoothed moving averages representing different phases of market
 */
import { calculateSMMA } from './smma';
export function calculateAlligator(closes, jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5, jawShift = 8, teethShift = 5, lipsShift = 3) {
    if (closes.length < jawPeriod + jawShift) {
        return {
            jaw: null,
            teeth: null,
            lips: null,
            phase: null,
            trend: null,
        };
    }
    // Calculate SMMA for each line
    const jawSMMA = calculateSMMA(closes, jawPeriod);
    const teethSMMA = calculateSMMA(closes, teethPeriod);
    const lipsSMMA = calculateSMMA(closes, lipsPeriod);
    // Apply shifts (looking backwards from current position)
    const currentIndex = closes.length - 1;
    const jawIndex = currentIndex - jawShift;
    const teethIndex = currentIndex - teethShift;
    const lipsIndex = currentIndex - lipsShift;
    const jaw = jawIndex >= 0 && jawIndex < jawSMMA.length ? jawSMMA[jawIndex] : null;
    const teeth = teethIndex >= 0 && teethIndex < teethSMMA.length ? teethSMMA[teethIndex] : null;
    const lips = lipsIndex >= 0 && lipsIndex < lipsSMMA.length ? lipsSMMA[lipsIndex] : null;
    // Determine market phase based on Alligator lines
    let phase = null;
    let trend = null;
    if (jaw !== null && teeth !== null && lips !== null) {
        // Check if lines are intertwined (sleeping phase)
        const linesClose = Math.abs(jaw - teeth) < 0.001 && Math.abs(teeth - lips) < 0.001 && Math.abs(jaw - lips) < 0.001;
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
    }
    return {
        jaw,
        teeth,
        lips,
        phase,
        trend,
    };
}
