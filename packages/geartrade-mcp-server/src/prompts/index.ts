/**
 * MCP Prompts Registry
 * Extracted from index.ts for better modularity
 */

import { z } from 'zod'

/**
 * Register all prompts to the server
 */
export function registerPrompts(server: any) {
server.registerPrompt(
  'analyze_and_execute',
  {
    title: 'Analyze and Execute',
    description: 'Analyze a crypto asset and prepare execution plan with risk management',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
      leverage: z.string().optional().describe('Leverage multiplier (default: 1 for spot, 1-50 for futures)'),
      strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading (default: swing_trading)'),
      timeframe: z.string().optional().describe('Primary timeframe: 1m, 5m, 15m, 1h, 4h, 1d (default: 1h)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker || 'BTC'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0
    const leverage = args.leverage ? parseInt(args.leverage) : 1
    const strategy = args.strategy || 'swing_trading'
    const timeframe = args.timeframe || '1h'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze ${ticker} comprehensively using these steps (Strategy: ${strategy}, Timeframe: ${timeframe}):

1. **Get Current Price & Basic Info:**
   - Use get_price tool for current price and market data

2. **Technical Analysis:**
   - Use get_indicators for RSI, MACD, moving averages
   - Use get_volume_analysis for volume patterns
   - Use get_market_structure for trend bias
   - Use get_candlestick_patterns for chart patterns
   - Use get_market_regime to identify market conditions

3. **Advanced Indicators (Based on Strategy: ${strategy}):**
   ${strategy === 'day_trading' ? `
   - Use stochastic_rsi for overbought/oversold with fast signals
   - Use fisher_transform for sharp reversal signals
   - Use get_orderbook_depth for order book analysis
   - Use get_liquidation_levels for liquidation zones` : ''}
   ${strategy === 'swing_trading' ? `
   - Use get_Multitimeframe for multi-timeframe trend alignment
   - Use get_divergence for RSI divergence detection
   - Use trend_indicators (supertrend) for trend following
   - Use elder_ray for buying/selling pressure
   - Use schaff_trend_cycle for MACD + Stochastic signals` : ''}
   ${strategy === 'position_trading' ? `
   - Use get_volume_profile for volume profile analysis
   - Use know_sure_thing for multi-timeframe ROC momentum
   - Use coppock_curve for long-term momentum
   - Use hull_ma, kaufman_adaptive_ma, mcginley_dynamic for trend following
   - Use get_market_regime to confirm market conditions` : ''}

4. **Risk Management Setup:**
   - Use calculate_risk_management with entry price, capital=${capital}, riskPct=${riskPct}
   - Use calculate_position_setup for position sizing with leverage=${leverage}

5. **Present Analysis Summary:**
   - Current price and 24h change
   - Technical signal (BUY/SELL/HOLD) with confidence %
   - Recommended entry, stop loss, take profit levels
   - Risk/reward ratio and position sizing
   - Key supporting indicators
   - Leverage: ${leverage}x

6. **Execution Preparation:**
   - If user wants to execute: Use hyperliquid_testnet_futures_trade for testing
   - Always start with TESTNET first
   - Only proceed to MAINNET (hyperliquid_mainnet_futures_trade) after explicit confirmation

Ask user: "Mau dieksekusi dengan paper trading dulu? (YES/NO)"
If YES, show the paper trade result first, then ask for live execution.

Safety first: Never execute live without explicit user approval twice.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'multi_asset_scan',
  {
    title: 'Multi Asset Scan',
    description: 'Scan multiple assets for trading opportunities and rank by confidence',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to scan (e.g., "BTC,ETH,SOL")'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading (default: swing_trading)'),
      minConfidence: z.string().optional().describe('Minimum confidence threshold for signals (default: 60)'),
      sortBy: z.string().optional().describe('Sort by: confidence, risk_reward, volume, trend_strength (default: confidence)'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim()) : ['BTC', 'ETH', 'SOL']
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const strategy = args.strategy || 'swing_trading'
    const minConfidence = args.minConfidence ? parseInt(args.minConfidence) : 60
    const sortBy = args.sortBy || 'confidence'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please scan multiple assets for trading opportunities (Strategy: ${strategy}, Min Confidence: ${minConfidence}%):

**Step-by-Step Analysis for each asset in ${JSON.stringify(tickers)}:**

1. **Get Price & Volume Data:**
   - Use get_price for current price and market data
   - Use get_volume_analysis for volume patterns

2. **Technical Analysis:**
   - Use get_indicators for technical signals
   - Use get_market_structure for trend bias
   - Use get_candlestick_patterns for chart patterns
   - Use get_market_regime for market conditions

3. **Strategy-Specific Indicators (${strategy}):**
   ${strategy === 'day_trading' ? `
   - Use stochastic_rsi for fast overbought/oversold signals
   - Use fisher_transform for sharp reversal detection
   - Use get_orderbook_depth for order book analysis` : ''}
   ${strategy === 'swing_trading' ? `
   - Use get_Multitimeframe for trend alignment
   - Use get_divergence for divergence signals
   - Use schaff_trend_cycle for momentum` : ''}
   ${strategy === 'position_trading' ? `
   - Use know_sure_thing for multi-timeframe momentum
   - Use coppock_curve for long-term momentum
   - Use get_volume_profile for volume analysis` : ''}

4. **Risk Assessment:**
   - Use calculate_risk_management with capital=${capital}

5. **Ranking Criteria (Sort by: ${sortBy}):**
   - Signal confidence (minimum ${minConfidence}%)
   - Risk/Reward ratio quality
   - Trend alignment (multi-timeframe)
   - Volume confirmation

6. **Present Top 3 Opportunities:**
   - Asset ticker and current price
   - BUY/SELL/HOLD signal with confidence %
   - Recommended entry, SL, TP levels
   - Risk/Reward ratio
   - Key supporting indicators
   - Volume confirmation status

Ask user: "Asset mana yang ingin dianalisis lebih detail atau dieksekusi?"

Use the selected asset for further analysis or execution workflow.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'risk_analysis',
  {
    title: 'Risk Analysis',
    description: 'Perform comprehensive risk analysis for a trading position',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze'),
      entry: z.string().describe('Entry price'),
      side: z.string().describe('Trade side (LONG or SHORT)'),
      capital: z.string().describe('Trading capital in USD'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker || 'BTC'
    const entry = parseFloat(args.entry)
    const side = args.side || 'LONG'
    const capital = parseFloat(args.capital) || 10000

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform comprehensive risk analysis for ${ticker}:
- Entry: ${entry}
- Side: ${side}
- Capital: ${capital}

Use these tools in sequence:
1. calculate_position_setup - Calculate optimal position size, leverage, and margin
2. calculate_risk_management - Calculate stop loss, take profit, and risk/reward ratio
3. get_position (if position exists) - Check current position status

Present:
1. Recommended position size (quantity, leverage, margin)
2. Stop loss level and risk amount
3. Take profit level and reward amount
4. Risk/Reward ratio
5. Maximum loss if stop loss hit
6. Maximum profit if take profit hit
7. Margin requirements and safety buffer

Provide clear risk assessment and recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'position_monitoring',
  {
    title: 'Position Monitoring',
    description: 'Monitor open positions and provide status update',
    argsSchema: {
      tickers: z.string().optional().describe('Comma-separated tickers to monitor (monitors all positions if not provided)'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim()) : undefined

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please monitor open positions${tickers ? ` for ${JSON.stringify(tickers)}` : ' (all positions)'}.

Use \`get_position\` to get current status for open positions.

For each position, present:
1. Ticker and side (LONG/SHORT)
2. Entry price vs current price
3. Unrealized PnL (profit/loss)
4. PnL percentage
5. Distance to stop loss
6. Distance to take profit
7. MAE (Maximum Adverse Excursion)
8. Risk/Reward status

If any position is:
- Near stop loss: Alert user
- Near take profit: Suggest partial close or trailing stop
- Showing high MAE: Suggest reviewing entry strategy

Provide actionable recommendations for each position.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'comprehensive_analysis',
  {
    title: 'Comprehensive Analysis',
    description: 'Perform comprehensive market analysis for crypto assets without execution',
    argsSchema: {
      ticker: z.string().optional().describe('Single ticker to analyze (e.g., BTC, ETH, SOL). If not provided, can analyze multiple tickers'),
      tickers: z.string().optional().describe('Comma-separated tickers to analyze (e.g., "BTC,ETH,SOL"). Use this for multiple assets'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
      strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading, flexible (default: flexible)'),
      includeAdvanced: z.string().optional().describe('Include advanced indicators: true/false (default: true)'),
      includeVolume: z.string().optional().describe('Include volume analysis: true/false (default: true)'),
      includeExternal: z.string().optional().describe('Include external data (funding, OI): true/false (default: true)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim()) : undefined
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0
    const strategy = args.strategy || 'flexible'

    if (ticker) {
      // Single asset analysis
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform comprehensive analysis for ${ticker} using these tools:
- capital: ${capital}
- riskPct: ${riskPct}
- strategy: ${strategy}

After analysis, present a detailed report with:

1. **Price & Market Overview**
   - Current price and 24h change
   - Volume trends
   - Market sentiment

2. **Technical Analysis**
   - RSI levels (14, 7, 4H) and interpretation
   - EMA trends (20, 50)
   - MACD signals
   - Bollinger Bands position
   - Support and Resistance levels
   - Trend direction and strength

3. **Volume Analysis**
   - Buy/Sell pressure
   - CVD (Cumulative Volume Delta) trend
   - POC, VAH/VAL levels
   - Liquidity zones
   - Volume-based recommendation

4. **Multi-Timeframe Analysis**
   - Daily, 4H, 1H trend alignment
   - Trend strength score
   - Timeframe conflicts or confirmations

5. **Advanced Analysis**
   - Fibonacci retracement levels (if available)
   - Order book depth and imbalance (if available)
   - Volume profile key levels (if available)
   - Market structure (COC, swing patterns)
   - Candlestick patterns detected
   - RSI divergence signals
   - Liquidation levels and zones
   - Long/Short ratio sentiment
   - Spot-Futures divergence (if available)

6. **External Data**
   - Funding rate and trend
   - Open Interest and trend
   - Volatility analysis

7. **Trading Signal**
   - Recommended signal: BUY / SELL / HOLD
   - Confidence level (0-100%)
   - Reasoning based on all indicators

8. **Entry, Stop Loss, Take Profit Levels**
   - Optimal entry price
   - Stop loss level with risk percentage
   - Take profit level with reward percentage
   - Risk/Reward ratio

9. **Position Setup (if signal is BUY/SELL)**
   - Recommended position size
   - Suggested leverage
   - Margin requirements
   - Risk amount in USD

10. **Risk Assessment**
    - Overall risk level (Low/Medium/High)
    - Key risk factors
    - Market conditions to watch

**Important:** This is analysis only. Do NOT execute any trades. Present the analysis clearly and wait for user's decision on next steps.`,
            },
          },
        ],
      }
    } else if (tickers && tickers.length > 0) {
      // Multiple assets analysis
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform comprehensive analysis for multiple assets using analisis_multiple_crypto with:
- tickers: ${JSON.stringify(tickers)}
- capital: ${capital}
- riskPct: ${riskPct}

After analysis, for each asset present:

1. **Quick Summary**
   - Ticker and current price
   - Signal (BUY/SELL/HOLD) and confidence
   - Key technical indicators summary

2. **Ranking**
   Rank all assets by:
   - Signal confidence (highest first)
   - Risk/Reward ratio (best first)
   - Trend alignment strength

3. **Top Opportunities**
   Present the top 3 opportunities with:
   - Complete technical analysis
   - Volume analysis summary
   - Multi-timeframe alignment
   - Entry, Stop Loss, Take Profit levels
   - Risk/Reward ratio
   - Position setup recommendations

4. **Comparison Table**
   Create a comparison table showing:
   - Ticker | Price | Signal | Confidence | R/R Ratio | Risk Level

**Important:** This is analysis only. Do NOT execute any trades. Present the analysis clearly and let user decide which assets to focus on or execute.`,
            },
          },
        ],
      }
    } else {
      // No ticker provided
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform comprehensive market analysis. 

You can analyze:
- Single asset: Use get_indicators, get_market_structure, get_volume_analysis
- Multiple assets: Use get_indicators(["BTC", "ETH", "SOL"]) with array of tickers

For comprehensive analysis, include:
- Technical indicators (RSI, EMA, MACD, Bollinger Bands, etc.)
- Volume analysis (buy/sell pressure, CVD, liquidity zones)
- Multi-timeframe trend alignment
- Advanced analysis (Fibonacci, Order Book, Volume Profile, Market Structure, etc.)
- External data (funding rate, open interest)
- Trading signals with confidence levels
- Entry, Stop Loss, Take Profit recommendations
- Risk assessment

**Important:** This is analysis only. Do NOT execute any trades. Present findings clearly and wait for user's input on which assets to analyze.`,
            },
          },
        ],
      }
    }
  }
)

