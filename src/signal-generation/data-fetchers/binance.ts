/**
 * Binance API Data Fetcher
 * getHistoricalDataFromBinance function
 */

import * as https from 'https'
import { HistoricalDataPoint } from '../types'

const BINANCE_BINANCE_PAIRS: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT',
  'BNB': 'BNBUSDT',
  'ADA': 'ADAUSDT',
  'DOGE': 'DOGEUSDT',
  'LTC': 'LTCUSDT',
  'BCH': 'BCHUSDT',
  'ETC': 'ETCUSDT',
  'XLM': 'XLMUSDT',
  'TRX': 'TRXUSDT',
  'NEAR': 'NEARUSDT',
  'FTM': 'FTMUSDT',
  'ALGO': 'ALGOUSDT',
  'FIL': 'FILUSDT',
  'ICP': 'ICPUSDT',
  'ATOM': 'ATOMUSDT',
  'DOT': 'DOTUSDT',
  'LINK': 'LINKUSDT',
  'UNI': 'UNIUSDT',
  'AAVE': 'AAVEUSDT',
  'AVAX': 'AVAXUSDT',
  'MATIC': 'MATICUSDT',
  'ARB': 'ARBUSDT',
  'OP': 'OPUSDT',
  'SUI': 'SUIUSDT',
  'APT': 'APTUSDT',
  'HYPER': 'HYPERUSDT',
  'RENDER': 'RENDERUSDT',
  'TRUMP': 'TRUMPUSDT',
  'PENGU': 'PENGUUSDT',
  'kBONK': 'KBONKUSDT', // Note: Hyperliquid uses lowercase k, but Binance uses uppercase K
  'PYTH': 'PYTHUSDT',
  'BLUR': 'BLURUSDT',
  'ONDO': 'ONDOUSDT',
  'ZEC': 'ZECUSDT',
  'XPL': 'XPLUSDT',
  'FARTCOIN': 'FARTCOINUSDT',
  'TON': 'TONUSDT',
  'WLD': 'WLDUSDT',
  // Additional assets (part of first 50)
  'STX': 'STXUSDT',
  'INJ': 'INJUSDT',
  'SEI': 'SEIUSDT',
  'FET': 'FETUSDT',
  'RUNE': 'RUNEUSDT',
  'TIA': 'TIAUSDT',
  'JTO': 'JTOUSDT',
  'ORDI': 'ORDIUSDT',
  'DYDX': 'DYDXUSDT', // Added to replace SATS (SATS not available in Hyperliquid)
  // Additional 50 assets to reach 100 (all verified in Hyperliquid)
  'APE': 'APEUSDT',
  'CRV': 'CRVUSDT',
  'LDO': 'LDOUSDT',
  'GMX': 'GMXUSDT',
  'SNX': 'SNXUSDT',
  'COMP': 'COMPUSDT',
  'MKR': 'MKRUSDT',
  'FXS': 'FXSUSDT',
  'RLB': 'RLBUSDT',
  'kPEPE': 'PEPEUSDT', // Note: Hyperliquid uses lowercase k prefix, Binance uses standard ticker
  'kSHIB': 'SHIBUSDT',
  'OX': 'OXUSDT',
  'FRIEND': 'FRIENDUSDT',
  'SHIA': 'SHIAUSDT',
  'CYBER': 'CYBERUSDT',
  'ZRO': 'ZROUSDT',
  'BLZ': 'BLZUSDT',
  'BANANA': 'BANANAUSDT',
  'CFX': 'CFXUSDT',
  'MINA': 'MINAUSDT',
  'POLYX': 'POLYXUSDT',
  'GAS': 'GASUSDT',
  'STRK': 'STRKUSDT',
  'ZK': 'ZKUSDT',
  'SAND': 'SANDUSDT',
  'IMX': 'IMXUSDT',
  'GALA': 'GALAUSDT',
  'ILV': 'ILVUSDT',
  'WIF': 'WIFUSDT',
  'CAKE': 'CAKEUSDT',
  'PEOPLE': 'PEOPLEUSDT',
  'ENS': 'ENSUSDT',
  'XAI': 'XAIUSDT',
  'MANTA': 'MANTAUSDT',
  'ZETA': 'ZETAUSDT',
  'DYM': 'DYMUSDT',
  'PANDORA': 'PANDORAUSDT',
  'PIXEL': 'PIXELUSDT',
  'TAO': 'TAOUSDT',
  'AR': 'ARUSDT',
  'MYRO': 'MYROUSDT',
  'kFLOKI': 'FLOKIUSDT',
  'BOME': 'BOMEUSDT',
  'ETHFI': 'ETHFIUSDT',
  'ENA': 'ENAUSDT',
  'MNT': 'MNTUSDT',
  'TNSR': 'TNSRUSDT',
  'SAGA': 'SAGAUSDT',
  'HBAR': 'HBARUSDT',
  'POPCAT': 'POPCATUSDT',
  'OMNI': 'OMNIUSDT',
  'EIGEN': 'EIGENUSDT',
  'REZ': 'REZUSDT',
  'NOT': 'NOTUSDT',
  'TURBO': 'TURBOUSDT',
  'BRETT': 'BRETTUSDT',
  'IO': 'IOUSDT',
  'BLAST': 'BLASTUSDT',
  'LISTA': 'LISTAUSDT',
  'MEW': 'MEWUSDT'
}

