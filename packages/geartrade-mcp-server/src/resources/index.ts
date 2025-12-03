/**
 * MCP Resources Registry
 * Extracted from index.ts for better modularity
 */

/**
 * Register all resources to the server
 */
export function registerResources(server: any) {
server.registerResource(
  'trading-strategies',
  'geartrade://docs/trading-strategies',
  {
    description: 'Comprehensive guide on trading strategies, technical analysis, and best practices for using GearTrade MCP Server',
    mimeType: 'text/markdown',
  },
  async () => {

    return {
      contents: [
        {
          uri: 'geartrade://docs/trading-strategies',
          mimeType: 'text/markdown',
          text: `# Trading Strategies Guide

## Overview

GearTrade MCP Server provides comprehensive tools for crypto trading analysis and execution. This guide covers effective trading strategies using the available tools.

## Recommended Workflow

### 1. Comprehensive Analysis
Start with systematic data gathering using specialized tools:

**Price & Market Data:**
- \`get_price\` - Current price, 24h change, market cap
- \`get_volume_analysis\` - Volume patterns, buy/sell pressure
- \`get_External_data\` - Funding rates, open interest, market sentiment

**Technical Analysis:**
- \`get_indicators\` - RSI, MACD, moving averages, momentum
- \`get_market_structure\` - Trend bias, support/resistance
- \`get_candlestick_patterns\` - Chart patterns, reversal signals
- \`get_fibonacci\` - Fibonacci retracements, golden ratio levels

### 2. Signal Identification
Look for high-confidence signals:
- **BUY Signals**: RSI oversold (<30), bullish divergence, support bounce, positive CVD trend
- **SELL Signals**: RSI overbought (>70), bearish divergence, resistance rejection, negative CVD trend
- **Multi-timeframe alignment**: Daily, 4H, and 1H all trending in same direction = higher confidence

### 3. Risk Management
Before execution, calculate:
- Position size based on capital and risk percentage
- Stop loss level (typically 1-3% from entry)
- Take profit level (aim for 2:1 or 3:1 risk/reward ratio)
- Maximum leverage (consider volatility and market conditions)

### 4. Execution
- Always test on TESTNET first using \`hyperliquid_testnet_futures_trade\`
- Get user confirmation before live execution
- Monitor positions after execution using \`get_position\`

## Technical Analysis Strategies

### Trend Following
1. Use \`get_Multitimeframe\` to identify trend alignment
2. Enter on pullbacks to support (for uptrends) or resistance (for downtrends)
3. Use Fibonacci retracement levels from \`get_fibonacci\` for entry zones
4. Confirm with volume analysis showing accumulation/distribution

### Mean Reversion
1. Identify overbought/oversold conditions using RSI from \`get_indicators\`
2. Look for divergence signals from \`get_divergence\`
3. Check order book depth for support/resistance zones
4. Enter when price reaches extreme levels with reversal candlestick patterns

### Breakout Trading
1. Identify consolidation zones using \`get_volume_profile\` (HVN/LVN)
2. Monitor order book depth for liquidity clusters
3. Wait for volume confirmation on breakout
4. Use liquidation levels to identify potential stop hunt zones

## Volume-Based Strategies

### CVD (Cumulative Volume Delta) Trading
- Positive CVD trend = buying pressure = bullish
- Negative CVD trend = selling pressure = bearish
- Use \`get_volume_analysis\` to track CVD trends
- Enter when CVD diverges from price (early signal)

### Volume Profile Trading
- POC (Point of Control) = high volume price level = strong support/resistance
- VAH/VAL = value area boundaries
- Trade from HVN to LVN (high volume to low volume)
- Use \`get_volume_profile\` for session and composite profiles

## Risk Management Best Practices

1. **Never risk more than 1-2% of capital per trade**
2. **Always set stop loss** - use \`calculate_risk_management\` tool
3. **Use position sizing** - use \`calculate_position_setup\` tool
4. **Monitor MAE (Maximum Adverse Excursion)** - track with \`get_position\`
5. **Diversify** - don't put all capital in one trade
6. **Respect leverage limits** - higher leverage = higher risk

## Advanced Analysis Tools

### Fibonacci Retracement
- Use swing highs/lows to identify key retracement levels
- 38.2%, 50%, 61.8% are common support/resistance zones
- Combine with volume profile for confirmation

### Order Book Depth
- Monitor bid/ask imbalance for short-term direction
- Large orders at specific levels = support/resistance
- Spread analysis indicates market liquidity

### Liquidation Levels
- Identify where stop losses are clustered
- Price often moves to liquidate positions before reversing
- Use safe entry zones to avoid stop hunts

### Long/Short Ratio
- Extreme ratios (>70% long or short) = contrarian signal
- Divergence between ratio and price = reversal potential
- Monitor sentiment shifts

## Execution Safety

1. **Always test with paper trading first**
2. **Get explicit user confirmation** before live execution
3. **Start with small position sizes**
4. **Monitor positions actively** after execution
5. **Use multiple timeframes** for confirmation
6. **Respect market conditions** - avoid trading during high volatility or low liquidity

## Common Mistakes to Avoid

1. ❌ Trading without stop loss
2. ❌ Over-leveraging (using too high leverage)
3. ❌ Ignoring volume analysis
4. ❌ Trading against the trend
5. ❌ Not waiting for confirmation signals
6. ❌ Emotional trading (FOMO, revenge trading)
7. ❌ Ignoring risk/reward ratios
8. ❌ Not monitoring open positions

## Tools Quick Reference (58 Tools)

### Market Data Tools
- **Price**: \`get_price\`
- **Technical Analysis**: \`get_indicators\`
- **Volume**: \`get_volume_analysis\`, \`get_volume_profile\`
- **Multi-timeframe**: \`get_Multitimeframe\`
- **Market Analysis**: \`get_market_structure\`, \`get_market_regime\`, \`get_candlestick_patterns\`, \`get_divergence\`
- **External Data**: \`get_External_data\`, \`get_orderbook_depth\`, \`get_liquidation_levels\`, \`get_long_short_ratio\`

### Position & Risk Tools
- **Position**: \`get_position\`, \`get_whale_position\`, \`get_tier_classification\`
- **Risk**: \`calculate_risk_management\`, \`calculate_position_setup\`
- **Correlation**: \`get_correlation_analysis\`

### Execution Tools
- **Testnet**: \`hyperliquid_testnet_futures_trade\`
- **Mainnet**: \`hyperliquid_mainnet_futures_trade\`

### Technical Indicator Tools (32)
- **Moving Averages**: \`double_ema\`, \`triple_ema\`, \`hull_ma\`, \`weighted_ma\`, \`smoothed_ma\`, \`vwma\`, \`kaufman_adaptive_ma\`, \`mcginley_dynamic\`, \`rainbow_ma\`, \`ma_envelope\`
- **Oscillators**: \`stochastic_rsi\`, \`chande_momentum\`, \`percentage_price_oscillator\`, \`accelerator_oscillator\`, \`awesome_oscillator\`, \`gator_oscillator\`, \`elder_ray\`, \`fisher_transform\`, \`know_sure_thing\`, \`schaff_trend_cycle\`, \`coppock_curve\`, \`true_strength_index\`, \`relative_vigor_index\`, \`detrended_price\`, \`momentum\`, \`rate_of_change\`, \`ultimate_oscillator\`, \`trix\`
- **Volume**: \`volume_indicators\`
- **Volatility**: \`volatility_indicators\`
- **Channels**: \`channels\`
- **Pivots**: \`pivot_points\`
- **Trend**: \`trend_indicators\`
- **Patterns**: \`patterns\`
- **Strength**: \`strength_indicators\`

### AI Memory Tools (8) - NEW
- **Preferences**: \`memory_save_preference\`
- **Trade Journal**: \`memory_log_trade\`
- **Insights**: \`memory_get_insights\`, \`memory_check_pattern\`
- **Notes**: \`memory_remember\`, \`memory_recall\`
- **Management**: \`memory_get_all\`, \`memory_delete\`
`,
        },
      ],
    }
  }
)

server.registerResource(
  'risk-management',
  'geartrade://docs/risk-management',
  {
    description: 'Guide on risk management, position sizing, stop loss, and take profit strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/risk-management',
          mimeType: 'text/markdown',
          text: `# Risk Management Guide

## Overview

Proper risk management is essential for successful trading. This guide covers position sizing, stop loss, take profit, and leverage management using GearTrade MCP Server tools.

## Position Sizing

### Basic Principles
- **Risk per trade**: Never risk more than 1-2% of total capital per trade
- **Position size calculation**: Use \`calculate_position_setup\` tool
- **Capital allocation**: Reserve 20-30% of capital for margin requirements

### Position Sizing Formula
\`\`\`
Position Size = (Capital × Risk %) / (Entry Price - Stop Loss Price)
\`\`\`

### Example
- Capital: $10,000
- Risk: 1% = $100
- Entry: $50,000
- Stop Loss: $49,000 (2% below entry)
- Position Size: $100 / $1,000 = 0.1 BTC

## Stop Loss Strategies

### Fixed Percentage Stop Loss
- Conservative: 1-2% from entry
- Moderate: 2-3% from entry
- Aggressive: 3-5% from entry

### Technical Stop Loss
- Below support level (for longs)
- Above resistance level (for shorts)
- Below/above key Fibonacci levels
- Below/above volume profile POC

### ATR-Based Stop Loss
- Use ATR (Average True Range) from technical indicators
- Stop Loss = Entry ± (2 × ATR) for volatility-adjusted stops

### Using calculate_risk_management Tool
The \`calculate_risk_management\` tool automatically calculates:
- Optimal stop loss level
- Take profit level
- Risk/reward ratio
- Position risk percentage

## Take Profit Strategies

### Risk/Reward Ratio
- **Minimum**: 1:1 (break-even after fees)
- **Recommended**: 2:1 or 3:1
- **Aggressive**: 4:1 or higher

### Multiple Take Profit Levels
1. **TP1**: 1:1 risk/reward (secure partial profit)
2. **TP2**: 2:1 risk/reward (let winners run)
3. **TP3**: 3:1 risk/reward (trailing stop)

### Technical Take Profit
- At resistance level (for longs)
- At support level (for shorts)
- At Fibonacci extension levels
- At volume profile VAH/VAL

## Leverage Management

### Leverage Guidelines
- **Conservative**: 1x-3x leverage
- **Moderate**: 3x-5x leverage
- **Aggressive**: 5x-10x leverage
- **Maximum**: Never exceed 10x for most traders

### Leverage Calculation
Use \`calculate_position_setup\` tool to determine:
- Required margin
- Maximum leverage based on capital
- Position quantity with leverage

### Dynamic Leverage
- **High volatility**: Reduce leverage (1x-3x)
- **Low volatility**: Can use higher leverage (3x-5x)
- **Trending markets**: Moderate leverage (3x-5x)
- **Ranging markets**: Lower leverage (1x-3x)

## Margin Management

### Margin Requirements
- **Initial Margin**: Required to open position
- **Maintenance Margin**: Required to keep position open
- **Liquidation Price**: Price where position gets liquidated

### Margin Safety
- Always maintain 20-30% buffer above maintenance margin
- Monitor margin ratio using \`get_position\` tool
- Reduce position size if margin ratio drops below 150%

## Maximum Adverse Excursion (MAE)

### What is MAE?
MAE measures the maximum unfavorable price movement after entry, even if the trade eventually becomes profitable.

### Using MAE
- Track MAE with \`get_position\` tool
- High MAE = poor entry timing
- Low MAE = good entry timing
- Use MAE to refine entry strategies

### MAE Analysis
- **MAE < Stop Loss**: Good entry, trade went as planned
- **MAE > Stop Loss but trade profitable**: Entry could be improved
- **MAE > Stop Loss and trade lost**: Entry was poor, review strategy

## Risk/Reward Ratio

### Calculation
\`\`\`
Risk/Reward Ratio = (Take Profit - Entry) / (Entry - Stop Loss)
\`\`\`

### Guidelines
- **Minimum**: 1:1 (break-even after fees)
- **Good**: 2:1 (profitable long-term)
- **Excellent**: 3:1 or higher

### Using calculate_risk_management
The tool automatically calculates optimal risk/reward ratios based on:
- Entry price
- Support/resistance levels
- Volatility (ATR)
- Market structure

## Portfolio Risk Management

### Capital Allocation
- **Per trade risk**: 1-2% of total capital
- **Total open positions**: Maximum 5-10 positions
- **Maximum portfolio risk**: 10-20% of total capital

### Diversification
- Don't put all capital in one asset
- Spread risk across different cryptocurrencies
- Consider correlation between assets

### Correlation Risk
- BTC and ETH are highly correlated
- Altcoins often follow BTC
- Diversify across different market segments

## Position Monitoring

### Active Monitoring
- Use \`get_position\` to track:
  - Unrealized PnL
  - MAE (Maximum Adverse Excursion)
  - Current price vs entry
  - Distance to stop loss/take profit

### Position Adjustments
- **Trailing Stop**: Move stop loss to breakeven after TP1 hit
- **Partial Close**: Close 50% at TP1, let rest run to TP2
- **Add to Position**: Only if original trade is profitable

## Common Risk Management Mistakes

1. ❌ **No stop loss**: Always set stop loss
2. ❌ **Too wide stop loss**: Defeats purpose of risk management
3. ❌ **Too tight stop loss**: Gets stopped out by noise
4. ❌ **Over-leveraging**: Using too high leverage
5. ❌ **Averaging down**: Adding to losing positions
6. ❌ **Ignoring MAE**: Not learning from trade analysis
7. ❌ **Emotional exits**: Closing positions based on fear/greed
8. ❌ **No position sizing**: Trading without calculating position size

## Tools for Risk Management

- **\`calculate_position_setup\`**: Calculate position size, leverage, margin
- **\`calculate_risk_management\`**: Calculate stop loss, take profit, risk/reward
- **\`get_position\`**: Monitor open positions, PnL, MAE
- **\`get_indicators\`**: Get ATR for volatility-based stops
- **\`get_market_structure\`**: Identify support/resistance for stop placement
- **\`memory_save_preference\`**: Save your risk settings for AI to remember
- **\`memory_log_trade\`**: Log trades with lessons for pattern learning

## Best Practices

1. ✅ Always calculate position size before trading
2. ✅ Always set stop loss (use calculate_risk_management)
3. ✅ Aim for minimum 2:1 risk/reward ratio
4. ✅ Monitor positions actively
5. ✅ Review MAE after each trade
6. ✅ Adjust leverage based on volatility
7. ✅ Maintain margin buffer
8. ✅ Diversify across assets
9. ✅ Never risk more than 2% per trade
10. ✅ Keep detailed trade journal
`,
        },
      ],
    }
  }
)