// Register Additional Prompts
server.registerPrompt(
  'quick_price_check',
  {
    title: 'Quick Price Check',
    description: 'Quickly check prices for multiple crypto assets',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to check (e.g., "BTC,ETH,SOL,BNB")'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers.split(',').map((t: string) => t.trim().toUpperCase())

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please check current prices for the following assets: ${tickers.join(', ')}

Use the get_price tool with tickers array to get prices for all tickers.

Present the results in a clear table format:
- Ticker
- Current Price (USD)
- 24h Change (%)
- Timestamp

Keep it concise and easy to read.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'trend_analysis',
  {
    title: 'Trend Analysis',
    description: 'Analyze trend direction and strength across multiple timeframes',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      timeframes: z.string().optional().describe('Comma-separated timeframes to analyze (e.g., "1D,4H,1H" or "daily,4h,1h"). Default: all timeframes'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    const timeframes = args.timeframes ? args.timeframes.split(',').map((t: string) => t.trim()) : ['1D', '4H', '1H']

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform trend analysis for ${ticker} across the following timeframes: ${timeframes.join(', ')}

Use the get_Multitimeframe tool to get trend data for ${ticker}.

Analyze and present:
1. **Trend Direction per Timeframe**
   - Daily trend: UPTREND / DOWNTREND / SIDEWAYS
   - 4H trend: UPTREND / DOWNTREND / SIDEWAYS
   - 1H trend: UPTREND / DOWNTREND / SIDEWAYS

2. **Trend Strength**
   - Strong / Moderate / Weak for each timeframe
   - Overall trend alignment score

3. **EMA Analysis**
   - EMA9 vs EMA21 position for each timeframe
   - Golden Cross / Death Cross signals
   - Price position relative to EMAs

4. **Trend Consistency**
   - Are all timeframes aligned? (Yes/No)
   - If not aligned, which timeframes conflict?
   - Overall trend recommendation

5. **Trading Implications**
   - Best timeframe for entry (if aligned)
   - Risk level based on trend alignment
   - Recommended action: BUY / SELL / WAIT

Present the analysis clearly with timeframe comparison.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'divergence_scan',
  {
    title: 'Divergence Scan',
    description: 'Scan for RSI and price divergences that indicate potential reversals',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to scan (e.g., "BTC,ETH,SOL")'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers.split(',').map((t: string) => t.trim().toUpperCase())

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please scan for divergence patterns in the following assets: ${tickers.join(', ')}

For each ticker, use the get_divergence tool to check for:
1. RSI Divergence (bullish or bearish)
2. Price-Volume Divergence
3. MACD Divergence (if available)

Present results in a clear format:

**For each ticker:**
- Ticker: [TICKER]
- RSI Divergence: [BULLISH / BEARISH / NONE]
  - Description: [explanation]
  - Strength: [STRONG / MODERATE / WEAK]
- Price-Volume Divergence: [BULLISH / BEARISH / NONE]
  - Description: [explanation]
- Overall Divergence Signal: [BULLISH / BEARISH / NEUTRAL]
- Trading Recommendation: [BUY / SELL / WAIT]
- Confidence: [HIGH / MEDIUM / LOW]

**Summary:**
- List tickers with bullish divergence (potential BUY)
- List tickers with bearish divergence (potential SELL)
- Rank by divergence strength

Divergences are early reversal signals - use with caution and wait for confirmation.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'liquidation_analysis',
  {
    title: 'Liquidation Analysis',
    description: 'Analyze liquidation levels and potential stop hunt zones',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze liquidation levels for ${ticker}.

Use the get_liquidation_levels tool to get liquidation data.

Present the analysis:

1. **Liquidation Clusters**
   - Long liquidation levels (price zones with high long liquidations)
   - Short liquidation levels (price zones with high short liquidations)
   - Liquidation density map

2. **Current Price Position**
   - Distance to nearest long liquidation cluster
   - Distance to nearest short liquidation cluster
   - Risk of stop hunt in each direction

3. **Stop Hunt Potential**
   - Likelihood of stop hunt to the downside (for longs)
   - Likelihood of stop hunt to the upside (for shorts)
   - Estimated price zones for potential stop hunts

4. **Trading Implications**
   - If holding LONG: Risk of stop hunt below current price
   - If holding SHORT: Risk of stop hunt above current price
   - Recommended stop loss placement (away from liquidation clusters)
   - Entry opportunities after stop hunt (contrarian play)

5. **Risk Assessment**
   - Overall liquidation risk: [LOW / MEDIUM / HIGH]
   - Recommendation: [SAFE TO HOLD / REDUCE POSITION / WAIT FOR STOP HUNT]

Use this analysis to avoid placing stops near liquidation clusters and to identify potential reversal zones.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'portfolio_review',
  {
    title: 'Portfolio Review',
    description: 'Review all open positions and provide portfolio status',
    argsSchema: {
      includeAnalysis: z.string().optional().describe('Include detailed analysis for each position (true/false, default: true)'),
    } as any,
  },
  async (args: any) => {
    const includeAnalysis = args.includeAnalysis !== 'false'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please review all open positions in the portfolio.

Use the get_position tool for each open position to get current status.

Present a comprehensive portfolio review:

1. **Portfolio Summary**
   - Total number of open positions
   - Total invested capital
   - Total unrealized P&L
   - Overall portfolio performance (%)

2. **Position Details (for each position)**
   - Ticker: [TICKER]
   - Side: [LONG / SHORT]
   - Entry Price: [PRICE]
   - Current Price: [PRICE]
   - Quantity: [QTY]
   - Unrealized P&L: [P&L USD] ([P&L %])
   - Leverage: [X]
   - Margin Used: [USD]
   - Stop Loss: [PRICE] (Distance: [%])
   - Take Profit: [PRICE] (Distance: [%])
   - Risk/Reward: [R:R]

${includeAnalysis ? `3. **Current Analysis (for each position)**
   - Current signal: [BUY / SELL / HOLD]
   - Trend alignment: [ALIGNED / NOT ALIGNED]
   - Risk level: [LOW / MEDIUM / HIGH]
   - Recommendation: [HOLD / CLOSE / REDUCE / ADD]` : ''}

4. **Portfolio Risk Assessment**
   - Total risk exposure (% of capital)
   - Average leverage across positions
   - Correlation risk (if multiple similar assets)
   - Overall portfolio risk: [LOW / MEDIUM / HIGH]

5. **Recommendations**
   - Positions to close (if any)
   - Positions to reduce (if any)
   - Positions to add to (if any)
   - Overall portfolio adjustments needed

Present in a clear, organized format with actionable recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'market_overview',
  {
    title: 'Market Overview',
    description: 'Get comprehensive market overview for major crypto assets',
    argsSchema: {
      tickers: z.string().optional().describe('Comma-separated tickers (default: "BTC,ETH,SOL,BNB,XRP,ADA,DOGE,AVAX,MATIC,DOT")'),
    } as any,
  },
  async (args: any) => {
    const defaultTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT']
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim().toUpperCase()) : defaultTickers

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please provide a comprehensive market overview for: ${tickers.join(', ')}

Use get_price with tickers array to get current prices for all tickers.

Present a market overview report:

1. **Market Summary**
   - Total market cap (if available)
   - Number of assets analyzed
   - Overall market sentiment: [BULLISH / BEARISH / NEUTRAL]

2. **Price Performance Table**
   | Ticker | Price (USD) | 24h Change | Trend | Signal |
   |--------|-------------|------------|-------|--------|
   | ...    | ...         | ...        | ...   | ...    |

3. **Top Performers**
   - Best 24h gainers (top 3)
   - Worst 24h losers (bottom 3)

4. **Market Leaders**
   - BTC dominance trend
   - ETH performance vs BTC
   - Altcoin performance vs BTC

5. **Trading Opportunities**
   - Assets with strong BUY signals
   - Assets with strong SELL signals
   - Assets to watch (neutral but interesting)

6. **Market Conditions**
   - Overall volatility: [LOW / MEDIUM / HIGH]
   - Market structure: [TRENDING / RANGING]
   - Recommended strategy: [TREND FOLLOWING / MEAN REVERSION / WAIT]

Keep it concise but informative. Focus on actionable insights.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'entry_exit_strategy',
  {
    title: 'Entry & Exit Strategy',
    description: 'Get optimal entry and exit strategy for a trading position',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      side: z.string().describe('Trade side: LONG or SHORT'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    const side = args.side.toUpperCase()
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please provide optimal entry and exit strategy for ${ticker} ${side} position.

Use get_indicators, get_market_structure, get_volume_analysis tools with:
- ticker: ${ticker}
- capital: ${capital}
- riskPct: ${riskPct}

Then use calculate_risk_management and calculate_position_setup tools to get precise levels.

Present a detailed entry/exit strategy:

1. **Entry Strategy**
   - Optimal Entry Price: [PRICE]
   - Entry Zone: [PRICE_MIN] - [PRICE_MAX]
   - Entry Conditions:
     * [ ] RSI condition
     * [ ] Trend alignment
     * [ ] Volume confirmation
     * [ ] Support/Resistance level
   - Entry Timing: [IMMEDIATE / WAIT FOR PULLBACK / WAIT FOR BREAKOUT]

2. **Stop Loss Strategy**
   - Stop Loss Price: [PRICE]
   - Stop Loss Distance: [%] from entry
   - Stop Loss Type: [FIXED / ATR-BASED / SUPPORT-RESISTANCE]
   - Risk Amount: [USD] (${riskPct}% of capital)
   - Stop Loss Reasoning: [explanation]

3. **Take Profit Strategy**
   - TP1 (2:1 R:R): [PRICE] - [%] gain
   - TP2 (3:1 R:R): [PRICE] - [%] gain
   - TP3 (5:1 R:R): [PRICE] - [%] gain
   - Take Profit Method: [ALL AT ONCE / SCALING OUT / TRAILING STOP]

4. **Position Sizing**
   - Position Size: [QUANTITY] ${ticker}
   - Leverage: [X]
   - Margin Required: [USD]
   - Risk/Reward Ratio: [R:R]

5. **Exit Strategy**
   - When to exit early:
     * [ ] Stop loss hit
     * [ ] Trend reversal signal
     * [ ] Divergence signal
     * [ ] Support/Resistance break
   - When to hold:
     * [ ] Trend still intact
     * [ ] Volume supports continuation
     * [ ] Multi-timeframe alignment

6. **Risk Management**
   - Maximum loss: [USD]
   - Maximum gain (if all TPs hit): [USD]
   - Risk level: [LOW / MEDIUM / HIGH]
   - Position monitoring: [Check every X hours]

Present clear, actionable strategy with specific price levels and conditions.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'volatility_analysis',
  {
    title: 'Volatility Analysis',
    description: 'Analyze volatility for risk management and position sizing',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze volatility for ${ticker} to determine appropriate risk management.

Use get_indicators tool to get ATR (Average True Range) values for ${ticker}.

Present volatility analysis:

1. **Volatility Metrics**
   - ATR (14-period): [VALUE]
   - ATR %: [%] of current price
   - Volatility Level: [LOW / MEDIUM / HIGH / EXTREME]
   - Historical Comparison: [ABOVE / BELOW / AVERAGE] historical average

2. **Volatility Interpretation**
   - Current Market Regime: [LOW VOLATILITY / NORMAL / HIGH VOLATILITY / EXTREME]
   - Volatility Trend: [INCREASING / DECREASING / STABLE]
   - Expected Price Movement: [TIGHT RANGE / NORMAL / WIDE RANGE]

3. **Risk Management Implications**
   - Recommended Stop Loss Distance:
     * Conservative: [%] (1.5x ATR)
     * Moderate: [%] (2x ATR)
     * Aggressive: [%] (3x ATR)
   - Stop Loss in USD: [USD] from current price
   - Position Size Adjustment: [REDUCE / NORMAL / INCREASE] size due to volatility

4. **Leverage Recommendation**
   - Recommended Leverage: [X] (based on volatility)
   - Maximum Safe Leverage: [X]
   - Reasoning: [explanation based on ATR]

5. **Trading Strategy Adjustment**
   - If HIGH VOLATILITY:
     * Use wider stops
     * Reduce position size
     * Lower leverage
     * Wait for volatility to decrease
   - If LOW VOLATILITY:
     * Tighter stops possible
     * Normal position size
     * Normal leverage
     * Watch for volatility expansion

6. **Volatility-Based Entry/Exit**
   - Entry: Wait for volatility contraction (squeeze) before breakout
   - Exit: Consider exiting if volatility expands beyond normal range
   - Position Monitoring: [MORE FREQUENT / NORMAL] due to volatility

Use this analysis to adjust your risk management and position sizing accordingly.`,
          },
        },
      ],
    }
  }
)

// Register Additional Prompts for Complete Tool Coverage
server.registerPrompt(
  'technical_indicator_analysis',
  {
    title: 'Technical Indicator Analysis',
    description: 'Analyze specific technical indicators for trading decisions',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      indicators: z.string().optional().describe('Comma-separated indicators to analyze (e.g., "RSI,EMA,MACD,BB"). If not provided, analyzes all available indicators'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    const indicators = args.indicators ? args.indicators.split(',').map((i: string) => i.trim().toUpperCase()) : ['RSI', 'EMA', 'MACD', 'BB', 'ATR', 'ADX', 'STOCH', 'CCI', 'WILLR', 'AROON', 'SAR', 'OBV']

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze technical indicators for ${ticker}. Use the get_indicators tool to get: ${indicators.join(', ')}. Present: 1) Indicator values and signals, 2) Trading signals (BUY/SELL/HOLD), 3) Indicator combination analysis, 4) Entry/exit recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'volume_profile_analysis',
  {
    title: 'Volume Profile Analysis',
    description: 'Analyze volume profile to identify key support/resistance levels',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze volume profile for ${ticker} using get_volume_profile. Present: POC, VAH/VAL, HVN/LVN, current price position, support/resistance levels, and trading strategy with entry/exit zones.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'orderbook_analysis',
  {
    title: 'Order Book Analysis',
    description: 'Analyze order book depth to identify support/resistance and market sentiment',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze order book for ${ticker} using get_orderbook_depth. Present: bid/ask volumes, support/resistance walls, market sentiment, trading implications, entry/exit strategy, and liquidity analysis.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'market_structure_analysis',
  {
    title: 'Market Structure Analysis',
    description: 'Analyze market structure to identify trend changes and trading opportunities',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze market structure for ${ticker} using get_market_structure. Present: structure type, COC signals, swing patterns, support/resistance, trading implications, and entry strategy.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'candlestick_pattern_analysis',
  {
    title: 'Candlestick Pattern Analysis',
    description: 'Analyze candlestick patterns to identify reversal and continuation signals',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze candlestick patterns for ${ticker} using get_candlestick_patterns. Present: detected patterns, pattern interpretation, reversal/continuation signals, trading signals, and entry/exit strategy.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'external_data_analysis',
  {
    title: 'External Data Analysis',
    description: 'Analyze external market data: funding rate, open interest, volatility',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze external data for ${ticker} using get_External_data. Present: funding rate analysis, open interest trends, market sentiment, volatility, trading implications, and risk assessment.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'spot_futures_arbitrage',
  {
    title: 'Spot-Futures Arbitrage Analysis',
    description: 'Analyze spot-futures divergence for arbitrage opportunities',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze spot-futures divergence for ${ticker} using get_spot_futures_divergence. Present: price comparison, divergence analysis, arbitrage opportunities, trading signals, and recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'long_short_sentiment',
  {
    title: 'Long/Short Sentiment Analysis',
    description: 'Analyze long/short ratio to gauge market sentiment',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze long/short sentiment for ${ticker} using get_long_short_ratio. Present: ratio analysis, market sentiment, historical context, trading implications, risk assessment, and contrarian signals.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'fibonacci_trading_strategy',
  {
    title: 'Fibonacci Trading Strategy',
    description: 'Use Fibonacci retracement levels for entry, stop loss, and take profit',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze Fibonacci retracement for ${ticker} using get_fibonacci. Present: Fibonacci levels, current price position, trading signals, support/resistance, entry strategy, stop loss/take profit, and risk/reward.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'multi_asset_comparison',
  {
    title: 'Multi-Asset Comparison',
    description: 'Compare multiple assets across various metrics to identify best opportunities',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to compare (e.g., "BTC,ETH,SOL,BNB")'),
      metrics: z.string().optional().describe('Comma-separated metrics (e.g., "price,volume,rsi,trend"). Default: all'),
      strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading (default: swing_trading)'),
      sortBy: z.string().optional().describe('Sort by: confidence, risk_reward, volume, trend_strength (default: confidence)'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers.split(',').map((t: string) => t.trim().toUpperCase())
    const strategy = args.strategy || 'swing_trading'
    const sortBy = args.sortBy || 'confidence'
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Compare assets: ${tickers.join(', ')} (Strategy: ${strategy}, Sort by: ${sortBy}). Use get_price, get_indicators, get_volume_analysis, get_Multitimeframe. Present: price comparison, technical comparison, signal comparison, risk/reward comparison, overall ranking (sorted by ${sortBy}), and top 3 recommendations for ${strategy}.`,
          },
        },
      ],
    }
  }
)

// NEW: Day Trading Analysis Prompt (Based on MCP_TOOLS_TEST_RESULTS.md recommendations)
server.registerPrompt(
  'day_trading_analysis',
  {
    title: 'Day Trading Analysis',
    description: 'Comprehensive day trading analysis with fast oscillators and order book depth',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 0.5 for day trading)'),
      leverage: z.string().optional().describe('Leverage multiplier (default: 3 for day trading)'),
      timeframe: z.string().optional().describe('Primary timeframe: 1m, 5m, 15m (default: 5m)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 0.5
    const leverage = args.leverage ? parseInt(args.leverage) : 3
    const timeframe = args.timeframe || '5m'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform Day Trading analysis for ${ticker} (Timeframe: ${timeframe}, Capital: $${capital}, Risk: ${riskPct}%, Leverage: ${leverage}x):

**1. Price & Basic Data:**
- Use get_price for current price
- Use get_indicators for core technical indicators

**2. Fast Oscillators (Day Trading Focus):**
- Use stochastic_rsi for overbought/oversold with RSI + Stochastic combination
- Use fisher_transform for sharp reversal signals
- Use momentum for rate of price change
- Use chande_momentum for momentum on both sides (-100 to +100)

**3. Order Book & Liquidity:**
- Use get_orderbook_depth for bid/ask analysis, spread, liquidity scoring
- Use get_liquidation_levels for liquidation clusters and safe entry zones

**4. Volume Analysis:**
- Use get_volume_analysis for buy/sell pressure, POC levels
- Use volume_indicators for CMF (accumulation/distribution)

**5. Quick Trend Confirmation:**
- Use get_market_structure for immediate trend bias
- Use get_candlestick_patterns for reversal signals

**6. Risk Management:**
- Use calculate_risk_management with capital=${capital}, riskPct=${riskPct}
- Use calculate_position_setup with leverage=${leverage}

**Present Day Trading Summary:**
- Current price and immediate trend
- Fast oscillator signals (stochastic_rsi, fisher)
- Order book sentiment (bid/ask imbalance)
- Entry signal: SCALP LONG / SCALP SHORT / WAIT
- Entry price, tight stop loss (0.5-1%), quick take profit (1-2%)
- Risk/Reward ratio (aim for 1.5:1 minimum for day trades)
- Liquidation risk assessment

**Important:** Day trading requires quick decisions. Focus on:
- Fast oscillators for timing
- Order book for immediate direction
- Tight stops and quick profits
- Avoid trading during low liquidity periods`,
          },
        },
      ],
    }
  }
)

// NEW: Swing Trading Analysis Prompt (Based on MCP_TOOLS_TEST_RESULTS.md recommendations)
server.registerPrompt(
  'swing_trading_analysis',
  {
    title: 'Swing Trading Analysis',
    description: 'Comprehensive swing trading analysis with multi-timeframe and divergence detection',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0 for swing trading)'),
      leverage: z.string().optional().describe('Leverage multiplier (default: 5 for swing trading)'),
      holdPeriod: z.string().optional().describe('Expected hold period: 1d, 3d, 1w, 2w (default: 1w)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0
    const leverage = args.leverage ? parseInt(args.leverage) : 5
    const holdPeriod = args.holdPeriod || '1w'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform Swing Trading analysis for ${ticker} (Hold Period: ${holdPeriod}, Capital: $${capital}, Risk: ${riskPct}%, Leverage: ${leverage}x):

**1. Multi-Timeframe Analysis:**
- Use get_Multitimeframe for Daily, 4H, 1H trend alignment
- Use get_market_structure for swing highs/lows identification

**2. Trend Indicators (Swing Trading Focus):**
- Use trend_indicators (supertrend) for ATR-based trend following
- Use elder_ray for bull/bear power (buying/selling pressure)
- Use schaff_trend_cycle for MACD + Stochastic with double smoothing
- Use trix for triple EMA rate of change

**3. Divergence Detection:**
- Use get_divergence for RSI divergence (bullish/bearish)
- Use get_candlestick_patterns for reversal patterns

**4. Momentum Confirmation:**
- Use get_indicators for RSI, MACD, ADX
- Use true_strength_index for double-smoothed momentum
- Use ultimate_oscillator for three-timeframe oscillator

**5. Volume & External Data:**
- Use get_volume_analysis for CVD trend, buy/sell pressure
- Use get_External_data for funding rate, open interest

**6. Risk Management:**
- Use calculate_risk_management with capital=${capital}, riskPct=${riskPct}
- Use calculate_position_setup with leverage=${leverage}

**Present Swing Trading Summary:**
- Multi-timeframe trend alignment (Daily/4H/1H)
- Trend strength score
- Divergence signals detected
- Entry signal: SWING LONG / SWING SHORT / WAIT
- Entry zone (support/resistance levels)
- Stop loss (2-3% for swing trades)
- Take profit levels (TP1: 5%, TP2: 10%, TP3: 15%)
- Risk/Reward ratio (aim for 2:1 minimum)
- Expected hold period: ${holdPeriod}

**Important:** Swing trading focuses on:
- Multi-timeframe alignment
- Divergence for reversal timing
- Trend indicators for confirmation
- Wider stops, bigger targets
- Patience for the setup to develop`,
          },
        },
      ],
    }
  }
)