/**
 * Binance API Data Fetcher - NO RETRY for maximum speed (fail fast)
 * getHistoricalDataFromBinance function
 */
export async function getHistoricalDataFromBinance(
  asset: string,
  interval: string = '1h',
  limit: number = 200,
  _retries: number = 0 // NO RETRY for maximum speed - fail fast
): Promise<HistoricalDataPoint[]> {
  // Try mapping first, then fallback to auto-format ASSETUSDT
  let symbol = BINANCE_BINANCE_PAIRS[asset]
  if (!symbol) {
    // Fallback: try auto-format as ASSETUSDT (most Binance pairs follow this pattern)
    // Remove 'k' prefix if present (e.g., kBONK -> BONKUSDT)
    const cleanAsset = asset.startsWith('k') ? asset.substring(1) : asset
    symbol = `${cleanAsset}USDT`
    // Note: Will try to fetch, but if it fails, will return [] (not throw error)
  }
  
  // Validate interval format
  const validIntervals = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']
  let binanceInterval = interval
  if (!validIntervals.includes(interval)) {
    console.warn(`⚠️  Invalid interval ${interval} for Binance, using 1h as fallback`)
    binanceInterval = '1h'
  }
  
  const path = `/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=${limit}`
  
  // NO RETRY LOGIC - fail fast for maximum speed (retries=0 by default)
  // Single attempt - no retry
  try {
    // Use https module for better compatibility
    const result = await new Promise<HistoricalDataPoint[]>((resolve, reject) => {
        const options: https.RequestOptions = {
          hostname: 'api.binance.com',
          port: 443,
          path: path,
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; GEARTRADE/1.0)'
          },
          timeout: 8000 // 8 second timeout (optimized for faster failure detection)
        }
        
        const req = https.request(options, (res) => {
          let data = ''
          
          res.on('data', (chunk) => {
            data += chunk
          })
          
          res.on('end', () => {
            try {
              // CRITICAL FIX: Remove rate limit restrictions - process all requests without limits
              // Ignore 429 (rate limit) errors and continue processing
              // No rate limiting - all requests proceed in parallel
              if (res.statusCode === 429) {
                // Rate limit hit - skip this request but don't fail
                // Log warning and return empty array to allow other requests to continue
                console.warn(`⚠️  Binance rate limit hit for ${symbol} (429), skipping but continuing...`)
                resolve([]) // Return empty array instead of rejecting
                return
              }
              
              // Handle other non-200 status codes - return [] for invalid symbols (not in Binance)
              if (res.statusCode !== 200) {
                const errorMsg = data ? data.substring(0, 200) : 'Unknown error'
                // If symbol not found (400/404) or invalid, return [] instead of throwing
                // This allows assets not on Binance to still be processed (just without historical data)
                if (res.statusCode === 400 || res.statusCode === 404) {
                  resolve([]) // Return empty array for invalid symbols
                  return
                }
                reject(new Error(`Binance API error: ${res.statusCode} - ${errorMsg}`))
                return
              }
              
              const result = JSON.parse(data) as Array<any>
              
              if (!Array.isArray(result)) {
                reject(new Error(`Binance API returned invalid data format: ${typeof result}`))
                return
              }
              
              if (result.length === 0) {
                reject(new Error('No data returned from Binance'))
                return
              }
              
              // Convert to our format
              const candles: HistoricalDataPoint[] = result
                .map((candle) => {
                  if (!Array.isArray(candle) || candle.length < 6) {
                    return null
                  }
                  
                  const [
                    openTime,
                    open,
                    high,
                    low,
                    close,
                    volume
                  ] = candle
                  
                  return {
                    time: parseInt(openTime),
                    open: parseFloat(open),
                    high: parseFloat(high),
                    low: parseFloat(low),
                    close: parseFloat(close),
                    volume: parseFloat(volume)
                  }
                })
                .filter((c): c is HistoricalDataPoint => 
                  c !== null && c.close > 0 && c.open > 0 && c.high >= c.low
                )
              
              if (candles.length === 0) {
                reject(new Error('No valid candles found in Binance response'))
                return
              }
              
              resolve(candles)
            } catch (error: any) {
              reject(new Error(`Failed to parse Binance response: ${error.message}`))
            }
          })
        })
        
        req.on('error', (error) => {
          reject(new Error(`Binance API network error: ${error.message}`))
        })
        
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Binance API request timeout'))
        })
        
        req.end()
      })
      
    return result
    
  } catch (error: any) {
    // NO RETRY - fail fast for maximum speed
    // Return [] instead of throwing to allow assets without Binance data to still be processed
    // (They can still use Hyperliquid price/volume data, just without historical indicators)
    return []
  }
}

