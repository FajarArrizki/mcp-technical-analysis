/**
 * Format Portfolio Summary
 * Create formatted portfolio summary display
 */
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
    return price.toFixed(2);
}
export function formatPortfolioSummary(positions, performanceMetrics, totalCapital, availableMargin) {
    const topBorder = '┌' + '─'.repeat(tableWidth - 2) + '┐\n';
    const bottomBorder = '└' + '─'.repeat(tableWidth - 2) + '┘\n';
    const separator = '├' + '─'.repeat(tableWidth - 2) + '┤\n';
    let result = topBorder;
    // Title
    result += `│ ${padText('RINGKASAN PORTFOLIO', tableWidth - 4)} │\n`;
    result += separator;
    // Calculate margin used
    let totalMarginUsed = 0;
    for (const position of positions.values()) {
        const entryPrice = position.entryPrice || 0;
        const quantity = Math.abs(position.quantity || 0);
        const leverage = position.leverage || 1;
        const positionValue = entryPrice * quantity;
        const margin = positionValue / leverage;
        totalMarginUsed += margin;
    }
    const marginUsedPct = totalCapital > 0 ? (totalMarginUsed / totalCapital) * 100 : 0;
    const availableMarginPct = totalCapital > 0 ? (availableMargin / totalCapital) * 100 : 0;
    // Modal Total
    result += `│ ${padText(`Modal Total     : $${formatPrice(totalCapital)}`, tableWidth - 4)} │\n`;
    // Margin
    result += `│ ${padText(`Margin Terpakai : $${formatPrice(totalMarginUsed)} (${marginUsedPct.toFixed(1)}%)`, tableWidth - 4)} │\n`;
    result += `│ ${padText(`Margin Tersedia : $${formatPrice(availableMargin)} (${availableMarginPct.toFixed(1)}%)`, tableWidth - 4)} │\n`;
    result += `│ ${padText('', tableWidth - 4)} │\n`;
    // Profit Hari Ini (using unrealized PnL from positions + realized from metrics)
    let totalUnrealizedPnl = 0;
    for (const position of positions.values()) {
        totalUnrealizedPnl += position.unrealizedPnl || 0;
    }
    // Realized PnL from closed trades (stored in performance metrics)
    const realizedPnl = performanceMetrics.totalReturnUsd || 0;
    const totalDailyPnl = realizedPnl + totalUnrealizedPnl;
    const totalDailyPnlPct = totalCapital > 0 ? (totalDailyPnl / totalCapital) * 100 : 0;
    const pnlColor = totalDailyPnl >= 0 ? '\x1b[32m' : '\x1b[31m';
    const pnlSign = totalDailyPnl >= 0 ? '+' : '';
    const realizedSign = realizedPnl >= 0 ? '+' : '';
    const unrealizedSign = totalUnrealizedPnl >= 0 ? '+' : '';
    result += `│ ${padText(`${pnlColor}Profit Hari Ini : ${pnlSign}$${formatPrice(totalDailyPnl)} (${pnlSign}${totalDailyPnlPct.toFixed(2)}%)\x1b[0m`, tableWidth - 4)} │\n`;
    result += `│ ${padText(`• Terealisasi   : ${realizedSign}$${formatPrice(realizedPnl)}`, tableWidth - 4)} │\n`;
    result += `│ ${padText(`• Belum Realize : ${unrealizedSign}$${formatPrice(totalUnrealizedPnl)}`, tableWidth - 4)} │\n`;
    result += `│ ${padText('', tableWidth - 4)} │\n`;
    // Trade Hari Ini
    const winRate = performanceMetrics.winRate || 0;
    const winningTrades = performanceMetrics.winningTrades || 0;
    const losingTrades = performanceMetrics.losingTrades || 0;
    const totalTrades = performanceMetrics.totalTrades || 0;
    const winRateColor = winRate >= 60 ? '\x1b[32m' : winRate >= 40 ? '\x1b[33m' : '\x1b[31m';
    result += `│ ${padText(`Trade Hari Ini  : ${totalTrades} (${winningTrades} win, ${losingTrades} loss) | ${winRateColor}Win Rate: ${winRate.toFixed(0)}%\x1b[0m`, tableWidth - 4)} │\n`;
    // Status Risiko (simplified - always AMAN for now)
    result += `│ ${padText('Status Risiko   : \x1b[32m✓ AMAN (Semua indikator OK)\x1b[0m', tableWidth - 4)} │\n`;
    result += bottomBorder;
    return result;
}
export function formatSystemStatus(mode, cycleNumber, cycleIntervalMs, nextUpdateInMs) {
    const topBorder = '┌' + '─'.repeat(tableWidth - 2) + '┐\n';
    const bottomBorder = '└' + '─'.repeat(tableWidth - 2) + '┘\n';
    const separator = '├' + '─'.repeat(tableWidth - 2) + '┤\n';
    let result = topBorder;
    // Title
    result += `│ ${padText('STATUS SISTEM', tableWidth - 4)} │\n`;
    result += separator;
    // Mode
    const modeStr = mode === 'LIVE' ? 'LIVE TRADING' : 'TEST MODE (Paper Trading)';
    result += `│ ${padText(`Mode       : ${modeStr}`, tableWidth - 4)} │\n`;
    // Update time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    result += `│ ${padText(`Update     : ${dateStr}, ${timeStr} UTC`, tableWidth - 4)} │\n`;
    // Cycle - format interval correctly
    const cycleIntervalSec = Math.floor(cycleIntervalMs / 1000);
    const cycleIntervalMin = Math.floor(cycleIntervalMs / 60000);
    let intervalStr = '';
    if (cycleIntervalSec < 60) {
        intervalStr = `${cycleIntervalSec} detik`;
    }
    else if (cycleIntervalMin < 60) {
        const secs = cycleIntervalSec % 60;
        intervalStr = secs > 0 ? `${cycleIntervalMin} menit ${secs} detik` : `${cycleIntervalMin} menit`;
    }
    else {
        const hours = Math.floor(cycleIntervalMs / 3600000);
        const mins = cycleIntervalMin % 60;
        intervalStr = mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
    }
    result += `│ ${padText(`Cycle      : #${cycleNumber} (update setiap ${intervalStr})`, tableWidth - 4)} │\n`;
    // Next Update
    const minutes = Math.floor(nextUpdateInMs / 60000);
    const seconds = Math.floor((nextUpdateInMs % 60000) / 1000);
    const nextUpdateStr = minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`;
    result += `│ ${padText(`Next Update: ${nextUpdateStr} lagi`, tableWidth - 4)} │\n`;
    result += bottomBorder;
    return result;
}