// NEW: Position Trading Analysis Prompt (Based on MCP_TOOLS_TEST_RESULTS.md recommendations)
server.registerPrompt(
  'position_trading_analysis',
  {
    title: 'Position Trading Analysis',
    description: 'Long-term position trading analysis with volume profile and long-term momentum indicators',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 2.0 for position trading)'),
      leverage: z.string().optional().describe('Leverage multiplier (default: 2 for position trading)'),
      holdPeriod: z.string().optional().describe('Expected hold period: 1m, 3m, 6m (default: 1m)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 2.0
    const leverage = args.leverage ? parseInt(args.leverage) : 2
    const holdPeriod = args.holdPeriod || '1m'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform Position Trading analysis for ${ticker} (Hold Period: ${holdPeriod}, Capital: $${capital}, Risk: ${riskPct}%, Leverage: ${leverage}x):

**1. Long-Term Trend Analysis:**
- Use get_market_regime for overall market conditions (trending/choppy/volatile)
- Use get_volume_profile for POC, VAH, VAL, accumulation/distribution zones

**2. Long-Term Momentum Indicators (Position Trading Focus):**
- Use know_sure_thing for multi-timeframe ROC momentum
- Use coppock_curve for major market bottoms, long-term momentum
- Use relative_vigor_index for close vs open momentum

**3. Adaptive Moving Averages:**
- Use hull_ma for smooth trend with reduced lag
- Use kaufman_adaptive_ma for adaptive to market efficiency
- Use mcginley_dynamic for adaptive to market volatility
- Use rainbow_ma for multi-period trend visualization

**4. Volume Profile Analysis:**
- Use get_volume_profile for session and composite profiles
- Use strength_indicators (bull_bear_power) for buying vs selling strength
- Use coppock_curve for contraction/expansion phases

**5. External Data (Long-Term Sentiment):**
- Use get_External_data for funding rate trends, open interest
- Use get_long_short_ratio for market sentiment

**6. Risk Management:**
- Use calculate_risk_management with capital=${capital}, riskPct=${riskPct}
- Use calculate_position_setup with leverage=${leverage}

**Present Position Trading Summary:**
- Market regime: trending/choppy/volatile
- Long-term trend direction
- Volume profile key levels (POC, VAH, VAL)
- Long-term momentum signals (KST, Coppock)
- Entry signal: POSITION LONG / POSITION SHORT / ACCUMULATE / WAIT
- Entry zone (accumulation zone from volume profile)
- Stop loss (5-10% for position trades)
- Take profit levels (TP1: 20%, TP2: 50%, TP3: 100%+)
- Risk/Reward ratio (aim for 3:1 minimum)
- Expected hold period: ${holdPeriod}

**Important:** Position trading focuses on:
- Long-term market regime
- Volume profile for key levels
- Long-term momentum for timing
- Lower leverage, wider stops
- Patience for major moves`,
          },
        },
      ],
    }
  }
)

// NEW: Risk Management Analysis Prompt (Enhanced based on MCP_TOOLS_TEST_RESULTS.md)
server.registerPrompt(
  'risk_management_analysis',
  {
    title: 'Risk Management Analysis',
    description: 'Comprehensive risk management analysis with liquidation levels and volatility assessment',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      entryPrice: z.string().optional().describe('Planned entry price (uses current price if not provided)'),
      side: z.string().optional().describe('Trade side: LONG or SHORT (default: LONG)'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
      leverage: z.string().optional().describe('Planned leverage (default: 5)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC'
    const entryPrice = args.entryPrice || 'current'
    const side = args.side?.toUpperCase() || 'LONG'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0
    const leverage = args.leverage ? parseInt(args.leverage) : 5

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform comprehensive Risk Management analysis for ${ticker} ${side} position:

**Entry Parameters:**
- Entry Price: ${entryPrice === 'current' ? 'Use current market price' : entryPrice}
- Side: ${side}
- Capital: $${capital}
- Risk: ${riskPct}%
- Planned Leverage: ${leverage}x

**1. Current Price & Volatility:**
- Use get_price for current price
- Use volatility_indicators (bollinger_band_width) for volatility assessment
- Use get_indicators for ATR (volatility measure)

**2. Liquidation Risk Assessment:**
- Use get_liquidation_levels for liquidation clusters
- Identify safe entry zones away from liquidation clusters
- Assess cascade risk potential

**3. Position Sizing:**
- Use calculate_position_setup with capital=${capital}, riskPct=${riskPct}, leverage=${leverage}
- Calculate optimal position size based on volatility

**4. Stop Loss Calculation:**
- Use calculate_risk_management for optimal stop loss levels
- Calculate ATR-based stop loss
- Identify support/resistance for technical stop loss

**5. Take Profit Planning:**
- Calculate multiple TP levels (TP1: 2:1, TP2: 3:1, TP3: 5:1)
- Use get_market_structure for resistance levels (for LONG) or support (for SHORT)

**6. Risk/Reward Assessment:**
- Calculate overall R:R ratio
- Assess probability of success based on technical signals

**Present Risk Management Summary:**

| Metric | Value |
|--------|-------|
| Entry Price | [PRICE] |
| Position Size | [QUANTITY] ${ticker} |
| Position Value | $[USD] |
| Leverage | ${leverage}x |
| Margin Used | $[USD] |
| Stop Loss | [PRICE] ([%] from entry) |
| TP1 (2:1) | [PRICE] ([%] gain) |
| TP2 (3:1) | [PRICE] ([%] gain) |
| TP3 (5:1) | [PRICE] ([%] gain) |
| Max Loss | $[USD] (${riskPct}% of capital) |
| Max Gain (TP3) | $[USD] |
| R:R Ratio | [X]:1 |
| Liquidation Price | [PRICE] |
| Liquidation Distance | [%] |

**Risk Assessment:**
- Volatility Level: [LOW / MEDIUM / HIGH]
- Liquidation Risk: [LOW / MEDIUM / HIGH]
- Overall Risk: [LOW / MEDIUM / HIGH]
- Recommendation: [PROCEED / REDUCE LEVERAGE / WAIT]`,
          },
        },
      ],
    }
  }
)

