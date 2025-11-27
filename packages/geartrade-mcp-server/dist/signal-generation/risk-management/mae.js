/**
 * Maximum Adverse Excursion (MAE) Calculation
 * calculateMAE function
 */
export function calculateMAE(position, currentPrice, historicalData = []) {
    if (!position || !currentPrice || position.entryPrice <= 0) {
        return null;
    }
    const entryPrice = position.entryPrice;
    const side = position.side || (position.quantity > 0 ? 'LONG' : 'SHORT');
    const entryTime = position.entryTime || Date.now();
    // If we have historical data, find the worst price since entry
    if (historicalData && historicalData.length > 0) {
        // Filter historical data to only include data after entry time
        const relevantData = historicalData.filter(candle => candle.time && candle.time >= entryTime);
        if (relevantData.length > 0) {
            if (side === 'LONG') {
                // For LONG: find the lowest price since entry
                const lowestPrice = Math.min(...relevantData.map(c => c.low || c.close));
                const mae = ((entryPrice - lowestPrice) / entryPrice) * 100;
                return {
                    mae: mae,
                    worstPrice: lowestPrice,
                    worstPriceTime: relevantData.find(c => (c.low || c.close) === lowestPrice)?.time || entryTime,
                    currentAdverseExcursion: ((entryPrice - currentPrice) / entryPrice) * 100
                };
            }
            else {
                // For SHORT: find the highest price since entry
                const highestPrice = Math.max(...relevantData.map(c => c.high || c.close));
                const mae = ((highestPrice - entryPrice) / entryPrice) * 100;
                return {
                    mae: mae,
                    worstPrice: highestPrice,
                    worstPriceTime: relevantData.find(c => (c.high || c.close) === highestPrice)?.time || entryTime,
                    currentAdverseExcursion: ((currentPrice - entryPrice) / entryPrice) * 100
                };
            }
        }
    }
    // Fallback: calculate current adverse excursion if no historical data
    let currentAdverseExcursion = 0;
    if (side === 'LONG') {
        // For LONG: adverse excursion is negative if price is below entry
        currentAdverseExcursion = currentPrice < entryPrice
            ? ((entryPrice - currentPrice) / entryPrice) * 100
            : 0;
    }
    else {
        // For SHORT: adverse excursion is negative if price is above entry
        currentAdverseExcursion = currentPrice > entryPrice
            ? ((currentPrice - entryPrice) / entryPrice) * 100
            : 0;
    }
    return {
        mae: currentAdverseExcursion, // Use current as MAE if no historical data
        worstPrice: side === 'LONG' ? Math.min(entryPrice, currentPrice) : Math.max(entryPrice, currentPrice),
        worstPriceTime: entryTime,
        currentAdverseExcursion: currentAdverseExcursion
    };
}
