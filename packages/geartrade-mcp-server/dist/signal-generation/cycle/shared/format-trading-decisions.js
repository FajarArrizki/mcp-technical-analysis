/**
 * Format Trading Decisions
 * Create formatted display for trading decisions (accepted/rejected signals)
 */
// import { createSection, formatKeyValue } from './format-box'
const tableWidth = 62;
function padText(text, width) {
    const str = String(text);
    if (str.length > width) {
        return str.substring(0, width - 3) + '...';
    }
    return str.padEnd(width);
}
function formatPrice(price) {
    if (price >= 1000) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return price.toFixed(4);
}
export function formatTradingDecisions(acceptedSignals, rejectedSignals, aiGeneratedCount) {
    // CRITICAL FIX: Filter signals with confidence < 60% before display
    // Accept only signals with confidence >= 60% (range: 60% - 100%)
    // Reject signals with confidence < 60% (0% - 59.99%)
    const filteredAcceptedSignals = (acceptedSignals || []).filter(signal => {
        const confidence = signal.confidence || 0;
        return confidence >= 0.60; // Only show signals with confidence >= 60%
    });
    // Add low confidence signals to rejected list for display
    const lowConfidenceSignals = (acceptedSignals || []).filter(signal => {
        const confidence = signal.confidence || 0;
        return confidence < 0.60; // Signals with confidence < 60% should be treated as rejected
    });
    const allRejectedSignals = [
        ...(rejectedSignals || []),
        ...lowConfidenceSignals.map(signal => ({
            signal,
            reason: `Confidence too low: ${((signal.confidence || 0) * 100).toFixed(1)}% < 60% (minimum required: 60%)`
        }))
    ];
    const topBorder = '┌' + '─'.repeat(tableWidth - 2) + '┐\n';
    const bottomBorder = '└' + '─'.repeat(tableWidth - 2) + '┘\n';
    const separator = '├' + '─'.repeat(tableWidth - 2) + '┤\n';
    let result = topBorder;
    result += `│ ${padText('TRADING DECISIONS', tableWidth - 4)} │\n`;
    result += separator;
    // Summary
    const totalSignals = (acceptedSignals?.length || 0) + (rejectedSignals?.length || 0);
    const aiCount = aiGeneratedCount || totalSignals;
    const acceptedCount = filteredAcceptedSignals.length; // Use filtered count
    const rejectedCount = allRejectedSignals.length; // Include low confidence signals
    result += `│ ${padText(`AI Generated   : ${aiCount} signals`, tableWidth - 4)} │\n`;
    result += `│ ${padText(`\x1b[32m✓ Accepted      : ${acceptedCount} signals\x1b[0m`, tableWidth - 4)} │\n`;
    result += `│ ${padText(`\x1b[31m✗ Rejected      : ${rejectedCount} signals\x1b[0m`, tableWidth - 4)} │\n`;
    result += separator;
    // Accepted Signals Summary
    if (acceptedCount > 0) {
        result += `│ ${padText('ACCEPTED SIGNALS:', tableWidth - 4)} │\n`;
        result += separator;
        for (let i = 0; i < Math.min(acceptedCount, 5); i++) {
            const signal = filteredAcceptedSignals[i]; // Use filtered signals
            const confidence = signal.confidence?.toFixed(1) || 'N/A';
            const ev = signal.expected_value != null ? signal.expected_value.toFixed(2) : 'N/A';
            const entryPrice = signal.entry_price || 0;
            const signalType = signal.signal.toUpperCase().replace('_', ' ');
            const confidenceColor = (signal.confidence || 0) >= 0.60 ? '\x1b[32m' : (signal.confidence || 0) >= 0.50 ? '\x1b[33m' : '\x1b[31m';
            const evColor = (signal.expected_value || 0) >= 1 ? '\x1b[32m' : (signal.expected_value || 0) >= 0.5 ? '\x1b[33m' : '\x1b[31m';
            result += `│ ${padText(`${i + 1}. ${signal.coin}: ${signalType}`, tableWidth - 4)} │\n`;
            result += `│ ${padText(`   Entry: $${formatPrice(entryPrice)} | ${confidenceColor}Conf: ${confidence}%\x1b[0m | ${evColor}EV: $${ev}\x1b[0m`, tableWidth - 4)} │\n`;
            if (signal.stop_loss && signal.take_profit) {
                const stopLoss = signal.stop_loss;
                const takeProfit = signal.take_profit;
                result += `│ ${padText(`   SL: $${formatPrice(stopLoss)} | TP: $${formatPrice(takeProfit)}`, tableWidth - 4)} │\n`;
            }
        }
        if (acceptedCount > 5) {
            result += `│ ${padText(`   ... dan ${acceptedCount - 5} signal lainnya`, tableWidth - 4)} │\n`;
        }
        if (rejectedCount > 0) {
            result += separator;
        }
    }
    // Rejected Signals Summary
    if (rejectedCount > 0) {
        result += `│ ${padText('REJECTED SIGNALS (Top 5):', tableWidth - 4)} │\n`;
        result += separator;
        for (let i = 0; i < Math.min(rejectedCount, 5); i++) {
            const { signal, reason } = allRejectedSignals[i]; // Include low confidence signals
            const confidence = signal.confidence?.toFixed(1) || 'N/A';
            const ev = signal.expected_value != null ? signal.expected_value.toFixed(2) : 'N/A';
            const signalType = signal.signal.toUpperCase().replace('_', ' ');
            result += `│ ${padText(`${i + 1}. ${signal.coin}: ${signalType}`, tableWidth - 4)} │\n`;
            result += `│ ${padText(`   Conf: ${confidence}% | EV: $${ev}`, tableWidth - 4)} │\n`;
            result += `│ ${padText(`   \x1b[33mReason: ${reason.substring(0, 50)}${reason.length > 50 ? '...' : ''}\x1b[0m`, tableWidth - 4)} │\n`;
        }
        if (rejectedCount > 5) {
            result += `│ ${padText(`   ... dan ${rejectedCount - 5} signal ditolak lainnya`, tableWidth - 4)} │\n`;
        }
    }
    // Action Summary
    result += separator;
    if (acceptedCount > 0) {
        result += `│ ${padText(`\x1b[32m✓ Aksi: ${acceptedCount} signal akan dieksekusi\x1b[0m`, tableWidth - 4)} │\n`;
    }
    else {
        result += `│ ${padText(`⚠️  Aksi: Tidak ada signal untuk dieksekusi`, tableWidth - 4)} │\n`;
    }
    result += bottomBorder;
    return result;
}