// NEW: Oscillators Analysis Prompt (All 10 oscillator tools from MCP_TOOLS_TEST_RESULTS.md)
server.registerPrompt(
  'oscillators_analysis',
  {
    title: 'Oscillators Analysis',
    description: 'Analyze all oscillator indicators for overbought/oversold and momentum signals',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      focusType: z.string().optional().describe('Focus on: fast (day trading), medium (swing), slow (position). Default: all'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC'
    const focusType = args.focusType || 'all'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze all oscillator indicators for ${ticker} (Focus: ${focusType}):

**Fast Oscillators (Day Trading):**
- Use stochastic_rsi for overbought/oversold with RSI + Stochastic
- Use fisher_transform for sharp reversal signals
- Use momentum for rate of price change

**Medium Oscillators (Swing Trading):**
- Use chande_momentum for momentum on both sides (-100 to +100)
- Use rate_of_change for percentage change in price
- Use percentage_price_oscillator for MACD as percentage
- Use detrended_price for cycle identification

**Slow Oscillators (Position Trading):**
- Use gator_oscillator for Alligator convergence/divergence
- Use ultimate_oscillator for three-timeframe oscillator
- Use true_strength_index for double-smoothed momentum

**Trend Confirmation:**
- Use schaff_trend_cycle for MACD + Stochastic with double smoothing

**Present Oscillators Summary:**

| Oscillator | Value | Signal | Confidence |
|------------|-------|--------|------------|
| Stochastic RSI | [K/D] | [OVERBOUGHT/OVERSOLD/NEUTRAL] | [HIGH/MED/LOW] |
| Fisher Transform | [VALUE] | [BULLISH/BEARISH/NEUTRAL] | [HIGH/MED/LOW] |
| Momentum | [VALUE] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| Chande Momentum | [VALUE] | [OVERBOUGHT/OVERSOLD/NEUTRAL] | [HIGH/MED/LOW] |
| ROC | [%] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| PPO | [%] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| Detrended Price | [VALUE] | [CYCLE POSITION] | [HIGH/MED/LOW] |
| Gator | [UPPER/LOWER] | [AWAKE/SLEEPING] | [HIGH/MED/LOW] |
| Ultimate Oscillator | [VALUE] | [OVERBOUGHT/OVERSOLD/NEUTRAL] | [HIGH/MED/LOW] |
| TSI | [VALUE] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| Schaff Trend | [VALUE] | [BUY/SELL/NEUTRAL] | [HIGH/MED/LOW] |

**Overall Oscillator Consensus:**
- Bullish signals: [COUNT]/11
- Bearish signals: [COUNT]/11
- Neutral signals: [COUNT]/11
- Overall signal: [BULLISH/BEARISH/NEUTRAL]
- Recommendation: [BUY/SELL/WAIT]`,
          },
        },
      ],
    }
  }
)

// NEW: Moving Averages Analysis Prompt (All 8 MA tools from MCP_TOOLS_TEST_RESULTS.md)
server.registerPrompt(
  'moving_averages_analysis',
  {
    title: 'Moving Averages Analysis',
    description: 'Analyze all moving average indicators for trend direction and crossovers',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      period: z.string().optional().describe('MA period focus: short (9,20), medium (50,100), long (200). Default: all'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC'
    const period = args.period || 'all'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze all moving average indicators for ${ticker} (Period focus: ${period}):

**Standard Moving Averages:**
- Use get_indicators for EMA20, EMA50 (baseline)
- Use double_ema for reduced lag EMA (DEMA)
- Use triple_ema for further reduced lag (TEMA)

**Weighted Moving Averages:**
- Use weighted_ma for recent price weighted MA (WMA)
- Use smoothed_ma for smooth trend following (SMMA)
- Use vwma for volume-weighted moving average

**Adaptive Moving Averages:**
- Use hull_ma for smooth trend with reduced lag (HMA)
- Use kaufman_adaptive_ma for adaptive to market efficiency (KAMA)
- Use mcginley_dynamic for adaptive to market volatility

**Visual Trend Analysis:**
- Use rainbow_ma for multi-period trend visualization

**Present Moving Averages Summary:**

| MA Type | Value | Price Position | Signal |
|---------|-------|----------------|--------|
| EMA20 | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| EMA50 | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| DEMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| TEMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| WMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| SMMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| VWMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| HMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| KAMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| McGinley | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |

**Rainbow MA Alignment:**
- Short-term MAs: [BULLISH/BEARISH] (2-5 periods)
- Medium-term MAs: [BULLISH/BEARISH] (6-7 periods)
- Long-term MAs: [BULLISH/BEARISH] (8-9 periods)
- Rainbow alignment: [PERFECT/MIXED/INVERTED]

**Crossover Signals:**
- Golden Cross (EMA20 > EMA50): [YES/NO]
- Death Cross (EMA20 < EMA50): [YES/NO]
- Recent crossover: [GOLDEN/DEATH/NONE]

**Overall MA Trend:**
- Bullish MAs: [COUNT]/10
- Bearish MAs: [COUNT]/10
- Overall trend: [STRONG UPTREND/UPTREND/NEUTRAL/DOWNTREND/STRONG DOWNTREND]
- Recommendation: [BUY/SELL/WAIT]`,
          },
        },
      ],
    }
  }
)

// Register Additional Resource Templates
server.registerResource(
  'technical-indicators-guide',
  'geartrade://docs/technical-indicators',
  {
    description: 'Complete guide on technical indicators available in GearTrade: RSI, EMA, MACD, Bollinger Bands, ATR, ADX, and more',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/technical-indicators',
          mimeType: 'text/markdown',
          text: `# Technical Indicators Guide

## Overview

GearTrade MCP Server provides access to 20+ technical indicators for comprehensive market analysis. This guide explains each indicator, its interpretation, and trading applications.

## Momentum Indicators

### RSI (Relative Strength Index)
- **Range**: 0-100
- **Oversold**: <30 (potential BUY signal)
- **Overbought**: >70 (potential SELL signal)
- **Neutral**: 30-70
- **Usage**: Identify reversal points, confirm trends
- **Timeframes**: RSI14 (14-period), RSI7 (7-period), RSI4h (4-hour)

### Stochastic Oscillator
- **Range**: 0-100
- **Oversold**: <20
- **Overbought**: >80
- **Usage**: Momentum indicator, works well with RSI
- **Components**: %K (fast), %D (slow)

### CCI (Commodity Channel Index)
- **Range**: -100 to +100
- **Oversold**: <-100
- **Overbought**: >+100
- **Usage**: Identify cyclical trends, breakouts

### Williams %R
- **Range**: -100 to 0
- **Oversold**: <-80
- **Overbought**: >-20
- **Usage**: Momentum indicator, similar to Stochastic

## Trend Indicators

### EMA (Exponential Moving Average)
- **Common Periods**: EMA9, EMA21, EMA50, EMA100, EMA200
- **Golden Cross**: EMA9 > EMA21 (bullish)
- **Death Cross**: EMA9 < EMA21 (bearish)
- **Usage**: Identify trend direction, support/resistance levels

### MACD (Moving Average Convergence Divergence)
- **Components**: MACD line, Signal line, Histogram
- **Bullish**: MACD crosses above Signal
- **Bearish**: MACD crosses below Signal
- **Usage**: Trend confirmation, momentum shifts

### ADX (Average Directional Index)
- **Range**: 0-100
- **Strong Trend**: >25
- **Weak Trend**: <20
- **Usage**: Measure trend strength (not direction)

### Parabolic SAR
- **Above Price**: Bearish trend
- **Below Price**: Bullish trend
- **Usage**: Trend following, stop loss placement

### Aroon Indicator
- **Aroon Up**: Measures uptrend strength (0-100)
- **Aroon Down**: Measures downtrend strength (0-100)
- **Usage**: Identify trend changes, consolidation periods

## Volatility Indicators

### Bollinger Bands
- **Components**: Upper band, Middle band (SMA20), Lower band
- **Squeeze**: Bands narrow (low volatility, potential breakout)
- **Expansion**: Bands widen (high volatility)
- **Usage**: Identify overbought/oversold, volatility changes

### ATR (Average True Range)
- **Usage**: Measure volatility, set stop loss levels
- **Stop Loss**: 1.5x-3x ATR from entry
- **High ATR**: High volatility (wider stops)
- **Low ATR**: Low volatility (tighter stops)

## Volume Indicators

### OBV (On-Balance Volume)
- **Rising OBV**: Accumulation (bullish)
- **Falling OBV**: Distribution (bearish)
- **Usage**: Confirm price trends, detect divergences

### VWAP (Volume Weighted Average Price)
- **Above VWAP**: Bullish intraday
- **Below VWAP**: Bearish intraday
- **Usage**: Intraday trading, institutional price levels

### CVD (Cumulative Volume Delta)
- **Positive CVD**: Buying pressure
- **Negative CVD**: Selling pressure
- **Usage**: Early trend detection, divergence analysis

## Support & Resistance

### Support/Resistance Levels
- **Support**: Price level where buying interest is strong
- **Resistance**: Price level where selling interest is strong
- **Usage**: Entry/exit points, stop loss placement

### Fibonacci Retracement
- **Key Levels**: 23.6%, 38.2%, 50%, 61.8%, 78.6%
- **Usage**: Identify potential reversal zones
- **Calculation**: Based on swing highs and lows

## Multi-Timeframe Analysis

### Timeframes Available
- **Daily (1D)**: Long-term trend
- **4-Hour (4H)**: Medium-term trend
- **1-Hour (1H)**: Short-term trend

### Trend Alignment
- **Aligned**: All timeframes trending same direction (high confidence)
- **Not Aligned**: Mixed signals (lower confidence)
- **Usage**: Confirm trade setups, filter false signals

## Indicator Combinations

### High-Confidence BUY Setup
- RSI <30 (oversold)
- Price at support level
- EMA9 > EMA21 (uptrend)
- Positive CVD trend
- Multi-timeframe alignment (bullish)

### High-Confidence SELL Setup
- RSI >70 (overbought)
- Price at resistance level
- EMA9 < EMA21 (downtrend)
- Negative CVD trend
- Multi-timeframe alignment (bearish)

## Best Practices

1. **Never rely on single indicator** - Use multiple confirmations
2. **Combine different indicator types** - Momentum + Trend + Volume
3. **Use multi-timeframe analysis** - Confirm on higher timeframes
4. **Watch for divergences** - Price vs indicator divergence = early signal
5. **Respect market context** - Indicators work better in trending vs ranging markets

## Common Mistakes

1. ❌ Using too many indicators (analysis paralysis)
2. ❌ Ignoring volume confirmation
3. ❌ Trading against the trend
4. ❌ Not using multi-timeframe confirmation
5. ❌ Ignoring divergences
`,
        },
      ],
    }
  }
)

server.registerResource(
  'hyperliquid-api-reference',
  'geartrade://docs/hyperliquid-api',
  {
    description: 'Hyperliquid API reference guide: endpoints, authentication, order types, and integration details',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/hyperliquid-api',
          mimeType: 'text/markdown',
          text: `# Hyperliquid API Reference

## Overview

GearTrade MCP Server integrates with Hyperliquid DEX for perpetual futures trading. This guide covers API endpoints, authentication, and order execution.

## Authentication

### EIP-712 Signing
- **Standard**: EIP-712 typed data signing
- **Purpose**: Secure order submission without exposing private keys
- **Implementation**: Automatic in \`hyperliquid_testnet_futures_trade\` and \`hyperliquid_mainnet_futures_trade\` tools

### Credentials
- **Account Address**: Your Hyperliquid wallet address (0x format)
- **Wallet API Key**: Your private key for signing (keep secure!)
- **Note**: Credentials can be provided via tool parameters (multi-user support)

## Order Types

### Market Orders
- **Execution**: Immediate at best available price
- **Slippage**: May occur during high volatility
- **Usage**: Fast execution, no price guarantee

### Limit Orders
- **Execution**: Only at specified price or better
- **Slippage**: None (price guaranteed)
- **Usage**: Price control, may not fill immediately

## Order Sides

### LONG (Buy)
- **Action**: Open long position or close short position
- **Profit**: When price increases
- **Usage**: Bullish market outlook

### SHORT (Sell)
- **Action**: Open short position or close long position
- **Profit**: When price decreases
- **Usage**: Bearish market outlook

## Leverage

### Available Leverage
- **Range**: 1x to 50x
- **Spot Trading**: 1x (no leverage)
- **Futures Trading**: 1x-50x

### Leverage Guidelines
- **Conservative**: 1x-3x
- **Moderate**: 3x-10x
- **Aggressive**: 10x-50x (high risk!)

### Dynamic Leverage
- Use \`calculate_dynamic_leverage\` tool
- Based on volatility (ATR), market conditions
- Recommended: Lower leverage in high volatility

## Position Management

### Position Sizing
- **Risk-Based**: 1-2% of capital per trade
- **Calculation**: Use \`calculate_position_setup\` tool
- **Formula**: (Capital × Risk %) / (Entry - Stop Loss)

### Stop Loss
- **Fixed**: 1-3% from entry
- **ATR-Based**: 1.5x-3x ATR
- **Support/Resistance**: Below support (longs) or above resistance (shorts)

### Take Profit
- **Risk/Reward**: Minimum 2:1, recommended 3:1
- **Multiple Levels**: TP1 (2:1), TP2 (3:1), TP3 (5:1)
- **Trailing Stop**: Move stop to breakeven after TP1

## API Endpoints

### Price Data
- **Real-time Price**: \`get_price\` tool
- **Multiple Prices**: \`get_price\` tool with tickers array
- **Source**: Hyperliquid and Binance APIs

### Market Data
- **Funding Rate**: Real-time funding rate with trend
- **Open Interest**: Total open positions
- **Volume**: 24h volume and trends

### Order Execution
- **Testnet Trading**: \`hyperliquid_testnet_futures_trade\` (test mode)
- **Mainnet Trading**: \`hyperliquid_mainnet_futures_trade\` (real money)
- **Leverage**: 1-100x supported
- **Safety**: Mainnet requires \`confirmExecution: "true"\`

## Safety Features

### Paper Trading (Default)
- **Purpose**: Test strategies without real money
- **Slippage Modeling**: Realistic execution simulation
- **Usage**: Always test before live trading

### Multi-Asset Execution
- **Default**: Paper trading (safety)
- **Reason**: Multiple simultaneous executions = higher risk
- **Override**: Explicit \`execute: true\` required

### User Confirmation
- **Required**: Always get user confirmation before live execution
- **Best Practice**: Present analysis, ask "Mau dieksekusi ke Hyperliquid? (YES/NO)"

## Error Handling

### Common Errors
- **Insufficient Balance**: Not enough funds for order
- **Invalid Leverage**: Leverage exceeds limits
- **Market Closed**: Trading not available
- **Network Error**: API connection issues

### Error Recovery
- **Retry Logic**: Automatic retry for network errors
- **User Notification**: Clear error messages
- **Fallback**: Paper trading if live execution fails

## Best Practices

1. **Always test with paper trading first**
2. **Start with small position sizes**
3. **Use appropriate leverage for volatility**
4. **Set stop loss on every trade**
5. **Monitor positions actively**
6. **Respect risk limits (1-2% per trade)**
7. **Get user confirmation before live execution**

## Rate Limits

- **Price Data**: No strict limits (cached)
- **Order Execution**: Follow Hyperliquid rate limits
- **Best Practice**: Avoid rapid-fire orders

## Security

- **Never share private keys**
- **Use environment variables or tool parameters**
- **Multi-user support**: Each user provides own credentials
- **EIP-712 signing**: Secure without exposing keys
`,
        },
      ],
    }
  }
)

