/**
 * Anti-Liquidation Position Sizing System
 * Calculate safe leverage, position sizes, liquidation prices with margin buffers
 */
const DEFAULT_CONFIG = {
    maxRiskPerTrade: 3, // 3% max risk per trade
    maxLeverage: 20, // 20x default max
    minLiquidationBuffer: 30, // 30% min buffer
    marginBuffer: 20, // 20% margin buffer
    capital: 1000 // $1000 default
};
/**
 * Calculate liquidation price
 */
export function calculateLiquidationPrice(entryPrice, leverage, side, marginBuffer = 0) {
    // Liquidation price formula:
    // LONG: liquidation_price = entry_price * (1 - (1 / leverage) * (1 - margin_buffer))
    // SHORT: liquidation_price = entry_price * (1 + (1 / leverage) * (1 - margin_buffer))
    if (entryPrice <= 0 || leverage <= 0 || !isFinite(entryPrice) || !isFinite(leverage)) {
        throw new Error('Invalid entry price or leverage');
    }
    const marginRate = 1 / leverage; // Margin rate (e.g., 1/20 = 5% for 20x)
    const adjustedMarginRate = marginRate * (1 - marginBuffer / 100); // Apply margin buffer
    let liquidationPrice;
    if (side === 'LONG') {
        liquidationPrice = entryPrice * (1 - adjustedMarginRate);
    }
    else {
        liquidationPrice = entryPrice * (1 + adjustedMarginRate);
    }
    // Calculate distance to liquidation (%)
    const distance = Math.abs(liquidationPrice - entryPrice) / entryPrice * 100;
    // Safe distance (should be > minLiquidationBuffer)
    const safeDistance = distance;
    const marginBufferPct = marginBuffer;
    return {
        entryPrice: isNaN(entryPrice) ? 0 : entryPrice,
        leverage: isNaN(leverage) ? 1 : leverage,
        side,
        liquidationPrice: isNaN(liquidationPrice) || !isFinite(liquidationPrice) ? 0 : liquidationPrice,
        liquidationDistance: isNaN(distance) || !isFinite(distance) ? 0 : distance,
        safeDistance: isNaN(safeDistance) || !isFinite(safeDistance) ? 0 : safeDistance,
        marginBuffer: isNaN(marginBufferPct) ? 0 : marginBufferPct
    };
}
/**
 * Calculate safe leverage based on volatility and liquidation distance
 */
export function calculateSafeLeverage(volatility, // ATR% or volatility %
minLiquidationBuffer = 30, maxLeverage = 100, price, nearestLiquidationCluster) {
    // Safe leverage: inversely proportional to volatility
    // Higher volatility = lower leverage
    if (volatility <= 0 || !isFinite(volatility)) {
        return 1; // Default to 1x if invalid volatility
    }
    // Calculate safe leverage based on volatility
    // Formula: max_leverage = minLiquidationBuffer / volatility
    // Example: 30% buffer, 2% volatility = 15x max leverage
    const volatilitySafeLeverage = minLiquidationBuffer / volatility;
    // Also check liquidation cluster distance
    let clusterSafeLeverage = maxLeverage;
    if (nearestLiquidationCluster && nearestLiquidationCluster > 0) {
        const clusterDistance = Math.abs(nearestLiquidationCluster - price) / price * 100;
        if (clusterDistance < minLiquidationBuffer) {
            // Cluster too close, reduce leverage
            clusterSafeLeverage = (clusterDistance / minLiquidationBuffer) * maxLeverage;
        }
    }
    // Use the more conservative (lower) leverage
    const safeLeverage = Math.min(maxLeverage, Math.max(1, Math.min(volatilitySafeLeverage, clusterSafeLeverage)));
    return isNaN(safeLeverage) || !isFinite(safeLeverage) ? 1 : Math.max(1, safeLeverage);
}
/**
 * Calculate safe position size
 */
