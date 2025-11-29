/**
 * Hyperliquid API Data Fetcher
 * fetchHyperliquid, getAssetMetadata, getUserState functions
 *
 * Note: According to Hyperliquid API docs (https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api):
 * - Info endpoint (/info) does NOT require HTTP authentication - it's a public endpoint
 * - API wallets are used for signing transactions (EIP-712 signatures), not HTTP auth headers
 * - Exchange endpoint (/exchange) requires signed messages, not Bearer tokens
 */
// Hyperliquid API URL helper
function getHyperliquidApiUrl() {
    const isTestnet = process.env.HYPERLIQUID_TESTNET === 'true';
    return isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz';
}
export async function fetchHyperliquid(endpoint, data) {
    const HYPERLIQUID_API_URL = getHyperliquidApiUrl();
    console.log(`🌐 Hyperliquid API URL: ${HYPERLIQUID_API_URL} (testnet=${process.env.HYPERLIQUID_TESTNET})`);
    const url = new URL(endpoint, HYPERLIQUID_API_URL);
    const postData = JSON.stringify(data);
    const headers = {
        'Content-Type': 'application/json'
    };
    // Note: Hyperliquid Info endpoint does NOT require HTTP authentication
    // API wallets are used for signing transactions, not HTTP auth headers
    // See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
    try {
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers,
            body: postData
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`❌ Hyperliquid API Error ${response.status}:`, errorBody);
            throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`);
        }
        const result = await response.json();
        return result;
    }
    catch (error) {
        throw new Error(`Failed to fetch Hyperliquid data: ${error.message}`);
    }
}
export async function getAssetMetadata() {
    try {
        const result = await fetchHyperliquid('/info', { type: 'metaAndAssetCtxs' });
        return result;
    }
    catch (error) {
        console.error('Error fetching asset metadata:', error);
        throw new Error(`Failed to fetch asset metadata: ${error.message}`);
    }
}
export async function getUserState(address, retries = 3, retryDelay = 1000) {
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Info endpoint does NOT require authentication - it's a public endpoint
            // According to Hyperliquid API docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
            const result = await fetchHyperliquid('/info', {
                type: 'clearinghouseState',
                user: address
            });
            return result;
        }
        catch (error) {
            lastError = error;
            if (attempt < retries) {
                const delay = retryDelay * attempt;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError || new Error('Failed to fetch user state after retries');
}
/**
 * Fetch real-time price for a specific asset
 * OPTIMIZATION: Accept metadata as parameter to avoid duplicate API call
 */
export async function getRealTimePrice(asset, metadata) {
    try {
        // OPTIMIZATION: Use provided metadata if available (avoid duplicate API call)
        const hyperliquidMetadata = metadata || await getAssetMetadata();
        let assetCtxs = [];
        let universe = [];
        if (Array.isArray(hyperliquidMetadata) && hyperliquidMetadata.length >= 2) {
            const metaObj = hyperliquidMetadata[0];
            if (metaObj && metaObj.universe) {
                universe = metaObj.universe || [];
            }
            assetCtxs = Array.isArray(hyperliquidMetadata[1]) ? hyperliquidMetadata[1] : [];
        }
        else if (hyperliquidMetadata && hyperliquidMetadata.data) {
            assetCtxs = hyperliquidMetadata.data.assetCtxs || [];
            universe = hyperliquidMetadata.data.universe || [];
        }
        const universeIndex = universe.findIndex((item) => {
            if (typeof item === 'string')
                return item === asset;
            return item.name === asset || item.symbol === asset;
        });
        if (universeIndex >= 0 && universeIndex < assetCtxs.length) {
            const assetCtx = assetCtxs[universeIndex];
            return parseFloat(assetCtx.markPx || '0');
        }
        return null;
    }
    catch (error) {
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.warn(`Failed to fetch real-time price for ${asset}: ${error.message}`);
        }
        return null;
    }
}
