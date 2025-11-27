/**
 * Dynamic Leverage Calculation
 * calculateDynamicLeverage function
 */
export function calculateDynamicLeverage(indicators, externalData, signal, entryPrice, maxLeverage = 10) {
    // Base leverage: 1x (minimum)
    const assetMaxLeverage = maxLeverage || (externalData?.hyperliquid?.maxLeverage) || 10;
    let leverage = 1; // Start from minimum 1x
    if (!indicators || !entryPrice || entryPrice <= 0) {
        return leverage; // Return minimum if no data
    }
    // 1. Volatility (ATR) - Lower volatility = higher leverage (inverse relationship)
    const atr = indicators.atr || 0;
    if (atr > 0 && entryPrice > 0) {
        const atrPercent = (atr / entryPrice) * 100;
        if (atrPercent < 1.0) {
            leverage += 2.0; // Very low volatility: +2x leverage
        }
        else if (atrPercent < 2.0) {
            leverage += 1.5; // Low volatility: +1.5x leverage
        }
        else if (atrPercent < 3.0) {
            leverage += 1.0; // Medium volatility: +1x leverage
        }
        else {
            leverage += 0.5; // High volatility: +0.5x leverage
        }
    }
    // 2. Trend Strength (ADX) - Stronger trend = higher leverage
    const adx = indicators.adx || 0;
    if (adx > 0) {
        if (adx > 50) {
            leverage += 2.0; // Very strong trend: +2x leverage
        }
        else if (adx >= 40) {
            leverage += 1.5; // Strong trend: +1.5x leverage
        }
        else if (adx >= 25) {
            leverage += 1.0; // Moderate trend: +1x leverage
        }
        else {
            leverage += 0.5; // Weak trend: +0.5x leverage
        }
    }
    // 3. Confidence Score - Higher confidence = higher leverage
    const confidence = signal.confidence || 0;
    if (confidence > 0.7) {
        leverage += 1.5; // Very high confidence: +1.5x leverage
    }
    else if (confidence >= 0.6) {
        leverage += 1.0; // High confidence: +1x leverage
    }
    else if (confidence >= 0.5) {
        leverage += 0.5; // Moderate confidence: +0.5x leverage
    }
    // 4. Risk/Reward Ratio - Better R:R = higher leverage
    if (signal.take_profit && signal.stop_loss && entryPrice > 0) {
        const profitDistance = Math.abs(signal.take_profit - entryPrice);
        const lossDistance = Math.abs(entryPrice - signal.stop_loss);
        if (lossDistance > 0) {
            const riskRewardRatio = profitDistance / lossDistance;
            if (riskRewardRatio > 3.0) {
                leverage += 1.0; // Excellent R:R (>3:1): +1x leverage
            }
            else if (riskRewardRatio >= 2.0) {
                leverage += 0.5; // Good R:R (2-3:1): +0.5x leverage
            }
        }
    }
    // 5. Market Structure (COC) - Clear structure = higher leverage
    const marketStructure = externalData?.marketStructure;
    if (marketStructure && marketStructure.coc) {
        const coc = marketStructure.coc;
        if (coc.reversalSignal && coc.structureStrength > 70) {
            leverage += 1.0; // Strong reversal signal: +1x leverage
        }
        else if (coc.structureStrength > 50) {
            leverage += 0.5; // Clear structure: +0.5x leverage
        }
    }
    // 6. Volume Profile - Price at POC = higher leverage
    const volumeProfile = externalData?.volumeProfile;
    if (volumeProfile && volumeProfile.session && entryPrice > 0) {
        const svp = volumeProfile.session;
        if (svp.poc && svp.poc > 0) {
            const priceToPoc = Math.abs((entryPrice - svp.poc) / svp.poc) * 100;
            if (priceToPoc < 1.0) {
                leverage += 0.5; // Price at POC: +0.5x leverage
            }
            else if (priceToPoc < 2.0) {
                leverage += 0.25; // Price at VAH/VAL: +0.25x leverage
            }
        }
    }
    // Clamp leverage between 1x (minimum) and assetMaxLeverage (maximum from Hyperliquid)
    return Math.max(1, Math.min(assetMaxLeverage, Math.round(leverage * 10) / 10));
}