export function calculateSafePositionSize(entryPrice, side, stopLoss, leverage, config = {}, futuresData) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    if (entryPrice <= 0 || stopLoss <= 0 || leverage <= 0) {
        throw new Error('Invalid entry price, stop loss, or leverage');
    }
    // Calculate risk amount
    const riskAmount = cfg.capital * (cfg.maxRiskPerTrade / 100);
    // Calculate price distance to stop loss (%)
    const priceDistance = Math.abs(entryPrice - stopLoss) / entryPrice * 100;
    if (priceDistance === 0 || !isFinite(priceDistance)) {
        throw new Error('Stop loss too close to entry price');
    }
    // Calculate position size based on risk
    // Position size (USD) = risk_amount / (price_distance * leverage)
    // Example: $30 risk, 2% stop loss, 20x leverage = $30 / (0.02 * 20) = $75
    const positionSizeUsd = riskAmount / (priceDistance / 100) / leverage;
    // Calculate liquidation price
    const liquidationCalc = calculateLiquidationPrice(entryPrice, leverage, side, cfg.marginBuffer);
    // Check if liquidation distance is safe
    const isLiquidationSafe = liquidationCalc.liquidationDistance >= cfg.minLiquidationBuffer;
    // Adjust leverage if needed
    let recommendedLeverage = leverage;
    let recommendedSizeUsd = positionSizeUsd;
    // If liquidation distance too close, reduce leverage
    if (!isLiquidationSafe && futuresData) {
        // Find nearest liquidation cluster
        const clusters = futuresData.liquidation.clusters || [];
        if (clusters.length > 0) {
            const nearest = clusters.reduce((prev, curr) => {
                const distPrev = Math.abs(prev.price - entryPrice);
                const distCurr = Math.abs(curr.price - entryPrice);
                return distPrev < distCurr ? prev : curr;
            });
            // Calculate safe leverage based on cluster distance
            // const clusterDistance = Math.abs(nearest.price - entryPrice) / entryPrice * 100
            const volatility = 2; // Placeholder - would use ATR% from market data
            recommendedLeverage = calculateSafeLeverage(volatility, cfg.minLiquidationBuffer, cfg.maxLeverage, entryPrice, nearest.price);
            // Recalculate position size with new leverage
            recommendedSizeUsd = riskAmount / (priceDistance / 100) / recommendedLeverage;
            // Recalculate liquidation with new leverage
            const newLiquidationCalc = calculateLiquidationPrice(entryPrice, recommendedLeverage, side, cfg.marginBuffer);
            // Check if new leverage is safe
            if (newLiquidationCalc.liquidationDistance >= cfg.minLiquidationBuffer) {
                recommendedSizeUsd = positionSizeUsd * (recommendedLeverage / leverage); // Adjust size proportionally
            }
        }
    }
    // Cap position size at max available capital
    const maxSizeUsd = cfg.capital * 0.2; // Max 20% of capital per position
    recommendedSizeUsd = Math.min(recommendedSizeUsd, maxSizeUsd);
    // Determine risk level
    let riskLevel = 'low';
    if (recommendedLeverage >= 50) {
        riskLevel = 'extreme';
    }
    else if (recommendedLeverage >= 30) {
        riskLevel = 'high';
    }
    else if (recommendedLeverage >= 15) {
        riskLevel = 'medium';
    }
    // Generate reasoning
    const reasoning = `Position size: $${recommendedSizeUsd.toFixed(2)}, Leverage: ${recommendedLeverage}x, ` +
        `Liquidation distance: ${liquidationCalc.liquidationDistance.toFixed(1)}%, ` +
        `Risk: ${(priceDistance * recommendedLeverage).toFixed(1)}%, ` +
        `Risk level: ${riskLevel}`;
    return {
        maxSizeUsd: isNaN(maxSizeUsd) ? 0 : maxSizeUsd,
        recommendedSizeUsd: isNaN(recommendedSizeUsd) || !isFinite(recommendedSizeUsd) ? 0 : recommendedSizeUsd,
        recommendedLeverage: isNaN(recommendedLeverage) || !isFinite(recommendedLeverage) ? 1 : recommendedLeverage,
        liquidationDistance: liquidationCalc.liquidationDistance,
        marginBuffer: cfg.marginBuffer,
        riskLevel,
        reasoning
    };
}
/**
 * Validate position safety
 */
export function validatePositionSafety(entryPrice, leverage, side, minLiquidationBuffer = 30, marginBuffer = 20, nearestLiquidationCluster) {
    try {
        const liquidationCalc = calculateLiquidationPrice(entryPrice, leverage, side, marginBuffer);
        // Check liquidation distance
        if (liquidationCalc.liquidationDistance < minLiquidationBuffer) {
            return {
                safe: false,
                reason: `Liquidation distance (${liquidationCalc.liquidationDistance.toFixed(1)}%) below minimum (${minLiquidationBuffer}%)`
            };
        }
        // Check liquidation cluster proximity
        if (nearestLiquidationCluster && nearestLiquidationCluster > 0) {
            const clusterDistance = Math.abs(nearestLiquidationCluster - entryPrice) / entryPrice * 100;
            if (clusterDistance < minLiquidationBuffer) {
                return {
                    safe: false,
                    reason: `Nearest liquidation cluster (${clusterDistance.toFixed(1)}% away) too close (minimum: ${minLiquidationBuffer}%)`
                };
            }
        }
        return { safe: true };
    }
    catch (error) {
        return {
            safe: false,
            reason: error.message || 'Unknown error validating position safety'
        };
    }
}
