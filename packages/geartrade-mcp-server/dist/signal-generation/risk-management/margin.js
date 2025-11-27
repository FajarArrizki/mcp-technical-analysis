/**
 * Dynamic Margin Calculation
 * calculateDynamicMarginPercentage function
 */
export function calculateDynamicMarginPercentage(indicators, externalData, signal, entryPrice) {
    // Base margin: 25% (minimum)
    let marginPercent = 25;
    if (!indicators || !entryPrice || entryPrice <= 0) {
        return marginPercent; // Return minimum if no data
    }
    // 1. Volatility (ATR) - Lower volatility = higher margin (can be more aggressive)
    const atr = indicators.atr || 0;
    if (atr > 0 && entryPrice > 0) {
        const atrPercent = (atr / entryPrice) * 100;
        if (atrPercent < 1.0) {
            marginPercent += 25; // Very low volatility: +25% margin
        }
        else if (atrPercent < 2.0) {
            marginPercent += 20; // Low volatility: +20% margin
        }
        else if (atrPercent < 3.0) {
            marginPercent += 15; // Medium volatility: +15% margin
        }
        else {
            marginPercent += 10; // High volatility: +10% margin
        }
    }
    // 2. Trend Strength (ADX) - Stronger trend = higher margin
    const adx = indicators.adx || 0;
    if (adx > 0) {
        if (adx > 50) {
            marginPercent += 20; // Very strong trend: +20% margin
        }
        else if (adx >= 40) {
            marginPercent += 15; // Strong trend: +15% margin
        }
        else if (adx >= 25) {
            marginPercent += 10; // Moderate trend: +10% margin
        }
        else {
            marginPercent += 5; // Weak trend: +5% margin
        }
    }
    // 3. Confidence Score - Higher confidence = higher margin
    const confidence = signal.confidence || 0;
    if (confidence > 0.7) {
        marginPercent += 15; // Very high confidence: +15% margin
    }
    else if (confidence >= 0.6) {
        marginPercent += 10; // High confidence: +10% margin
    }
    else if (confidence >= 0.5) {
        marginPercent += 5; // Moderate confidence: +5% margin
    }
    // 4. Risk/Reward Ratio - Better R:R = higher margin
    if (signal.take_profit && signal.stop_loss && entryPrice > 0) {
        const profitDistance = Math.abs(signal.take_profit - entryPrice);
        const lossDistance = Math.abs(entryPrice - signal.stop_loss);
        if (lossDistance > 0) {
            const riskRewardRatio = profitDistance / lossDistance;
            if (riskRewardRatio > 3.0) {
                marginPercent += 15; // Excellent R:R (>3:1): +15% margin
            }
            else if (riskRewardRatio >= 2.0) {
                marginPercent += 10; // Good R:R (2-3:1): +10% margin
            }
            else if (riskRewardRatio >= 1.5) {
                marginPercent += 5; // Decent R:R (1.5-2:1): +5% margin
            }
        }
    }
    // 5. Market Structure (COC) - Clear structure = higher margin
    const marketStructure = externalData?.marketStructure;
    if (marketStructure && marketStructure.coc) {
        const coc = marketStructure.coc;
        if (coc.reversalSignal && coc.structureStrength > 70) {
            marginPercent += 10; // Strong reversal signal: +10% margin
        }
        else if (coc.structureStrength > 50) {
            marginPercent += 5; // Clear structure: +5% margin
        }
    }
    // 6. Volume Profile - Price at POC = higher margin
    const volumeProfile = externalData?.volumeProfile;
    if (volumeProfile && volumeProfile.session && entryPrice > 0) {
        const svp = volumeProfile.session;
        if (svp.poc && svp.poc > 0) {
            const priceToPoc = Math.abs((entryPrice - svp.poc) / svp.poc) * 100;
            if (priceToPoc < 1.0) {
                marginPercent += 10; // Price at POC: +10% margin
            }
            else if (priceToPoc < 2.0) {
                marginPercent += 5; // Price at VAH/VAL: +5% margin
            }
        }
    }
    // Clamp margin between 25% (minimum) and 100% (maximum)
    return Math.max(25, Math.min(100, marginPercent));
}