server.registerResource(
  'tools-overview',
  'geartrade://docs/tools-overview',
  {
    description: 'Complete overview of all 58 MCP tools available in GearTrade',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/tools-overview',
          mimeType: 'text/markdown',
          text: `# Tools Overview

## Complete List of 58 MCP Tools

### Market Data Tools (18)
- **\`get_price\`**: Get latest prices for multiple tickers
- **\`get_indicators\`**: Comprehensive technical indicators (RSI, EMA, MACD, Bollinger Bands, ATR, ADX, etc.)
- **\`get_volume_analysis\`**: Buy/sell volume, POC, VAH/VAL, HVN/LVN, CVD, liquidity zones
- **\`get_volume_profile\`**: Volume profile analysis (POC, VAH, VAL)
- **\`get_Multitimeframe\`**: Multi-timeframe trend alignment analysis
- **\`get_market_structure\`**: Market structure and swing points
- **\`get_market_regime\`**: Market conditions (trending/choppy/volatile)
- **\`get_candlestick_patterns\`**: Candlestick pattern recognition
- **\`get_divergence\`**: RSI divergence detection
- **\`get_External_data\`**: Funding rates, open interest, liquidations
- **\`get_orderbook_depth\`**: Order book depth analysis
- **\`get_liquidation_levels\`**: Liquidation clusters and zones
- **\`get_long_short_ratio\`**: Long/short sentiment with whale data
- **\`get_position\`**: Current positions, balance, PnL
- **\`get_whale_position\`**: Track whale wallet positions
- **\`get_tier_classification\`**: Market breakdown by trader tier
- **\`get_correlation_analysis\`**: BTC dominance, altcoin correlation
- **\`calculate_risk_management\`**: Stop loss, take profit, R:R calculation
- **\`calculate_position_setup\`**: Position sizing calculations
### Execution Tools (2)
- **\`hyperliquid_testnet_futures_trade\`**: Execute futures trades on Hyperliquid TESTNET
- **\`hyperliquid_mainnet_futures_trade\`**: Execute REAL futures trades on Hyperliquid MAINNET

### Technical Indicator Tools (32)

#### Moving Averages (10)
- **\`double_ema\`**: Double Exponential Moving Average - reduced lag
- **\`triple_ema\`**: Triple Exponential Moving Average - smooth trend
- **\`hull_ma\`**: Hull Moving Average - smooth trend identification
- **\`weighted_ma\`**: Weighted Moving Average - recent price weighted
- **\`smoothed_ma\`**: Smoothed Moving Average - reduced noise
- **\`vwma\`**: Volume Weighted Moving Average
- **\`kaufman_adaptive_ma\`**: Kaufman Adaptive MA - adjusts to volatility
- **\`mcginley_dynamic\`**: McGinley Dynamic - adaptive to market
- **\`rainbow_ma\`**: Multiple MAs for trend visualization
- **\`ma_envelope\`**: Moving Average Envelope bands

#### Oscillators (18)
- **\`stochastic_rsi\`**: RSI + Stochastic for overbought/oversold
- **\`chande_momentum\`**: Chande Momentum Oscillator (-100 to +100)
- **\`percentage_price_oscillator\`**: MACD as percentage
- **\`accelerator_oscillator\`**: Momentum acceleration
- **\`awesome_oscillator\`**: Bill Williams AO
- **\`gator_oscillator\`**: Alligator divergence
- **\`elder_ray\`**: Bull/Bear power
- **\`fisher_transform\`**: Sharp reversal signals
- **\`know_sure_thing\`**: Multi-timeframe ROC
- **\`schaff_trend_cycle\`**: MACD + Stochastic
- **\`coppock_curve\`**: Long-term momentum
- **\`true_strength_index\`**: Double-smoothed momentum
- **\`relative_vigor_index\`**: Close vs open momentum
- **\`detrended_price\`**: Cycle identification
- **\`momentum\`**: Rate of price change
- **\`rate_of_change\`**: ROC percentage
- **\`ultimate_oscillator\`**: Three-timeframe oscillator
- **\`trix\`**: Triple EMA ROC

#### Other Indicators (4)
- **\`volume_indicators\`**: CMF, Chaikin Oscillator, PVT, VZO, MFI
- **\`volatility_indicators\`**: BB Width, %B, Chaikin Volatility, HV, Mass Index
- **\`channels\`**: Keltner Channels, Donchian Channels
- **\`pivot_points\`**: Standard, Camarilla, Fibonacci pivots
- **\`trend_indicators\`**: SuperTrend, Alligator, Ichimoku, Vortex
- **\`patterns\`**: Fractals, ZigZag, Change of Character
- **\`strength_indicators\`**: Bull/Bear Power, Force Index, COG, BOP

### AI Memory Tools (8) - NEW
- **\`memory_save_preference\`**: Save trading preferences (leverage, risk, rules)
- **\`memory_log_trade\`**: Log completed trades for pattern learning
- **\`memory_get_insights\`**: Get personalized insights from history
- **\`memory_check_pattern\`**: Check if setup matches winning patterns
- **\`memory_remember\`**: Store notes, levels, observations
- **\`memory_recall\`**: Search and retrieve memories
- **\`memory_get_all\`**: Get all stored memories
- **\`memory_delete\`**: Delete specific memory by ID

## Tool Categories

### Analysis Tools
Market data and technical analysis without executing trades.

### Execution Tools
Execute trades on Hyperliquid (testnet or mainnet).

### Risk Management Tools
Position sizing, stop loss, take profit calculations.

### AI Memory Tools
Personalized AI that learns from your trading history.

## Usage Patterns

### Single Asset Analysis
\`\`\`
1. get_price → get_indicators → get_volume_analysis → get_Multitimeframe
2. Add: get_market_structure, get_divergence, get_External_data
\`\`\`

### Multiple Asset Scan
\`\`\`
get_price(["BTC", "ETH", "SOL"]) → get_indicators(["BTC", "ETH", "SOL"])
\`\`\`

### Execution Workflow
\`\`\`
1. memory_recall (check preferences)
2. get_indicators + get_market_structure (analysis)
3. memory_check_pattern (validate setup)
4. calculate_position_setup (position sizing)
5. calculate_risk_management (stop loss/take profit)
6. hyperliquid_testnet_futures_trade (test first)
7. hyperliquid_mainnet_futures_trade (live with confirmation)
8. memory_log_trade (log for learning)
\`\`\`

### Memory-Enhanced Trading
\`\`\`
1. memory_save_preference - Set your trading rules
2. memory_remember - Store key levels and observations
3. memory_check_pattern - Validate setups before trading
4. memory_log_trade - Log all trades with lessons
5. memory_get_insights - Review performance and patterns
\`\`\`

## Best Practices

1. Always test on TESTNET before MAINNET
2. Get user confirmation before live trades
3. Use memory tools to build personalized AI
4. Log all trades for pattern learning
5. Monitor positions after execution
6. Use risk management tools before execution
`,
        },
      ],
    }
  }
)

