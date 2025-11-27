/**
 * Position Monitoring System
 * Real-time monitoring of liquidation distance, funding impact, BTC correlation
 */
import { calculateLiquidationPrice } from '../risk-management/anti-liquidation';
import { checkEmergencyExitConditions, shouldTriggerEmergencyExit } from '../risk-management/emergency-exit';
import { predictAltImpactFromBTCMove } from '../analysis/btc-correlation';
/**
 * Monitor position in real-time
 */
export async function monitorPosition(position, futuresData, correlationData) {
    const warnings = [];
    const recommendations = [];
    // 1. Calculate liquidation distance
    let liquidationDistance = 0;
    try {
        const liquidationCalc = calculateLiquidationPrice(position.entryPrice, position.leverage, position.side, 0 // No margin buffer for monitoring
        );
        const currentPrice = position.currentPrice || position.current_price || 0;
        if (currentPrice > 0) {
            const liquidationPrice = liquidationCalc.liquidationPrice;
            liquidationDistance = Math.abs(currentPrice - liquidationPrice) / currentPrice * 100;
            // Check distance thresholds
            if (liquidationDistance < 5) {
                warnings.push(`CRITICAL: Liquidation distance only ${liquidationDistance.toFixed(2)}%`);
                recommendations.push('Consider reducing position size or closing');
            }
            else if (liquidationDistance < 10) {
                warnings.push(`WARNING: Liquidation distance low (${liquidationDistance.toFixed(2)}%)`);
            }
        }
    }
    catch (error) {
        warnings.push(`Error calculating liquidation distance: ${error.message}`);
    }
    // 2. Calculate funding impact
    const fundingRate = futuresData.fundingRate.current;
    const fundingImpact24h = fundingRate * 3; // 3 funding periods per 24h (8h each)
    // LONG pays funding if positive, receives if negative
    // SHORT receives funding if positive, pays if negative
    const positionFundingImpact = position.side === 'LONG'
        ? fundingImpact24h // LONG pays positive funding
        : -fundingImpact24h; // SHORT receives positive funding
    if (Math.abs(positionFundingImpact) > 0.003) { // >0.3% per day
        warnings.push(`High funding impact: ${(positionFundingImpact * 100).toFixed(2)}% per 24h`);
        if (positionFundingImpact > 0) {
            recommendations.push('Consider closing if funding cost too high');
        }
    }
    // 3. Calculate BTC correlation impact
    let btcCorrelationImpact = 0;
    if (correlationData) {
        try {
            // Get recent BTC move (last 5 minutes)
            // const currentBTC = await getBTCCurrentPrice()
            // This is simplified - would need BTC history for accurate calculation
            // Placeholder: estimate 0.5% BTC move impact
            const estimatedBTCMove = 0.5; // 0.5% estimated move
            btcCorrelationImpact = predictAltImpactFromBTCMove(estimatedBTCMove, correlationData);
            if (Math.abs(btcCorrelationImpact) > 2) {
                const impactDirection = btcCorrelationImpact > 0 ? 'positive' : 'negative';
                const positionDirection = position.side === 'LONG' ? 'favorable' : 'unfavorable';
                if ((btcCorrelationImpact > 0 && position.side === 'SHORT') ||
                    (btcCorrelationImpact < 0 && position.side === 'LONG')) {
                    warnings.push(`BTC correlation impact: ${btcCorrelationImpact.toFixed(2)}% (${impactDirection}, ${positionDirection} for ${position.side})`);
                    recommendations.push('Monitor BTC moves closely');
                }
            }
        }
        catch (error) {
            // Ignore BTC correlation errors (non-critical)
        }
    }
    // 4. Determine risk level
    let riskLevel = 'low';
    if (liquidationDistance < 5 || Math.abs(positionFundingImpact) > 0.01) {
        riskLevel = 'critical';
    }
    else if (liquidationDistance < 10 || Math.abs(positionFundingImpact) > 0.005) {
        riskLevel = 'high';
    }
    else if (liquidationDistance < 20 || Math.abs(positionFundingImpact) > 0.002) {
        riskLevel = 'medium';
    }
    // 5. Check emergency exit conditions
    const emergencyConditions = await checkEmergencyExitConditions(position, futuresData, correlationData);
    const emergencyExit = shouldTriggerEmergencyExit(emergencyConditions);
    if (emergencyExit.shouldExit) {
        riskLevel = 'critical';
        warnings.push(`EMERGENCY EXIT TRIGGERED: ${emergencyExit.reason}`);
        recommendations.push(`Recommended action: ${emergencyExit.action}`);
    }
    // Generate recommendations based on monitoring
    if (liquidationDistance > 30 && positionFundingImpact < 0) {
        recommendations.push('Position healthy: Good liquidation distance and positive funding');
    }
    if (positionFundingImpact > 0 && position.unrealizedPnl && position.unrealizedPnl < 0) {
        recommendations.push('Consider closing if funding costs exceed unrealized gains');
    }
    return {
        liquidationDistance: isNaN(liquidationDistance) || !isFinite(liquidationDistance) ? 0 : liquidationDistance,
        fundingImpact24h: isNaN(positionFundingImpact) || !isFinite(positionFundingImpact) ? 0 : positionFundingImpact,
        btcCorrelationImpact: isNaN(btcCorrelationImpact) || !isFinite(btcCorrelationImpact) ? 0 : btcCorrelationImpact,
        riskLevel,
        emergencyExit: {
            ...emergencyExit,
            triggered: emergencyExit.shouldExit
        },
        warnings,
        recommendations
    };
}
/**
 * Batch monitor multiple positions
 */
export async function batchMonitorPositions(positions, futuresDataMap, correlationDataMap) {
    const results = new Map();
    const positionsArray = positions instanceof Map
        ? Array.from(positions.entries())
        : Object.entries(positions);
    // Monitor positions in parallel
    const promises = positionsArray.map(async ([symbol, position]) => {
        const futuresData = futuresDataMap instanceof Map
            ? futuresDataMap.get(symbol)
            : futuresDataMap[symbol];
        const correlationData = correlationDataMap
            ? (correlationDataMap instanceof Map
                ? correlationDataMap.get(symbol)
                : correlationDataMap[symbol])
            : undefined;
        if (!futuresData) {
            return { symbol, result: null };
        }
        try {
            const result = await monitorPosition(position, futuresData, correlationData);
            return { symbol, result };
        }
        catch (error) {
            console.warn(`⚠️  Failed to monitor position ${symbol}: ${error.message}`);
            return { symbol, result: null };
        }
    });
    const resultsArray = await Promise.all(promises);
    for (const { symbol, result } of resultsArray) {
        if (result) {
            results.set(symbol, result);
        }
    }
    return results;
}