server.registerResource(
  'market-analysis-patterns',
  'geartrade://docs/market-patterns',
  {
    description: 'Common market analysis patterns: chart patterns, candlestick patterns, and market structure analysis',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/market-patterns',
          mimeType: 'text/markdown',
          text: `# Market Analysis Patterns Guide

## Overview

This guide covers common market patterns, chart formations, and market structure analysis techniques available in GearTrade MCP Server.

## Candlestick Patterns

### Reversal Patterns

#### Doji
- **Appearance**: Open and close are nearly equal
- **Signal**: Indecision, potential reversal
- **Usage**: Wait for confirmation on next candle

#### Hammer
- **Appearance**: Small body, long lower wick
- **Signal**: Bullish reversal (at support)
- **Usage**: Enter long after confirmation

#### Shooting Star
- **Appearance**: Small body, long upper wick
- **Signal**: Bearish reversal (at resistance)
- **Usage**: Enter short after confirmation

#### Engulfing Patterns
- **Bullish Engulfing**: Large green candle engulfs previous red
- **Bearish Engulfing**: Large red candle engulfs previous green
- **Signal**: Strong reversal signal
- **Usage**: High-confidence reversal entry

### Continuation Patterns

#### Three White Soldiers
- **Appearance**: Three consecutive green candles
- **Signal**: Strong uptrend continuation
- **Usage**: Add to long positions

#### Three Black Crows
- **Appearance**: Three consecutive red candles
- **Signal**: Strong downtrend continuation
- **Usage**: Add to short positions

## Chart Patterns

### Trend Patterns

#### Ascending Triangle
- **Formation**: Higher lows, horizontal resistance
- **Signal**: Bullish breakout expected
- **Entry**: On breakout above resistance

#### Descending Triangle
- **Formation**: Lower highs, horizontal support
- **Signal**: Bearish breakdown expected
- **Entry**: On breakdown below support

#### Symmetrical Triangle
- **Formation**: Converging support and resistance
- **Signal**: Breakout direction uncertain
- **Entry**: Wait for breakout confirmation

### Reversal Patterns

#### Head and Shoulders
- **Formation**: Three peaks, middle highest
- **Signal**: Bearish reversal
- **Entry**: On neckline breakdown

#### Inverse Head and Shoulders
- **Formation**: Three troughs, middle lowest
- **Signal**: Bullish reversal
- **Entry**: On neckline breakout

#### Double Top
- **Formation**: Two similar peaks
- **Signal**: Bearish reversal
- **Entry**: On breakdown below support

#### Double Bottom
- **Formation**: Two similar troughs
- **Signal**: Bullish reversal
- **Entry**: On breakout above resistance

## Market Structure

### Change of Character (COC)
- **Definition**: Shift in market structure (uptrend to downtrend or vice versa)
- **Detection**: Use \`get_market_structure\` tool
- **Signal**: Potential trend reversal
- **Usage**: Early warning for trend changes

### Swing Patterns
- **Swing High**: Local price peak
- **Swing Low**: Local price trough
- **Usage**: Identify trend direction, support/resistance

### Structure Strength
- **Strong Structure**: Clear trend with consistent swings
- **Weak Structure**: Choppy, ranging market
- **Usage**: Determine if trend-following or mean-reversion strategy

## Volume Patterns

### Volume Profile Patterns

#### POC (Point of Control)
- **Definition**: Price level with highest volume
- **Usage**: Strong support/resistance level
- **Trading**: Trade from POC to value area boundaries

#### Value Area
- **VAH (Value Area High)**: Upper boundary
- **VAL (Value Area Low)**: Lower boundary
- **Usage**: Identify fair value zone
- **Trading**: Price tends to return to value area

#### HVN/LVN (High/Low Volume Nodes)
- **HVN**: High volume price levels (support/resistance)
- **LVN**: Low volume price levels (quick price movement)
- **Usage**: Identify liquidity zones

### Volume Analysis Patterns

#### Accumulation
- **Pattern**: Increasing volume on up moves
- **Signal**: Bullish, smart money buying
- **Usage**: Enter long positions

#### Distribution
- **Pattern**: Increasing volume on down moves
- **Signal**: Bearish, smart money selling
- **Usage**: Enter short positions

#### Volume Divergence
- **Pattern**: Price makes new high/low, volume doesn't confirm
- **Signal**: Weak move, potential reversal
- **Usage**: Early reversal signal

## Order Book Patterns

### Bid/Ask Imbalance
- **Large Bid Wall**: Strong support, potential bounce
- **Large Ask Wall**: Strong resistance, potential rejection
- **Usage**: Short-term direction indicator

### Order Flow
- **Buying Pressure**: More buy orders than sell
- **Selling Pressure**: More sell orders than buy
- **Usage**: Immediate market sentiment

### Spread Analysis
- **Tight Spread**: High liquidity, low slippage
- **Wide Spread**: Low liquidity, high slippage
- **Usage**: Execution quality indicator

## Fibonacci Patterns

### Retracement Levels
- **23.6%**: Shallow retracement
- **38.2%**: Normal retracement
- **50%**: Psychological level
- **61.8%**: Deep retracement (golden ratio)
- **Usage**: Entry zones, support/resistance

### Extension Levels
- **127.2%**: First extension
- **161.8%**: Golden ratio extension
- **200%**: Double extension
- **Usage**: Take profit targets

## Divergence Patterns

### RSI Divergence
- **Bullish Divergence**: Price makes lower low, RSI makes higher low
- **Bearish Divergence**: Price makes higher high, RSI makes lower high
- **Signal**: Early reversal indicator
- **Usage**: Enter before price reversal

### Price-Volume Divergence
- **Pattern**: Price and volume move in opposite directions
- **Signal**: Weak trend, potential reversal
- **Usage**: Confirm with other indicators

## Liquidation Patterns

### Liquidation Clusters
- **Definition**: Concentration of stop losses
- **Detection**: Use \`get_liquidation_levels\` tool
- **Usage**: Identify potential stop hunt zones

### Stop Hunt
- **Pattern**: Price moves to liquidate positions before reversing
- **Signal**: Contrarian opportunity
- **Usage**: Enter opposite direction after liquidation

## Best Practices

1. **Wait for pattern confirmation** - Don't enter on pattern formation alone
2. **Combine multiple patterns** - Higher confidence with multiple confirmations
3. **Use volume confirmation** - Patterns work better with volume support
4. **Respect market structure** - Patterns work better in trending markets
5. **Set appropriate stop loss** - Patterns can fail, protect capital

## Common Mistakes

1. ❌ Entering before pattern confirmation
2. ❌ Ignoring volume confirmation
3. ❌ Trading patterns in ranging markets
4. ❌ Not setting stop loss
5. ❌ Over-trading on every pattern
`,
        },
      ],
    }
  }
)

server.registerResource(
  'common-trading-mistakes',
  'geartrade://docs/common-mistakes',
  {
    description: 'Common trading mistakes to avoid: emotional trading, over-leveraging, ignoring risk management, and more',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/common-mistakes',
          mimeType: 'text/markdown',
          text: `# Common Trading Mistakes to Avoid

## Overview

This guide lists common trading mistakes and how to avoid them. Learning from these mistakes can significantly improve your trading performance.

## Risk Management Mistakes

### ❌ Not Setting Stop Loss
- **Problem**: Unlimited downside risk
- **Solution**: Always set stop loss (1-3% from entry)
- **Tool**: Use \`calculate_risk_management\` tool

### ❌ Risking Too Much Per Trade
- **Problem**: Large losses can wipe out account
- **Solution**: Never risk more than 1-2% per trade
- **Tool**: Use \`calculate_position_setup\` tool

### ❌ Moving Stop Loss Against Position
- **Problem**: Turning small loss into large loss
- **Solution**: Only move stop loss in profit direction
- **Exception**: Trailing stop to lock in profits

### ❌ Ignoring Risk/Reward Ratio
- **Problem**: Taking trades with poor R:R
- **Solution**: Minimum 2:1, recommended 3:1
- **Tool**: Use \`calculate_risk_management\` tool

## Leverage Mistakes

### ❌ Over-Leveraging
- **Problem**: Small price move = large loss
- **Solution**: Use appropriate leverage (1x-10x for most traders)
- **Tool**: Use \`calculate_dynamic_leverage\` tool

### ❌ Using Same Leverage for All Markets
- **Problem**: High volatility markets need lower leverage
- **Solution**: Adjust leverage based on volatility (ATR)
- **Tool**: Use \`calculate_dynamic_leverage\` tool

### ❌ Ignoring Margin Requirements
- **Problem**: Forced liquidation
- **Solution**: Maintain 150-200% of required margin
- **Tool**: Use \`calculate_dynamic_margin_percentage\` tool

## Analysis Mistakes

### ❌ Trading Without Analysis
- **Problem**: Random entries, poor results
- **Solution**: Always use comprehensive analysis
- **Tool**: Use \`get_indicators\` + \`get_market_structure\` tools before trading

### ❌ Ignoring Multi-Timeframe Analysis
- **Problem**: Trading against higher timeframe trend
- **Solution**: Check Daily, 4H, and 1H alignment
- **Tool**: Use \`get_Multitimeframe\` tool

### ❌ Not Waiting for Confirmation
- **Problem**: Entering too early, false signals
- **Solution**: Wait for multiple confirmations
- **Best Practice**: RSI + Volume + Trend alignment

### ❌ Ignoring Volume Analysis
- **Problem**: Missing important market signals
- **Solution**: Always check volume trends
- **Tool**: Use \`get_volume_analysis\` tool

## Execution Mistakes

### ❌ Executing Without User Confirmation
- **Problem**: Unauthorized trades, user frustration
- **Solution**: Always ask "Mau dieksekusi ke Hyperliquid? (YES/NO)"
- **Best Practice**: Present analysis first, then ask

### ❌ Skipping Paper Trading
- **Problem**: Testing strategies with real money
- **Solution**: Always test with paper trading first
- **Default**: All execution tools default to paper trading

### ❌ Not Monitoring Positions
- **Problem**: Missing exit signals, large losses
- **Solution**: Actively monitor open positions
- **Tool**: Use \`get_position\` tool regularly

### ❌ Trading During High Volatility
- **Problem**: Increased slippage, wider stops
- **Solution**: Avoid trading during extreme volatility
- **Indicator**: High ATR = high volatility

## Emotional Mistakes

### ❌ FOMO (Fear of Missing Out)
- **Problem**: Entering trades out of fear
- **Solution**: Stick to your strategy, wait for setups
- **Reminder**: There's always another opportunity

### ❌ Revenge Trading
- **Problem**: Trying to recover losses quickly
- **Solution**: Take a break after losses, review strategy
- **Best Practice**: Maximum 2-3 trades per day

### ❌ Greed
- **Problem**: Holding winners too long, not taking profits
- **Solution**: Use take profit levels, trail stop loss
- **Tool**: Use \`calculate_risk_management\` for TP levels

### ❌ Fear
- **Problem**: Exiting winners too early, not taking trades
- **Solution**: Trust your analysis, follow the plan
- **Reminder**: Risk is managed with stop loss

## Strategy Mistakes

### ❌ Changing Strategy After Losses
- **Problem**: No consistent approach
- **Solution**: Stick to one strategy, improve it
- **Best Practice**: Backtest before changing

### ❌ Over-Trading
- **Problem**: Too many trades, overtrading
- **Solution**: Quality over quantity
- **Best Practice**: 1-3 high-quality setups per day

### ❌ Trading Against the Trend
- **Problem**: Fighting the market
- **Solution**: Trade with the trend
- **Tool**: Use \`get_Multitimeframe\` to identify trend

### ❌ Not Diversifying
- **Problem**: All capital in one trade
- **Solution**: Spread risk across multiple positions
- **Best Practice**: Max 3-5 positions at once

## Technical Mistakes

### ❌ Using Too Many Indicators
- **Problem**: Analysis paralysis, conflicting signals
- **Solution**: Use 3-5 key indicators
- **Recommended**: RSI, EMA, Volume, Multi-timeframe

### ❌ Ignoring Divergences
- **Problem**: Missing early reversal signals
- **Solution**: Always check for divergences
- **Tool**: Use \`get_divergence\` tool

### ❌ Not Using Stop Loss Based on ATR
- **Problem**: Fixed stops don't account for volatility
- **Solution**: Use ATR-based stops (1.5x-3x ATR)
- **Tool**: Use \`get_indicators\` for ATR values

### ❌ Ignoring Market Structure
- **Problem**: Trading in wrong market regime
- **Solution**: Adapt strategy to market structure
- **Tool**: Use \`get_market_structure\` tool

## How to Avoid Mistakes

### Pre-Trade Checklist
- [ ] Comprehensive analysis completed
- [ ] Multi-timeframe alignment checked
- [ ] Volume analysis confirms signal
- [ ] Risk management calculated (1-2% risk)
- [ ] Stop loss set (1-3% from entry)
- [ ] Take profit set (2:1+ R:R)
- [ ] Leverage appropriate for volatility
- [ ] User confirmation obtained

### Post-Trade Review
- [ ] Review what went right
- [ ] Review what went wrong
- [ ] Identify mistakes made
- [ ] Plan improvements
- [ ] Update strategy if needed

## Recovery from Mistakes

### After a Loss
1. **Take a break** - Don't revenge trade
2. **Review the trade** - What went wrong?
3. **Identify the mistake** - Was it analysis, execution, or risk?
4. **Learn from it** - How to avoid next time?
5. **Return with plan** - Don't repeat the mistake

### After Multiple Losses
1. **Stop trading** - Take a longer break
2. **Review all trades** - Find common mistakes
3. **Revise strategy** - Fix identified issues
4. **Paper trade** - Test revised strategy
5. **Return gradually** - Start with smaller positions

## Key Takeaways

1. **Risk management is non-negotiable** - Always set stop loss
2. **Analysis before execution** - Never trade blindly
3. **Emotions kill profits** - Stick to the plan
4. **Learn from mistakes** - Every loss is a lesson
5. **Consistency matters** - Stick to your strategy
`,
        },
      ],
    }
  }
)