server.registerResource(
  'execution-workflow',
  'geartrade://docs/execution-workflow',
  {
    description: 'Step-by-step guide for analysis to execution workflow with safety best practices',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/execution-workflow',
          mimeType: 'text/markdown',
          text: `# Execution Workflow Guide

## Overview

This guide covers the complete workflow from market analysis to order execution using GearTrade MCP Server. Always follow safety best practices.

## Step-by-Step Workflow

### Step 1: Comprehensive Analysis

Gather data systematically using specialized tools:

#### 1.1 Price & Market Data
\`\`\`json
{
  "name": "get_price",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.2 Technical Indicators
\`\`\`json
{
  "name": "get_indicators",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.3 Volume Analysis
\`\`\`json
{
  "name": "get_volume_analysis",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.4 Market Structure
\`\`\`json
{
  "name": "get_market_structure",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.5 External Data
\`\`\`json
{
  "name": "get_External_data",
  "arguments": {
    "tickers": ["BTC"]
  }
}
\`\`\`

#### 1.6 Check Memory (AI Personalization)
\`\`\`json
{
  "name": "memory_recall",
  "arguments": {
    "query": "BTC leverage settings"
  }
}
\`\`\`

**Combined Analysis Output:**
- **get_price**: Current price, 24h change
- **get_indicators**: RSI, MACD, moving averages, momentum
- **get_volume_analysis**: Volume patterns, buy/sell pressure, CVD
- **get_market_structure**: Trend bias, support/resistance
- **get_External_data**: Funding rates, open interest, liquidations
- **memory_recall**: User's saved preferences and rules

### Step 2: Signal Identification

Analyze the comprehensive data to identify:
- **Signal**: BUY, SELL, or HOLD
- **Confidence**: Based on multiple confirmations
- **Entry Level**: Optimal entry price
- **Stop Loss**: Risk level
- **Take Profit**: Profit target

**Key Indicators:**
- RSI: Oversold (<30) = BUY, Overbought (>70) = SELL
- Trend Alignment: All timeframes aligned = higher confidence
- Volume: Positive CVD = bullish, Negative CVD = bearish
- Divergence: Bullish divergence = BUY signal, Bearish = SELL
- Market Structure: COC (Change of Character) = potential reversal

### Step 3: Present Analysis to User

**Always present clear summary:**
\`\`\`
📊 Analysis Summary for BTC

Current Price: $86,804
Signal: SELL
Confidence: 73.86%

Entry: $86,804
Stop Loss: $88,338 (1.77% risk)
Take Profit: $82,003 (5.53% reward)
Risk/Reward: 3.12:1

Position Size: 0.1 BTC
Leverage: 5x
Margin Required: $1,736

Technical Indicators:
- RSI(14): 68.5 (Overbought)
- Trend: Bearish (Daily, 4H, 1H aligned)
- Volume: Negative CVD trend
- Divergence: Bearish divergence detected

⚠️ Risk: Medium
\`\`\`

### Step 4: Request User Confirmation

**Always ask for explicit confirmation:**
\`\`\`
Berdasarkan analisis, sinyal SELL dengan confidence 73.86%.
Entry: $86,804, Stop Loss: $88,338, Take Profit: $82,003.
Risk/Reward: 3.12:1

Mau dieksekusi ke Hyperliquid? (YES/NO)
\`\`\`

**Never execute without user approval!**

### Step 5: Testnet First (Recommended)

Test execution on Hyperliquid TESTNET first:

\`\`\`json
{
  "name": "hyperliquid_testnet_futures_trade",
  "arguments": {
    "symbol": "BTC",
    "side": "sell",
    "sizeInUsd": 100,
    "orderMode": "market",
    "leverage": "5"
  }
}
\`\`\`

**Testnet benefits:**
- No real money at risk
- Test execution logic
- Verify position sizing
- Check order modes (market/limit/custom)

### Step 6: Mainnet Execution (If User Confirms)

Only execute on MAINNET if user explicitly confirms:

\`\`\`json
{
  "name": "hyperliquid_mainnet_futures_trade",
  "arguments": {
    "symbol": "BTC",
    "side": "sell",
    "sizeInUsd": 100,
    "orderMode": "market",
    "leverage": "5",
    "confirmExecution": "true"
  }
}
\`\`\`

**Safety checks:**
- ✅ User confirmed execution
- ✅ Testnet trading tested
- ✅ Position size calculated
- ✅ Stop loss/take profit planned
- ✅ Risk within limits (1-2% of capital)
- ✅ confirmExecution set to "true"

### Step 7: Position Monitoring

After execution, monitor the position:

\`\`\`json
{
  "name": "get_position",
  "arguments": {
    "walletAddress": "your_wallet_address"
  }
}
\`\`\`

**Monitor:**
- Unrealized PnL
- Current price vs entry
- Liquidation price
- Account equity and margin

### Step 8: Log Trade for AI Learning

After closing position, log the trade:

\`\`\`json
{
  "name": "memory_log_trade",
  "arguments": {
    "symbol": "BTC",
    "side": "SHORT",
    "entryPrice": 86804,
    "exitPrice": 82003,
    "pnlPercent": 5.53,
    "result": "win",
    "reason": "Bearish divergence at resistance, RSI overbought",
    "lesson": "Divergence + overbought RSI is reliable for shorts",
    "label": "swing",
    "categories": "reversal"
  }
}
\`\`\`

**Benefits of logging:**
- AI learns from your winning patterns
- Identifies common mistakes
- Provides personalized insights
- Improves future recommendations

## Multiple Asset Analysis

For multiple assets, use array parameters:

\`\`\`json
{
  "name": "get_indicators",
  "arguments": {
    "tickers": ["BTC", "ETH", "SOL"]
  }
}
\`\`\`

**Note:** Always test on TESTNET before MAINNET execution.

## Safety Features

### Testnet vs Mainnet
- Use \`hyperliquid_testnet_futures_trade\` for testing
- Use \`hyperliquid_mainnet_futures_trade\` for real trades
- Mainnet requires \`confirmExecution: "true"\`

### User Confirmation Required
- Always ask user before mainnet execution
- Present clear risk/reward summary
- Show position size and margin requirements

### Risk Limits
- Default risk: 1% of capital per trade
- Maximum recommended: 2% per trade
- Mainnet has built-in safety checks (min $10, max 25% equity)

## Error Handling

### Execution Errors
- Network errors: Retry with exponential backoff
- Insufficient balance: Show clear error message
- Invalid parameters: Validate before execution
- Order rejection: Log reason and inform user

### Position Monitoring Errors
- API failures: Retry and cache last known state
- Missing positions: Handle gracefully (position closed or never opened)

## Best Practices

1. ✅ **Always analyze first** - Use \`get_indicators\` + \`get_market_structure\` before execution
2. ✅ **Present clear summary** - Show all key metrics
3. ✅ **Ask for confirmation** - Never execute without user approval
4. ✅ **Paper trade first** - Test with paper trading
5. ✅ **Monitor positions** - Track PnL and MAE
6. ✅ **Respect risk limits** - Never exceed 2% risk per trade
7. ✅ **Handle errors gracefully** - Show user-friendly error messages
8. ✅ **Log all executions** - Keep record of all trades

## Common Workflow Patterns

### Quick Analysis
\`\`\`
get_indicators + get_market_structure → Present summary → User decision
\`\`\`

### Full Execution Workflow
\`\`\`
get_indicators + memory_recall → calculate_position_setup → calculate_risk_management → 
Present summary → User confirmation → Paper trade → Live execution → Monitor position
\`\`\`

### Multi-Asset Scan
\`\`\`
analisis_multiple_crypto → Identify opportunities → Present top 3 → 
User selects → Individual analysis → Execution workflow
\`\`\`
`,
        },
      ],
    }
  }
)

}

export default registerResources
