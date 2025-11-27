/**
 * Signal Reversal Exit Condition Checker
 * Monitor new signals for reversal (opposite direction) and trigger exit
 */
export function checkSignalReversal(position, newSignal, config) {
    if (!config.enabled || !newSignal) {
        return null;
    }
    const positionSide = position.side;
    const signalType = newSignal.signal;
    const signalConfidence = newSignal.confidence != null ? newSignal.confidence : 0;
    // Reversal detection logic
    let isReversal = false;
    // Position LONG + New signal SHORT with confidence > threshold → REVERSAL
    // Lower threshold for testing: use 50% if signal confidence is meaningful (>40%)
    const effectiveThreshold = signalConfidence > 40 ? Math.min(config.confidenceThreshold, 50) : config.confidenceThreshold;
    if (positionSide === 'LONG' && signalType === 'sell_to_enter') {
        if (signalConfidence >= effectiveThreshold) {
            isReversal = true;
            console.log(`\x1b[33m🔄 SIGNAL REVERSAL DETECTED: ${position.symbol || position.coin || 'UNKNOWN'} - LONG position but SELL signal (confidence: ${signalConfidence.toFixed(1)}% >= ${effectiveThreshold.toFixed(1)}%)\x1b[0m`);
        }
        else {
            console.log(`\x1b[36m⚠️  Signal reversal potential: ${position.symbol || position.coin || 'UNKNOWN'} - LONG position + SELL signal, but confidence ${signalConfidence.toFixed(1)}% < ${effectiveThreshold.toFixed(1)}% (threshold)\x1b[0m`);
        }
    }
    // Position SHORT + New signal LONG with confidence > threshold → REVERSAL
    else if (positionSide === 'SHORT' && signalType === 'buy_to_enter') {
        if (signalConfidence >= effectiveThreshold) {
            isReversal = true;
            console.log(`\x1b[33m🔄 SIGNAL REVERSAL DETECTED: ${position.symbol || position.coin || 'UNKNOWN'} - SHORT position but BUY signal (confidence: ${signalConfidence.toFixed(1)}% >= ${effectiveThreshold.toFixed(1)}%)\x1b[0m`);
        }
        else {
            console.log(`\x1b[36m⚠️  Signal reversal potential: ${position.symbol || position.coin || 'UNKNOWN'} - SHORT position + BUY signal, but confidence ${signalConfidence.toFixed(1)}% < ${effectiveThreshold.toFixed(1)}% (threshold)\x1b[0m`);
        }
    }
    // Position LONG + New signal LONG (lower confidence) → NO REVERSAL (confirmation)
    // Position SHORT + New signal SHORT (lower confidence) → NO REVERSAL (confirmation)
    // Position LONG/SHORT + New signal NEUTRAL/HOLD → NO REVERSAL (ignore)
    if (!isReversal) {
        return null;
    }
    return {
        reason: 'SIGNAL_REVERSAL',
        priority: 5, // After trailing stop
        shouldExit: true,
        exitSize: 100, // Full exit
        metadata: {
            newSignalType: signalType,
            newSignalConfidence: signalConfidence,
            oldPositionSide: positionSide,
            threshold: config.confidenceThreshold
        },
        timestamp: Date.now(),
        description: `Signal reversal detected: Position ${positionSide} but new signal ${signalType} with confidence ${signalConfidence.toFixed(1)}% (threshold: ${config.confidenceThreshold}%)`
    };
}