server.registerResource(
  'position-sizing-guide',
  'geartrade://docs/position-sizing',
  {
    description: 'Complete guide on position sizing, leverage calculation, and margin management for optimal risk control',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/position-sizing',
          mimeType: 'text/markdown',
          text: `# Position Sizing Guide

## Overview

Proper position sizing is critical for long-term trading success. This guide covers position sizing formulas, leverage management, and margin calculations.

## Risk-Based Position Sizing

### Basic Formula
\`\`\`
Position Size = (Capital × Risk %) / (Entry Price - Stop Loss Price)
\`\`\`

### Example
- Capital: $10,000
- Risk: 1% = $100
- Entry: $50,000
- Stop Loss: $49,000 (2% below entry)
- Position Size = $100 / $1,000 = 0.1 BTC

## Leverage Management

### Leverage Guidelines
- **Conservative**: 1x-3x (low risk, steady growth)
- **Moderate**: 3x-10x (balanced risk/reward)
- **Aggressive**: 10x-50x (high risk, high reward)

### Dynamic Leverage
- Use \`calculate_dynamic_leverage\` tool
- Based on volatility (ATR)
- Lower leverage in high volatility
- Higher leverage in low volatility

## Margin Requirements

### Margin Calculation
\`\`\`
Margin = Position Size × Entry Price / Leverage
\`\`\`

### Margin Safety
- Maintain 150-200% of required margin
- Avoid margin calls
- Use \`calculate_dynamic_margin_percentage\` tool

## Position Sizing Tools

### calculate_position_setup
- Calculates optimal position size
- Considers risk percentage
- Includes leverage and margin
- Provides quantity and USD value

### calculate_risk_management
- Calculates stop loss levels
- Sets take profit targets
- Determines risk/reward ratio
- Provides risk amount in USD

## Best Practices

1. **Never risk more than 1-2% per trade**
2. **Adjust position size based on volatility**
3. **Use lower leverage in uncertain markets**
4. **Maintain adequate margin buffer**
5. **Scale position size with account growth**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'multi-timeframe-guide',
  'geartrade://docs/multi-timeframe',
  {
    description: 'Complete guide on multi-timeframe analysis: how to use Daily, 4H, and 1H timeframes for better trading decisions',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/multi-timeframe',
          mimeType: 'text/markdown',
          text: `# Multi-Timeframe Analysis Guide

## Overview

Multi-timeframe analysis is essential for high-probability trading. This guide explains how to use different timeframes effectively.

## Timeframe Hierarchy

### Daily (1D)
- **Purpose**: Long-term trend direction
- **Use**: Identify major trend, support/resistance
- **Trading**: Swing trades, position trades

### 4-Hour (4H)
- **Purpose**: Medium-term trend and entries
- **Use**: Confirm daily trend, find entry zones
- **Trading**: Day trades, swing trades

### 1-Hour (1H)
- **Purpose**: Short-term entries and exits
- **Use**: Precise entry timing, stop placement
- **Trading**: Day trades, scalping

## Trend Alignment

### Perfect Alignment (Highest Confidence)
- Daily: UPTREND
- 4H: UPTREND
- 1H: UPTREND
- **Action**: Strong BUY signal

### Partial Alignment (Medium Confidence)
- Daily: UPTREND
- 4H: UPTREND
- 1H: DOWNTREND (pullback)
- **Action**: Wait for 1H to align, then BUY

### No Alignment (Low Confidence)
- Daily: UPTREND
- 4H: DOWNTREND
- 1H: DOWNTREND
- **Action**: Avoid trading, wait for alignment

## Trading Strategy

### Top-Down Approach
1. **Daily**: Identify major trend
2. **4H**: Confirm trend, find entry zone
3. **1H**: Execute entry at optimal price

### Bottom-Up Approach
1. **1H**: Find short-term setup
2. **4H**: Check if aligns with medium trend
3. **Daily**: Confirm major trend direction

## Best Practices

1. **Always check higher timeframe first**
2. **Trade with the trend on higher timeframe**
3. **Use lower timeframe for entry timing**
4. **Wait for alignment for high-confidence trades**
5. **Avoid trading against higher timeframe trend**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'execution-best-practices',
  'geartrade://docs/execution-practices',
  {
    description: 'Best practices for order execution: market vs limit orders, slippage management, and execution timing',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/execution-practices',
          mimeType: 'text/markdown',
          text: `# Execution Best Practices

## Overview

Proper execution is crucial for trading success. This guide covers order types, execution timing, and slippage management.

## Order Types

### Market Orders
- **Pros**: Immediate execution, guaranteed fill
- **Cons**: No price control, potential slippage
- **Use**: When speed is critical, small positions

### Limit Orders
- **Pros**: Price control, no slippage
- **Cons**: May not fill, missed opportunities
- **Use**: When price is important, larger positions

## Execution Timing

### Best Times to Execute
- **High Liquidity**: During active trading hours
- **Low Volatility**: Avoid extreme volatility periods
- **Volume Confirmation**: Wait for volume spike

### Avoid Execution During
- **Low Liquidity**: Thin order books
- **High Volatility**: Extreme price swings
- **News Events**: Major announcements

## Slippage Management

### Understanding Slippage
- **Definition**: Difference between expected and actual price
- **Causes**: Low liquidity, high volatility, large orders
- **Impact**: Reduces profit, increases loss

### Reducing Slippage
1. Use limit orders when possible
2. Execute during high liquidity
3. Split large orders
4. Check order book depth first

## Paper Trading First

### Why Paper Trade
- Test strategies without risk
- Understand execution mechanics
- Practice order placement
- Build confidence

### When to Go Live
- Consistent paper trading profits
- Understanding of all tools
- Comfortable with risk management
- User explicitly confirms

## Safety Checklist

Before executing any trade:
- [ ] Analysis completed
- [ ] Risk management calculated
- [ ] Stop loss set
- [ ] Position size appropriate
- [ ] Leverage reasonable
- [ ] User confirmation obtained
- [ ] Paper trading tested (if new strategy)
`,
        },
      ],
    }
  }
)

server.registerResource(
  'volume-analysis-guide',
  'geartrade://docs/volume-analysis',
  {
    description: 'Complete guide on volume analysis: CVD, buy/sell pressure, liquidity zones, and volume profile',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/volume-analysis',
          mimeType: 'text/markdown',
          text: `# Volume Analysis Guide

## Overview

Volume analysis is crucial for understanding market dynamics. This guide covers CVD, buy/sell pressure, and volume profile.

## Cumulative Volume Delta (CVD)

### What is CVD?
- Tracks cumulative buy vs sell volume
- Positive CVD: More buying pressure
- Negative CVD: More selling pressure
- Divergence: Price vs CVD divergence signals reversal

### Using CVD
- Rising price + Rising CVD: Strong uptrend
- Falling price + Falling CVD: Strong downtrend
- Rising price + Falling CVD: Bearish divergence (potential reversal)
- Falling price + Rising CVD: Bullish divergence (potential reversal)

## Buy/Sell Pressure

### Interpretation
- **High Buy Pressure**: Strong demand, bullish
- **High Sell Pressure**: Strong supply, bearish
- **Balanced**: Indecision, potential reversal

### Trading Signals
- Extreme buy pressure: Potential exhaustion, watch for reversal
- Extreme sell pressure: Potential exhaustion, watch for reversal
- Balanced pressure: Wait for breakout

## Volume Profile

### Key Levels
- **POC (Point of Control)**: Highest volume price
- **VAH/VAL**: Value area boundaries
- **HVN**: High volume nodes (support/resistance)
- **LVN**: Low volume nodes (quick movement zones)

### Trading Strategy
- Trade from POC to value area boundaries
- Use HVN as support/resistance
- LVN zones for quick entries/exits

## Best Practices

1. **Always confirm with price action**
2. **Use volume spikes for confirmation**
3. **Watch for volume divergences**
4. **Combine with technical indicators**
5. **Volume precedes price movement**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'liquidation-levels-guide',
  'geartrade://docs/liquidation-levels',
  {
    description: 'Complete guide on liquidation levels: liquidity grabs, stop hunts, cascade risks, and trading strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/liquidation-levels',
          mimeType: 'text/markdown',
          text: `# Liquidation Levels Guide

## Overview

Understanding liquidation levels helps identify high-probability trading zones and avoid dangerous price areas.

## Liquidity Grab

### What is Liquidity Grab?
- Price moves to liquidate positions
- Creates temporary price spike/drop
- Often reverses after liquidation

### Trading Strategy
- **Before Liquidity**: Avoid entering near liquidation zones
- **After Liquidity**: Enter opposite direction (contrarian)
- **Risk**: Liquidity can be grabbed multiple times

## Stop Hunt

### What is Stop Hunt?
- Price moves to trigger stop losses
- Creates quick price movement
- Often reverses after stop hunt

### Trading Strategy
- **Before Stop Hunt**: Set stops outside obvious levels
- **After Stop Hunt**: Enter opposite direction
- **Risk**: Stop hunt can continue if trend is strong

## Cascade Risk

### What is Cascade?
- Chain reaction of liquidations
- One liquidation triggers another
- Can cause extreme price movement

### Risk Assessment
- **Low Risk**: Isolated liquidations
- **Medium Risk**: Clustered liquidations
- **High Risk**: Cascade potential

### Trading Strategy
- **Low Risk**: Trade normally
- **Medium Risk**: Reduce position size
- **High Risk**: Avoid trading, wait for stability

## Best Practices

1. **Check liquidation levels before entry**
2. **Avoid trading near high liquidation zones**
3. **Use liquidation zones as support/resistance**
4. **Watch for cascade risk in volatile markets**
5. **Enter after liquidity grab/stop hunt completes**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'divergence-trading-guide',
  'geartrade://docs/divergence-trading',
  {
    description: 'Complete guide on divergence trading: RSI divergence, price-action divergence, and trading strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/divergence-trading',
          mimeType: 'text/markdown',
          text: `# Divergence Trading Guide

## Overview

Divergence is a powerful reversal signal. This guide covers RSI divergence, price-action divergence, and trading strategies.

## RSI Divergence

### Bullish Divergence
- Price makes lower low
- RSI makes higher low
- **Signal**: Potential bullish reversal

### Bearish Divergence
- Price makes higher high
- RSI makes lower high
- **Signal**: Potential bearish reversal

### Trading Strategy
- Wait for divergence confirmation
- Enter on price reversal
- Set stop below/above divergence point
- Target: Previous swing high/low

## Price-Action Divergence

### Types
- **Momentum Divergence**: Price vs momentum indicator
- **Volume Divergence**: Price vs volume
- **Time Divergence**: Price vs time cycles

### Trading Strategy
- Identify divergence pattern
- Wait for confirmation
- Enter on reversal signal
- Use stop loss to protect

## Best Practices

1. **Wait for confirmation** - Don't enter on divergence alone
2. **Use multiple timeframes** - Higher timeframe divergences are stronger
3. **Combine with support/resistance** - Divergence at key levels is more reliable
4. **Set appropriate stops** - Divergence can fail
5. **Don't force divergence** - Not all moves have divergence
`,
        },
      ],
    }
  }
)

server.registerResource(
  'orderbook-trading-guide',
  'geartrade://docs/orderbook-trading',
  {
    description: 'Complete guide on order book trading: reading order book depth, identifying support/resistance walls, and market sentiment',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/orderbook-trading',
          mimeType: 'text/markdown',
          text: `# Order Book Trading Guide

## Overview

Order book analysis provides real-time market sentiment and liquidity information. This guide covers reading order books effectively.

## Reading Order Book

### Bid Side (Buy Orders)
- Shows demand at different price levels
- Large bid walls = strong support
- Thin bids = weak support

### Ask Side (Sell Orders)
- Shows supply at different price levels
- Large ask walls = strong resistance
- Thin asks = weak resistance

## Market Sentiment

### Bullish Signals
- Large bid walls below price
- Thin ask walls above price
- Bid/Ask ratio > 1.5

### Bearish Signals
- Large ask walls above price
- Thin bid walls below price
- Bid/Ask ratio < 0.67

### Neutral Signals
- Balanced bid/ask volumes
- Bid/Ask ratio ~1.0

## Support/Resistance Levels

### Identifying Walls
- **Bid Wall**: Large concentration of buy orders
- **Ask Wall**: Large concentration of sell orders
- **Wall Strength**: Volume at that level

### Trading Strategy
- Enter longs below bid walls
- Enter shorts above ask walls
- Set stops beyond walls
- Take profit at opposite walls

## Warning: Wall Removal

### Risk
- Walls can disappear quickly
- Market makers can fake walls
- Don't rely solely on order book

### Best Practices
1. Use order book as confirmation, not sole signal
2. Combine with price action
3. Watch for wall removal
4. Don't chase walls that are too far
5. Use order book for entry timing, not direction
`,
        },
      ],
    }
  }
)

