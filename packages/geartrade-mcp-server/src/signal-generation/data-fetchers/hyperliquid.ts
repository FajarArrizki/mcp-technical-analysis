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
function getHyperliquidApiUrl(): string {
  const isTestnet = process.env.HYPERLIQUID_TESTNET === 'true'
  return isTestnet ? 'https://api.hyperliquid-testnet.xyz' : 'https://api.hyperliquid.xyz'
}

export async function fetchHyperliquid(endpoint: string, data: any): Promise<any> {
  const HYPERLIQUID_API_URL = getHyperliquidApiUrl()
  console.log(`🌐 Hyperliquid API URL: ${HYPERLIQUID_API_URL} (testnet=${process.env.HYPERLIQUID_TESTNET})`)
  const url = new URL(endpoint, HYPERLIQUID_API_URL)
  const postData = JSON.stringify(data)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Note: Hyperliquid Info endpoint does NOT require HTTP authentication
  // API wallets are used for signing transactions, not HTTP auth headers
  // See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: postData
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`❌ Hyperliquid API Error ${response.status}:`, errorBody)
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorBody}`)
    }

    const result = await response.json()
    return result
  } catch (error: any) {
    throw new Error(`Failed to fetch Hyperliquid data: ${error.message}`)
  }
}

export async function getAssetMetadata(): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', { type: 'metaAndAssetCtxs' })
    return result
  } catch (error: any) {
    console.error('Error fetching asset metadata:', error)
    throw new Error(`Failed to fetch asset metadata: ${error.message}`)
  }
}

export async function getUserState(
  address: string,
  retries: number = 3,
  retryDelay: number = 1000
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Info endpoint does NOT require authentication - it's a public endpoint
      // According to Hyperliquid API docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
      const result = await fetchHyperliquid('/info', {
        type: 'clearinghouseState',
        user: address
      })
      
      return result
    } catch (error: any) {
      lastError = error
      if (attempt < retries) {
        const delay = retryDelay * attempt
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch user state after retries')
}

/**
 * Fetch real-time price for a specific asset
 * OPTIMIZATION: Accept metadata as parameter to avoid duplicate API call
 */
export async function getRealTimePrice(asset: string, metadata?: any): Promise<number | null> {
  try {
    // OPTIMIZATION: Use provided metadata if available (avoid duplicate API call)
    const hyperliquidMetadata = metadata || await getAssetMetadata()
    let assetCtxs: any[] = []
    let universe: any[] = []
    
    if (Array.isArray(hyperliquidMetadata) && hyperliquidMetadata.length >= 2) {
      const metaObj = hyperliquidMetadata[0]
      if (metaObj && metaObj.universe) {
        universe = metaObj.universe || []
      }
      assetCtxs = Array.isArray(hyperliquidMetadata[1]) ? hyperliquidMetadata[1] : []
    } else if (hyperliquidMetadata && (hyperliquidMetadata as any).data) {
      assetCtxs = (hyperliquidMetadata as any).data.assetCtxs || []
      universe = (hyperliquidMetadata as any).data.universe || []
    }
    
    const universeIndex = universe.findIndex((item: any) => {
      if (typeof item === 'string') return item === asset
      return item.name === asset || item.symbol === asset
    })
    
    if (universeIndex >= 0 && universeIndex < assetCtxs.length) {
      const assetCtx = assetCtxs[universeIndex]
      return parseFloat(assetCtx.markPx || '0')
    }
    return null
  } catch (error: any) {
    if (process.env.VERBOSE_LOGGING === 'true') {
    console.warn(`Failed to fetch real-time price for ${asset}: ${error.message}`)
    }
    return null
  }
}

// ============================================================================
// MARKET DATA - Price and Order Book
// ============================================================================

/**
 * Fetch mid prices for all coins
 * Returns object with coin symbols as keys and mid prices as values
 */
export async function getAllMids(): Promise<Record<string, string>> {
  try {
    const result = await fetchHyperliquid('/info', { type: 'allMids' })
    return result
  } catch (error: any) {
    console.error('Error fetching all mids:', error)
    throw new Error(`Failed to fetch all mids: ${error.message}`)
  }
}

/**
 * Fetch L2 order book snapshot for a specific coin
 * @param coin - Coin symbol (e.g., 'BTC', 'ETH')
 * @param nSigFigs - Significant figures for price aggregation (2, 3, 4, 5, or null for full precision)
 */
export async function getL2OrderBook(
  coin: string,
  nSigFigs?: number | null
): Promise<any> {
  try {
    const params: any = { type: 'l2Book', coin }
    if (nSigFigs !== undefined && nSigFigs !== null) {
      params.nSigFigs = nSigFigs
    }
    const result = await fetchHyperliquid('/info', params)
    return result
  } catch (error: any) {
    console.error(`Error fetching L2 order book for ${coin}:`, error)
    throw new Error(`Failed to fetch L2 order book: ${error.message}`)
  }
}

/**
 * Fetch candle/OHLCV data for a specific coin
 * @param coin - Coin symbol (e.g., 'BTC', 'ETH')
 * @param interval - Candle interval: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 12h, 1d, 3d, 1w, 1M
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds (optional)
 */
export async function getCandleSnapshot(
  coin: string,
  interval: string,
  startTime: number,
  endTime?: number
): Promise<any[]> {
  try {
    const req: any = { coin, interval, startTime }
    if (endTime) {
      req.endTime = endTime
    }
    const result = await fetchHyperliquid('/info', { type: 'candleSnapshot', req })
    return result
  } catch (error: any) {
    console.error(`Error fetching candle snapshot for ${coin}:`, error)
    throw new Error(`Failed to fetch candle snapshot: ${error.message}`)
  }
}

// ============================================================================
// USER DATA - Orders, Fills, Positions
// ============================================================================

/**
 * Fetch user's open orders
 * @param address - User wallet address
 */
export async function getUserOpenOrders(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'openOrders',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching open orders for ${address}:`, error)
    throw new Error(`Failed to fetch open orders: ${error.message}`)
  }
}

