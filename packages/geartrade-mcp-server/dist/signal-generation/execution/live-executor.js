/**
 * Live Trading Executor
 * Real order execution via Hyperliquid API
 */
import { fetchHyperliquid } from '../data-fetchers/hyperliquid';
import { getHyperliquidWalletApiKey, getHyperliquidAccountAddress } from '../config';
import { getAssetIndex, createOrderMessage, signHyperliquidOrder, createWalletFromPrivateKey } from './hyperliquid-signing';
/**
 * Live executor for real trading via Hyperliquid API
 * Implements EIP-712 signing for order submission to Hyperliquid /exchange endpoint
 */
export class LiveExecutor {
    config;
    pendingOrders;
    apiErrorCount;
    apiRequestCount;
    walletApiKey;
    accountAddress;
    tradeHistory; // In-memory storage for trade history (Cloudflare Workers compatible)
    constructor(config) {
        this.config = config;
        this.pendingOrders = new Map();
        this.apiErrorCount = 0;
        this.apiRequestCount = 0;
        this.tradeHistory = []; // Initialize in-memory storage
        // Store credentials if provided, otherwise will use env vars when needed
        this.walletApiKey = config.walletApiKey;
        this.accountAddress = config.accountAddress;
    }
    /**
     * Execute real entry order via Hyperliquid API
     */
    async executeEntry(signal, currentPrice) {
        const orderId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const quantity = signal.quantity || 0;
        // CRITICAL FIX: Validate confidence before execution (double check)
        // Accept only signals with confidence >= 60% (range: 60% - 100%)
        // Reject signals with confidence < 60% (0% - 59.99%)
        const confidence = signal.confidence || 0;
        if (confidence < 0.60) {
            console.log(`\x1b[31m❌ LIVE EXECUTOR REJECT: ${signal.coin} - Confidence ${(confidence * 100).toFixed(1)}% < 60% (too low, filter out)\x1b[0m`);
            return {
                id: orderId,
                symbol: signal.coin || '',
                side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
                type: 'MARKET',
                quantity,
                price: currentPrice,
                status: 'REJECTED',
                submittedAt: Date.now(),
                rejectedReason: `Confidence too low: ${(confidence * 100).toFixed(1)}% < 60% (minimum required: 60%)`
            };
        }
        // Pre-execution checks
        const preCheck = await this.preExecutionChecks(signal, quantity);
        if (!preCheck.passed) {
            return {
                id: orderId,
                symbol: signal.coin || '',
                side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
                type: 'MARKET',
                quantity,
                price: currentPrice,
                status: 'REJECTED',
                submittedAt: Date.now(),
                rejectedReason: preCheck.reason
            };
        }
        try {
            // Submit order to Hyperliquid
            const order = await this.submitOrder({
                symbol: signal.coin || '',
                side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
                quantity,
                type: 'MARKET',
                stopLoss: signal.stop_loss,
                takeProfit: signal.take_profit || signal.profit_target
            });
            // Wait for fill confirmation
            const filledOrder = await this.waitForFill(order, this.config.orderFillTimeoutMs);
            if (filledOrder.status === 'FILLED' || filledOrder.status === 'PARTIAL_FILLED') {
                // Save to in-memory storage (Cloudflare Workers compatible)
                this.saveTradeToMemory(filledOrder, 'ENTRY');
                // Note: File saving disabled in Cloudflare Workers environment
                // this.saveTradeToFile(filledOrder, 'ENTRY')
            }
            this.apiRequestCount++;
            return filledOrder;
        }
        catch (error) {
            this.apiErrorCount++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                id: orderId,
                symbol: signal.coin || '',
                side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
                type: 'MARKET',
                quantity,
                price: currentPrice,
                status: 'REJECTED',
                submittedAt: Date.now(),
                rejectedReason: `Order submission failed: ${errorMsg}`
            };
        }
    }
    /**
     * Execute real exit order via Hyperliquid API
     */
    async executeExit(position, exitSize, exitReason, currentPrice) {
        const orderId = `live_exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const symbol = position.symbol || position.coin || '';
        const totalQuantity = Math.abs(position.quantity);
        const closeQuantity = totalQuantity * (exitSize / 100);
        try {
            // Submit close order to Hyperliquid
            const order = await this.submitOrder({
                symbol,
                side: 'CLOSE',
                quantity: closeQuantity,
                type: 'MARKET',
                reduceOnly: true
            });
            // Wait for fill confirmation
            const filledOrder = await this.waitForFill(order, this.config.orderFillTimeoutMs);
            if (filledOrder.status === 'FILLED' || filledOrder.status === 'PARTIAL_FILLED') {
                // Save to in-memory storage (Cloudflare Workers compatible)
                this.saveTradeToMemory(filledOrder, 'EXIT', {
                    exitReason,
                    originalQuantity: totalQuantity,
                    exitSizePct: exitSize
                });
                // Note: File saving disabled in Cloudflare Workers environment
                // this.saveTradeToFile(filledOrder, 'EXIT', {
                //   exitReason,
                //   originalQuantity: totalQuantity,
                //   exitSizePct: exitSize
                // })
            }
            this.apiRequestCount++;
            return filledOrder;
        }
        catch (error) {
            this.apiErrorCount++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            return {
                id: orderId,
                symbol,
                side: 'CLOSE',
                type: 'MARKET',
                quantity: closeQuantity,
                price: currentPrice,
                status: 'REJECTED',
                submittedAt: Date.now(),
                rejectedReason: `Exit order submission failed: ${errorMsg}`
            };
        }
    }
    /**
     * Submit order to Hyperliquid API
     * Implements EIP-712 signing for order submission
     */
    async submitOrder(params) {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            // Get wallet API key (use provided or fallback to env var)
            const walletApiKey = this.walletApiKey || getHyperliquidWalletApiKey();
            if (!walletApiKey || walletApiKey.trim() === '') {
                throw new Error('Wallet API key not provided and HYPERLIQUID_WALLET_API_KEY not configured');
            }
            // Get account address (use provided or fallback to env var)
            const accountAddress = this.accountAddress || getHyperliquidAccountAddress();
            if (!accountAddress) {
                throw new Error('Account address not provided and HYPERLIQUID_ACCOUNT_ADDRESS not configured');
            }
            // Create wallet from private key
            const wallet = createWalletFromPrivateKey(walletApiKey);
            // Verify wallet address matches account address
            if (wallet.address.toLowerCase() !== accountAddress.toLowerCase()) {
                throw new Error(`Wallet address ${wallet.address} does not match account address ${accountAddress}`);
            }
            // Get asset index
            const assetIndex = await getAssetIndex(params.symbol);
            // Determine if buy or sell
            const isBuy = params.side === 'LONG' || (params.side === 'CLOSE' && params.reduceOnly === false);
            const reduceOnly = params.side === 'CLOSE' || params.reduceOnly === true;
            // Convert quantity to string (Hyperliquid uses string for precision)
            const quantityStr = params.quantity.toString();
            // Get current price for limit orders (if needed)
            let limitPx;
            if (params.type === 'LIMIT') {
                // For limit orders, we need a price - use stopLoss or takeProfit if available
                // Otherwise, user should provide price in params
                limitPx = params.stopLoss?.toString() || params.takeProfit?.toString() || '0';
            }
            // Create order message
            // Note: Hyperliquid requires size as string with proper precision
            const orderMessage = createOrderMessage({
                assetIndex,
                isBuy,
                reduceOnly,
                limitPx,
                sz: quantityStr,
                orderType: params.type === 'LIMIT' ? 'Limit' : 'Market',
                cloid: orderId // Use orderId as client order ID for tracking
            });
            // Sign the order
            const signature = await signHyperliquidOrder(wallet, orderMessage);
            // Prepare request payload for Hyperliquid /exchange endpoint
            // Format: { action, nonce, signature, vaultAddress (optional) }
            const requestPayload = {
                action: {
                    type: orderMessage.action.type,
                    orders: orderMessage.action.orders,
                    grouping: orderMessage.action.grouping
                },
                nonce: Date.now(),
                signature: {
                    r: signature.slice(0, 66), // 0x + 64 chars
                    s: '0x' + signature.slice(66, 130), // next 64 chars  
                    v: parseInt(signature.slice(130, 132), 16) // last 2 chars as number
                }
            };
            // Add vaultAddress if trading on behalf of another account
            // For regular trading from signing wallet, omit this field
            if (accountAddress && accountAddress.toLowerCase() !== wallet.address.toLowerCase()) {
                requestPayload.vaultAddress = accountAddress;
            }
            // Debug logging
            console.log('📤 Submitting order to Hyperliquid:', JSON.stringify({
                symbol: params.symbol,
                side: params.side,
                quantity: params.quantity,
                orderMessage: orderMessage,
                signature: signature,
                accountAddress: wallet.address
            }, null, 2));
            console.log('📦 Actual request payload:', JSON.stringify(requestPayload, null, 2));
            // Submit to Hyperliquid /exchange endpoint
            const response = await fetchHyperliquid('/exchange', requestPayload);
            // Check response - Hyperliquid returns { status: 'ok' } on success
            if (response && (response.status === 'ok' || response.status === 'ok' || response.data?.status === 'ok')) {
                const order = {
                    id: orderId,
                    symbol: params.symbol,
                    side: params.side,
                    type: params.type,
                    quantity: params.quantity,
                    price: limitPx ? parseFloat(limitPx) : undefined,
                    status: 'PENDING', // Will be updated by waitForFill
                    submittedAt: Date.now(),
                    stopLoss: params.stopLoss,
                    takeProfit: params.takeProfit,
                    metadata: {
                        hyperliquidResponse: response,
                        assetIndex,
                        clientOrderId: orderId
                    }
                };
                this.pendingOrders.set(orderId, order);
                return order;
            }
            else {
                throw new Error(`Order submission failed: ${response?.error || 'Unknown error'}`);
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ Failed to submit order to Hyperliquid: ${errorMsg}`);
            return {
                id: orderId,
                symbol: params.symbol,
                side: params.side,
                type: params.type,
                quantity: params.quantity,
                status: 'REJECTED',
                submittedAt: Date.now(),
                rejectedReason: `Order submission failed: ${errorMsg}`
            };
        }
    }
    /**
     * Wait for order fill confirmation
     * Polls Hyperliquid API for order status
     */
    async waitForFill(order, timeoutMs) {
        const startTime = Date.now();
        const pollInterval = 2000; // Poll every 2 seconds
        // Use provided credentials or fallback to environment variables
        const accountAddress = this.accountAddress || getHyperliquidAccountAddress();
        if (!accountAddress) {
            return {
                ...order,
                status: 'REJECTED',
                rejectedReason: 'Account address not configured'
            };
        }
        while (Date.now() - startTime < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            try {
                // Query user state to check order status
                const userState = await fetchHyperliquid('/info', {
                    type: 'clearinghouseState',
                    user: accountAddress
                });
                // Check if order is filled
                // Hyperliquid returns open orders in userState.openOrders
                if (userState && userState.openOrders) {
                    const openOrder = userState.openOrders.find((o) => o.oid === order.metadata?.clientOrderId ||
                        o.coid === order.metadata?.clientOrderId);
                    if (!openOrder) {
                        // Order not in open orders - check filled orders
                        if (userState.filledOrders) {
                            const filledOrder = userState.filledOrders.find((o) => o.oid === order.metadata?.clientOrderId ||
                                o.coid === order.metadata?.clientOrderId);
                            if (filledOrder) {
                                return {
                                    ...order,
                                    status: 'FILLED',
                                    filledQuantity: parseFloat(filledOrder.sz || order.quantity.toString()),
                                    filledPrice: parseFloat(filledOrder.avgPx || order.price?.toString() || '0'),
                                    filledAt: Date.now()
                                };
                            }
                        }
                        // Order might be filled but not yet in filledOrders - check positions
                        if (userState.assetPositions) {
                            const position = userState.assetPositions.find((p) => p.position.coin === order.symbol);
                            if (position) {
                                // Position exists - order likely filled
                                return {
                                    ...order,
                                    status: 'FILLED',
                                    filledQuantity: order.quantity,
                                    filledPrice: order.price || parseFloat(position.position.entryPx || '0'),
                                    filledAt: Date.now()
                                };
                            }
                        }
                    }
                    else {
                        // Order still open
                        const updatedOrder = {
                            ...order,
                            status: 'PENDING'
                        };
                        this.pendingOrders.set(order.id, updatedOrder);
                    }
                }
            }
            catch (error) {
                console.warn(`⚠️  Failed to poll order status: ${error.message}`);
                // Continue polling
            }
        }
        // Timeout - order not filled
        if (this.config.retryOnTimeout) {
            console.warn(`⚠️  Order ${order.id} timeout after ${timeoutMs}ms`);
        }
        return {
            ...order,
            status: 'TIMEOUT',
            rejectedReason: `Order timeout after ${timeoutMs}ms`
        };
    }
    /**
     * Pre-execution checks
     */
    async preExecutionChecks(_signal, _quantity) {
        // Check API connection
        // Use provided credentials or fallback to environment variables
        const walletApiKey = this.walletApiKey || getHyperliquidWalletApiKey();
        if (!walletApiKey || walletApiKey.trim() === '') {
            return {
                passed: false,
                reason: 'Wallet API key not configured'
            };
        }
        // Check account address
        const accountAddress = this.accountAddress || getHyperliquidAccountAddress();
        if (!accountAddress) {
            return {
                passed: false,
                reason: 'Account address not configured'
            };
        }
        // TODO: Check available margin
        // TODO: Check risk limits
        // TODO: Check position limits
        return { passed: true };
    }
    /**
     * Get API error rate
     */
    getApiErrorRate() {
        if (this.apiRequestCount === 0)
            return 0;
        return (this.apiErrorCount / this.apiRequestCount) * 100;
    }
    /**
     * Reset API error tracking
     */
    resetApiErrorTracking() {
        this.apiErrorCount = 0;
        this.apiRequestCount = 0;
    }
    /**
     * Save trade to in-memory storage (Cloudflare Workers compatible)
     */
    saveTradeToMemory(order, type, metadata) {
        try {
            const trade = {
                ...order,
                type,
                metadata,
                savedAt: Date.now()
            };
            // Add to in-memory trade history
            this.tradeHistory.push(trade);
            console.log(`[CLOUDFLARE_WORKERS] Saved trade ${trade.id} (${type}) to memory storage`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`Failed to save live trade to memory: ${errorMsg}`);
        }
    }
    /**
     * Save trade to file (DISABLED - not compatible with Cloudflare Workers)
     */
    saveTradeToFile(order, type, metadata) {
        // Note: This method is disabled in Cloudflare Workers environment
        // File system operations are not available in Cloudflare Workers
        console.log(`[CLOUDFLARE_WORKERS] File saving disabled: Would save trade ${order.id} (${type}) to ${this.config.tradesFile}`);
        /* Original implementation commented out:
        try {
          const fileDir = path.dirname(this.config.tradesFile)
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true })
          }
    
          let trades: any[] = []
          if (fs.existsSync(this.config.tradesFile)) {
            const content = fs.readFileSync(this.config.tradesFile, 'utf-8')
            trades = JSON.parse(content)
          }
    
          const trade = {
            ...order,
            type,
            metadata,
            savedAt: Date.now()
          }
    
          trades.push(trade)
          fs.writeFileSync(this.config.tradesFile, JSON.stringify(trades, null, 2))
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`Failed to save live trade to file: ${errorMsg}`)
        }
        */
    }
    /**
     * Get trade history from in-memory storage (Cloudflare Workers compatible)
     */
    getTradeHistory() {
        return [...this.tradeHistory]; // Return a copy to prevent external modifications
    }
}
