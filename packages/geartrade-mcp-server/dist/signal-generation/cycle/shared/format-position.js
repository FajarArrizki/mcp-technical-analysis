/**
 * Format Position Box
 * Create formatted position display with detailed information
 */
const tableWidth = 62;
function padText(text, width) {
    const str = String(text);
    if (str.length > width) {
        return str.substring(0, width - 3) + '...';
    }
    return str.padEnd(width);
}
function formatDuration(entryTime) {
    const now = Date.now();
    const durationMs = now - entryTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
        return `${hours}j ${minutes}m`;
    }
    return `${minutes}m`;
}
function formatNumber(num, decimals = 2) {
    if (num >= 1000) {
        return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    return num.toFixed(decimals);
}
function formatPrice(price) {
    if (price >= 1000) {
        return formatNumber(price, 2);
    }
    return price.toFixed(4);
}
export function formatPositionBox(position, index, marketData, ranking, signalValid) {
    const symbol = position.symbol || position.coin || 'UNKNOWN';
    const side = position.side || 'LONG';
    const status = 'BUKA'; // Active position
    // Get current price from market data or position
    // CRITICAL FIX: Prioritize price from Hyperliquid (markPx), NOT from Binance historical data
    // Binance historical data is only for indicators, NOT for current price
    const assetData = marketData instanceof Map
        ? marketData.get(symbol)
        : marketData?.[symbol];
    // Priority: 1. markPx (Hyperliquid real-time), 2. price (Hyperliquid), 3. position.currentPrice, 4. entryPrice
    const currentPrice = assetData?.markPx || assetData?.price || position.currentPrice || position.entryPrice;
    // Position details
    const entryPrice = position.entryPrice || 0;
    const quantity = Math.abs(position.quantity || 0);
    const leverage = position.leverage || 1;
    const unrealizedPnl = position.unrealizedPnl || 0;
    const unrealizedPnlPct = position.unrealizedPnlPct || 0;
    const entryTime = position.entryTime || position.entry_time || Date.now();
    const duration = formatDuration(entryTime);
    // Risk management
    const stopLoss = position.stopLoss || 0;
    const takeProfit = position.takeProfit || 0;
    // Calculate position size in base currency (e.g., BTC)
    // For display, we'll show quantity directly
    const positionSize = quantity;
    // Multiple take profit levels (50%, 30%, 20% of position)
    // If takeProfit is set, calculate levels from entry price
    let tp1Price = 0;
    let tp2Price = 0;
    let tp3Price = 0;
    // let _tp1Pct = 0
    // let tp2Pct = 0
    // let tp3Pct = 0
    if (takeProfit > entryPrice && side === 'LONG') {
        const distance = takeProfit - entryPrice;
        tp1Price = entryPrice + (distance * 0.5);
        tp2Price = entryPrice + (distance * 0.8);
        tp3Price = takeProfit;
        // _tp1Pct = ((tp1Price - entryPrice) / entryPrice) * 100
        // tp2Pct = ((tp2Price - entryPrice) / entryPrice) * 100
        // tp3Pct = ((tp3Price - entryPrice) / entryPrice) * 100
    }
    else if (takeProfit < entryPrice && side === 'SHORT') {
        const distance = entryPrice - takeProfit;
        tp1Price = entryPrice - (distance * 0.5);
        tp2Price = entryPrice - (distance * 0.8);
        tp3Price = takeProfit;
        // tp1Pct = ((entryPrice - tp1Price) / entryPrice) * 100
        // tp2Pct = ((entryPrice - tp2Price) / entryPrice) * 100
        // tp3Pct = ((entryPrice - tp3Price) / entryPrice) * 100
    }
    else if (entryPrice > 0) {
        // Default TP levels if not set (2%, 4%, 6% for LONG; -2%, -4%, -6% for SHORT)
        const basePct = side === 'LONG' ? 0.02 : -0.02;
        // tp1Pct = Math.abs(basePct * 1) * 100
        // tp2Pct = Math.abs(basePct * 2) * 100
        // tp3Pct = Math.abs(basePct * 3) * 100
        tp1Price = side === 'LONG' ? entryPrice * (1 + basePct * 1) : entryPrice * (1 + basePct * 1);
        tp2Price = side === 'LONG' ? entryPrice * (1 + basePct * 2) : entryPrice * (1 + basePct * 2);
        tp3Price = side === 'LONG' ? entryPrice * (1 + basePct * 3) : entryPrice * (1 + basePct * 3);
    }
    // Check if TP1 is nearly reached (within 0.5% for LONG, or below current for SHORT)
    const tp1NearlyReached = side === 'LONG'
        ? currentPrice >= tp1Price * 0.995
        : currentPrice <= tp1Price * 1.005;
    // Volatility status
    // const atr = assetData?.indicators?.atr || 0
    const atrPercent = assetData?.indicators?.atrPercent || 0;
    const volatilityStatus = atrPercent > 2 ? '↑' : atrPercent < 1 ? '↓' : '→';
    const volatilityLevel = atrPercent > 2 ? 'Tinggi' : atrPercent < 1 ? 'Rendah' : 'Normal';
    // Build box
    const topBorder = '┌' + '─'.repeat(tableWidth - 2) + '┐\n';
    const bottomBorder = '└' + '─'.repeat(tableWidth - 2) + '┘\n';
    const separator = '├' + '─'.repeat(tableWidth - 2) + '┤\n';
    let result = topBorder;
    // Header: POSISI #1: SYMBOL [SIDE] [STATUS]
    const sideColor = side === 'LONG' ? '\x1b[32m' : '\x1b[31m';
    const statusColor = '\x1b[32m';
    const headerLeft = `POSISI #${index + 1}: ${symbol.padEnd(20)}`;
    const headerRight = `${sideColor}[${side}]\x1b[0m ${statusColor}[${status}]\x1b[0m`;
    const headerPadding = tableWidth - 4 - headerLeft.length - headerRight.replace(/\x1b\[\d+m/g, '').length;
    const header = `${headerLeft}${' '.repeat(headerPadding)}${headerRight}`;
    result += `│ ${padText(header, tableWidth - 4)} │\n`;
    result += separator;
    // Entry → Current Price
    const entryStr = `Masuk: $${formatPrice(entryPrice)}`;
    const currentStr = `→ Sekarang: $${formatPrice(currentPrice)}`;
    result += `│ ${padText(entryStr + ' ' + currentStr, tableWidth - 4)} │\n`;
    // Profit
    const pnlSign = unrealizedPnl >= 0 ? '+' : '';
    const pnlColor = unrealizedPnl >= 0 ? '\x1b[32m' : '\x1b[31m';
    const profitStr = `${pnlColor}Profit: ${pnlSign}$${unrealizedPnl.toFixed(2)} (${pnlSign}${unrealizedPnlPct.toFixed(2)}%)\x1b[0m | Durasi: ${duration}`;
    result += `│ ${padText(profitStr, tableWidth - 4)} │\n`;
    // Position Size and Leverage
    const baseSymbol = symbol.replace('-USD', '').replace('-PERP', '').replace('USD', '');
    const sizeStr = `Ukuran: ${positionSize.toFixed(4)} ${baseSymbol} | Leverage: ${leverage}x`;
    result += `│ ${padText(sizeStr, tableWidth - 4)} │\n`;
    result += separator;
    // Stop Loss
    if (stopLoss > 0) {
        const slStr = `Stop Loss : $${formatPrice(stopLoss)}`;
        result += `│ ${padText(slStr, tableWidth - 4)} │\n`;
    }
    // Take Profit Targets
    if (tp1Price > 0) {
        const tp1Str = `Target 1  : $${formatPrice(tp1Price)} [50%]${tp1NearlyReached ? ' \x1b[33m← Hampir tercapai\x1b[0m' : ''}`;
        result += `│ ${padText(tp1Str, tableWidth - 4)} │\n`;
    }
    if (tp2Price > 0) {
        const tp2Str = `Target 2  : $${formatPrice(tp2Price)} [30%]`;
        result += `│ ${padText(tp2Str, tableWidth - 4)} │\n`;
    }
    if (tp3Price > 0) {
        const tp3Str = `Target 3  : $${formatPrice(tp3Price)} [20%]`;
        result += `│ ${padText(tp3Str, tableWidth - 4)} │\n`;
    }
    result += separator;
    // Status - Enhanced with position status
    const positionStatus = '\x1b[32m✓ TERBUKA\x1b[0m'; // Open position
    const signalStatus = signalValid !== false ? '\x1b[32m✓ Sinyal valid\x1b[0m' : '\x1b[31m✗ Sinyal invalid\x1b[0m';
    const rankingStatus = ranking ? `\x1b[32m✓ Ranking #${ranking}\x1b[0m` : '';
    const volatilityStatusStr = `\x1b[33m⚠ Volatilitas ${volatilityLevel} ${volatilityStatus}\x1b[0m`;
    const statusStr = [positionStatus, signalStatus, rankingStatus, volatilityStatusStr].filter(s => s).join(' | ');
    result += `│ ${padText('Status: ' + statusStr, tableWidth - 4)} │\n`;
    // Additional Info: Entry Time and Holding Duration
    const entryDate = new Date(entryTime);
    const entryTimeStr = entryDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    const infoStr = `Dibuka: ${entryTimeStr} UTC | Durasi: ${duration}`;
    result += `│ ${padText(infoStr, tableWidth - 4)} │\n`;
    result += bottomBorder;
    return result;
}
/**
 * Format closed position box (from TradeRecord)
 */
export function formatClosedPositionBox(trade, index) {
    const symbol = trade.symbol || 'UNKNOWN';
    const side = trade.side || 'LONG';
    const status = '\x1b[31m✗ TERTUTUP\x1b[0m'; // Closed position
    const entryPrice = trade.entryPrice || 0;
    const exitPrice = trade.exitPrice || 0;
    const quantity = trade.quantity || 0;
    const leverage = trade.leverage || 1;
    const pnl = trade.pnl || 0;
    const pnlPct = trade.pnlPct || 0;
    const holdingTimeMinutes = trade.holdingTimeMinutes || 0;
    const exitReason = trade.exitReason || 'UNKNOWN';
    const exitTime = trade.exitTime || Date.now();
    // Format holding time
    const hours = Math.floor(holdingTimeMinutes / 60);
    const minutes = holdingTimeMinutes % 60;
    const holdingTimeStr = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;
    // Format exit time
    const exitDate = new Date(exitTime);
    const exitTimeStr = exitDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    // Build box
    const topBorder = '┌' + '─'.repeat(tableWidth - 2) + '┐\n';
    const bottomBorder = '└' + '─'.repeat(tableWidth - 2) + '┘\n';
    const separator = '├' + '─'.repeat(tableWidth - 2) + '┤\n';
    let result = topBorder;
    // Header: POSISI TERTUTUP #1: SYMBOL [SIDE] [STATUS]
    const sideColor = side === 'LONG' ? '\x1b[32m' : '\x1b[31m';
    const headerLeft = `POSISI TERTUTUP #${index + 1}: ${symbol.padEnd(15)}`;
    const headerRight = `${sideColor}[${side}]\x1b[0m ${status}`;
    const headerPadding = tableWidth - 4 - headerLeft.length - headerRight.replace(/\x1b\[\d+m/g, '').length;
    const header = `${headerLeft}${' '.repeat(headerPadding)}${headerRight}`;
    result += `│ ${padText(header, tableWidth - 4)} │\n`;
    result += separator;
    // Entry → Exit Price
    const entryStr = `Masuk: $${formatPrice(entryPrice)}`;
    const exitStr = `→ Keluar: $${formatPrice(exitPrice)}`;
    result += `│ ${padText(entryStr + ' ' + exitStr, tableWidth - 4)} │\n`;
    // Final PnL
    const pnlSign = pnl >= 0 ? '+' : '';
    const pnlColor = pnl >= 0 ? '\x1b[32m' : '\x1b[31m';
    const profitStr = `${pnlColor}Profit Final : ${pnlSign}$${pnl.toFixed(2)} (${pnlSign}${pnlPct.toFixed(2)}%)\x1b[0m | Durasi: ${holdingTimeStr}`;
    result += `│ ${padText(profitStr, tableWidth - 4)} │\n`;
    // Position Size and Leverage
    const baseSymbol = symbol.replace('-USD', '').replace('-PERP', '').replace('USD', '');
    const sizeStr = `Ukuran: ${quantity.toFixed(4)} ${baseSymbol} | Leverage: ${leverage}x`;
    result += `│ ${padText(sizeStr, tableWidth - 4)} │\n`;
    result += separator;
    // Exit Reason
    const exitReasonStr = `Alasan Keluar: ${exitReason}`;
    const exitReasonColor = exitReason === 'TAKE_PROFIT' ? '\x1b[32m' :
        exitReason === 'STOP_LOSS' ? '\x1b[31m' : '\x1b[33m';
    result += `│ ${padText(`${exitReasonColor}${exitReasonStr}\x1b[0m`, tableWidth - 4)} │\n`;
    // Exit Details
    if (trade.exitReasonDetails) {
        const detailsStr = `Detail: ${trade.exitReasonDetails.substring(0, 50)}${trade.exitReasonDetails.length > 50 ? '...' : ''}`;
        result += `│ ${padText(detailsStr, tableWidth - 4)} │\n`;
    }
    result += separator;
    // Exit Time and R-Multiple
    const rMultiple = trade.rMultiple || 0;
    const rMultipleStr = `R-Multiple: ${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}`;
    const timeStr = `Keluar: ${exitTimeStr} UTC`;
    result += `│ ${padText(`${timeStr} | ${rMultipleStr}`, tableWidth - 4)} │\n`;
    result += bottomBorder;
    return result;
}
