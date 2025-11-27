/**
 * Position Management
 * getActivePositions, updateActivePositions functions
 */
// Global positions map for simulation
export const activePositions = new Map();
/**
 * Get active positions from account state or tracked positions
 */
export function getActivePositions(accountState = null) {
    // If accountState has activePositions, use them
    if (accountState && accountState.activePositions && Array.isArray(accountState.activePositions)) {
        const positions = new Map();
        for (const pos of accountState.activePositions) {
            if (pos.symbol && pos.quantity && pos.quantity !== 0) {
                positions.set(pos.symbol, {
                    symbol: pos.symbol,
                    quantity: pos.quantity || 0,
                    entryPrice: pos.entryPrice || pos.entry_price || 0,
                    currentPrice: pos.currentPrice || pos.current_price || 0,
                    leverage: pos.leverage || 1,
                    unrealizedPnl: pos.unrealizedPnl || pos.unrealized_pnl || 0,
                    side: pos.quantity > 0 ? 'LONG' : 'SHORT', // Positive = LONG, Negative = SHORT
                    entryTime: pos.entryTime || pos.entry_time || Date.now()
                });
            }
        }
        return positions;
    }
    // Otherwise use tracked positions
    return activePositions;
}
/**
 * Update active positions after signal execution (for simulation)
 */
export function updateActivePositions(signal) {
    const symbol = signal.coin;
    const currentPosition = activePositions.get(symbol || '');
    if (!symbol)
        return;
    if (signal.signal === 'buy_to_enter') {
        // Open new LONG position or add to existing
        if (currentPosition && currentPosition.side === 'LONG') {
            // Add to existing LONG position (average entry price)
            const totalQuantity = currentPosition.quantity + (signal.quantity || 0);
            const totalCost = (currentPosition.quantity * currentPosition.entryPrice) + ((signal.quantity || 0) * (signal.entry_price || 0));
            activePositions.set(symbol, {
                ...currentPosition,
                quantity: totalQuantity,
                entryPrice: totalCost / totalQuantity,
                leverage: signal.leverage || currentPosition.leverage
            });
        }
        else if (currentPosition && currentPosition.side === 'SHORT') {
            // Close SHORT and open LONG (reverse)
            activePositions.delete(symbol);
            activePositions.set(symbol, {
                symbol,
                quantity: signal.quantity || 0,
                entryPrice: signal.entry_price || 0,
                currentPrice: signal.entry_price || 0,
                leverage: signal.leverage || 1,
                unrealizedPnl: 0,
                side: 'LONG',
                entryTime: Date.now()
            });
        }
        else {
            // Open new LONG position
            activePositions.set(symbol, {
                symbol,
                quantity: signal.quantity || 0,
                entryPrice: signal.entry_price || 0,
                currentPrice: signal.entry_price || 0,
                leverage: signal.leverage || 1,
                unrealizedPnl: 0,
                side: 'LONG',
                entryTime: Date.now()
            });
        }
    }
    else if (signal.signal === 'sell_to_enter') {
        // Open new SHORT position or add to existing
        if (currentPosition && currentPosition.side === 'SHORT') {
            // Add to existing SHORT position
            const totalQuantity = Math.abs(currentPosition.quantity) + (signal.quantity || 0);
            const totalCost = (Math.abs(currentPosition.quantity) * currentPosition.entryPrice) + ((signal.quantity || 0) * (signal.entry_price || 0));
            activePositions.set(symbol, {
                ...currentPosition,
                quantity: -totalQuantity, // Negative for SHORT
                entryPrice: totalCost / totalQuantity,
                leverage: signal.leverage || currentPosition.leverage
            });
        }
        else if (currentPosition && currentPosition.side === 'LONG') {
            // Close LONG and open SHORT (reverse)
            activePositions.delete(symbol);
            activePositions.set(symbol, {
                symbol,
                quantity: -(signal.quantity || 0), // Negative for SHORT
                entryPrice: signal.entry_price || 0,
                currentPrice: signal.entry_price || 0,
                leverage: signal.leverage || 1,
                unrealizedPnl: 0,
                side: 'SHORT',
                entryTime: Date.now()
            });
        }
        else {
            // Open new SHORT position
            activePositions.set(symbol, {
                symbol,
                quantity: -(signal.quantity || 0), // Negative for SHORT
                entryPrice: signal.entry_price || 0,
                currentPrice: signal.entry_price || 0,
                leverage: signal.leverage || 1,
                unrealizedPnl: 0,
                side: 'SHORT',
                entryTime: Date.now()
            });
        }
    }
    else if (signal.signal === 'close_all') {
        // Close position
        if (currentPosition) {
            activePositions.delete(symbol);
        }
    }
    else if (signal.signal === 'reduce') {
        // Reduce position size
        if (currentPosition) {
            const reduceQuantity = signal.quantity || 0;
            const newQuantity = currentPosition.side === 'LONG'
                ? currentPosition.quantity - reduceQuantity
                : currentPosition.quantity + reduceQuantity; // SHORT is negative, so add to reduce
            if (Math.abs(newQuantity) < 0.001) {
                // Position fully closed
                activePositions.delete(symbol);
            }
            else {
                activePositions.set(symbol, {
                    ...currentPosition,
                    quantity: newQuantity
                });
            }
        }
    }
}