server.registerResource(
  'market-structure-guide',
  'geartrade://docs/market-structure',
  {
    description: 'Complete guide on market structure: trend identification, change of character (COC), swing patterns, and structure breaks',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/market-structure',
          mimeType: 'text/markdown',
          text: `# Market Structure Guide

## Overview

Market structure analysis identifies trend direction and potential reversals. This guide covers structure types, COC, and trading strategies.

## Market Structure Types

### Uptrend
- Higher highs and higher lows
- Structure: Bullish
- Trading: Buy on dips

### Downtrend
- Lower highs and lower lows
- Structure: Bearish
- Trading: Sell on rallies

### Sideways/Ranging
- Equal highs and lows
- Structure: Neutral
- Trading: Range trading

## Change of Character (COC)

### Bullish COC
- Previous downtrend breaks
- New higher high formed
- **Signal**: Potential trend reversal to uptrend

### Bearish COC
- Previous uptrend breaks
- New lower low formed
- **Signal**: Potential trend reversal to downtrend

### Trading Strategy
- Enter on COC confirmation
- Set stop below/above COC point
- Target: Previous structure level

## Swing Patterns

### Swing Highs
- Peaks in price movement
- Resistance levels
- Break above = bullish signal

### Swing Lows
- Troughs in price movement
- Support levels
- Break below = bearish signal

## Structure Breaks

### Break of Structure (BOS)
- Price breaks previous swing high/low
- Confirms trend continuation
- **Signal**: Strong trend continuation

### Trading Strategy
- Enter on BOS confirmation
- Follow the trend
- Set stop at previous structure level

## Best Practices

1. **Always identify structure first**
2. **Trade with the structure**
3. **Wait for COC confirmation**
4. **Use structure levels for stops**
5. **Avoid trading against structure**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'external-data-guide',
  'geartrade://docs/external-data',
  {
    description: 'Complete guide on external market data: funding rate, open interest, volatility, and market sentiment indicators',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/external-data',
          mimeType: 'text/markdown',
          text: `# External Data Guide

## Overview

External market data provides insights into market sentiment and potential reversals. This guide covers funding rate, OI, and volatility.

## Funding Rate

### What is Funding Rate?
- Fee paid between longs and shorts
- Positive: Longs pay shorts (more longs)
- Negative: Shorts pay longs (more shorts)

### Trading Signals
- **Extreme Positive (>0.1%)**: Potential bearish reversal
- **Extreme Negative (<-0.1%)**: Potential bullish reversal
- **Normal Range**: No contrarian signal

### Strategy
- Use extreme funding for contrarian trades
- Normal funding confirms trend direction

## Open Interest (OI)

### What is OI?
- Total number of open futures contracts
- Increasing OI: New money entering
- Decreasing OI: Money exiting

### Trading Signals
- **Rising OI + Rising Price**: Strong uptrend
- **Falling OI + Falling Price**: Strong downtrend
- **Rising OI + Falling Price**: Short squeeze potential
- **Falling OI + Rising Price**: Long squeeze potential

### Strategy
- OI confirms trend strength
- Divergence signals potential reversal

## Volatility

### Interpretation
- **High Volatility**: Wide price swings, higher risk
- **Low Volatility**: Tight range, lower risk
- **Expanding Volatility**: Trend acceleration
- **Contracting Volatility**: Potential breakout

### Strategy
- Adjust position size based on volatility
- Use volatility for stop loss placement
- High volatility = wider stops needed

## Best Practices

1. **Combine external data with technical analysis**
2. **Watch for extreme values**
3. **Use funding rate for contrarian signals**
4. **Monitor OI for trend confirmation**
5. **Adjust risk based on volatility**
`,
        },
      ],
    }
  }
)


server.registerResource(
  'candlestick-patterns-guide',
  'geartrade://docs/candlestick-patterns',
  {
    description: 'Complete guide on candlestick patterns: reversal patterns, continuation patterns, and trading strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/candlestick-patterns',
          mimeType: 'text/markdown',
          text: `# Candlestick Patterns Guide

## Overview

Candlestick patterns provide visual signals for potential reversals and continuations. This guide covers major patterns and trading strategies.

## Reversal Patterns

### Bullish Reversal
- **Hammer**: Long lower wick, small body
- **Engulfing**: Bullish candle engulfs previous bearish
- **Morning Star**: Three-candle pattern, bullish reversal
- **Doji**: Indecision, potential reversal

### Bearish Reversal
- **Shooting Star**: Long upper wick, small body
- **Engulfing**: Bearish candle engulfs previous bullish
- **Evening Star**: Three-candle pattern, bearish reversal
- **Doji**: Indecision, potential reversal

## Continuation Patterns

### Bullish Continuation
- **Rising Three Methods**: Consolidation in uptrend
- **Bullish Flag**: Brief pause in uptrend
- **Bullish Pennant**: Tight consolidation

### Bearish Continuation
- **Falling Three Methods**: Consolidation in downtrend
- **Bearish Flag**: Brief pause in downtrend
- **Bearish Pennant**: Tight consolidation

## Trading Strategy

### Pattern Confirmation
1. Identify pattern formation
2. Wait for confirmation candle
3. Enter on confirmation
4. Set stop below/above pattern

### Best Practices
- Combine with support/resistance
- Use volume confirmation
- Higher timeframe patterns are stronger
- Don't trade every pattern

## Common Mistakes

1. ❌ Entering before confirmation
2. ❌ Ignoring volume
3. ❌ Trading in ranging markets
4. ❌ Not setting stop loss
5. ❌ Over-trading on patterns
`,
        },
      ],
    }
  }
)

server.registerResource(
  'fibonacci-trading-guide',
  'geartrade://docs/fibonacci-trading',
  {
    description: 'Complete guide on Fibonacci retracement: key levels, entry/exit strategies, and risk management',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/fibonacci-trading',
          mimeType: 'text/markdown',
          text: `# Fibonacci Trading Guide

## Overview

Fibonacci retracement levels identify potential support/resistance zones. This guide covers key levels and trading strategies.

## Key Fibonacci Levels

### Retracement Levels
- **23.6%**: Shallow retracement
- **38.2%**: Normal retracement
- **50%**: Psychological level
- **61.8%**: Golden ratio (most important)
- **78.6%**: Deep retracement

### Extension Levels
- **127.2%**: First extension
- **161.8%**: Golden ratio extension
- **200%**: Double extension

## Trading Strategy

### In Uptrend
- **Entry**: Buy at 38.2%, 50%, or 61.8% retracement
- **Stop Loss**: Below 78.6% retracement
- **Take Profit**: Above 0% (new highs) or extensions

### In Downtrend
- **Entry**: Sell at 38.2%, 50%, or 61.8% retracement
- **Stop Loss**: Above 78.6% retracement
- **Take Profit**: Below 100% (new lows) or extensions

## Best Practices

1. **Use in trending markets** - Not effective in ranging markets
2. **Combine with other indicators** - RSI, volume, structure
3. **61.8% is most important** - Golden ratio level
4. **Wait for bounce confirmation** - Don't enter blindly
5. **Set stops beyond 78.6%** - Deep retracement invalidates setup
`,
        },
      ],
    }
  }
)

// NEW: Recommended Usage Patterns Resource (Based on MCP_TOOLS_TEST_RESULTS.md)
server.registerResource(
  'usage-patterns-guide',
  'geartrade://docs/usage-patterns',
  {
    description: 'Recommended usage patterns for Day Trading, Swing Trading, Position Trading, and Risk Management',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/usage-patterns',
          mimeType: 'text/markdown',
          text: `# Recommended Usage Patterns

## Overview

This guide covers recommended tool combinations for different trading styles based on the 52 available MCP tools.

---

## Day Trading Pattern

**Focus:** Quick decisions, fast oscillators, order book analysis

### Recommended Tools:

**1. Price & Market Data:**
- \`get_price\` - Current price
- \`get_indicators\` - Core technical indicators
- \`get_volume_analysis\` - Buy/sell pressure

**2. Fast Oscillators:**
- \`stochastic_rsi\` - Overbought/oversold with RSI + Stochastic combination
- \`fisher_transform\` - Sharp reversal signals
- \`momentum\` - Rate of price change
- \`chande_momentum\` - Momentum on both sides (-100 to +100)

**3. Order Book & Liquidity:**
- \`get_orderbook_depth\` - Bid/ask analysis, spread, liquidity scoring
- \`get_liquidation_levels\` - Liquidation clusters, safe entry zones

**4. Quick Confirmation:**
- \`get_market_structure\` - Immediate trend bias
- \`get_candlestick_patterns\` - Reversal signals

### Day Trading Workflow:
\`\`\`
1. get_price → Check current price
2. get_orderbook_depth → Check order book sentiment
3. stochastic_rsi + fisher_transform → Get oscillator signals
4. get_liquidation_levels → Identify safe entry zones
5. calculate_risk_management → Set tight stop (0.5-1%)
6. Execute with low leverage (2-3x)
\`\`\`

### Risk Parameters:
- Risk per trade: 0.5%
- Leverage: 2-3x
- Stop loss: 0.5-1%
- Take profit: 1-2%
- R:R target: 1.5:1 minimum

---

## Swing Trading Pattern

**Focus:** Multi-timeframe alignment, divergence detection, trend following

### Recommended Tools:

**1. Multi-Timeframe Analysis:**
- \`get_Multitimeframe\` - Daily, 4H, 1H trend alignment
- \`get_market_structure\` - Swing highs/lows identification

**2. Trend Indicators:**
- \`trend_indicators\` (supertrend) - ATR-based trend following
- \`elder_ray\` - Bull/bear power (buying/selling pressure)
- \`schaff_trend_cycle\` - MACD + Stochastic with double smoothing
- \`trix\` - Triple EMA rate of change

**3. Divergence & Patterns:**
- \`get_divergence\` - RSI divergence (bullish/bearish)
- \`get_candlestick_patterns\` - Reversal/continuation patterns

**4. Momentum Confirmation:**
- \`get_indicators\` - RSI, MACD, ADX
- \`true_strength_index\` - Double-smoothed momentum
- \`ultimate_oscillator\` - Three-timeframe oscillator

**5. Volume & External:**
- \`get_volume_analysis\` - CVD trend, buy/sell pressure
- \`get_External_data\` - Funding rate, open interest

### Swing Trading Workflow:
\`\`\`
1. get_Multitimeframe → Check trend alignment (Daily/4H/1H)
2. get_divergence → Look for RSI divergence
3. trend_indicators + elder_ray → Confirm trend direction
4. get_volume_analysis → Verify volume supports the move
5. calculate_risk_management → Set stop (2-3%)
6. Execute with moderate leverage (3-5x)
7. Hold for 1 day to 2 weeks
\`\`\`

### Risk Parameters:
- Risk per trade: 1.0%
- Leverage: 3-5x
- Stop loss: 2-3%
- Take profit: 5-15% (multiple TPs)
- R:R target: 2:1 minimum

---

## Position Trading Pattern

**Focus:** Long-term trends, volume profile, adaptive moving averages

### Recommended Tools:

**1. Market Regime:**
- \`get_market_regime\` - Overall market conditions (trending/choppy/volatile)
- \`get_volume_profile\` - POC, VAH, VAL, accumulation/distribution zones

**2. Long-Term Momentum:**
- \`know_sure_thing\` - Multi-timeframe ROC momentum
- \`coppock_curve\` - Major market bottoms, long-term momentum
- \`relative_vigor_index\` - Close vs open momentum

**3. Adaptive Moving Averages:**
- \`hull_ma\` - Smooth trend with reduced lag
- \`kaufman_adaptive_ma\` - Adaptive to market efficiency
- \`mcginley_dynamic\` - Adaptive to market volatility
- \`rainbow_ma\` - Multi-period trend visualization

**4. Volume & Strength:**
- \`get_volume_profile\` - Session and composite profiles
- \`strength_indicators\` (bull_bear_power) - Buying vs selling strength

**5. External Sentiment:**
- \`get_External_data\` - Funding rate trends, open interest
- \`get_long_short_ratio\` - Market sentiment

### Position Trading Workflow:
\`\`\`
1. get_market_regime → Confirm trending market
2. get_volume_profile → Identify accumulation zones
3. know_sure_thing + coppock_curve → Check long-term momentum
4. hull_ma + kaufman_adaptive_ma → Confirm trend direction
5. get_long_short_ratio → Check sentiment extremes
6. calculate_risk_management → Set wide stop (5-10%)
7. Execute with low leverage (1-2x)
8. Hold for 1-6 months
\`\`\`

### Risk Parameters:
- Risk per trade: 2.0%
- Leverage: 1-2x
- Stop loss: 5-10%
- Take profit: 20-100%+ (multiple TPs)
- R:R target: 3:1 minimum

---

## Risk Management Pattern

**Focus:** Comprehensive risk assessment before any trade

### Recommended Tools:

**1. Volatility Assessment:**
- \`volatility_indicators\` (bollinger_band_width) - Volatility measurement
- \`get_indicators\` - ATR (Average True Range)

**2. Liquidation Risk:**
- \`get_liquidation_levels\` - Liquidation clusters
- Safe entry zone identification

**3. Position Sizing:**
- \`calculate_position_setup\` - Optimal position size
- \`calculate_risk_management\` - Stop loss, take profit levels

**4. Market Structure:**
- \`get_market_structure\` - Support/resistance levels

### Risk Management Workflow:
\`\`\`
1. get_price → Current price
2. volatility_indicators → Check volatility level
3. get_liquidation_levels → Identify liquidation risk
4. calculate_position_setup → Calculate position size
5. calculate_risk_management → Set SL/TP levels
6. Assess overall risk: LOW / MEDIUM / HIGH
7. Proceed or wait based on risk assessment
\`\`\`

---

## Tool Categories Summary

| Category | Tools | Best For |
|----------|-------|----------|
| Market Data | 10 | All trading styles |
| Advanced Market Data | 5 | All trading styles |
| Oscillators | 10 | Day trading, swing trading |
| Trend Indicators | 7 | Swing trading, position trading |
| Volume Indicators | 4 | All trading styles |
| Channels & Bands | 3 | Volatility assessment |
| Moving Averages | 8 | Position trading, trend following |
| Specialized | 5 | Pattern recognition |

---

## Quick Reference

### For Scalping/Day Trading:
\`get_price\` → \`stochastic_rsi\` → \`fisher_transform\` → \`get_orderbook_depth\`

### For Swing Trading:
\`get_Multitimeframe\` → \`get_divergence\` → \`schaff_trend_cycle\` → \`get_volume_analysis\`

### For Position Trading:
\`get_market_regime\` → \`know_sure_thing\` → \`coppock_curve\` → \`get_volume_profile\`

### For Risk Management:
\`calculate_position_setup\` → \`calculate_risk_management\` → \`get_liquidation_levels\` → \`volatility_indicators\`
`,
        },
      ],
    }
  }
)

// NEW: AI Memory Analysis Prompt
server.registerPrompt(
  'memory_analysis',
  {
    title: 'AI Memory Analysis',
    description: 'Analyze trading history, preferences, and patterns stored in AI memory',
    argsSchema: {
      query: z.string().optional().describe('Specific query about trading history (e.g., "my BTC performance", "common mistakes")'),
      symbol: z.string().optional().describe('Filter by symbol (e.g., "BTC", "ETH")'),
      type: z.string().optional().describe('Filter by memory type: preference, trade, note, all (default: all)'),
    } as any,
  },
  async (args: any) => {
    const query = args.query || 'trading performance and patterns'
    const symbol = args.symbol ? args.symbol.toUpperCase() : undefined
    const type = args.type || 'all'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze my trading memory${symbol ? ` for ${symbol}` : ''}.

**Step 1: Retrieve All Memories**
Use \`memory_get_all\` to get complete trading history.

**Step 2: Search Specific Query**
Use \`memory_recall\` with query: "${query}"
${symbol ? `Filter results for symbol: ${symbol}` : ''}
${type !== 'all' ? `Filter by type: ${type}` : ''}

**Step 3: Analyze Patterns**
${symbol ? `Use \`memory_check_pattern\` for ${symbol} with common setups` : 'Identify common patterns across all trades'}

**Step 4: Get Insights**
Use \`memory_get_insights\` with query: "${query}"

**Present Analysis:**

1. **Memory Summary**
   - Total memories stored
   - Breakdown by type (preferences, trades, notes)
   - Most recent activity

2. **Trading Performance**
   - Total trades logged
   - Win rate (wins vs losses)
   - Common winning setups
   - Common losing patterns

3. **Preferences Stored**
   - Leverage settings per asset
   - Risk management rules
   - Trading strategies

4. **Key Lessons Learned**
   - Top lessons from winning trades
   - Top lessons from losing trades
   - Areas for improvement

5. **Personalized Recommendations**
   - Based on your history
   - Patterns to repeat
   - Mistakes to avoid

6. **Action Items**
   - Memories to update
   - Outdated info to delete
   - New preferences to save`,
          },
        },
      ],
    }
  }
)

