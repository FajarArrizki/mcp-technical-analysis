/**
 * Market Structure Analysis
 * detectChangeOfCharacter function
 */
/**
 * Detect Change of Character (COC) in market structure
 * COC indicates shift in market structure - possible trend reversal
 */
export function detectChangeOfCharacter(historicalData, currentPrice) {
    if (!historicalData || historicalData.length < 20 || !currentPrice || currentPrice <= 0) {
        return null;
    }
    const highs = historicalData.map(d => d.high);
    const lows = historicalData.map(d => d.low);
    const closes = historicalData.map(d => d.close);
    // Detect swing highs and lows (similar to calculateSupportResistance)
    const swingHighs = [];
    const swingLows = [];
    // More sensitive swing detection for COC
    for (let i = 3; i < closes.length - 3; i++) {
        // Swing high: higher than previous 3 and next 3 candles
        if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i - 3] &&
            highs[i] > highs[i + 1] && highs[i] > highs[i + 2] && highs[i] > highs[i + 3]) {
            swingHighs.push({
                price: highs[i],
                index: i,
                timestamp: historicalData[i].time || Date.now()
            });
        }
        // Swing low: lower than previous 3 and next 3 candles
        if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i - 3] &&
            lows[i] < lows[i + 1] && lows[i] < lows[i + 2] && lows[i] < lows[i + 3]) {
            swingLows.push({
                price: lows[i],
                index: i,
                timestamp: historicalData[i].time || Date.now()
            });
        }
    }
    if (swingHighs.length < 2 || swingLows.length < 2) {
        return {
            structure: 'neutral',
            coc: 'none',
            lastSwingHigh: swingHighs.length > 0 ? swingHighs[swingHighs.length - 1].price : null,
            lastSwingLow: swingLows.length > 0 ? swingLows[swingLows.length - 1].price : null,
            structureStrength: 0,
            reversalSignal: false,
            swingHighs: [],
            swingLows: [],
            timestamp: Date.now()
        };
    }
    // Get recent swing points (last 5 swings)
    const recentSwingHighs = swingHighs.slice(-5);
    const recentSwingLows = swingLows.slice(-5);
    // Determine market structure
    let structure = 'neutral';
    let coc = 'none';
    let reversalSignal = false;
    // Analyze structure: HH (Higher High), HL (Higher Low), LH (Lower High), LL (Lower Low)
    if (recentSwingHighs.length >= 2 && recentSwingLows.length >= 2) {
        const lastSwingHigh = recentSwingHighs[recentSwingHighs.length - 1];
        const prevSwingHigh = recentSwingHighs[recentSwingHighs.length - 2];
        const lastSwingLow = recentSwingLows[recentSwingLows.length - 1];
        const prevSwingLow = recentSwingLows[recentSwingLows.length - 2];
        // Bullish structure: HH and HL
        const isHigherHigh = lastSwingHigh.price > prevSwingHigh.price;
        const isHigherLow = lastSwingLow.price > prevSwingLow.price;
        const isLowerHigh = lastSwingHigh.price < prevSwingHigh.price;
        const isLowerLow = lastSwingLow.price < prevSwingLow.price;
        if (isHigherHigh && isHigherLow) {
            structure = 'bullish'; // HH + HL = uptrend
        }
        else if (isLowerHigh && isLowerLow) {
            structure = 'bearish'; // LH + LL = downtrend
        }
        else if (isHigherHigh && isLowerLow) {
            structure = 'bullish'; // HH + LL = potential reversal to uptrend
            coc = 'bullish'; // Bullish COC: LL → breaks to HH
            reversalSignal = true;
        }
        else if (isLowerHigh && isHigherLow) {
            structure = 'bearish'; // LH + HL = potential reversal to downtrend
            coc = 'bearish'; // Bearish COC: HH → breaks to LL
            reversalSignal = true;
        }
        else {
            structure = 'neutral';
        }
    }
    // Check if price broke structure (confirmation of COC)
    if (recentSwingHighs.length > 0 && recentSwingLows.length > 0) {
        const lastSwingHigh = recentSwingHighs[recentSwingHighs.length - 1];
        const lastSwingLow = recentSwingLows[recentSwingLows.length - 1];
        // Bullish COC confirmation: price breaks above last swing high after making LL
        if (structure === 'bullish' && coc === 'bullish' && currentPrice > lastSwingHigh.price) {
            reversalSignal = true;
        }
        // Bearish COC confirmation: price breaks below last swing low after making HH
        if (structure === 'bearish' && coc === 'bearish' && currentPrice < lastSwingLow.price) {
            reversalSignal = true;
        }
    }
    // Calculate structure strength (0-100)
    let structureStrength = 0;
    if (recentSwingHighs.length >= 3 && recentSwingLows.length >= 3) {
        // Check consistency of swings
        let consistentHighs = 0;
        let consistentLows = 0;
        for (let i = 1; i < recentSwingHighs.length; i++) {
            if (recentSwingHighs[i].price > recentSwingHighs[i - 1].price) {
                consistentHighs++;
            }
        }
        for (let i = 1; i < recentSwingLows.length; i++) {
            if (recentSwingLows[i].price > recentSwingLows[i - 1].price) {
                consistentLows++;
            }
        }
        // Strength based on consistency
        const highConsistency = recentSwingHighs.length > 1 ? consistentHighs / (recentSwingHighs.length - 1) : 0;
        const lowConsistency = recentSwingLows.length > 1 ? consistentLows / (recentSwingLows.length - 1) : 0;
        structureStrength = ((highConsistency + lowConsistency) / 2) * 100;
    }
    return {
        structure: structure, // 'bullish' | 'bearish' | 'neutral'
        coc: coc, // 'bullish' | 'bearish' | 'none'
        lastSwingHigh: recentSwingHighs.length > 0 ? recentSwingHighs[recentSwingHighs.length - 1].price : null,
        lastSwingLow: recentSwingLows.length > 0 ? recentSwingLows[recentSwingLows.length - 1].price : null,
        structureStrength: structureStrength, // 0-100
        reversalSignal: reversalSignal, // boolean
        swingHighs: recentSwingHighs,
        swingLows: recentSwingLows,
        timestamp: Date.now()
    };
}