/**
 * Fetch user's open orders with additional frontend info
 * @param address - User wallet address
 */
export async function getUserFrontendOpenOrders(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'frontendOpenOrders',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching frontend open orders for ${address}:`, error)
    throw new Error(`Failed to fetch frontend open orders: ${error.message}`)
  }
}

/**
 * Fetch user's fills (trade history)
 * Returns at most 2000 most recent fills
 * @param address - User wallet address
 * @param aggregateByTime - When true, partial fills are combined
 */
export async function getUserFills(
  address: string,
  aggregateByTime: boolean = false
): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'userFills',
      user: address,
      aggregateByTime
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user fills for ${address}:`, error)
    throw new Error(`Failed to fetch user fills: ${error.message}`)
  }
}

/**
 * Fetch user's fills by time range
 * @param address - User wallet address
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds (optional)
 * @param aggregateByTime - When true, partial fills are combined
 */
export async function getUserFillsByTime(
  address: string,
  startTime: number,
  endTime?: number,
  aggregateByTime: boolean = false
): Promise<any[]> {
  try {
    const params: any = {
      type: 'userFillsByTime',
      user: address,
      startTime,
      aggregateByTime
    }
    if (endTime) {
      params.endTime = endTime
    }
    const result = await fetchHyperliquid('/info', params)
    return result
  } catch (error: any) {
    console.error(`Error fetching user fills by time for ${address}:`, error)
    throw new Error(`Failed to fetch user fills by time: ${error.message}`)
  }
}

/**
 * Fetch user's historical orders
 * Returns at most 2000 most recent historical orders
 * @param address - User wallet address
 */
