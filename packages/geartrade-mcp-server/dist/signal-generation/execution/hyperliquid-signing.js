/**
 * Hyperliquid EIP-712 Signing
 * Implements EIP-712 signature for Hyperliquid order submission
 */
import { ethers } from 'ethers';
import { getAssetMetadata } from '../data-fetchers/hyperliquid';
// Hyperliquid EIP-712 Domain
// Chain ID: 1337 for mainnet, 421614 for testnet (Arbitrum testnet)
function getHyperliquidDomain() {
    const isTestnet = process.env.HYPERLIQUID_TESTNET === 'true';
    return {
        name: 'Exchange',
        version: '1',
        chainId: isTestnet ? 421614 : 42161, // Arbitrum testnet: 421614, Arbitrum mainnet: 42161
        verifyingContract: '0x0000000000000000000000000000000000000000'
    };
}
/**
 * Get asset index from symbol
 */
export async function getAssetIndex(symbol) {
    try {
        const metadata = await getAssetMetadata();
        let universe = [];
        if (Array.isArray(metadata) && metadata.length >= 2) {
            const metaObj = metadata[0];
            if (metaObj && metaObj.universe) {
                universe = metaObj.universe || [];
            }
        }
        else if (metadata && metadata.data) {
            universe = metadata.data.universe || [];
        }
        console.log(`🔍 Looking for ${symbol} in universe with ${universe.length} assets`);
        console.log(`First 5 assets:`, universe.slice(0, 5).map((a) => a.name || a));
        const index = universe.findIndex((item) => {
            if (typeof item === 'string')
                return item === symbol;
            return item.name === symbol || item.symbol === symbol;
        });
        console.log(`✅ Found ${symbol} at index: ${index}`);
        if (index < 0) {
            throw new Error(`Asset ${symbol} not found in Hyperliquid universe`);
        }
        return index;
    }
    catch (error) {
        throw new Error(`Failed to get asset index: ${error.message}`);
    }
}
/**
 * Create EIP-712 order message for Hyperliquid
 */
export function createOrderMessage(params) {
    const order = {
        a: params.assetIndex,
        b: params.isBuy,
        s: params.sz,
        r: params.reduceOnly,
    };
    // For limit orders, add price and order type
    if (params.orderType === 'Limit' && params.limitPx) {
        order.p = params.limitPx;
        order.t = { limit: { tif: 'Gtc' } };
    }
    // For market orders, NO price (p) and NO type (t) fields
    // Market orders in Hyperliquid are determined by the absence of these fields
    // Add client order ID if provided (optional, for order tracking)
    if (params.cloid) {
        order.c = params.cloid;
    }
    // Build clean order with only defined fields
    // IMPORTANT: Field order matters for EIP-712 signing!
    const cleanOrder = {};
    if (order.a !== undefined)
        cleanOrder.a = order.a;
    if (order.b !== undefined)
        cleanOrder.b = order.b;
    if (order.p !== undefined)
        cleanOrder.p = order.p; // Only included for limit orders
    if (order.s !== undefined)
        cleanOrder.s = order.s;
    if (order.r !== undefined)
        cleanOrder.r = order.r;
    if (order.t !== undefined)
        cleanOrder.t = order.t; // Only included for limit orders
    if (order.c !== undefined)
        cleanOrder.c = order.c;
    return {
        action: {
            type: 'order',
            orders: [cleanOrder],
            grouping: 'na' // 'na' = no grouping, 'gtd' = good till date grouping
        }
    };
}
/**
 * Sign EIP-712 message for Hyperliquid
 * Hyperliquid uses a specific EIP-712 structure for order signing
 * Returns full hex signature string for Hyperliquid API
 */
export async function signHyperliquidOrder(wallet, message) {
    try {
        // Get the first order to check what fields it has
        const order = message.action.orders[0];
        // Build Order type dynamically based on present fields
        const orderFields = [
            { name: 'a', type: 'uint64' },
            { name: 'b', type: 'bool' },
            { name: 's', type: 'string' },
            { name: 'r', type: 'bool' }
        ];
        // Only add 'p' field if it exists (for limit orders)
        if (order.p !== undefined) {
            orderFields.push({ name: 'p', type: 'string' });
        }
        // Only add 't' field if it exists (for limit orders)
        if (order.t !== undefined) {
            orderFields.push({ name: 't', type: 'Limit' });
        }
        // Only add 'c' field if it exists (client order ID)
        if (order.c !== undefined) {
            orderFields.push({ name: 'c', type: 'string' });
        }
        // Hyperliquid EIP-712 types - must match Hyperliquid's exact structure
        const types = {
            Order: orderFields,
            Action: [
                { name: 'type', type: 'string' },
                { name: 'orders', type: 'Order[]' },
                { name: 'grouping', type: 'string' }
            ]
        };
        // Only add Limit type if needed
        if (order.t !== undefined) {
            types.Limit = [
                { name: 'tif', type: 'string' }
            ];
        }
        // Sign the typed data using EIP-712
        const signature = await wallet.signTypedData(getHyperliquidDomain(), types, message.action);
        // Return the full signature hex string (Hyperliquid expects this format)
        // Format: 0x + r (64 chars) + s (64 chars) + v (2 chars) = 132 chars total
        return signature;
    }
    catch (error) {
        throw new Error(`Failed to sign order: ${error.message}`);
    }
}
/**
 * Create wallet from private key
 */
export function createWalletFromPrivateKey(privateKey) {
    try {
        // Remove '0x' prefix if present
        const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
        // Validate private key length (64 hex chars = 32 bytes)
        if (key.length !== 64) {
            throw new Error('Invalid private key length. Must be 64 hex characters (32 bytes)');
        }
        return new ethers.Wallet(`0x${key}`);
    }
    catch (error) {
        throw new Error(`Failed to create wallet: ${error.message}`);
    }
}
