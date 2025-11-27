/**
 * Exit Manager
 * Aggregate exit conditions and prioritize exit decisions
 */
import { checkStopLoss } from '../../exit-conditions/stop-loss';
import { checkTakeProfit } from '../../exit-conditions/take-profit';
import { checkTrailingStop, updateTrailingStop } from '../../exit-conditions/trailing-stop';
import { checkSignalReversal } from '../../exit-conditions/signal-reversal';
import { checkRankingDrop } from '../../exit-conditions/ranking-drop';
import { checkIndicatorBasedExit } from '../../exit-conditions/indicator-based';
/**
 * Check all exit conditions for a position
 */
export function checkAllExitConditions(position, currentPrice, newSignal, currentRanking, marketData, config) {
    if (!config.enabled) {
        return [];
    }
    const exitConditions = [];
    // Check stop loss (priority 1 - highest after emergency)
    const slExit = checkStopLoss(position, currentPrice, config.stopLoss);
    if (slExit) {
        exitConditions.push(slExit);
    }
    // Check take profit (priority 2 - after stop loss)
    const tpExit = checkTakeProfit(position, currentPrice, config.takeProfit);
    if (tpExit) {
        exitConditions.push(tpExit);
    }
    // Check indicator-based exit (priority 3 - after TP, before trailing stop)
    // This ensures indicators can exit before trailing stop activates
    const indicatorExit = checkIndicatorBasedExit(position, marketData, config.indicatorBased);
    if (indicatorExit) {
        exitConditions.push(indicatorExit);
    }
    // Check trailing stop (priority 4 - after indicator-based)
    const trailingExit = checkTrailingStop(position, currentPrice, config.trailingStop);
    if (trailingExit) {
        exitConditions.push(trailingExit);
    }
    // Check signal reversal (priority 5 - after trailing stop)
    const reversalExit = checkSignalReversal(position, newSignal, config.signalReversal);
    if (reversalExit) {
        exitConditions.push(reversalExit);
    }
    // Check ranking drop (priority 6 - lowest priority)
    const rankingExit = checkRankingDrop(position, currentRanking, config.rankingDrop);
    if (rankingExit) {
        exitConditions.push(rankingExit);
    }
    // Sort by priority (lower number = higher priority)
    exitConditions.sort((a, b) => a.priority - b.priority);
    return exitConditions;
}
/**
 * Get highest priority exit condition
 */
export function getHighestPriorityExit(exitConditions) {
    if (exitConditions.length === 0) {
        return null;
    }
    // Already sorted by priority, return first (highest priority)
    return exitConditions[0];
}
/**
 * Determine exit action (full or partial)
 */
export function determineExitAction(exitCondition, position) {
    if (!exitCondition.shouldExit) {
        return {
            shouldExit: false,
            exitSize: 0,
            exitPrice: position.currentPrice,
            reason: exitCondition.reason,
            description: exitCondition.description
        };
    }
    // Use exit size from condition (may be partial for take profit)
    const exitSize = Math.min(Math.max(exitCondition.exitSize, 0), 100);
    const exitPrice = exitCondition.exitPrice != null
        ? exitCondition.exitPrice
        : position.currentPrice;
    return {
        shouldExit: true,
        exitSize,
        exitPrice,
        reason: exitCondition.reason,
        description: exitCondition.description
    };
}
/**
 * Update position trailing stop
 */
export function updatePositionTrailingStop(position, currentPrice, config) {
    return updateTrailingStop(position, currentPrice, config);
}