export async function getUserHistoricalOrders(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'historicalOrders',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching historical orders for ${address}:`, error)
    throw new Error(`Failed to fetch historical orders: ${error.message}`)
  }
}

/**
 * Query order status by order ID or client order ID
 * @param address - User wallet address
 * @param oid - Order ID (number) or client order ID (string)
 */
export async function getOrderStatus(
  address: string,
  oid: number | string
): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'orderStatus',
      user: address,
      oid
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching order status:`, error)
    throw new Error(`Failed to fetch order status: ${error.message}`)
  }
}

/**
 * Query user rate limits
 * @param address - User wallet address
 */
export async function getUserRateLimit(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'userRateLimit',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user rate limit:`, error)
    throw new Error(`Failed to fetch user rate limit: ${error.message}`)
  }
}

// ============================================================================
// PORTFOLIO & ACCOUNT DATA
// ============================================================================

/**
 * Query user's portfolio (account value history, PnL history)
 * @param address - User wallet address
 */
export async function getUserPortfolio(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'portfolio',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user portfolio for ${address}:`, error)
    throw new Error(`Failed to fetch user portfolio: ${error.message}`)
  }
}

/**
 * Query user's role (user, agent, vault, subAccount, missing)
 * @param address - User wallet address
 */
export async function getUserRole(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'userRole',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user role for ${address}:`, error)
    throw new Error(`Failed to fetch user role: ${error.message}`)
  }
}

/**
 * Fetch user's subaccounts
 * @param address - User wallet address
 */
export async function getUserSubaccounts(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'subAccounts',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user subaccounts for ${address}:`, error)
    throw new Error(`Failed to fetch user subaccounts: ${error.message}`)
  }
}

/**
 * Query user's fees (fee schedule, rates, discounts)
 * @param address - User wallet address
 */
export async function getUserFees(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'userFees',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user fees for ${address}:`, error)
    throw new Error(`Failed to fetch user fees: ${error.message}`)
  }
}

// ============================================================================
// REFERRAL DATA
// ============================================================================

/**
 * Query user's referral information
 * @param address - User wallet address
 */
export async function getUserReferral(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'referral',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user referral for ${address}:`, error)
    throw new Error(`Failed to fetch user referral: ${error.message}`)
  }
}

// ============================================================================
// VAULT DATA
// ============================================================================

/**
 * Fetch vault details
 * @param vaultAddress - Vault wallet address
 * @param userAddress - Optional user address to get user-specific vault info
 */
export async function getVaultDetails(
  vaultAddress: string,
  userAddress?: string
): Promise<any> {
  try {
    const params: any = {
      type: 'vaultDetails',
      vaultAddress
    }
    if (userAddress) {
      params.user = userAddress
    }
    const result = await fetchHyperliquid('/info', params)
    return result
  } catch (error: any) {
    console.error(`Error fetching vault details for ${vaultAddress}:`, error)
    throw new Error(`Failed to fetch vault details: ${error.message}`)
  }
}

/**
 * Fetch user's vault deposits/equities
 * @param address - User wallet address
 */
export async function getUserVaultEquities(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'userVaultEquities',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user vault equities for ${address}:`, error)
    throw new Error(`Failed to fetch user vault equities: ${error.message}`)
  }
}

// ============================================================================
// STAKING DATA
// ============================================================================

/**
 * Query user's staking delegations
 * @param address - User wallet address
 */
export async function getUserDelegations(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'delegations',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching user delegations for ${address}:`, error)
    throw new Error(`Failed to fetch user delegations: ${error.message}`)
  }
}

/**
 * Query user's staking summary
 * @param address - User wallet address
 */
export async function getUserDelegatorSummary(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'delegatorSummary',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching delegator summary for ${address}:`, error)
    throw new Error(`Failed to fetch delegator summary: ${error.message}`)
  }
}

/**
 * Query user's staking history
 * @param address - User wallet address
 */
export async function getUserDelegatorHistory(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'delegatorHistory',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching delegator history for ${address}:`, error)
    throw new Error(`Failed to fetch delegator history: ${error.message}`)
  }
}

/**
 * Query user's staking rewards
 * @param address - User wallet address
 */