// NEW: Memory-Enhanced Trading Prompt
server.registerPrompt(
  'memory_enhanced_trading',
  {
    title: 'Memory-Enhanced Trading',
    description: 'Execute trades with AI memory context for personalized risk management',
    argsSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH")'),
      side: z.string().describe('Trade direction: LONG or SHORT'),
      capital: z.string().optional().describe('Trading capital in USD (default: uses memory preference or 10000)'),
      testnet: z.string().optional().describe('Use testnet for paper trading: true/false (default: true)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker ? args.ticker.toUpperCase() : 'BTC'
    const side = args.side ? args.side.toUpperCase() : 'LONG'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const testnet = args.testnet !== 'false'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please execute a memory-enhanced ${side} trade for ${ticker}.

**Step 1: Check Memory for Preferences**
Use \`memory_recall\` with query: "leverage ${ticker} risk settings"
- Get preferred leverage for ${ticker}
- Get risk per trade setting
- Get any specific trading rules

**Step 2: Check Historical Performance**
Use \`memory_get_insights\` with query: "${ticker} ${side} trades performance"
- Review past ${side} trades on ${ticker}
- Identify win/loss patterns
- Get lessons from similar setups

**Step 3: Validate Current Setup**
Use \`memory_check_pattern\` with:
- symbol: "${ticker}"
- setup: "current market conditions for ${side}"
- Get historical win rate for similar setups

**Step 4: Technical Analysis**
Use \`get_indicators\` for ${ticker}:
- RSI, MACD, EMA analysis
- Support/resistance levels
- Trend direction

Use \`get_market_structure\` for ${ticker}:
- Market structure analysis
- Swing highs/lows

**Step 5: Calculate Position**
Use \`calculate_position_setup\`:
- ticker: ${ticker}
- capital: ${capital} (or from memory preference)
- Apply memory-based leverage and risk settings

Use \`calculate_risk_management\`:
- Calculate stop loss and take profit
- Based on historical patterns and current volatility

**Step 6: Present Trade Plan**
Show:
- Entry price and reasoning
- Stop loss (based on memory + technicals)
- Take profit (based on historical R:R)
- Position size and leverage
- Pattern confidence from memory
- Risk assessment

**Step 7: Execute Trade (with confirmation)**
${testnet ? `Use \`hyperliquid_testnet_futures_trade\`:
- symbol: ${ticker}
- side: ${side.toLowerCase()}
- Apply calculated position size
- Use memory-based leverage` : `Use \`hyperliquid_mainnet_futures_trade\`:
- symbol: ${ticker}
- side: ${side.toLowerCase()}
- confirmExecution: "true" (REQUIRES USER APPROVAL)`}

**Step 8: Log Trade for Learning**
After execution, use \`memory_log_trade\`:
- Log entry price and reason
- Set appropriate label and categories
- Include technical setup description

Ask user: "Ready to proceed with this ${testnet ? 'TESTNET' : 'MAINNET'} trade? (YES/NO)"`,
          },
        },
      ],
    }
  }
)

// NEW: Complete Tools Reference Resource (60 Tools - Updated with Memory + Position Management)
server.registerResource(
  'complete-tools-reference',
  'geartrade://docs/complete-tools',
  {
    description: 'Complete reference of all 60 MCP tools with parameters and use cases',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/complete-tools',
          mimeType: 'text/markdown',
          text: `# Complete Tools Reference (60 Tools)

## Market Data Tools (10)

| Tool | Description | Parameters |
|------|-------------|------------|
| \`get_price\` | Get latest prices | tickers: string[] |
| \`get_indicators\` | Comprehensive technical indicators | tickers: string[] |
| \`get_market_structure\` | Market structure and swing points | tickers: string[] |
| \`get_volume_analysis\` | Volume profile and buy/sell pressure | tickers: string[] |
| \`get_divergence\` | RSI divergence detection | tickers: string[] |
| \`get_candlestick_patterns\` | Candlestick pattern recognition | tickers: string[] |
| \`get_market_regime\` | Market conditions (trending/choppy) | tickers: string[] |
| \`get_Multitimeframe\` | Multi-timeframe trend alignment | tickers: string[] |
| \`get_liquidation_levels\` | Liquidation clusters and zones | tickers: string[] |
| \`get_long_short_ratio\` | Long/short sentiment | tickers: string[] |

## Advanced Market Data Tools (5)

| Tool | Description | Parameters |
|------|-------------|------------|
| \`get_orderbook_depth\` | Order book depth analysis | tickers: string[] |
| \`get_volume_profile\` | Volume profile (POC, VAH, VAL) | tickers: string[] |
| \`get_External_data\` | Funding rate, open interest | tickers: string[] |
| \`calculate_position_setup\` | Position sizing calculations | ticker, entryPrice, side, capital, riskPct, leverage |
| \`calculate_risk_management\` | Stop loss, take profit, R:R | ticker, entryPrice, side, stopLossPct, takeProfitPct |

## Oscillators (10)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`awesome_oscillator\` | Bill Williams AO | Momentum changes |
| \`accelerator_oscillator\` | AC momentum | Acceleration/deceleration |
| \`fisher_transform\` | Sharp reversal signals | Fisher value, trend |
| \`stochastic_rsi\` | RSI + Stochastic | K, D values, oversold/overbought |
| \`momentum\` | Rate of price change | Momentum value, signal |
| \`chande_momentum\` | CMO (-100 to +100) | CMO value, oversold/overbought |
| \`rate_of_change\` | ROC percentage | ROC %, direction |
| \`percentage_price_oscillator\` | MACD as percentage | PPO %, signal |
| \`detrended_price\` | Cycle identification | DPO, cycle position |
| \`gator_oscillator\` | Alligator divergence | Upper, lower values |

## Trend Indicators (7)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`trend_indicators\` | SuperTrend ATR-based | Trend direction, ATR bands |
| \`elder_ray\` | Bull/Bear power | Bull power, bear power |
| \`know_sure_thing\` | Multi-timeframe ROC | KST value, momentum |
| \`trix\` | Triple EMA ROC | TRIX %, trend |
| \`ultimate_oscillator\` | Three-timeframe | UO value, oversold/overbought |
| \`true_strength_index\` | Double-smoothed momentum | TSI value, direction |
| \`schaff_trend_cycle\` | MACD + Stochastic | STC value, buy/sell signal |

## Volume Indicators (4)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`volume_indicators\` | Chaikin Money Flow | CMF, accumulation/distribution |
| \`relative_vigor_index\` | Close vs open momentum | RVI value, trend |
| \`coppock_curve\` | Long-term momentum | Coppock value, phase |
| \`strength_indicators\` | Bull/Bear power | Bull/bear strength |

## Channels & Bands (3)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`channels\` | Keltner Channels | Middle, upper, lower |
| \`volatility_indicators\` | Bollinger Band Width | Width, squeeze status |
| \`ma_envelope\` | MA with envelope | MA, upper, lower |

## Moving Averages (8)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`double_ema\` | DEMA reduced lag | DEMA value |
| \`triple_ema\` | TEMA further reduced lag | TEMA value |
| \`hull_ma\` | HMA smooth trend | HMA value |
| \`weighted_ma\` | WMA recent weighted | WMA value |
| \`smoothed_ma\` | SMMA smooth | SMMA value |
| \`vwma\` | Volume-weighted MA | VWMA, efficiency |
| \`kaufman_adaptive_ma\` | KAMA adaptive | KAMA, efficiency ratio |
| \`mcginley_dynamic\` | McGinley adaptive | McGinley value, trend |

## Specialized (5)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`rainbow_ma\` | Multi-period MAs | Multiple MA values, alignment |
| \`pivot_points\` | Standard pivots | Pivot, R1-R3, S1-S3 |
| \`patterns\` | Fractals, ZigZag, COC | Pattern detection |

---

## Common Parameters

### For Ticker-Based Tools:
- \`tickers\`: Array of strings (e.g., ["BTC", "ETH", "SOL"])

### For Calculation Tools:
- \`ticker\`: Single string (e.g., "BTC")
- \`entryPrice\`: Number (entry price)
- \`side\`: "LONG" or "SHORT"
- \`capital\`: Number (trading capital in USD)
- \`riskPct\`: Number (risk percentage, e.g., 1.0)
- \`leverage\`: Number (leverage multiplier, e.g., 5)

### For Indicator Tools:
- \`period\`: Number (indicator period, e.g., 14)
- \`prices\`: Array of numbers (price data)
- \`highs\`: Array of numbers (high prices)
- \`lows\`: Array of numbers (low prices)
- \`volumes\`: Array of numbers (volume data)

## AI Memory Tools (8) - NEW

| Tool | Description | Parameters |
|------|-------------|------------|
| \`memory_save_preference\` | Save trading preferences | preference, label?, categories? |
| \`memory_log_trade\` | Log completed trades | symbol, side, entryPrice, exitPrice, pnlPercent, result, reason, lesson?, label?, categories? |
| \`memory_get_insights\` | Get personalized insights | query |
| \`memory_check_pattern\` | Check pattern history | symbol, setup |
| \`memory_remember\` | Store notes/observations | content, label?, categories?, tags? |
| \`memory_recall\` | Search memories | query, limit? |
| \`memory_get_all\` | Get all memories | (none) |
| \`memory_delete\` | Delete specific memory | memoryId |

### Memory Tools Use Cases:
- **Preferences**: Store leverage, risk settings, trading rules
- **Trade Journal**: Log all trades with entry/exit reasons and lessons
- **Pattern Learning**: AI learns from your winning and losing patterns
- **Key Levels**: Remember support/resistance and market observations
- **Personalized Insights**: Get recommendations based on your history

### Memory Metadata Fields:
- \`label\`: Categorize memories (e.g., "leverage", "support", "scalp")
- \`categories\`: Group memories (e.g., "risk-management", "technical-analysis")
- \`tags\`: Additional tags for filtering

## Position Management & Sentiment Tools (2) - NEW

| Tool | Description | Parameters |
|------|-------------|------------|
| \`close_position\` | Close/reduce Hyperliquid positions | symbol, percentage?, isTestnet?, confirmMainnet? |
| \`get_market_sentiment\` | Fear & Greed + BTC Dominance + Funding | includeFearGreed?, includeBtcDominance?, includeFundingSummary? |

### close_position
Close or reduce existing positions on Hyperliquid (testnet/mainnet).

**Parameters:**
- \`symbol\` (required): Asset symbol (e.g., "BTC", "ETH")
- \`percentage\` (optional): 1-100%, default 100 for full close
- \`isTestnet\` (optional): true (default) or false for mainnet
- \`confirmMainnet\` (required for mainnet): Must be true to execute on mainnet

### get_market_sentiment
Get comprehensive market sentiment from FREE APIs.

**Output:**
- Fear & Greed Index (0-100, from alternative.me)
- BTC Dominance (%, from CoinGecko)
- Funding Rate Summary (from Hyperliquid)
- Overall sentiment score with trading recommendation
`,
        },
      ],
    }
  }
)

// NEW: AI Memory Tools Guide Resource
server.registerResource(
  'memory-tools-guide',
  'geartrade://docs/memory-tools',
  {
    description: 'Complete guide to AI Memory tools for personalized trading',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/memory-tools',
          mimeType: 'text/markdown',
          text: `# AI Memory Tools Guide

## Overview
GearTrade includes 8 AI Memory tools powered by Mem0 for personalized trading assistance. The AI learns from your preferences, trades, and observations to provide better recommendations over time.

## Memory Tools (8)

### 1. memory_save_preference
Save trading preferences that the AI will remember.

**Parameters:**
- \`preference\` (required): What to remember
- \`label\` (optional): Category label (e.g., "leverage", "risk")
- \`categories\` (optional): Group category (e.g., "risk-management")

**Example:**
\`\`\`
preference: "Default leverage for BTC is 5x, for altcoins use 3x"
label: "leverage"
categories: "risk-management"
\`\`\`

### 2. memory_log_trade
Log completed trades for pattern learning.

**Parameters:**
- \`symbol\` (required): Asset symbol (BTC, ETH, SOL)
- \`side\` (required): LONG or SHORT
- \`entryPrice\` (required): Entry price
- \`exitPrice\` (required): Exit price
- \`pnlPercent\` (required): PnL percentage
- \`result\` (required): win, loss, or breakeven
- \`reason\` (required): Entry/exit reason
- \`lesson\` (optional): Lesson learned
- \`label\` (optional): Trade type (scalp, swing, position)
- \`categories\` (optional): Strategy category

**Example:**
\`\`\`
symbol: "BTC"
side: "LONG"
entryPrice: 95000
exitPrice: 97500
pnlPercent: 2.63
result: "win"
reason: "RSI oversold at support, took profit at resistance"
lesson: "Support levels are reliable for BTC entries"
label: "swing"
categories: "momentum"
\`\`\`

### 3. memory_get_insights
Get personalized insights based on your history.

**Parameters:**
- \`query\` (required): What insight you want

**Example Queries:**
- "my BTC trading performance"
- "common mistakes I make"
- "best setups for SOL"
- "lessons from losing trades"

### 4. memory_check_pattern
Check if current setup matches historical patterns.

**Parameters:**
- \`symbol\` (required): Asset symbol
- \`setup\` (required): Current setup description

**Example:**
\`\`\`
symbol: "ETH"
setup: "RSI oversold with bullish divergence at support"
\`\`\`

**Returns:** Win rate, similar trades, recommendation

### 5. memory_remember
Store any important note or observation.

**Parameters:**
- \`content\` (required): What to remember
- \`label\` (optional): Category label
- \`categories\` (optional): Group category
- \`tags\` (optional): Array of tags

**Example:**
\`\`\`
content: "BTC has strong support at 94000"
label: "support"
categories: "technical-analysis"
\`\`\`

### 6. memory_recall
Search and retrieve stored memories.

**Parameters:**
- \`query\` (required): Search query
- \`limit\` (optional): Max results (default: 5)

**Example Queries:**
- "leverage settings"
- "BTC support levels"
- "trading rules"

### 7. memory_get_all
Get all stored memories for review.

**Parameters:** None

### 8. memory_delete
Delete a specific memory by ID.

**Parameters:**
- \`memoryId\` (required): Memory ID to delete

---

## Best Practices

### Organizing Memories with Labels & Categories

**Labels (specific):**
- \`leverage\` - Leverage settings
- \`risk\` - Risk management rules
- \`support\` - Support levels
- \`resistance\` - Resistance levels
- \`scalp\` - Scalp trades
- \`swing\` - Swing trades
- \`position\` - Position trades

**Categories (broad):**
- \`risk-management\` - All risk-related
- \`technical-analysis\` - TA observations
- \`position-sizing\` - Size calculations
- \`momentum\` - Momentum strategies
- \`reversal\` - Reversal patterns
- \`breakout\` - Breakout trades

### Workflow Integration

**Before Trading:**
1. \`memory_recall\` - Check preferences for the asset
2. \`memory_check_pattern\` - Validate current setup
3. \`memory_get_insights\` - Review past performance

**After Trading:**
1. \`memory_log_trade\` - Log the trade with full context
2. Include lesson learned for future reference

**Regular Maintenance:**
1. \`memory_get_all\` - Review all memories
2. \`memory_delete\` - Remove outdated information
`,
        },
      ],
    }
  }
)

}

export default registerPrompts
