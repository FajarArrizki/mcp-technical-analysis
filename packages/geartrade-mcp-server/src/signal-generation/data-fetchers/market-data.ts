/**
 * Market Data Fetcher
 * getMarketData function - fetches comprehensive market data including technical indicators
 * Enhanced with Hyperliquid API and HyperScreener data
 */

import { log } from '../utils/logger'
import { 
  getAssetMetadata, 
  getAllMids, 
  getL2OrderBook,
  getFundingHistory,
  getPerpMetadata
} from './hyperliquid'
import {
  getLiquidations,
  getWhalePositions,
  getFundingRates as getHyperscreenerFundingRates,
  getOpenInterest as getHyperscreenerOpenInterest,
  getLongShortRatio as getHyperscreenerLongShortRatio,
  getTopGainers,
  getTopLosers,
  getLargeTrades,
  getMarketsOverview,
  getTopTradersRanking
} from './hyperscreener'
import { getHistoricalData, getMultiTimeframeData } from './historical-data'
import { calculateTechnicalIndicators } from '../technical-indicators'
import { calculateMultiTimeframeIndicators, checkTrendAlignment } from '../utils/multi-timeframe'
import { calculateEnhancedMetrics } from '../analysis/enhanced-metrics'
import { calculateOrderBookDepth } from '../analysis/orderbook'
import { calculateSessionVolumeProfile, calculateCompositeVolumeProfile } from '../analysis/volume-profile'
import { detectChangeOfCharacter } from '../analysis/market-structure'
import { performComprehensiveVolumeAnalysis } from '../analysis/volume-analysis'
import { fetchFuturesData } from './binance-futures'
import { calculateCVD } from '../analysis/volume-analysis'

// Stub functions for removed modules
function formatPrice(price: number, _asset?: string, _priceString?: string): string { return price.toString() }
function calculateBTCCorrelation(_data: any, _btcData: any): any { return null }
function analyzeWhaleActivity(_data: any): any { return null }

// HyperScreener data cache
interface HyperscreenerCache {
  liquidations: Map<string, any[]>
  whalePositions: Map<string, any[]>
  longShortRatios: Map<string, number>
  largeTrades: Map<string, any[]>
  marketsOverview: Map<string, any>
  topGainers: any[]
  topLosers: any[]
  topTraders: any[]
  timestamp: number
}

let hyperscreenerCache: HyperscreenerCache | null = null
const HYPERSCREENER_CACHE_TTL = 60000 // 1 minute cache