export async function getUserDelegatorRewards(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'delegatorRewards',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching delegator rewards for ${address}:`, error)
    throw new Error(`Failed to fetch delegator rewards: ${error.message}`)
  }
}

// ============================================================================
// SPOT MARKET DATA
// ============================================================================

/**
 * Fetch spot market metadata
 */
export async function getSpotMetadata(): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', { type: 'spotMeta' })
    return result
  } catch (error: any) {
    console.error('Error fetching spot metadata:', error)
    throw new Error(`Failed to fetch spot metadata: ${error.message}`)
  }
}

/**
 * Fetch spot market metadata and asset contexts
 */
export async function getSpotMetaAndAssetCtxs(): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', { type: 'spotMetaAndAssetCtxs' })
    return result
  } catch (error: any) {
    console.error('Error fetching spot meta and asset contexts:', error)
    throw new Error(`Failed to fetch spot meta and asset contexts: ${error.message}`)
  }
}

/**
 * Fetch user's spot token balances
 * @param address - User wallet address
 */
export async function getUserSpotBalances(address: string): Promise<any> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'spotClearinghouseState',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching spot balances for ${address}:`, error)
    throw new Error(`Failed to fetch spot balances: ${error.message}`)
  }
}

// ============================================================================
// PERPETUALS METADATA
// ============================================================================

/**
 * Fetch perpetuals metadata (universe, margin tables)
 * @param dex - Optional DEX name (defaults to first perp dex)
 */
export async function getPerpMetadata(dex?: string): Promise<any> {
  try {
    const params: any = { type: 'meta' }
    if (dex) {
      params.dex = dex
    }
    const result = await fetchHyperliquid('/info', params)
    return result
  } catch (error: any) {
    console.error('Error fetching perp metadata:', error)
    throw new Error(`Failed to fetch perp metadata: ${error.message}`)
  }
}

/**
 * Fetch all perpetual DEXs
 */
export async function getPerpDexs(): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', { type: 'perpDexs' })
    return result
  } catch (error: any) {
    console.error('Error fetching perp dexs:', error)
    throw new Error(`Failed to fetch perp dexs: ${error.message}`)
  }
}

// ============================================================================
// FUNDING DATA
// ============================================================================

/**
 * Fetch funding history for a coin
 * @param coin - Coin symbol (e.g., 'BTC', 'ETH')
 * @param startTime - Start time in milliseconds
 * @param endTime - End time in milliseconds (optional)
 */
export async function getFundingHistory(
  coin: string,
  startTime: number,
  endTime?: number
): Promise<any[]> {
  try {
    const params: any = {
      type: 'fundingHistory',
      coin,
      startTime
    }
    if (endTime) {
      params.endTime = endTime
    }
    const result = await fetchHyperliquid('/info', params)
    return result
  } catch (error: any) {
    console.error(`Error fetching funding history for ${coin}:`, error)
    throw new Error(`Failed to fetch funding history: ${error.message}`)
  }
}

// ============================================================================
// TWAP DATA
// ============================================================================

/**
 * Fetch user's TWAP slice fills
 * @param address - User wallet address
 */
export async function getUserTwapSliceFills(address: string): Promise<any[]> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'userTwapSliceFills',
      user: address
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching TWAP slice fills for ${address}:`, error)
    throw new Error(`Failed to fetch TWAP slice fills: ${error.message}`)
  }
}

// ============================================================================
// BUILDER FEE DATA
// ============================================================================

/**
 * Check builder fee approval
 * @param userAddress - User wallet address
 * @param builderAddress - Builder wallet address
 */
export async function getMaxBuilderFee(
  userAddress: string,
  builderAddress: string
): Promise<number> {
  try {
    const result = await fetchHyperliquid('/info', {
      type: 'maxBuilderFee',
      user: userAddress,
      builder: builderAddress
    })
    return result
  } catch (error: any) {
    console.error('Error fetching max builder fee:', error)
    throw new Error(`Failed to fetch max builder fee: ${error.message}`)
  }
}
