/**
 * Run Test Mode
 * Entry point for paper trading cycle
 */

import { initializeTestMode, runTestModeCycle } from './signal-generation/cycle/test-mode'
import { formatSignal } from './signal-generation/formatting/format-signal'
import { createSection, formatKeyValue } from './signal-generation/cycle/shared/format-box'
import { formatPositionBox, formatClosedPositionBox } from './signal-generation/cycle/shared/format-position'
import { formatPortfolioSummary, formatSystemStatus } from './signal-generation/cycle/shared/format-portfolio'
import { formatTradingDecisions } from './signal-generation/cycle/shared/format-trading-decisions'

// Environment variables are loaded by config/index.ts

async function main() {
  console.log('🚀 Starting TEST MODE (Paper Trading)')
  console.log('═══════════════════════════════════════\n')

  // Load configuration
  const cycleIntervalMs = parseInt(process.env.CYCLE_INTERVAL_MS || '10000') // 10 seconds default (for testing)
  const paperCapital = parseFloat(process.env.PAPER_CAPITAL || '10000')
  const topNAssets = parseInt(process.env.TOP_ASSETS_FOR_AI || '15')
  const stateFile = process.env.CYCLE_STATE_FILE || 'data/cycle-state-test.json'
  const performanceFile = process.env.PERFORMANCE_REPORT_FILE || 'data/performance-report-test.json'
  const aiTrainingDataFile = process.env.AI_TRAINING_DATA_FILE || 'data/ai-training-data-test.json'
  const paperTradesFile = process.env.PAPER_TRADES_FILE || 'data/paper-trades.json'

  // AI model is passed directly (no initialization needed, handled in generateSignals)
  // Use defaults if env vars not set (for testing without API keys)
  const aiProviderApiKey = process.env.AI_PROVIDER_API_KEY || process.env.OPENROUTER_API_KEY
  const modelId = process.env.MODEL_ID || 'anthropic/claude-3-5-sonnet'
  const aiProvider = process.env.AI_PROVIDER || 'openrouter'

  if (!aiProviderApiKey) {
    console.warn('⚠️  WARNING: AI_PROVIDER_API_KEY not set')
    console.warn('   Test mode will run but signal generation may fail without valid API key')
    console.warn('   Set it with: export AI_PROVIDER_API_KEY=your_api_key')
    console.warn('')
  }

  const model = {
    provider: aiProvider,
    modelId
  }

  console.log(`   AI Provider: ${aiProvider}`)
  console.log(`   Model: ${modelId}`)

  // Initialize test mode
  const config = {
    cycleIntervalMs,
    paperCapital,
    topNAssets,
    stateFile,
    performanceFile,
    aiTrainingDataFile,
    paperTradesFile,
    enabled: true
  }

  const { state, performanceTracker, cycleConfig } = initializeTestMode(config, model)

  console.log(`✅ Test mode initialized`)
  console.log(`   Paper Capital: $${paperCapital.toFixed(2)}`)
  console.log(`   Cycle Interval: ${cycleIntervalMs / 1000}s`)
  console.log(`   Top N Assets: ${topNAssets}`)
  console.log(`   State File: ${stateFile}`)
  console.log(`\n═══════════════════════════════════════\n`)

  // Setup graceful shutdown
  let isRunning = true
  let currentState = state

  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Received SIGINT, shutting down gracefully...')
    isRunning = false
  })

  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Received SIGTERM, shutting down gracefully...')
    isRunning = false
  })

  // Main cycle loop
  let cycleNumber = 0
  const cycleStartTime = Date.now()
  
  while (isRunning) {
    try {
      cycleNumber++
      console.log(`\n[${new Date().toISOString()}] Starting cycle #${cycleNumber}...`)

      const result = await runTestModeCycle(currentState, cycleConfig, performanceTracker)

      if (result.success) {
        if (result.newState) {
          const previousPositionsCount = currentState.positions instanceof Map ? currentState.positions.size : (currentState.positions ? Object.keys(currentState.positions).length : 0)
          
          currentState = {
            ...currentState,
            ...result.newState,
            positions: result.newState.positions || currentState.positions || new Map()
          }
          
          // Log position and trade count changes
          const currentPositionsCount = currentState.positions instanceof Map ? currentState.positions.size : (currentState.positions ? Object.keys(currentState.positions).length : 0)
          const metrics = performanceTracker.getMetrics()
          const totalTrades = metrics.totalTrades || 0
          const realizedPnl = metrics.totalReturnUsd || 0
          const unrealizedPnl = Array.from((currentState.positions || new Map()).values()).reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0)
          
          if (previousPositionsCount !== currentPositionsCount || totalTrades > 0) {
            console.log(`\x1b[36m📊 Cycle Summary: ${currentPositionsCount} positions | ${totalTrades} trades | Realized: $${realizedPnl.toFixed(2)} | Unrealized: $${unrealizedPnl.toFixed(2)}\x1b[0m`)
          }
        }

        // Display active positions with detailed info (formatted box)
        const positions = currentState.positions || new Map()
        if (positions.size > 0) {
          const marketData = result.marketData || {}
          let positionIndex = 0
          
          for (const [symbol, position] of positions.entries()) {
            // Get ranking if available (from topAssets or signal metadata)
            let ranking: number | undefined = undefined
            if (result.signals) {
              for (let i = 0; i < result.signals.length; i++) {
                if (result.signals[i].coin === symbol || result.signals[i].coin === position.coin) {
                  ranking = i + 1
                  break
                }
              }
            }
            
            // Signal valid check (simplified - assume valid if position exists)
            const signalValid = true
            
            console.log(formatPositionBox(
              position,
              positionIndex++,
              marketData,
              ranking,
              signalValid
            ))
          }
        } else {
          console.log(createSection('📊 Active Positions', 'No active positions'))
        }
        
        // Display closed positions (recent trades)
        // Get recent trades from performance tracker (sorted by exit time, most recent first)
        const allTrades = (performanceTracker as any).trades || []
        const recentTrades = [...allTrades].sort((a, b) => (b.exitTime || 0) - (a.exitTime || 0))
        if (recentTrades.length > 0) {
          console.log(createSection('📊 Closed Positions (Recent Trades)', ''))
          // Show last 5 closed positions
          const closedPositionsToShow = recentTrades.slice(0, 5)
          for (let i = 0; i < closedPositionsToShow.length; i++) {
            const trade = closedPositionsToShow[i]
            console.log(formatClosedPositionBox(trade, i))
          }
          if (recentTrades.length > 5) {
            console.log(`\n... dan ${recentTrades.length - 5} posisi tertutup lainnya\n`)
          }
        }
        
        // Display portfolio summary
        const totalCapital = paperCapital
        const totalMarginUsed = Array.from((currentState.positions || new Map()).values()).reduce((sum, pos) => {
          const entryPrice = pos.entryPrice || 0
          const quantity = Math.abs(pos.quantity || 0)
          const leverage = pos.leverage || 1
          const positionValue = entryPrice * quantity
          return sum + (positionValue / leverage)
        }, 0)
        const availableMargin = Math.max(0, totalCapital - totalMarginUsed)
        
        console.log(formatPortfolioSummary(
          currentState.positions || new Map(),
          performanceTracker.getMetrics(),
          totalCapital,
          availableMargin
        ))
        
        // Display system status
        const elapsedMs = Date.now() - cycleStartTime
        const nextUpdateInMs = Math.max(0, cycleIntervalMs - (elapsedMs % cycleIntervalMs))
        
        console.log(formatSystemStatus(
          'TEST',
          cycleNumber,
          cycleIntervalMs,
          nextUpdateInMs
        ))

        // Display trading decisions summary
        console.log(formatTradingDecisions(
          result.signals || [],
          result.rejectedSignals || [],
          result.aiGeneratedCount
        ))

        // Display accepted signals details if any (formatted by formatSignal)
        // CRITICAL FIX: Filter signals with confidence < 60% AND HOLD signals without position before display
        // Accept only signals with confidence >= 60% (range: 60% - 100%)
        // Reject signals with confidence < 60% (0% - 59.99%)
        // Reject HOLD signals without position (should be BUY/SELL, not HOLD)
        const currentPositions = currentState.positions || new Map()
        const filteredSignalsForDisplay = (result.signals || []).filter(signal => {
          const confidence = signal.confidence || 0
          const signalType = signal.signal || 'hold'
          const symbol = signal.coin || ''
          const hasPosition = currentPositions.has(symbol)
          
          // Filter 1: Confidence must be >= 60% (lowered from 70% for futures trading)
          if (confidence < 0.60) {
            return false // Reject low confidence signals
          }
          
          // Filter 2: HOLD signals without position should be rejected
          // HOLD should only be accepted if there's an existing position
          if (signalType === 'hold' && !hasPosition) {
            return false // Reject HOLD without position (should be BUY/SELL)
          }
          
          return true // Accept signal
        })
        
        // Count reasons for filtering
        const lowConfidenceCount = (result.signals || []).filter(s => (s.confidence || 0) < 0.60).length
        const holdWithoutPositionCount = (result.signals || []).filter(s => {
          const sigType = s.signal || 'hold'
          const sym = s.coin || ''
          return sigType === 'hold' && !currentPositions.has(sym) && (s.confidence || 0) >= 0.60
        }).length
        const totalFiltered = (result.signals || []).length - filteredSignalsForDisplay.length
        const filterReason = totalFiltered > 0 
          ? `, ${totalFiltered} filtered out (${lowConfidenceCount} low confidence${holdWithoutPositionCount > 0 ? `, ${holdWithoutPositionCount} HOLD without position` : ''})` 
          : ''
        
        if (filteredSignalsForDisplay.length > 0) {
          console.log(`\n\x1b[32m📊 Detail Accepted Signals (${filteredSignalsForDisplay.length}${filterReason}):\x1b[0m`)
          const marketData = result.marketData || {}
          const mockAccountState = {
            accountValue: 10000,
            availableCash: 10000,
            totalReturnPercent: 0,
            activePositions: [],
            sharpeRatio: 0
          }
          
          for (let i = 0; i < filteredSignalsForDisplay.length; i++) {
            const signal = filteredSignalsForDisplay[i]
            await formatSignal(
              signal,
              i,
              marketData,
              currentState.positions || new Map(),
              new Map(), // signalHistory
              mockAccountState, // accountState for TEST mode
              null // metadata
            )
          }
        } else if (result.signals && result.signals.length > 0) {
          // All signals filtered out - provide detailed reason
          const allLowConfidence = result.signals.every(s => (s.confidence || 0) < 0.60)
          const allHoldWithoutPosition = result.signals.every(s => {
            const sigType = s.signal || 'hold'
            const sym = s.coin || ''
            return sigType === 'hold' && !currentPositions.has(sym) && (s.confidence || 0) >= 0.60
          })
          
          let reason = ''
          if (allLowConfidence) {
            reason = 'confidence < 60%'
          } else if (allHoldWithoutPosition) {
            reason = 'HOLD without position'
          } else {
            reason = 'confidence < 60% or HOLD without position'
          }
          
          console.log(`\n\x1b[33m⚠️  All ${result.signals.length} signal(s) filtered out (${reason})\x1b[0m`)
        }

        // Display detailed performance metrics (formatted box)
        const metrics = performanceTracker.getMetrics()
        const performanceLines: string[] = []
        performanceLines.push(formatKeyValue('Total Trades:', `${metrics.totalTrades}`))
        performanceLines.push(formatKeyValue('Win Rate:', `${metrics.winRate.toFixed(2)}% (${metrics.winningTrades}W / ${metrics.losingTrades}L)`))
        
        const totalReturnPct = `${metrics.totalReturnPct >= 0 ? '+' : ''}${metrics.totalReturnPct.toFixed(2)}%`
        const totalReturnUsd = `$${metrics.totalReturnUsd >= 0 ? '+' : ''}${metrics.totalReturnUsd.toFixed(2)}`
        performanceLines.push(formatKeyValue('Total Return:', `${totalReturnPct} (${totalReturnUsd})`, metrics.totalReturnPct >= 0 ? 'green' : 'red'))
        
        const avgReturnPct = `${metrics.averageReturnPct >= 0 ? '+' : ''}${metrics.averageReturnPct.toFixed(2)}%`
        performanceLines.push(formatKeyValue('Average Return:', avgReturnPct, metrics.averageReturnPct >= 0 ? 'green' : 'red'))
        performanceLines.push(formatKeyValue('Average R-Multiple:', `${metrics.averageRMultiple.toFixed(2)}`))
        performanceLines.push(formatKeyValue('Max Drawdown:', `${metrics.maxDrawdownPct.toFixed(2)}%`, 'red'))
        performanceLines.push(formatKeyValue('Sharpe Ratio:', `${metrics.sharpeRatio.toFixed(2)}`))
        performanceLines.push(formatKeyValue('Consecutive:', metrics.consecutiveWins > 0 ? `Wins: ${metrics.consecutiveWins}` : `Losses: ${metrics.consecutiveLosses}`, metrics.consecutiveWins > 0 ? 'green' : 'red'))
        
        if (metrics.totalTrades === 0) {
          performanceLines.push('')
          performanceLines.push('⚠️  No trades yet - waiting for signal execution')
        }
        
        console.log(createSection('📊 Performance Metrics', performanceLines))
      } else {
        console.error(`❌ Cycle failed: ${result.error}`)
      }

      // Wait for next cycle
      console.log(`⏳ Waiting ${cycleIntervalMs / 1000}s until next cycle...`)
      await new Promise(resolve => setTimeout(resolve, cycleIntervalMs))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Cycle error: ${errorMsg}`)
      await new Promise(resolve => setTimeout(resolve, cycleIntervalMs))
    }
  }

  console.log('\n✅ Test mode stopped gracefully')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