// Function to fetch and cache HyperScreener data
async function fetchHyperscreenerData(): Promise<HyperscreenerCache> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (hyperscreenerCache && (now - hyperscreenerCache.timestamp) < HYPERSCREENER_CACHE_TTL) {
    return hyperscreenerCache
  }
  
  // Fetch all HyperScreener data in parallel
  const [
    liquidationsData,
    whalePositionsData,
    longShortData,
    largeTradesData,
    marketsData,
    topGainersData,
    topLosersData,
    topTradersData
  ] = await Promise.all([
    getLiquidations('notional_volume', 'desc', 100).catch(() => []),
    getWhalePositions('position_value', 'desc', 100).catch(() => []),
    getHyperscreenerLongShortRatio('long_short_ratio', 'desc', 100).catch(() => []),
    getLargeTrades(50000, 'desc', 100).catch(() => []),
    getMarketsOverview(undefined, 200).catch(() => []),
    getTopGainers('24h', 50).catch(() => []),
    getTopLosers('24h', 50).catch(() => []),
    getTopTradersRanking('D', 'pnl', 'desc', 50).catch(() => [])
  ])
  
  // Create lookup maps
  const liquidationsMap = new Map<string, any[]>()
  const whalePositionsMap = new Map<string, any[]>()
  const longShortRatiosMap = new Map<string, number>()
  const largeTradesMap = new Map<string, any[]>()
  const marketsOverviewMap = new Map<string, any>()
  
  // Process liquidations
  if (Array.isArray(liquidationsData)) {
    for (const liq of liquidationsData) {
      const symbol = (liq.symbol || liq.coin || '').toUpperCase()
      if (symbol) {
        if (!liquidationsMap.has(symbol)) {
          liquidationsMap.set(symbol, [])
        }
        liquidationsMap.get(symbol)!.push(liq)
      }
    }
  }
  
  // Process whale positions
  if (Array.isArray(whalePositionsData)) {
    for (const whale of whalePositionsData) {
      const symbol = (whale.symbol || whale.coin || '').toUpperCase()
      if (symbol) {
        if (!whalePositionsMap.has(symbol)) {
          whalePositionsMap.set(symbol, [])
        }
        whalePositionsMap.get(symbol)!.push(whale)
      }
    }
  }
  
  // Process long/short ratios
  if (Array.isArray(longShortData)) {
    for (const ls of longShortData) {
      const symbol = (ls.symbol || ls.coin || '').toUpperCase()
      const ratio = ls.long_short_ratio || ls.longShortRatio || ls.ratio
      if (symbol && ratio !== undefined) {
        longShortRatiosMap.set(symbol, parseFloat(ratio))
      }
    }
  }
  
  // Process large trades
  if (Array.isArray(largeTradesData)) {
    for (const trade of largeTradesData) {
      const symbol = (trade.symbol || trade.coin || '').toUpperCase()
      if (symbol) {
        if (!largeTradesMap.has(symbol)) {
          largeTradesMap.set(symbol, [])
        }
        largeTradesMap.get(symbol)!.push(trade)
      }
    }
  }
  
  // Process markets overview
  if (Array.isArray(marketsData)) {
    for (const market of marketsData) {
      const symbol = (market.symbol || market.coin || market.name || '').toUpperCase()
      if (symbol) {
        marketsOverviewMap.set(symbol, market)
      }
    }
  }
  
  // Update cache
  hyperscreenerCache = {
    liquidations: liquidationsMap,
    whalePositions: whalePositionsMap,
    longShortRatios: longShortRatiosMap,
    largeTrades: largeTradesMap,
    marketsOverview: marketsOverviewMap,
    topGainers: Array.isArray(topGainersData) ? topGainersData : [],
    topLosers: Array.isArray(topLosersData) ? topLosersData : [],
    topTraders: Array.isArray(topTradersData) ? topTradersData : [],
    timestamp: now
  }
  
  log(`   📊 HyperScreener cache updated: ${liquidationsMap.size} liquidations, ${whalePositionsMap.size} whale positions, ${longShortRatiosMap.size} L/S ratios`, 'cyan')
  
  return hyperscreenerCache
}

// Function to fetch L2 order book with caching
const l2BookCache = new Map<string, { data: any; timestamp: number }>()
const L2_BOOK_CACHE_TTL = 5000 // 5 seconds cache for order book

async function fetchL2OrderBook(asset: string): Promise<any> {
  const now = Date.now()
  const cached = l2BookCache.get(asset)
  
  if (cached && (now - cached.timestamp) < L2_BOOK_CACHE_TTL) {
    return cached.data
  }
  
  try {
    const l2Book = await getL2OrderBook(asset, 3) // 3 significant figures
    l2BookCache.set(asset, { data: l2Book, timestamp: now })
    return l2Book
  } catch (error) {
    return null
  }
}

// Function to fetch all mid prices
let allMidsCache: { data: Record<string, string>; timestamp: number } | null = null
const ALL_MIDS_CACHE_TTL = 3000 // 3 seconds cache

async function fetchAllMids(): Promise<Record<string, string>> {
  const now = Date.now()
  
  if (allMidsCache && (now - allMidsCache.timestamp) < ALL_MIDS_CACHE_TTL) {
    return allMidsCache.data
  }
  
  try {
    const mids = await getAllMids()
    allMidsCache = { data: mids, timestamp: now }
    return mids
  } catch (error) {
    return {}
  }
}

// Cache for funding rate and open interest trends
const fundingRateCache = new Map<string, { value: number; timestamp: number }>()
const openInterestCache = new Map<string, { value: number; timestamp: number }>()
const FUNDING_OI_CACHE_TTL = 600000 // 10 minutes default

