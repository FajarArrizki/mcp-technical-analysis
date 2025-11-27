/**
 * Performance Tracker
 * Track closed trades and calculate performance metrics
 */
import * as fs from 'fs';
import * as path from 'path';
export class PerformanceTracker {
    config;
    trades;
    equityCurve;
    startEquity;
    currentEquity;
    peakEquity;
    constructor(config, initialEquity = 10000) {
        this.config = config;
        this.trades = [];
        this.equityCurve = [];
        this.startEquity = initialEquity;
        this.currentEquity = initialEquity;
        this.peakEquity = initialEquity;
        this.loadTradesFromFile();
        this.recalculateMetrics();
    }
    /**
     * Add closed trade to tracker
     */
    addTrade(trade) {
        // Validate trade record
        if (!trade.symbol || !trade.id) {
            console.warn(`⚠️  Invalid trade record: missing symbol or id`, trade);
            return;
        }
        console.log(`\x1b[36m📊 PerformanceTracker: Adding trade ${trade.id} (${trade.symbol}, PnL: $${trade.pnl?.toFixed(2) || '0.00'})\x1b[0m`);
        this.trades.push(trade);
        this.saveTradeToFile(trade);
        this.updateEquityCurve(trade);
        this.recalculateMetrics();
        console.log(`\x1b[32m✓ PerformanceTracker: Trade ${trade.id} added (Total trades: ${this.trades.length})\x1b[0m`);
    }
    /**
     * Update equity curve with new trade
     */
    updateEquityCurve(trade) {
        if (!this.config.trackEquityCurve) {
            return;
        }
        // Update current equity
        this.currentEquity += trade.pnl;
        // Update peak equity
        if (this.currentEquity > this.peakEquity) {
            this.peakEquity = this.currentEquity;
        }
        // Calculate drawdown
        const drawdownPct = this.peakEquity > 0
            ? ((this.peakEquity - this.currentEquity) / this.peakEquity) * 100
            : 0;
        // Add point to equity curve
        this.equityCurve.push({
            timestamp: trade.exitTime,
            equity: this.currentEquity,
            peak: this.peakEquity,
            drawdownPct
        });
        // Keep only last 1000 points (to avoid memory issues)
        if (this.equityCurve.length > 1000) {
            this.equityCurve.shift();
        }
    }
    /**
     * Recalculate all performance metrics
     */
    recalculateMetrics() {
        // Metrics will be calculated on demand via getMetrics()
    }
    /**
     * Get current performance metrics
     */
    getMetrics() {
        if (this.trades.length === 0) {
            return this.getEmptyMetrics();
        }
        // Calculate basic stats
        const winningTrades = this.trades.filter(t => t.pnl > 0);
        const losingTrades = this.trades.filter(t => t.pnl < 0);
        const winRate = this.trades.length > 0
            ? (winningTrades.length / this.trades.length) * 100
            : 0;
        // Calculate returns
        const totalReturnUsd = this.trades.reduce((sum, t) => sum + t.pnl, 0);
        const totalReturnPct = this.startEquity > 0
            ? (totalReturnUsd / this.startEquity) * 100
            : 0;
        const averageReturnPct = this.trades.length > 0
            ? this.trades.reduce((sum, t) => sum + t.pnlPct, 0) / this.trades.length
            : 0;
        // Calculate R-multiple
        const averageRMultiple = this.trades.length > 0
            ? this.trades.reduce((sum, t) => sum + t.rMultiple, 0) / this.trades.length
            : 0;
        // Max single trade loss
        const maxSingleTradeLoss = this.trades.length > 0
            ? Math.min(...this.trades.map(t => t.pnl))
            : 0;
        // Max drawdown
        const maxDrawdownPct = this.equityCurve.length > 0
            ? Math.max(...this.equityCurve.map(p => p.drawdownPct))
            : 0;
        // Sharpe ratio (simplified: using standard deviation of returns)
        const returns = this.trades.map(t => t.pnlPct);
        const avgReturn = averageReturnPct;
        const variance = returns.length > 1
            ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
            : 0;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
        // Best and worst trades
        const bestTrade = this.trades.length > 0
            ? this.trades.reduce((best, t) => t.pnl > best.pnl ? t : best, this.trades[0])
            : undefined;
        const worstTrade = this.trades.length > 0
            ? this.trades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, this.trades[0])
            : undefined;
        // Trades per asset
        const tradesPerAsset = {};
        for (const trade of this.trades) {
            if (!tradesPerAsset[trade.symbol]) {
                tradesPerAsset[trade.symbol] = {
                    totalTrades: 0,
                    winRate: 0,
                    averageRMultiple: 0,
                    totalReturnPct: 0
                };
            }
            tradesPerAsset[trade.symbol].totalTrades++;
        }
        for (const symbol in tradesPerAsset) {
            const assetTrades = this.trades.filter(t => t.symbol === symbol);
            const assetWins = assetTrades.filter(t => t.pnl > 0);
            tradesPerAsset[symbol].winRate = assetTrades.length > 0
                ? (assetWins.length / assetTrades.length) * 100
                : 0;
            tradesPerAsset[symbol].averageRMultiple = assetTrades.length > 0
                ? assetTrades.reduce((sum, t) => sum + t.rMultiple, 0) / assetTrades.length
                : 0;
            tradesPerAsset[symbol].totalReturnPct = assetTrades.reduce((sum, t) => sum + t.pnlPct, 0);
        }
        // Consecutive wins/losses
        let consecutiveWins = 0;
        let consecutiveLosses = 0;
        let currentStreak = 0;
        let lastResult = null;
        for (const trade of this.trades) {
            const isWin = trade.pnl > 0;
            if (lastResult === null) {
                lastResult = isWin ? 'win' : 'loss';
                currentStreak = 1;
            }
            else if ((lastResult === 'win' && isWin) || (lastResult === 'loss' && !isWin)) {
                currentStreak++;
            }
            else {
                if (lastResult === 'win') {
                    consecutiveWins = Math.max(consecutiveWins, currentStreak);
                }
                else {
                    consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
                }
                lastResult = isWin ? 'win' : 'loss';
                currentStreak = 1;
            }
        }
        // Update current streak
        if (lastResult === 'win') {
            consecutiveWins = Math.max(consecutiveWins, currentStreak);
        }
        else if (lastResult === 'loss') {
            consecutiveLosses = Math.max(consecutiveLosses, currentStreak);
        }
        // Average holding time
        const averageHoldingTimeMinutes = this.trades.length > 0
            ? this.trades.reduce((sum, t) => sum + t.holdingTimeMinutes, 0) / this.trades.length
            : 0;
        // Rolling 30-day stats
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        const recentTrades = this.trades.filter(t => t.exitTime >= thirtyDaysAgo);
        const recentWins = recentTrades.filter(t => t.pnl > 0);
        const recentReturnPct = recentTrades.reduce((sum, t) => sum + t.pnlPct, 0);
        const recentWinRate = recentTrades.length > 0
            ? (recentWins.length / recentTrades.length) * 100
            : 0;
        return {
            totalTrades: this.trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate,
            totalReturnPct,
            totalReturnUsd,
            averageReturnPct,
            averageRMultiple,
            maxSingleTradeLoss,
            maxDrawdownPct,
            sharpeRatio,
            bestTrade,
            worstTrade,
            tradesPerAsset,
            equityCurve: this.equityCurve.slice(-100), // Last 100 points
            consecutiveWins,
            consecutiveLosses,
            averageHoldingTimeMinutes,
            rollingStats: {
                last30Days: {
                    winRate: recentWinRate,
                    totalReturnPct: recentReturnPct,
                    trades: recentTrades.length
                }
            }
        };
    }
    /**
     * Get empty metrics (for initialization)
     */
    getEmptyMetrics() {
        return {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalReturnPct: 0,
            totalReturnUsd: 0,
            averageReturnPct: 0,
            averageRMultiple: 0,
            maxSingleTradeLoss: 0,
            maxDrawdownPct: 0,
            sharpeRatio: 0,
            tradesPerAsset: {},
            equityCurve: [],
            consecutiveWins: 0,
            consecutiveLosses: 0,
            averageHoldingTimeMinutes: 0
        };
    }
    /**
     * Save trade to file
     */
    saveTradeToFile(trade) {
        try {
            const fileDir = path.dirname(this.config.reportFile);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }
            let trades = [];
            if (fs.existsSync(this.config.reportFile)) {
                const content = fs.readFileSync(this.config.reportFile, 'utf-8');
                const data = JSON.parse(content);
                trades = data.trades || [];
            }
            trades.push(trade);
            const report = {
                ...this.getMetrics(),
                trades,
                lastUpdated: Date.now()
            };
            fs.writeFileSync(this.config.reportFile, JSON.stringify(report, null, 2));
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`Failed to save performance metrics: ${errorMsg}`);
        }
    }
    /**
     * Load trades from file
     */
    loadTradesFromFile() {
        try {
            if (!fs.existsSync(this.config.reportFile)) {
                return;
            }
            const content = fs.readFileSync(this.config.reportFile, 'utf-8');
            const data = JSON.parse(content);
            this.trades = data.trades || [];
            this.equityCurve = data.equityCurve || [];
            // Recalculate equity
            this.currentEquity = this.startEquity;
            for (const trade of this.trades) {
                this.currentEquity += trade.pnl;
                if (this.currentEquity > this.peakEquity) {
                    this.peakEquity = this.currentEquity;
                }
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to load performance metrics: ${errorMsg}`);
        }
    }
    /**
     * Generate human-readable performance report
     */
    generateReport() {
        const metrics = this.getMetrics();
        return `
═══════════════════════════════════════════════════════════
PERFORMANCE REPORT
═══════════════════════════════════════════════════════════

📊 Overall Statistics:
   • Total Trades: ${metrics.totalTrades}
   • Winning Trades: ${metrics.winningTrades}
   • Losing Trades: ${metrics.losingTrades}
   • Win Rate: ${metrics.winRate.toFixed(2)}%
   • Total Return: ${metrics.totalReturnPct.toFixed(2)}% ($${metrics.totalReturnUsd.toFixed(2)})
   • Average Return: ${metrics.averageReturnPct.toFixed(2)}%
   • Average R-Multiple: ${metrics.averageRMultiple.toFixed(2)}
   • Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}

📉 Risk Metrics:
   • Max Single Trade Loss: $${metrics.maxSingleTradeLoss.toFixed(2)}
   • Max Drawdown: ${metrics.maxDrawdownPct.toFixed(2)}%
   • Consecutive Wins: ${metrics.consecutiveWins}
   • Consecutive Losses: ${metrics.consecutiveLosses}

⏱️  Trade Analysis:
   • Average Holding Time: ${metrics.averageHoldingTimeMinutes.toFixed(1)} minutes

🏆 Best/Worst Trades:
   ${metrics.bestTrade ? `• Best: ${metrics.bestTrade.symbol} ${metrics.bestTrade.side} - $${metrics.bestTrade.pnl.toFixed(2)} (${metrics.bestTrade.pnlPct.toFixed(2)}%)` : '• No trades yet'}
   ${metrics.worstTrade ? `• Worst: ${metrics.worstTrade.symbol} ${metrics.worstTrade.side} - $${metrics.worstTrade.pnl.toFixed(2)} (${metrics.worstTrade.pnlPct.toFixed(2)}%)` : ''}

📈 30-Day Rolling Stats:
   • Win Rate: ${metrics.rollingStats?.last30Days.winRate.toFixed(2)}%
   • Total Return: ${metrics.rollingStats?.last30Days.totalReturnPct.toFixed(2)}%
   • Trades: ${metrics.rollingStats?.last30Days.trades}

═══════════════════════════════════════════════════════════
`;
    }
}
