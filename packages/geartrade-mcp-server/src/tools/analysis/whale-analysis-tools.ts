/**
 * Whale Analysis Tools
 * Tools for tracking whale positions and trader tier classification
 */

import { z } from 'zod'
import { 
  getPositionsBySymbol,
  getWhalePositions as getHyperscreenerWhalePositions,
  getTopTraders
} from '../../signal-generation/data-fetchers/hyperscreener'
import { 
  classifyPositionsByTier, 
  detectPositionChanges,
  TRADER_TIERS
} from '../../signal-generation/analysis/tier-classification'
import type { TrackedWallet, TierClassificationResult, WalletChange } from '../../signal-generation/analysis/tier-classification'

import { getUserState } from '../../signal-generation/data-fetchers/hyperliquid'
import { 
  getTierByNotional, 
  getTierLabel 
} from '../../signal-generation/analysis/tier-classification'
import type { PositionWithTier } from '../../signal-generation/analysis/tier-classification'

// Cache for tracking wallet positions
const walletPositionCache = new Map<string, PositionWithTier[]>()
export function registerWhaleAnalysisTools(server: any) {

  // Tool: get_whale_position
  server.registerTool(
    'get_whale_position',
    {
      title: 'Get Whale Position',
      description: 'Track positions from specific wallet addresses with labeling support. Can also include top whales from HyperScreener. Supports change detection alerts.',
      inputSchema: {
        wallets: z
          .array(z.object({
            address: z.string().describe('Wallet address to track'),
            label: z.string().optional().describe('Optional label for the wallet (e.g., "Smart Money 1", "Competitor A")'),
          }))
          .min(1)
          .describe('Array of wallet objects with address and optional label (at least 1 wallet required)'),
        includeHyperscreener: z
          .boolean()
          .optional()
          .default(false)
          .describe('Include top whales from HyperScreener data'),
        hyperscreenerLimit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe('Number of top whales to fetch from HyperScreener (default: 10)'),
        tickers: z
          .array(z.string())
          .optional()
          .describe('Optional filter by tickers (e.g., ["BTC", "ETH"])'),
        detectChanges: z
          .boolean()
          .optional()
          .default(true)
          .describe('Enable change detection alerts (compares with previous call)'),
      },
      outputSchema: z.object({
        timestamp: z.number(),
        trackedWallets: z.array(z.any()),
        hyperscreenerWhales: z.array(z.any()).nullable(),
        changes: z.array(z.any()).nullable(),
        summary: z.object({
          totalWalletsTracked: z.number(),
          manualWallets: z.number(),
          hyperscreenerWallets: z.number(),
          combinedNotional: z.number(),
          changesDetected: z.number(),
        }),
        error: z.string().nullable(),
      }),
    },
    async ({ wallets, includeHyperscreener = false, hyperscreenerLimit = 10, tickers, detectChanges = true }: { 
      wallets: Array<{ address: string, label?: string }>,
      includeHyperscreener?: boolean,
      hyperscreenerLimit?: number,
      tickers?: string[],
      detectChanges?: boolean
    }) => {
      try {
        const trackedWallets: TrackedWallet[] = []
        const allChanges: WalletChange[] = []
        let combinedNotional = 0
        
        // Normalize tickers filter
        const tickerFilter = Array.isArray(tickers) && tickers.length > 0 
          ? tickers.map(t => String(t).toUpperCase()) 
          : null
        
        // Process manual wallets
        if (wallets && wallets.length > 0) {
          for (const wallet of wallets) {
            try {
              const userState = await getUserState(wallet.address)
              
              if (!userState) continue
              
              const assetPositions = userState.assetPositions || []
              const positions: PositionWithTier[] = []
              let walletNotional = 0
              
              for (const pos of assetPositions) {
                const position = pos.position || pos
                const szi = parseFloat(position.szi || '0')
                if (szi === 0) continue
                
                const symbol = position.coin || pos.coin || 'UNKNOWN'
                
                // Apply ticker filter
                if (tickerFilter && !tickerFilter.includes(symbol.toUpperCase())) continue
                
                const entryPx = parseFloat(position.entryPx || '0')
                const currentPx = parseFloat(position.positionValue || '0') / Math.abs(szi) || entryPx
                const notional = Math.abs(szi) * currentPx
                const unrealizedPnl = parseFloat(position.unrealizedPnl || '0')
                const pnlPercent = entryPx > 0 ? ((currentPx - entryPx) / entryPx) * 100 * (szi > 0 ? 1 : -1) : 0
                const leverage = parseFloat(position.leverage || '1')
                
                const tier = getTierByNotional(notional)
                
                positions.push({
                  address: wallet.address,
                  symbol,
                  side: szi > 0 ? 'LONG' : 'SHORT',
                  size: Math.abs(szi),
                  notionalValue: notional,
                  entryPrice: entryPx,
                  currentPrice: currentPx,
                  unrealizedPnl,
                  pnlPercent,
                  leverage,
                  tier: getTierLabel(notional),
                  tierEmoji: tier.emoji,
                  tierName: tier.name,
                })
                
                walletNotional += notional
              }
              
              // Calculate wallet tier based on total notional
              const walletTier = getTierByNotional(walletNotional)
              
              // Change detection
              if (detectChanges) {
                const cacheKey = wallet.address.toLowerCase()
                const cached = walletPositionCache.get(cacheKey)
                
                if (cached) {
                  const changes = detectPositionChanges(cached, positions, wallet.address)
                  allChanges.push(...changes)
                }
                
                // Update cache
                walletPositionCache.set(cacheKey, positions)
              }
              
              trackedWallets.push({
                address: wallet.address,
                label: wallet.label || null,
                source: 'manual',
                tier: getTierLabel(walletNotional),
                tierEmoji: walletTier.emoji,
                accountValue: parseFloat(userState.marginSummary?.accountValue || userState.crossMarginSummary?.accountValue || '0'),
                totalNotional: walletNotional,
                positions,
              })
              
              combinedNotional += walletNotional
            } catch (walletError) {
              console.error(`Error fetching wallet ${wallet.address}:`, walletError)
            }
          }
        }
        
        // Process HyperScreener whales
        let hyperscreenerWhales: TrackedWallet[] | null = null
        
        if (includeHyperscreener) {
          try {
            const whalePositions = await getHyperscreenerWhalePositions('notional_value', 'desc', hyperscreenerLimit * 3)
            
            // Group by address
            const whaleMap = new Map<string, any[]>()
            for (const pos of whalePositions) {
              const symbol = pos.asset_name || pos.symbol
              
              // Apply ticker filter
              if (tickerFilter && !tickerFilter.includes(symbol.toUpperCase())) continue
              
              const address = pos.address
              if (!whaleMap.has(address)) {
                whaleMap.set(address, [])
              }
              whaleMap.get(address)!.push(pos)
            }
            
            hyperscreenerWhales = []
            let count = 0
            
            for (const [address, positions] of whaleMap) {
              if (count >= hyperscreenerLimit) break
              
              // Skip if already in manual wallets
              if (wallets?.some(w => w.address.toLowerCase() === address.toLowerCase())) continue
              
              let totalNotional = 0
              const formattedPositions: PositionWithTier[] = []
              
              for (const pos of positions) {
                const notional = pos.notional_value || 0
                totalNotional += notional
                const tier = getTierByNotional(notional)
                
                formattedPositions.push({
                  address,
                  symbol: pos.asset_name || pos.symbol,
                  side: pos.direction || pos.side,
                  size: pos.size || 0,
                  notionalValue: notional,
                  entryPrice: pos.entry_price || 0,
                  currentPrice: pos.current_price || 0,
                  unrealizedPnl: pos.unrealized_pnl || 0,
                  pnlPercent: pos.pnl_percent || 0,
                  leverage: pos.leverage || 1,
                  tier: getTierLabel(notional),
                  tierEmoji: tier.emoji,
                  tierName: tier.name,
                })
              }
              
              const walletTier = getTierByNotional(totalNotional)
              
              hyperscreenerWhales.push({
                address,
                label: null,
                source: 'hyperscreener',
                tier: getTierLabel(totalNotional),
                tierEmoji: walletTier.emoji,
                accountValue: totalNotional, // Approximate
                totalNotional,
                positions: formattedPositions,
              })
              
              combinedNotional += totalNotional
              count++
            }
          } catch (hsError) {
            console.error('Error fetching HyperScreener whales:', hsError)
          }
        }
        
        const result = {
          timestamp: Date.now(),
          trackedWallets,
          hyperscreenerWhales,
          changes: allChanges.length > 0 ? allChanges : null,
          summary: {
            totalWalletsTracked: trackedWallets.length + (hyperscreenerWhales?.length || 0),
            manualWallets: trackedWallets.length,
            hyperscreenerWallets: hyperscreenerWhales?.length || 0,
            combinedNotional,
            changesDetected: allChanges.length,
          },
          error: null,
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: errorMsg }, null, 2) }],
          structuredContent: {
            timestamp: Date.now(),
            trackedWallets: [],
            hyperscreenerWhales: null,
            changes: null,
            summary: { totalWalletsTracked: 0, manualWallets: 0, hyperscreenerWallets: 0, combinedNotional: 0, changesDetected: 0 },
            error: errorMsg,
          },
        }
      }
    }
  )
  

  // Tool: get_tier_classification
  server.registerTool(
    'get_tier_classification',
    {
      title: 'Get Tier Classification',
      description: 'Get market breakdown by trader tier (Shrimp to Institutional) for given tickers. Shows count, notional, and wallet addresses per tier with Long/Short breakdown.',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of ticker symbols to analyze (e.g., ["BTC", "ETH", "SOL"])'),
        limit: z
          .number()
          .int()
          .min(50)
          .max(500)
          .optional()
          .default(200)
          .describe('Maximum positions to fetch per ticker (default: 200)'),
      },
      outputSchema: z.object({
        timestamp: z.number(),
        results: z.record(z.string(), z.any()),
        tierDefinitions: z.array(z.object({
          name: z.string(),
          emoji: z.string(),
          range: z.string(),
        })),
        error: z.string().nullable(),
      }),
    },
    async ({ tickers, limit = 200 }: { tickers: string[], limit?: number }) => {
      if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid tickers parameter' }, null, 2) }],
          structuredContent: {
            timestamp: Date.now(),
            results: {},
            tierDefinitions: TRADER_TIERS.map(t => ({
              name: t.name,
              emoji: t.emoji,
              range: t.maxNotional === Infinity ? `> $${(t.minNotional / 1000).toFixed(0)}K` : `$${(t.minNotional / 1000).toFixed(0)}K - $${(t.maxNotional / 1000).toFixed(0)}K`
            })),
            error: 'Invalid tickers parameter',
          },
        }
      }
      
      try {
        const normalizedTickers = tickers.map(t => t.trim().toUpperCase())
        const results: Record<string, any> = {}
        
        for (const ticker of normalizedTickers) {
          try {
            // Fetch positions from HyperScreener
            const positions = await getPositionsBySymbol(ticker, 'notional_value', 'desc', limit)
            
            if (positions.length === 0) {
              results[ticker] = {
                error: 'No positions found',
                totalPositions: 0,
                breakdown: {},
              }
              continue
            }
            
            // Classify positions by tier
            const classification = classifyPositionsByTier(positions, ticker)
            
            // Format breakdown with top wallets (sorted by notional desc)
            const formattedBreakdown: Record<string, any> = {}
            
            for (const tier of classification.breakdown) {
              const key = `${tier.emoji} ${tier.tierName}`
              formattedBreakdown[key] = {
                count: tier.total.count,
                notional: tier.total.notional,
                pct: parseFloat(tier.total.percentage.toFixed(2)),
                long: {
                  count: tier.long.count,
                  notional: tier.long.notional,
                  topWallets: tier.long.topWallets.map(w => ({
                    address: w.address,
                    notional: w.notional,
                  })),
                },
                short: {
                  count: tier.short.count,
                  notional: tier.short.notional,
                  topWallets: tier.short.topWallets.map(w => ({
                    address: w.address,
                    notional: w.notional,
                  })),
                },
              }
            }
            
            results[ticker] = {
              totalPositions: classification.totalPositions,
              totalNotional: classification.totalNotional,
              breakdown: formattedBreakdown,
              dominance: classification.dominance.retailVsWhale,
              topTier: `${classification.dominance.topTierEmoji} ${classification.dominance.topTier}`,
              whaleConcentration: parseFloat(classification.dominance.whaleConcentration.toFixed(2)),
              institutionalConcentration: parseFloat(classification.dominance.institutionalConcentration.toFixed(2)),
              longVsShort: {
                longCount: classification.longVsShort.longCount,
                shortCount: classification.longVsShort.shortCount,
                longNotional: classification.longVsShort.longNotional,
                shortNotional: classification.longVsShort.shortNotional,
                ratio: parseFloat(classification.longVsShort.ratio.toFixed(2)),
              },
            }
          } catch (tickerError) {
            results[ticker] = {
              error: tickerError instanceof Error ? tickerError.message : String(tickerError),
              totalPositions: 0,
              breakdown: {},
            }
          }
        }
        
        const result = {
          timestamp: Date.now(),
          results,
          tierDefinitions: TRADER_TIERS.map(t => ({
            name: t.name,
            emoji: t.emoji,
            range: t.maxNotional === Infinity 
              ? `> $${(t.minNotional / 1000000).toFixed(1)}M` 
              : t.minNotional >= 1000000
                ? `$${(t.minNotional / 1000000).toFixed(1)}M - $${(t.maxNotional / 1000000).toFixed(1)}M`
                : `$${(t.minNotional / 1000).toFixed(0)}K - $${(t.maxNotional / 1000).toFixed(0)}K`
          })),
          error: null,
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: errorMsg }, null, 2) }],
          structuredContent: {
            timestamp: Date.now(),
            results: {},
            tierDefinitions: TRADER_TIERS.map(t => ({
              name: t.name,
              emoji: t.emoji,
              range: `$${t.minNotional} - $${t.maxNotional}`
            })),
            error: errorMsg,
          },
        }
      }
    }
  )
  

}