export async function getMarketData(assets: string[], metadata?: any): Promise<{
  marketDataMap: Map<string, any>
  allowedAssets: string[]
  hyperscreenerData?: HyperscreenerCache
}> {
  try {
    // OPTIMIZATION: Fetch Hyperliquid metadata, all mids, and HyperScreener data in parallel
    const [hyperliquidMetadata, allMids, hsData] = await Promise.all([
      metadata || getAssetMetadata(),
      fetchAllMids(),
      fetchHyperscreenerData()
    ])
    
    const marketData = new Map<string, any>()
    
    // Hyperliquid returns array: [metaObject, assetCtxsArray]
    let assetCtxs: any[] = []
    let universe: any[] = []
    let marginTables: any[] = []
    
    if (Array.isArray(hyperliquidMetadata) && hyperliquidMetadata.length >= 2) {
      const metaObj = hyperliquidMetadata[0]
      if (metaObj && metaObj.universe) {
        universe = metaObj.universe || []
      }
      if (metaObj && metaObj.marginTables) {
        marginTables = metaObj.marginTables || []
      }
      assetCtxs = Array.isArray(hyperliquidMetadata[1]) ? hyperliquidMetadata[1] : []
    } else if (hyperliquidMetadata && (hyperliquidMetadata as any).data) {
      assetCtxs = (hyperliquidMetadata as any).data.assetCtxs || []
      universe = (hyperliquidMetadata as any).data.universe || []
      marginTables = (hyperliquidMetadata as any).data.marginTables || []
    }
    
    log(`   Found ${universe.length} assets in universe, ${assetCtxs.length} asset contexts, ${marginTables.length} margin tables`, 'cyan')
    
    // CRITICAL FIX: Remove rate limiting - process ALL assets in parallel without limits
    // Batch size set to very large number (999999) to effectively remove batching
    // All assets processed in parallel for maximum speed (no rate limit restrictions)
    const BATCH_SIZE = 999999 // Effectively unlimited - process all assets in parallel
    // const BATCH_DELAY = 0 // 0ms delay between batches (no throttling)

    // OPTIMIZATION FINAL: Cache all configuration constants at function start (avoid repeated checks per asset)
    // CRITICAL FIX: Increased to 75 candles minimum for better volume analysis and indicator accuracy
    // Volume analysis requires sufficient historical data to calculate POC, VAH/VAL, HVN/LVN, CVD, etc.
    const CANDLES_COUNT = 200
    // FUTURES / SCALPING MODE: default primary TF → 5m (lebih responsif untuk entry cepat)
    // Bisa override via env: PRIMARY_DATA_INTERVAL=10m/15m/1h, dll.
    const PRIMARY_INTERVAL = '5m'
    // CRITICAL FIX: Enable multi-timeframe by default for better trend alignment scoring
    // Multi-timeframe provides alignmentScore (0-100) which is critical for confidence calculation (25 points)
    // Can disable via MULTI_TIMEFRAME="" if needed (for speed)
    const MULTI_TIMEFRAME = ['1d', '4h', '1h'] // Default: daily, 4h, 1h timeframes
    // CRITICAL FIX: Enable all external data features by default for better confidence calculation
    // These features provide 30 points in confidence scoring (external data category)
    // Disabling them causes external score to be 0-5/30, reducing max confidence to ~76%
    // Enable all by default to maximize confidence scoring accuracy
    // Block explorer APIs disabled: always skip external blockchain explorer calls
    // const USE_BLOCKCHAIN_DATA = false
    const USE_ENHANCED_METRICS = true // Default: true
    const USE_ORDER_BOOK_DEPTH = true // Default: true
    const USE_VOLUME_PROFILE = true // Default: true
    const USE_COMPOSITE_VOLUME_PROFILE = true // Default: true
    const USE_MARKET_STRUCTURE = true // Default: true
    const USE_COMPREHENSIVE_VOLUME_ANALYSIS = true // Default: true
    const USE_FUTURES_DATA = true // Default: true
    const USE_BTC_CORRELATION = true // Default: true
    const USE_WHALE_DETECTION = true // Default: true
    
    // Helper function to process a single asset
    const processAsset = async (asset: string): Promise<any> => {
      try {
        // OPTIMIZATION FINAL: Cache Date.now() once per asset to avoid repeated calls
        const assetTimestamp = Date.now()
        
        const universeIndex = universe.findIndex((item: any) => {
          if (typeof item === 'string') return item === asset
          return item.name === asset || item.symbol === asset
        })
        
        // CRITICAL FIX: Skip delisted assets (they exist in universe but can't be traded)
        if (universeIndex >= 0) {
          const universeItem = universe[universeIndex]
          if (typeof universeItem === 'object' && universeItem.isDelisted === true) {
            // OPTIMIZATION: Removed error logging - only show successful fetches
            return null
          }
        }
        
        if (universeIndex >= 0 && universeIndex < assetCtxs.length) {
        const assetCtx = assetCtxs[universeIndex]
        // CRITICAL: Current price MUST come from Hyperliquid (markPx), NOT from Binance historical data
        // Binance historical data is ONLY for indicators calculation, NOT for current price
        // Store original price string from Hyperliquid to preserve precision
        const priceString = assetCtx.markPx || '0'
        const price = parseFloat(priceString) // Current price from Hyperliquid real-time API
        const volume = parseFloat(assetCtx.dayNtlVlm || '0')
        
        // Get max leverage from universe or marginTables
        let maxLeverage = 10
        if (universeIndex < universe.length) {
          const universeItem = universe[universeIndex]
          if (universeItem && typeof universeItem === 'object') {
            maxLeverage = (universeItem as any).maxLeverage || (universeItem as any).maxLeverageFromMargin || ((universeItem as any).config?.maxLeverage) || 10
          }
        }
        if (marginTables && marginTables.length > universeIndex) {
          const marginTable = marginTables[universeIndex]
          if (marginTable && typeof marginTable === 'object') {
            maxLeverage = (marginTable as any).maxLeverage || (marginTable as any).maxLv || maxLeverage
          }
        }
        
        // OPTIMIZATION: Removed per-asset logging for speed (only log on success/error)
        let historicalData: any[] = []
        let indicators: any = null
        let multiTimeframeData: Record<string, any[]> = {}
        let multiTimeframeIndicators: Record<string, any> = {}
        let trendAlignment: any = null
        
        try {
          // OPTIMIZATION FINAL: Use cached env vars instead of repeated process.env checks
          // OPTIMIZATION: Fetch primary and multi-timeframe data in parallel (if enabled)
          // Multi-timeframe doesn't depend on primary data, so they can be fetched simultaneously
          const [primaryData, mtfData] = await Promise.all([
            getHistoricalData(asset, PRIMARY_INTERVAL, CANDLES_COUNT).catch(_err => {
              // OPTIMIZATION: Removed error logging - only show successful fetches
            return []
            }),
            MULTI_TIMEFRAME.length > 0 
              ? getMultiTimeframeData(asset, MULTI_TIMEFRAME).catch(_err => {
                  // OPTIMIZATION: Removed error logging - only show successful fetches
              return {}
            })
              : Promise.resolve({} as Record<string, any[]>)
          ])
          
          historicalData = primaryData
          
          // OPTIMIZATION FINAL: Cache Object.keys(mtfData) check to avoid repeated computation
          const mtfDataKeys = Object.keys(mtfData)
          const hasMtfData = mtfDataKeys.length > 0
          
          // Calculate multi-timeframe indicators (reduced logging for speed)
          if (hasMtfData) {
            multiTimeframeData = mtfData
            multiTimeframeIndicators = calculateMultiTimeframeIndicators(mtfData, price)
            trendAlignment = checkTrendAlignment(multiTimeframeIndicators)
          }
          
          // Calculate indicators (skip retry for speed)
          if (historicalData.length >= 14) {
            indicators = calculateTechnicalIndicators(historicalData, price)
          }
          
          // OPTIMIZATION: formatPrice already imported statically at top of file
          // Log only on success (reduced logging for speed, using original Hyperliquid price format)
          if (indicators && historicalData.length >= 14 && (indicators.rsi14 || indicators.ema20 || indicators.macd || indicators.bollingerBands)) {
            // Use original price string from Hyperliquid for display (preserves format without trailing zeros)
            const priceFormatted = formatPrice(price, asset, priceString)
            log(`   ✅ ${asset}: $${priceFormatted} | ${historicalData.length} candles | RSI(14): ${indicators.rsi14?.toFixed(2) || 'N/A'} | EMA(20): $${indicators.ema20?.toFixed(2) || 'N/A'} | MACD: ${indicators.macd ? indicators.macd.histogram.toFixed(4) : 'N/A'}`, 'green')
          }
        } catch (error: any) {
          // OPTIMIZATION: Removed error logging - only show successful fetches
        }
        
        // Extract Hyperliquid native data fields
        const fundingRate = parseFloat(assetCtx.funding || '0')
        const openInterest = parseFloat(assetCtx.openInterest || '0')
        const premium = parseFloat(assetCtx.premium || '0')
        const oraclePx = parseFloat(assetCtx.oraclePx || '0')
        const midPx = parseFloat(assetCtx.midPx || '0')
        const impactPxs = assetCtx.impactPxs || null
        const prevDayPx = parseFloat(assetCtx.prevDayPx || '0')
        const dayBaseVlm = parseFloat(assetCtx.dayBaseVlm || '0')
        
        // Calculate funding rate and OI trends
        let fundingRateTrend = 'stable'
        let oiTrend = 'stable'
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp instead of repeated Date.now() calls
        const previousFundingRate = fundingRateCache.get(asset)
        if (previousFundingRate && previousFundingRate.timestamp && (assetTimestamp - previousFundingRate.timestamp) < FUNDING_OI_CACHE_TTL) {
          const prevValue = previousFundingRate.value
          const currentValue = fundingRate
          
          if (Math.abs(prevValue) > 0.0001) {
            const changePercent = Math.abs((currentValue - prevValue) / Math.abs(prevValue))
            if (changePercent > 0.05) {
              if (currentValue > prevValue * 1.05) {
                fundingRateTrend = 'increasing'
              } else if (currentValue < prevValue * 0.95) {
                fundingRateTrend = 'decreasing'
              }
            } else if (changePercent > 0.02) {
              if (currentValue > prevValue * 1.02) {
                fundingRateTrend = 'increasing'
              } else if (currentValue < prevValue * 0.98) {
                fundingRateTrend = 'decreasing'
              }
            }
          } else if (Math.abs(currentValue) > 0.0001) {
            fundingRateTrend = currentValue > 0 ? 'increasing' : 'decreasing'
          }
        }
        // OPTIMIZATION: Removed first-time funding rate logging for speed
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp
        fundingRateCache.set(asset, {
          value: fundingRate,
          timestamp: assetTimestamp
        })
        
        const previousOI = openInterestCache.get(asset)
        if (previousOI && previousOI.timestamp && (assetTimestamp - previousOI.timestamp) < FUNDING_OI_CACHE_TTL) {
          const prevValue = previousOI.value
          const currentValue = openInterest
          
          if (prevValue > 0) {
            const changePercent = Math.abs((currentValue - prevValue) / prevValue)
            if (changePercent > 0.05) {
              if (currentValue > prevValue * 1.05) {
                oiTrend = 'increasing'
              } else if (currentValue < prevValue * 0.95) {
                oiTrend = 'decreasing'
              }
            } else if (changePercent > 0.02) {
              if (currentValue > prevValue * 1.02) {
                oiTrend = 'increasing'
              } else if (currentValue < prevValue * 0.98) {
                oiTrend = 'decreasing'
              }
            }
          } else if (currentValue > 0) {
            oiTrend = 'increasing'
          }
        }
        // Removed first-time and trend logging for speed
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp
        openInterestCache.set(asset, {
          value: openInterest,
          timestamp: assetTimestamp
        })
        
        // Skip blockchain explorer data entirely (disabled by design)
        const blockchainData: any = {
            largeTransactions: [],
            estimatedExchangeFlow: 0,
            whaleActivityScore: 0,
            timestamp: assetTimestamp
        }
        
        // OPTIMIZATION FINAL: Use cached USE_ENHANCED_METRICS instead of repeated process.env check
        // CRITICAL FIX: Enhanced metrics enabled by default for better confidence calculation
        // Can disable via USE_ENHANCED_METRICS=false if needed (for speed)
        const enhancedMetrics = USE_ENHANCED_METRICS && indicators 
          ? calculateEnhancedMetrics(historicalData, indicators, null) 
          : null
        
        if (indicators && enhancedMetrics) {
          indicators.volumePriceDivergence = enhancedMetrics.volumePriceDivergence
          indicators.volumeTrend = enhancedMetrics.volumeTrend
          indicators.volumeChangePercent = enhancedMetrics.volumeChangePercent
        } else if (indicators) {
          // Set default values if enhanced metrics disabled
          indicators.volumePriceDivergence = 0
          indicators.volumeTrend = 'stable'
          indicators.volumeChangePercent = 0
        }
        
        // OPTIMIZATION FINAL: Use cached USE_ORDER_BOOK_DEPTH instead of repeated process.env check
        const orderBookDepth = USE_ORDER_BOOK_DEPTH && impactPxs && price > 0 
          ? calculateOrderBookDepth(impactPxs, price, assetCtx)
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_VOLUME_PROFILE instead of repeated process.env check
        // CRITICAL FIX: Session volume profile enabled by default for better confidence calculation
        // Can disable via USE_VOLUME_PROFILE=false if needed (for speed)
        const sessionVolumeProfile = USE_VOLUME_PROFILE && historicalData && historicalData.length >= 20
          ? calculateSessionVolumeProfile(historicalData, price, 'daily')
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_COMPOSITE_VOLUME_PROFILE instead of repeated process.env check
        // CRITICAL FIX: Composite volume profile enabled by default (requires 50+ candles, now 80)
        // Can disable via USE_COMPOSITE_VOLUME_PROFILE=false if needed (for speed)
        const compositeVolumeProfile = USE_COMPOSITE_VOLUME_PROFILE && historicalData && historicalData.length >= 50
          ? calculateCompositeVolumeProfile(historicalData, price, 'weekly')
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_MARKET_STRUCTURE instead of repeated process.env check
        // CRITICAL FIX: Change of Character and CVD enabled by default for better confidence calculation
        // Can disable via USE_MARKET_STRUCTURE=false if needed (for speed)
        const changeOfCharacter = USE_MARKET_STRUCTURE && historicalData && historicalData.length >= 20
          ? detectChangeOfCharacter(historicalData, price)
          : null
        
        const cumulativeVolumeDelta = USE_MARKET_STRUCTURE && historicalData && historicalData.length >= 20
          ? calculateCVD(historicalData)
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_COMPREHENSIVE_VOLUME_ANALYSIS instead of repeated process.env check
        // CRITICAL FIX: Comprehensive Volume Analysis enabled by default for better confidence calculation
        // This is computationally expensive but provides better scoring accuracy
        const comprehensiveVolumeAnalysis = USE_COMPREHENSIVE_VOLUME_ANALYSIS && historicalData && historicalData.length >= 20
          ? performComprehensiveVolumeAnalysis(
              historicalData,
              price,
              undefined, // breakoutLevel - can be calculated from support/resistance
              undefined, // breakoutDirection
              sessionVolumeProfile || compositeVolumeProfile || undefined,
              cumulativeVolumeDelta || undefined,
              openInterest ? [{ price, openInterest }] : undefined
            )
          : null
        
        // Fetch futures data (Binance futures: funding, OI, long/short ratio, liquidations)
        let futuresData: any = null
        let btcCorrelationData: any = null
        let whaleActivityData: any = null

        if (USE_FUTURES_DATA && price > 0) {
          try {
            const futures = await fetchFuturesData(asset, price).catch(() => null)
            if (futures) {
              futuresData = futures
            }
          } catch (error: any) {
            // Silent fail - futures data is optional
          }
        }

        // Calculate BTC correlation
        if (USE_BTC_CORRELATION && historicalData && historicalData.length >= 24) {
          try {
            const correlation = await calculateBTCCorrelation(asset, historicalData).catch(() => null)
            if (correlation) {
              btcCorrelationData = correlation
            }
          } catch (error: any) {
            // Silent fail - BTC correlation is optional
          }
        }

        // Analyze whale activity
        if (USE_WHALE_DETECTION && historicalData && historicalData.length >= 20) {
          try {
            const whale = analyzeWhaleActivity(historicalData)
            if (whale) {
              whaleActivityData = whale
            }
          } catch (error: any) {
            // Silent fail - whale detection is optional
          }
        }
        
        // Fetch L2 order book from Hyperliquid (real-time)
        const l2BookData = await fetchL2OrderBook(asset)
        let l2Book = null
        if (l2BookData && l2BookData.levels) {
          const bids = (l2BookData.levels[0] || []).slice(0, 20).map((level: any) => ({
            price: parseFloat(level.px),
            size: parseFloat(level.sz)
          }))
          const asks = (l2BookData.levels[1] || []).slice(0, 20).map((level: any) => ({
            price: parseFloat(level.px),
            size: parseFloat(level.sz)
          }))
          
          const totalBidSize = bids.reduce((sum: number, b: any) => sum + b.size, 0)
          const totalAskSize = asks.reduce((sum: number, a: any) => sum + a.size, 0)
          const bidAskImbalance = totalBidSize + totalAskSize > 0 
            ? (totalBidSize - totalAskSize) / (totalBidSize + totalAskSize) 
            : 0

          l2Book = {
            bids,
            asks,
            totalBidSize,
            totalAskSize,
            bidAskImbalance,
            bestBid: bids.length > 0 ? bids[0].price : null,
            bestAsk: asks.length > 0 ? asks[0].price : null,
            spread: bids.length > 0 && asks.length > 0 ? asks[0].price - bids[0].price : null,
            spreadPercent: bids.length > 0 && asks.length > 0 && bids[0].price > 0 
              ? ((asks[0].price - bids[0].price) / bids[0].price) * 100 
              : null
          }
        }

        // Get HyperScreener data for this asset
        const hsLiquidations = hsData.liquidations.get(asset) || []
        const hsWhalePositions = hsData.whalePositions.get(asset) || []
        const hsLongShortRatio = hsData.longShortRatios.get(asset) || null
        const hsLargeTrades = hsData.largeTrades.get(asset) || []
        const hsMarketOverview = hsData.marketsOverview.get(asset) || null
        
        // Get real-time mid price from allMids
        const midPriceFromAllMids = allMids[asset] ? parseFloat(allMids[asset]) : null
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp for all timestamp fields
        const externalData = {
          hyperliquid: {
            fundingRate: fundingRate,
            openInterest: openInterest,
            fundingRateTrend: fundingRateTrend,
            oiTrend: oiTrend,
            premium: premium,
            oraclePx: oraclePx,
            midPx: midPx,
            midPxRealtime: midPriceFromAllMids, // Real-time mid price from allMids endpoint
            impactPxs: impactPxs,
            prevDayPx: prevDayPx,
            dayBaseVlm: dayBaseVlm,
            maxLeverage: maxLeverage,
            l2Book: l2Book, // L2 order book data
            timestamp: assetTimestamp
          },
          hyperscreener: {
            liquidations: hsLiquidations.slice(0, 10),
            whalePositions: hsWhalePositions.slice(0, 10),
            longShortRatio: hsLongShortRatio,
            largeTrades: hsLargeTrades.slice(0, 10),
            marketOverview: hsMarketOverview,
            isTopGainer: hsData.topGainers.some((g: any) => (g.symbol || g.coin || '').toUpperCase() === asset),
            isTopLoser: hsData.topLosers.some((l: any) => (l.symbol || l.coin || '').toUpperCase() === asset),
            timestamp: assetTimestamp
          },
          blockchain: blockchainData || {
            largeTransactions: [],
            estimatedExchangeFlow: 0,
            whaleActivityScore: 0,
            timestamp: assetTimestamp
          },
          enhanced: enhancedMetrics || {
            volumeTrend: 'stable',
            volatilityPattern: 'normal',
            volumePriceDivergence: 0,
            timestamp: assetTimestamp
          },
          orderBook: orderBookDepth,
          volumeProfile: {
            session: sessionVolumeProfile,
            composite: compositeVolumeProfile
          },
          marketStructure: {
            coc: changeOfCharacter
          },
          volumeDelta: cumulativeVolumeDelta,
          comprehensiveVolumeAnalysis: comprehensiveVolumeAnalysis,
          futures: futuresData ? {
            fundingRate: futuresData.fundingRate,
            openInterest: futuresData.openInterest,
            longShortRatio: futuresData.longShortRatio,
            liquidation: futuresData.liquidation,
            premiumIndex: futuresData.premiumIndex,
            btcCorrelation: btcCorrelationData,
            whaleActivity: whaleActivityData
          } : undefined
        }
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp for result timestamp
        // CRITICAL: Both price and markPx come from Hyperliquid real-time API (NOT from Binance)
        // Binance historical data is stored separately and used ONLY for indicators
        const result = {
          asset: asset,
          data: {
            symbol: asset,
            price: price, // Current price from Hyperliquid (same as markPx)
            priceString: priceString, // Store original price string from Hyperliquid
            volume24h: volume,
            markPx: price, // Current mark price from Hyperliquid (real-time, primary source)
            markPxString: priceString, // Store original markPx string from Hyperliquid
            maxLeverage: maxLeverage,
            timestamp: assetTimestamp,
            historicalData: historicalData,
            indicators: indicators,
            multiTimeframeData: multiTimeframeData,
            multiTimeframeIndicators: multiTimeframeIndicators,
            trendAlignment: trendAlignment,
            externalData: externalData,
            // Direct access to openInterest for redundancy
            openInterest: openInterest,
            fundingRate: fundingRate,
          }
        }
        
          return result
        } else {
          log(`   ⚠️  ${asset}: Not found in universe (index: ${universeIndex})`, 'yellow')
          return null
        }
      } catch (error: any) {
        // OPTIMIZATION: Removed error logging - only show successful fetches
        return null
      }
    }
    
    // OPTIMIZATION: Process all batches in parallel instead of sequential
    const results: any[] = []
    
    // Split assets into batches
    const batches: string[][] = []
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      batches.push(assets.slice(i, i + BATCH_SIZE))
    }
    
    const totalBatches = batches.length
    if (totalBatches > 0) {
      log(`   📊 Processing ${totalBatches} batch(es) in parallel (${assets.length} total assets)...`, 'cyan')
      
      // Process all batches in parallel (not sequential)
      const allBatchPromises = batches.map((batch, batchIndex) => {
        const batchNumber = batchIndex + 1
        log(`   📊 Batch ${batchNumber}/${totalBatches}: ${batch.length} assets`, 'cyan')
      
        // Process each batch in parallel
        return Promise.allSettled(batch.map(asset => processAsset(asset)))
      })
      
      // Wait for all batches to complete in parallel
      const allBatchResults = await Promise.allSettled(allBatchPromises)
      
      // Collect results from all batches - only process successful results (no error logging)
      allBatchResults.forEach((batchResult) => {
        if (batchResult.status === 'fulfilled' && Array.isArray(batchResult.value)) {
          batchResult.value.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
            }
            // OPTIMIZATION: Removed error logging for failed batch processing - only show successful fetches
          })
        }
        // OPTIMIZATION: Removed error logging for failed batches - only show successful fetches
      })
    }
    
    // Store results in marketData map
    for (const result of results) {
      if (result && result.data) {
        marketData.set(result.asset, result.data)
      }
    }
    
    log(`   ✅ Fetched market data for ${results.length} assets with HyperScreener data`, 'green')
    
    return { 
      marketDataMap: marketData, 
      allowedAssets: assets,
      hyperscreenerData: hsData
    }
  } catch (error: any) {
    log(`   ❌ Error: ${error.message}`, 'red')
    throw new Error(`Failed to fetch market data: ${error.message}`)
  }
}

// Export helper functions for direct use
export { fetchL2OrderBook, fetchAllMids }
// Note: fetchHyperscreenerData is internal, use getMarketData().hyperscreenerData instead

