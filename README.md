# Model Context Protocol Server for AI-Powered Cryptocurrency Analysis

A comprehensive Model Context Protocol (MCP) server that bridges AI assistants with professional cryptocurrency market analysis capabilities. This server transforms AI conversations by providing real-time market data, sophisticated technical analysis, and intelligent trading insights through standardized MCP protocols. Whether you're building analysis tools, research systems, or AI financial advisors, this server delivers the complete infrastructure needed for data-driven market analysis and decision-making across multiple timeframes and asset classes.


**🎬 MCP Technical Analysis Server Demo**

*Watch the full demonstration of AI-powered cryptocurrency analysis capabilities*

<div align="center">
  <a href="https://youtu.be/9d5ZlVpYxpM?si=rt57UDoy68AZaywL">
    <img src="https://img.youtube.com/vi/9d5ZlVpYxpM/maxresdefault.jpg" alt="MCP Technical Analysis Server Demo" width="100%">
  </a>
  <br><br>
  <div style="position: relative; width: 100%;">
    <div style="position: absolute; left: 0; display: flex; gap: 10px;">
      <a href="https://youtu.be/9d5ZlVpYxpM?si=rt57UDoy68AZaywL">
        <img src="https://img.shields.io/badge/Watch_Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="Watch Demo">
      </a>
      <a href="https://nullshot.ai/brainstorm/c5ee234a-da45-4c8e-8b1b-2df3cc5abadb">
        <img src="https://img.shields.io/badge/Upvote_Now-00ADD8?style=for-the-badge&logo=null&logoColor=white" alt="Upvote Now">
      </a>
    </div>
  </div>
</div>


**🔥 Key Features:**
- 🔴 **69 Analysis & Trading Tools** - Complete market analysis + trading execution + Hyperliquid operations
- 📊 **Real-time Market Data** - Live prices, indicators, volume analysis
- 🎯 **Advanced Technical Analysis** - 35 technical indicators (MAs, oscillators, channels, patterns)
- 💰 **Risk Management** - Position sizing, stop loss, take profit calculations
- 📈 **Multi-Timeframe Analysis** - Daily, 4H, 1H trend alignment
- 🤖 **31 AI Prompts** - Pre-configured analysis workflows for Day Trading, Swing Trading, Position Trading
- 📚 **4 Resources** - Comprehensive trading guides and documentation
- 🔄 **Streaming Support** - HTTP/SSE for real-time updates
- 💹 **Hyperliquid Futures** - Testnet & Mainnet futures execution with slippage protection (0.010% - 8.00%)
- 🪙 **Hyperliquid Spot** - Market & limit orders with automatic slippage retry (mainnet ready)
- 💼 **Account Operations** - Balance checks, transfers (spot ↔ perp), send USD/tokens (6 operations)
- 🌉 **Bridge Operations** - Withdraw to Arbitrum L1, check withdrawal status (2 operations)
- 🐋 **HyperScreener Integration** - Whale positions, liquidations, top traders, large trades data
- 🎯 **Whale Tracking** - Track specific wallet addresses with labeling & change detection alerts
- 📊 **Tier Classification** - Market breakdown by trader tier (🦐 Shrimp to 🐉 Institutional)
- 🔗 **BTC Correlation** - Altcoin correlation with BTC, beta analysis, market regime detection
- 📈 **Enhanced L2 Order Book** - Real-time bids/asks with depth and imbalance from Hyperliquid
- 🧠 **AI Memory (Mem0)** - Persistent memory for trading preferences, trade journal, pattern learning
- ✅ **Production Ready** - All 104 components (69 tools + 4 resources + 31 prompts) validated and working
- 🏗️ **Fully Modular** - Clean architecture with 5 tool categories, 83.8% code reduction in core file

## 📋 Recent Updates

### December 3, 2025 - Hyperliquid Account & Spot Trading Integration + TypeScript Fix

#### Bug Fixes
- ✅ Fixed TypeScript compilation error: Added `slippageType` property to `TradeResult` interface in futures trading tools
- ✅ Build now completes successfully without errors

#### New Hyperliquid Tools (3)

**Account Operations (6 operations merged)**
- ✅ `hyperliquid_account_operations` - Balance checks, transfers (spot ↔ perp), send USD/tokens
  - `check_spot_balance` - View all spot token balances
  - `check_perp_balance` - View perpetual positions and margin
  - `transfer_spot_to_perp` - Move funds to futures trading
  - `transfer_perp_to_spot` - Move funds to spot trading
  - `send_spot_token` - Send tokens to other addresses
  - `send_usd` - Send USD to other addresses

**Bridge Operations (2 operations merged)**
- ✅ `hyperliquid_bridge_operations` - L1 Arbitrum bridge
  - `withdraw_to_arbitrum` - Withdraw to Arbitrum (3-hour bridge)
  - `check_withdraw_status` - Check withdrawal status

**Spot Trading (1 tool)**
- ✅ `spot_trade` - Buy/sell spot tokens with slippage retry (0.010% → 8.00%)
  - Market orders with automatic slippage retry (same as futures)
  - Limit orders with exact price execution
  - Token decimal handling and price formatting
  - **Production Ready** - Use mainnet with small amounts ($5-10)
  - **Testnet Limitations:** 
    - ⚠️ **ZERO liquidity** - Orders will be rejected even with high slippage (13.919%+)
    - ⚠️ **Hyperliquid limit** - Max slippage cannot exceed 80% from reference price
    - ⚠️ Not recommended for spot trading tests
    - ✅ **Solution:** Use mainnet with small amounts for realistic testing

**Testing & Validation:**
- $100+ real transactions executed on testnet
- 100% coverage for account and bridge operations
- Spot trading tested: Successfully executed HYPE trades with 13.919% slippage on testnet
- Comprehensive documentation: See `FINAL_SUMMARY.md` for complete implementation details
  
### Data Now Available
| Tool | Data Status |
|------|-------------|
| `get_External_data` | ✅ longShortRatio, whalePositions, recentLiquidations, largeTrades, marketOverview |
| `get_long_short_ratio` | ✅ hyperscreenerRatio, whalePositions, topTradersOverall |
| `get_liquidation_levels` | ✅ liquidationHeatmap with price levels, recentLiquidations |
| `get_volume_analysis` | ✅ CVD (cvdTrend, cvdDelta) |

🏠 **Local Development:** Run the MCP server locally for full control and privacy  
🌐 **HTTP Streaming:** Remote MCP connection via `mcp-remote` for Cursor IDE

## 🌟 **What's Included**

### 📊 **69 Complete Analysis & Trading Tools**
- **Market Data** (5): Price, indicators, volume analysis, multi-timeframe, external data
- **Order Book & Market** (8): Order book depth, volume profile, market structure, regime, patterns, divergence, liquidation, long/short ratio
- **Position & Whale Tracking** (4): Position tracking, correlation analysis, whale position tracking, tier classification
- **Risk Management** (2): Position sizing and risk/reward calculations
- **Hyperliquid Account** (3): Account operations (6 ops), bridge operations (2 ops), spot trading (1 tool)
- **Moving Averages** (10): MA envelope, VWMA, McGinley, Rainbow, Kaufman, Hull, WMA, SMMA, DEMA, TEMA
- **Oscillators** (18): Stochastic RSI, CMO, PPO, AO, Gator, Elder Ray, Fisher, KST, Schaff, Coppock, TSI, RVI, DPO, Momentum, ROC, Ultimate, TRIX
- **Merged Indicator Tools** (7): Volume indicators, volatility, trend, strength, channels, pivot points, patterns
- **Trading Execution** (5): Hyperliquid futures (testnet/mainnet), spot trading, account operations, bridge operations
- **AI Memory** (8): Save preferences, log trades, get insights, check patterns, remember, recall, get all, delete

### 📚 **4 Educational Resources**
- Comprehensive documentation for trading strategies, risk management, and technical analysis
- API references and integration guides
- Specialized guides for volume analysis, Fibonacci, orderbook, and more
- **NEW:** Usage patterns guide for Day Trading, Swing Trading, Position Trading
- **NEW:** Complete tools reference (69 tools with parameters including AI Memory)

### 🤖 **31 AI Analysis Prompts**
- Core analysis workflows for comprehensive market research
- Technical analysis prompts for indicator-based insights
- Risk management and position sizing guidance
- Specialized prompts for advanced trading strategies
- **NEW:** Day Trading Analysis with fast oscillators (stochastic_rsi, fisher_transform)
- **NEW:** Swing Trading Analysis with multi-timeframe and divergence
- **NEW:** Position Trading Analysis with volume profile and long-term momentum
- **NEW:** Risk Management Analysis with liquidation levels
- **NEW:** Oscillators Analysis (11 oscillator indicators)
- **NEW:** Moving Averages Analysis (10 MA indicators)

## 🚀 **Quick Start**

### 1️⃣ Installation

```bash
# Clone the repository
git clone https://github.com/FajarArrizki/mcp-technical-analysis.git
cd mcp-technical-analysis

# Install dependencies
pnpm install

# Build the server
pnpm run build
```

### 2️⃣ Run Server

Server runs at `http://localhost:8787` with SSE streaming support for real-time market analysis!

#### 🐧 Linux / Mac
```bash
# Start Streaming Server (from project root)
bash scripts/mcp-auto-start.sh

# Or with full path
bash /path/to/mcp-technical-analysis/scripts/mcp-auto-start.sh
```

#### 🪟 Windows
```cmd
# Start Streaming Server (from project root)
scripts\mcp-auto-start.bat

# Or with full path (adjust to your installation directory)
C:\Users\YourUsername\Downloads\mcp-technical-analysis\scripts\mcp-auto-start.bat
```

**Alternative - Manual Start:**
```bash
# Terminal 1 - Start server
pnpm run stream

# Terminal 2 - Test with MCP client
pnpm run terminal
```

### 3️⃣ Add to MCP Client

#### 🪟 Windows - Cursor IDE / Claude Desktop

Add to `mcp.json` or `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "mcp-technical-analysis": {
      "command": "cmd",
      "args": ["/c", "C:\\Users\\YourUsername\\Downloads\\mcp-technical-analysis\\scripts\\mcp-auto-start.bat"],
      "env": {
        "CANDLES_COUNT": "75"
      },
      "description": "MCP Technical Analysis Server - Windows"
    }
  }
}
```

#### 🐧 Linux / Mac - Cursor IDE / Claude Desktop

Add to `.cursor/mcp.json` or `mcp.json`:
```json
{
  "mcpServers": {
    "mcp-technical-analysis": {
      "command": "bash",
      "args": ["/path/to/mcp-technical-analysis/scripts/mcp-auto-start.sh"],
      "description": "MCP Technical Analysis Server - Linux/Mac"
    }
  }
}
```

#### ⚡ Claude Code (CLI) - All Platforms

```bash
# Add the MCP server to Claude Code
claude mcp add --transport http mcp-technical-analysis http://localhost:8787/mcp

# List configured servers
claude mcp list

# Check server status
/mcp
```

#### 🌐 Remote Access via mcp-remote

For remote MCP connection, add to `.mcp.json` in project root:
```json
{
  "mcpServers": {
    "mcp-technical-analysis": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

## 🌍 Geographic Access & Restrictions

### Binance Access in Restricted Countries

If Binance is banned or restricted in your country, you can still access the platform and use this MCP server by configuring Cloudflare's DNS (1.1.1.1). If Cloudflare DNS fails, use a VPN as an alternative solution.

**Recommended Setup:**
1. First, try configuring DNS to use Cloudflare's 1.1.1.1 (primary) and 1.0.0.1 (secondary)
2. If DNS configuration doesn't work, use a reputable VPN service (NordVPN, ExpressVPN, or similar)
3. Connect to a server in a country where Binance operates freely (e.g., Netherlands, Singapore, Japan)

**Cloudflare DNS Configuration (Try First):**
```bash
# Linux DNS configuration
sudo nano /etc/resolv.conf
# Add these lines:
nameserver 1.1.1.1
nameserver 1.0.0.1
```

**VPN Alternative (If DNS Fails):**
- Install a reputable VPN service
- Connect to a server in an unrestricted country
- Access Binance normally through the VPN connection

### Countries with Complete Bans

| No | Country | Status | Year | Main Reason |
|----|---------|--------|------|-------------|
| 1 | United States | Banned | 2019 | Regulatory violations; Binance.US launched as compliant alternative |
| 2 | Canada | Withdrew from market | 2023 | Strict regulations; $4.32 million fine for anti-money laundering violations (2024) |
| 3 | United Kingdom | Banned | 2021-2023 | FCA revoked license for non-compliance with anti-money laundering rules; total license revocation in 2023 |
| 4 | Netherlands | Withdrew from market | 2023 | Failed to obtain regulatory approval; €3.3 million fine for unlicensed operations (2022) |
| 5 | Nigeria | Declared illegal | 2023-2024 | SEC Nigeria declared Binance illegal; Executives arrested; Naira services deactivated |
| 6 | Belgium | Banned | 2023 | Financial regulator ordered operations halt for non-compliance with EU financial laws |
| 7 | Philippines | Blocked | 2024 | SEC blocked website (March 2024) for unlicensed operations; Attempts to block app |
| 8 | Japan | Banned | 2021 | Financial Services Agency banned operations for being unregistered; AML violation complaints |
| 9 | Thailand | Blocked | 2021 | SEC Thailand filed criminal complaints for unlicensed operations |
| 10 | Malaysia | Not available | - | Listed in SC Malaysia's investor warning list |
| 11 | Singapore | Restricted | 2021 | MAS banned Binance.com from recruiting Singapore users without license; IP geo-blocking |
| 12 | Italy | Temporarily blocked | 2021 | CONSOB ordered blocking (July 2021); Obtained regulatory approval (May 2022) |
| 13 | India | Blocked | 2024 | App removed from App Store and Google Play (January 2024); PMLA violations |

### Countries with Partial Restrictions

| No | Country | Restriction Type | Details |
|----|---------|------------------|---------|
| 1 | China | Spot trading blocked | Excluding Hong Kong SAR and Taiwan |
| 2 | Indonesia | No official license | Serves through local partner Tokocrypto regulated by Bappebti |

**Note:** This information is for educational purposes. Always comply with local laws and regulations regarding cryptocurrency trading in your jurisdiction.

## 📦 MCP Capabilities

The MCP Technical Analysis Server exposes **104 total components** through the Model Context Protocol:
- **69 Tools** - Executable functions for analysis, trading, and account management
- **31 Prompts** - Pre-configured AI workflows for trading strategies
- **4 Resources** - Educational documentation and guides

### Component Breakdown

```
📊 Total: 104 Components
├─ 🔧 Tools: 69
│  ├─ Account (10): Account ops, bridge, AI memory
│  ├─ Analysis (15): Market analysis, patterns, structure
│  ├─ Data (3): Price, positions, ratios
│  ├─ Indicators (35): MAs, oscillators, channels, patterns
│  └─ Trading (6): Futures, spot, risk management
├─ 🤖 Prompts: 31
│  ├─ Day Trading (9): Scalping, momentum, range
│  ├─ Swing Trading (11): Multi-timeframe, patterns
│  └─ Position Trading (11): Long-term trends, macro
└─ 📚 Resources: 4
   ├─ Trading Strategy Guide
   ├─ Technical Analysis Reference
   ├─ Risk Management Guide
   └─ Tool Usage Patterns
```

### 🔧 Tools (69)

| No | Tool Name | Description |
|----|-----------|-------------|
| 1 | `get_price` | Get latest prices for multiple trading tickers/symbols at once (e.g., ["BTC", "ETH", "SOL"]) |
| 2 | `get_indicators` | Get comprehensive technical analysis indicators for multiple trading tickers at once |
| 3 | `get_volume_analysis` | Get comprehensive volume analysis for multiple trading tickers at once |
| 4 | `get_Multitimeframe` | Get multi-timeframe trend alignment analysis (Daily, 4H, 1H) |
| 5 | `get_External_data` | Get external market data (funding rate, open interest, liquidations, whale positions, top traders, large trades from HyperScreener) |
| 6 | `get_orderbook_depth` | Get real-time L2 order book depth from Hyperliquid (bids/asks, spread, imbalance) |
| 7 | `get_volume_profile` | Get volume profile analysis (POC, VAH, VAL, HVN, LVN) |
| 8 | `get_market_structure` | Get market structure analysis (swing highs/lows, COC) |
| 9 | `get_market_regime` | Get market regime analysis (trending/ranging/volatile) |
| 10 | `get_candlestick_patterns` | Get candlestick pattern detection (doji, engulfing, etc.) |
| 11 | `get_divergence` | Get RSI/price divergence detection |
| 12 | `get_liquidation_levels` | Get liquidation level analysis with heatmap data from HyperScreener |
| 13 | `get_long_short_ratio` | Get long/short ratio with whale positions and top traders from HyperScreener |
| 14 | `get_position` | Get your own futures positions from Hyperliquid (account value, margin, PnL, leverage) |
| 15 | `get_correlation_analysis` | BTC dominance, altcoin correlation, beta analysis, market regime detection |
| 16 | `get_whale_position` | Track specific wallet addresses with labeling & change detection alerts |
| 17 | `get_tier_classification` | Market breakdown by tier (🦐→🐉) with Long/Short and top wallets per tier |
| 18 | `calculate_risk_management` | Calculate stop loss, take profit, and risk/reward ratio |
| 19 | `calculate_position_setup` | Calculate position size, leverage, margin, and quantity |
| 20 | `ma_envelope` | MA Envelope for volatility-based support/resistance |
| 21 | `vwma` | Volume-Weighted Moving Average |
| 22 | `mcginley_dynamic` | McGinley Dynamic - adaptive MA with reduced lag |
| 23 | `rainbow_ma` | Rainbow MA - multiple MAs for trend visualization |
| 24 | `kaufman_adaptive_ma` | Kaufman Adaptive MA - adjusts to market efficiency |
| 25 | `hull_ma` | Hull Moving Average - reduced lag, smooth trend |
| 26 | `weighted_ma` | Weighted Moving Average |
| 27 | `smoothed_ma` | Smoothed Moving Average |
| 28 | `double_ema` | Double Exponential Moving Average (DEMA) |
| 29 | `triple_ema` | Triple Exponential Moving Average (TEMA) |
| 30 | `stochastic_rsi` | Stochastic RSI - RSI with stochastic formula |
| 31 | `chande_momentum` | Chande Momentum Oscillator (-100 to +100) |
| 32 | `percentage_price_oscillator` | PPO - MACD as percentage |
| 33 | `accelerator_oscillator` | Accelerator Oscillator (Bill Williams) |
| 34 | `awesome_oscillator` | Awesome Oscillator - momentum via median price |
| 35 | `gator_oscillator` | Gator Oscillator - Alligator convergence/divergence |
| 36 | `elder_ray` | Elder-Ray Index - Bull/Bear Power |
| 37 | `fisher_transform` | Fisher Transform - Gaussian normalized reversals |
| 38 | `know_sure_thing` | KST - multi-timeframe ROC momentum |
| 39 | `schaff_trend_cycle` | Schaff Trend Cycle - MACD + Stochastic |
| 40 | `coppock_curve` | Coppock Curve - long-term momentum bottoms |
| 41 | `true_strength_index` | TSI - double-smoothed momentum |
| 42 | `relative_vigor_index` | RVI - close vs open momentum |
| 43 | `detrended_price` | Detrended Price Oscillator - cycle identification |
| 44 | `momentum` | Momentum Indicator - rate of price change |
| 45 | `rate_of_change` | ROC - percentage price change |
| 46 | `ultimate_oscillator` | Ultimate Oscillator - 3 timeframe combination |
| 47 | `trix` | TRIX - triple smoothed EMA rate of change |
| 48 | `volume_indicators` | Merged volume tool with types: chaikin_money_flow, chaikin_oscillator, klinger_oscillator, volume_oscillator, ease_of_movement, price_volume_trend, positive_volume_index, volume_roc, anchored_vwap, volume_zone_oscillator, money_flow_index |
| 49 | `volatility_indicators` | Merged volatility tool with types: bollinger_band_width, bollinger_percent_b, chaikin_volatility, historical_volatility, mass_index, ulcer_index |
| | **Trend Indicators (Merged Tool)** | |
| 50 | `trend_indicators` | Merged trend tool with types: supertrend, alligator, ichimoku_cloud, vortex, linear_regression, r_squared |
| | **Strength Indicators (Merged Tool)** | |
| 51 | `strength_indicators` | Merged strength tool with types: bull_bear_power, force_index, center_of_gravity, balance_of_power, advance_decline_line |
| | **Channels (Merged Tool)** | |
| 52 | `channels` | Merged channels tool with types: keltner_channels, donchian_channels, price_channel |
| | **Pivot Points (Merged Tool)** | |
| 53 | `pivot_points` | Merged pivot tool with types: camarilla, standard, fibonacci_retracement |
| | **Patterns (Merged Tool)** | |
| 54 | `patterns` | Merged patterns tool with types: fractals, zigzag, change_of_character |
| 55 | `hyperliquid_testnet_futures_trade` | Execute futures trades on Hyperliquid TESTNET. Supports market/limit/custom orders, sizeInUsd ($100), leverage (1-100x), slippage protection (0.01%-50%), auto-
| 56 | `hyperliquid_mainnet_futures_trade` | Execute REAL futures trades on Hyperliquid MAINNET. Safety checks: confirmExecution=true required, asset whitelist, min $10, max 25% equity. |
| 57 | `close_position` | Close or reduce positions on Hyperliquid (testnet/mainnet). Full or partial close (1-99%), auto-detects position side, reduceOnly for safety. |
| 58 | `get_market_sentiment` | Get market sentiment from Fear & Greed Index + BTC Dominance + Funding Summary (FREE APIs). Overall sentiment score + trading recommendation. |
| 59 | `hyperliquid_account_operations` | 6 operations: check balances, transfers (spot ↔ perp), send USD/tokens. Tested with $100+ real transactions. Production ready. |
| 60 | `hyperliquid_bridge_operations` | L1 Arbitrum bridge: withdraw_to_arbitrum (3-hour), check_withdraw_status. Full testnet/mainnet support. |
| 61 | `spot_trade` | Buy/sell spot tokens with slippage retry (0.010% → 8.00%). Market & limit orders. **Use mainnet** ($5-10 recommended). |
| 62 | `memory_save_preference` | Save trading preferences (leverage, risk %, pairs, style). AI remembers for future interactions. |
| 63 | `memory_log_trade` | Log completed trade with full context (entry/exit reason, PnL, lesson) for pattern learning. |
| 64 | `memory_get_insights` | Get personalized trading insights based on history (performance, patterns, mistakes). |
| 65 | `memory_check_pattern` | Check if current setup matches past winning/losing patterns from your history. |
| 66 | `memory_remember` | Store any important note or context for future reference (key levels, observations). |
| 67 | `memory_recall` | Search and recall stored memories based on query. |
| 68 | `memory_get_all` | Get all stored memories for review. |
| 69 | `memory_delete` | Delete specific memory by ID. |

### 📚 Resources (4)

Educational documentation accessible through the MCP protocol.

| No | Resource URI | Description |
|----|--------------|-------------|
| 1 | `geartrade://docs/trading-strategies` | Comprehensive guide on trading strategies, technical analysis, and best practices. Covers trend following, mean reversion, breakout trading, volume-based strategies, and risk management principles. |
| 2 | `geartrade://docs/risk-management` | Complete guide on risk management, position sizing, stop loss/take profit strategies, leverage management, and portfolio risk. Includes formulas, examples, and best practices. |
| 3 | `geartrade://docs/tools-overview` | Complete overview of all 69 MCP tools with descriptions, parameters, and usage patterns. Organized by category: Market Data, Execution, Technical Indicators, and AI Memory. |
| 4 | `geartrade://docs/execution-workflow` | Step-by-step guide for analysis to execution workflow. Covers comprehensive analysis, signal identification, user confirmation, testnet/mainnet execution, position monitoring, and trade logging. |

### 🤖 Prompts (31)

| No | Prompt Name | Description |
|----|-------------|-------------|
| | **Core Trading Prompts** | |
| 1 | `analyze_and_execute` | Analyze a crypto asset and prepare execution plan with risk management. **NEW params:** leverage, strategy, timeframe |
| 2 | `multi_asset_scan` | Scan multiple assets for trading opportunities. **NEW params:** strategy, minConfidence, sortBy |
| 3 | `comprehensive_analysis` | Complete market analysis with technical indicators and risk assessment. **NEW params:** includeAdvanced, includeVolume, includeExternal |
| | **Quick Analysis Prompts** | |
| 4 | `quick_price_check` | Fast price check with basic market data |
| 5 | `trend_analysis` | Trend direction and strength analysis |
| 6 | `market_overview` | High-level market sentiment and key levels |
| | **Technical Analysis Prompts** | |
| 7 | `technical_indicator_analysis` | Deep dive into technical indicators and signals |
| 8 | `volume_profile_analysis` | Volume profile and liquidity analysis |
| 9 | `market_structure_analysis` | Market structure and change of character detection |
| | **Advanced Strategy Prompts** | |
| 10 | `divergence_scan` | RSI and price divergence identification |
| 11 | `liquidation_analysis` | Liquidation level analysis and risk zones |
| 12 | `fibonacci_trading_strategy` | Fibonacci retracement and extension trading |
| 13 | `spot_futures_arbitrage` | Spot-futures price divergence opportunities |
| | **Risk Management Prompts** | |
| 14 | `risk_analysis` | Comprehensive risk assessment and position sizing |
| 15 | `position_monitoring` | Active position monitoring and adjustment recommendations |
| 16 | `portfolio_review` | Portfolio performance and rebalancing analysis |
| 17 | `volatility_analysis` | Volatility measurement and risk assessment |
| | **Specialized Trading Prompts** | |
| 18 | `entry_exit_strategy` | Entry and exit timing optimization |
| 19 | `multi_asset_comparison` | Compare multiple assets across various metrics. **NEW params:** strategy, sortBy |
| | **NEW: Trading Style Prompts** | |
| 20 | `day_trading_analysis` | **NEW:** Day trading with fast oscillators (stochastic_rsi, fisher_transform), order book, liquidation levels. Params: ticker, capital, riskPct, leverage, timeframe |
| 21 | `swing_trading_analysis` | **NEW:** Swing trading with multi-timeframe, divergence, trend indicators (supertrend, elder_ray, schaff_trend_cycle). Params: ticker, capital, riskPct, leverage, holdPeriod |
| 22 | `position_trading_analysis` | **NEW:** Position trading with volume profile, long-term momentum (know_sure_thing, coppock_curve), adaptive MAs. Params: ticker, capital, riskPct, leverage, holdPeriod |
| | **NEW: Risk & Indicator Analysis Prompts** | |
| 23 | `risk_management_analysis` | **NEW:** Comprehensive risk analysis with liquidation levels and volatility. Params: ticker, entryPrice, side, capital, riskPct, leverage |
| 24 | `oscillators_analysis` | **NEW:** Analyze all 11 oscillator indicators (stochastic_rsi, fisher, momentum, chande, ROC, PPO, gator, etc.). Params: ticker, focusType |
| 25 | `moving_averages_analysis` | **NEW:** Analyze all 10 MA indicators (DEMA, TEMA, HMA, WMA, SMMA, VWMA, KAMA, McGinley, Rainbow). Params: ticker, period |
| | **Additional Trading Prompts** | |
| 26 | `momentum_trading` | Momentum-based trading strategies |
| 27 | `mean_reversion` | Mean reversion trading opportunities |
| 28 | `breakout_trading` | Breakout pattern recognition and execution |
| 29 | `scalping_strategy` | High-frequency scalping strategies |
| 30 | `swing_trading` | Medium-term swing trading analysis |
| 31 | `trend_following` | Long-term trend following strategies |
| 32 | `arbitrage_opportunities` | Cross-exchange and cross-asset arbitrage |

## 🛠️ **Technology Stack**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Nullshot AI Agent Framework](https://nullshot.ai)** | latest | MCP server development & deployment framework |
| @nullshot/mcp | latest | Nullshot MCP SDK for AI-powered applications |
| @nullshot/cli | latest | CLI tools for development workflow |
| **Node.js** | - | JavaScript runtime environment |
| TypeScript | ^5.0.0 | Static type checking and compilation |
| tsx | ^4.20.6 | TypeScript execution for development |
| **pnpm** | - | Fast, disk space efficient package manager |
| **Zod** | ^3.22.4 | TypeScript-first schema validation |
| **Node.js HTTP/HTTPS** | Built-in | Core web server |
| Server-Sent Events (SSE) | Native | Real-time streaming transport |
| mcp-remote | npm package | Remote MCP client connection support |
| **📡 Hyperliquid API** | @nktkas/hyperliquid ^0.27.1 | Real-time prices, L2 order book, funding, OI, trading |
| HyperScreener API | REST API | Whale positions, liquidations, L/S ratio, large trades |
| Binance API | REST API | Historical candles, multi-timeframe data |
| **Mem0 Platform** | mem0ai ^2.1.38 | AI-powered persistent memory with vector search |
| **Custom Indicators** | 70+ Built-in | MAs, oscillators, volume, volatility, trend, strength |
| Market Analysis | Built-in | Volume profile, market structure, patterns, divergence |
| Risk Management | Built-in | Position sizing, SL/TP, R:R calculations |
| **Hyperliquid Trading** | @nktkas/hyperliquid ^0.27.1 | Testnet/mainnet futures with slippage protection |
| Wallet Management | ethers.js ^6.15.0 | Ethereum wallet integration for trading |
| Order Types | Custom | Market (auto-retry), Limit, Custom entry |
| Mem0 Integration | mem0ai ^2.1.38 | Trading preferences, journal, pattern learning |
| Vector Search | Mem0 Built-in | Semantic memory recall with similarity matching |
| LLM Extraction | Mem0 Built-in | Intelligent context extraction from trading data |
| **TypeScript Compiler** | tsc ^5.0.0 | Build tool for production |
| dotenv | ^17.2.3 | Environment variable management |
| Auto-start Scripts | .bat/.sh | Windows and Linux/Mac server automation |
| **Cursor IDE** | - | Desktop IDE with MCP support |
| Claude Desktop | - | Desktop app with MCP integration |
| Claude Code CLI | - | Command-line MCP client |
| mcp-remote | npm | Remote HTTP/SSE MCP transport |
| **Asset Whitelist** | Built-in | Mainnet trading safety |
| Position Limits | Built-in | Max 25% account equity per trade |
| Confirmation Required | Built-in | Explicit mainnet execution approval |
| **Linux** | ✅ | Full support with .sh scripts |
| macOS | ✅ | Full support with .sh scripts |
| Windows | ✅ | Full support with .bat scripts |

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                      AI ASSISTANTS LAYER                                                ║
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                          ║
│   │  Claude  │    │  Cursor  │    │  GPT-4   │    │  Custom  │                          ║
│   └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘                          ║
│        ┼               ┼               ┼               ┼                                ║
│        │               │               │               │                                ║
│        └───────────────┴───────────────┴───────────────┘                                ║
│                           │                                                             ║
│                   ◀═══ MCP Protocol ═══▶                                                ║
│                           │                                                             ║
┌───────────────────────────┼──────────────────────────────────────────────────────────┐  ║
│                           ▼                                                          │  ║
│  ╔═══════════════════════════════════════════════════════════════╗                   │  ║
│  ║          GEARTRADE MCP SERVER v1.1.0                          ║                   │  ║
│  ║   69 Tools • 31 Prompts • 4 Resources • 104 Components        ║                   │  ║
│  ╚═══════════════════════════════════════════════════════════════╝                   │  ║
║  │                                           │                                       │  ║
║  │                                           ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │  CORE COMPONENTS                                                            │  │  ║
║  │  │  ┌────────────────────────────┐           ┌────────────────────────────┐    │  │  ║
║  │  │  │  ANALYSIS ENGINE           │           │  AI MEMORY (Mem0)          │    │  │  ║
║  │  │  │  ────────────────────────  │           │  ────────────────────────  │    │  │  ║
║  │  │  │  • Price & Indicators      │           │  • Trading Preferences     │    │  │  ║
║  │  │  │  • Volume & CVD            │           │  • Trade Journal           │    │  │  ║
║  │  │  │  • Market Structure        │           │  • Pattern Learning        │    │  │  ║
║  │  │  │  • Order Book Depth        │           │  • Personalized Insights   │    │  │  ║
║  │  │  │  • Risk Management         │           │  • Historical Win Rate     │    │  │  ║
║  │  │  └────────────────────────────┘           └────────────────────────────┘    │  │  ║
║  │  └─────────────────────────────────────────────────────────────────────────────┘  │  ║
║  │                                           │                                       │  ║
║  │                                           ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │  DATA SOURCES                                                               │  │  ║
║  │  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐    │  │  ║
║  │  │  │  HYPERLIQUID API    │ │  HYPERSCREENER API  │ │  BINANCE API        │    │  │  ║
║  │  │  │  ─────────────────  │ │  ─────────────────  │ │  ─────────────────  │    │  │  ║
║  │  │  │  • Real-time Prices │ │  • Whale Positions  │ │  • Historical Candle│    │  │  ║
║  │  │  │  • L2 Order Book    │ │  • Liquidations     │ │  • Multi-Timeframe  │    │  │  ║
║  │  │  │  • Funding Rates    │ │  • Long/Short Ratio │ │  • Volume Data      │    │  │  ║
║  │  │  │  • Open Interest    │ │  • Large Trades     │ │  • Market Data      │    │  │  ║
║  │  │  │  • Futures Trading  │ │  • Top Traders      │ │                     │    │  │  ║
║  │  │  │  • Spot Trading     │ │  • Tier Breakdown   │ │                     │    │  │  ║
║  │  │  │  • Account Ops      │ │                     │ │                     │    │  │  ║
║  │  │  │  • Bridge to L1     │ │                     │ │                     │    │  │  ║
║  │  │  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘    │  │  ║
║  │  └─────────────────────────────────────────────────────────────────────────────┘  │  ║
║  │                                           │                                       │  ║
║  │                                           ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │  AI LAYER                                                                   │  │  ║
║  │  │  ┌────────────────────────────┐         ┌────────────────────────────┐      │  │  ║
║  │  │  │  AI PROMPTS (32)           │         │  SECURITY & VALIDATION     │      │  │  ║
║  │  │  │  ────────────────────────  │         │  ────────────────────────  │      │  │  ║
║  │  │  │  • Day Trading Analysis    │         │  • Zod Schema Validation   │      │  │  ║
║  │  │  │  • Swing Trading           │         │  • Trading Safety Checks   │      │  │  ║
║  │  │  │  • Position Trading        │         │  • Slippage Protection     │      │  │  ║
║  │  │  │  • Oscillators & MA        │         │  • Asset Whitelist         │      │  │  ║
║  │  │  │  • Risk Analysis           │         │  • Position Size Limits    │      │  │  ║
║  │  │  └────────────────────────────┘         └────────────────────────────┘      │  │  ║
║  │  └─────────────────────────────────────────────────────────────────────────────┘  │  ║
║  │                                           │                                       │  ║
║  │                                           ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │  STREAMING & TRADING EXECUTION                                              │  │  ║
║  │  │  ┌──────────────────────────────┐     ┌──────────────────────────────┐      │  │  ║
║  │  │  │  HTTP/SSE STREAMING          │     │  HYPERLIQUID TRADING         │      │  │  ║
║  │  │  │  • localhost:8787            │     │  • TESTNET: Full Features    │      │  │  ║
║  │  │  │  • Server-Sent Events        │     │  • MAINNET: Safety Checks    │      │  │  ║
║  │  │  │  • mcp-remote Support        │     │  • Market/Limit/Custom       │      │  │  ║
║  │  │  │  • Real-time Updates         │     │  • Slippage: 0.01%-50%       │      │  │  ║
║  │  │  └──────────────────────────────┘     └──────────────────────────────┘      │  │  ║
║  │  └─────────────────────────────────────────────────────────────────────────────┘  │  ║
║  │                                           │                                       │  ║
║  │                                           ▼                                       │  ║
║  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │  ║
║  │  │  MEM0 PLATFORM API                                                          │  │  ║
║  │  │  ─────────────────────────────────────────────────────────────────────────  │  │  ║
║  │  │  • Persistent Memory Storage             • Vector Search & Semantic Recall  │  │  ║
║  │  │  • LLM-Powered Memory Extraction                                            │  │  ║
║  │  └─────────────────────────────────────────────────────────────────────────────┘  │  ║
║  └───────────────────────────────────────────────────────────────────────────────────┘  ║
╚═════════════════════════════════════════════════════════════════════════════════════════╝
```

### Component Details

**🎯 MCP Protocol Layer**
- **Tool Execution**: 58 specialized analysis & trading tools for comprehensive market intelligence
- **Resource Management**: 22 detailed documentation resources for research and education
- **Prompt System**: 32 AI-optimized prompts for structured analysis workflows

**🔒 Security & Validation Layer**
- **Input Validation**: Comprehensive Zod schema validation for all data inputs
- **Trading Safety**: Mainnet trading requires explicit confirmation, asset whitelist, position size limits
- **Testnet Support**: Full trading capabilities on testnet for safe testing
- **Configurable Slippage**: Dynamic slippage with auto-retry (0.01% to 50%)

**📊 Analysis Engine Components**
- **Technical Indicators**: 35+ indicators across momentum, volume, volatility, and trend analysis
- **CVD (Cumulative Volume Delta)**: Real-time buy/sell pressure analysis with trend detection
- **Market Structure**: Advanced change-of-character detection, market regime analysis, and fractal analysis
- **Volume Profile**: POC, VAH, VAL, HVN, LVN for session and composite analysis
- **Multi-Timeframe**: Cross-timeframe trend alignment (Daily, 4H, 1H) and confirmation signals
- **Risk Management**: Position sizing, stop-loss, take-profit, and R:R calculations

**🧠 AI Memory Layer (Mem0)**
- **Trading Preferences**: Persistent storage of leverage, risk %, pairs, trading style
- **Trade Journal**: Auto-logged trades with entry/exit reasons, PnL, lessons learned
- **Pattern Learning**: Historical pattern matching with win rate analysis
- **Personalized Insights**: Context-aware recommendations based on user history
- **Vector Search**: Semantic search across all stored memories

**🌐 Data Integration**

| Source | Data Type | Caching |
|--------|-----------|---------|
| **Hyperliquid** | Real-time prices, L2 order book, funding rates, OI | 3-5s |
| **HyperScreener** | Liquidations, whale positions, L/S ratio, market summary | 60s |
| **Binance** | Historical candles, multi-timeframe data | 30s |
| **Mem0** | User memories, preferences, trade history | Real-time |

**🐋 HyperScreener API Integration**
- **Base URL**: `https://api-hyperliquid.asxn.xyz/api`
- **Liquidations**: `/node/liquidations`, `/node/liquidations/{SYMBOL}`, `/node/liquidations/summary`
- **Positions**: `/node/positions`, `/node/positions/{SYMBOL}`, `/node/positions/{SYMBOL}/long|short`
- **Market Summary**: `/node/market/summary`, `/node/market/summary/{SYMBOL}`
- **Market Data**: `/market-data/funding-rates`, `/market-data/open-interest`, `/market-data/volume`, `/market-data/stats/24h`
- **Total**: 14 verified endpoints with proper error handling and response parsing

## 🐋 HyperScreener Integration

The server integrates data from [HyperScreener](https://hyperscreener.asxn.xyz/) API (`https://api-hyperliquid.asxn.xyz/api`) to provide whale and liquidation intelligence:

| Data Type | Description | Tools Using This Data |
|-----------|-------------|----------------------|
| **Liquidations** | Recent liquidation events per asset | `get_External_data`, `get_liquidation_levels` |
| **Whale Positions** | Large trader positions per asset | `get_External_data`, `get_long_short_ratio` |
| **Long/Short Ratio** | Market sentiment ratio (calculated from positions) | `get_External_data`, `get_long_short_ratio` |
| **Large Trades** | Trades >$50K per asset | `get_External_data` |
| **Top Traders** | PnL-ranked traders (daily) | `get_long_short_ratio` |
| **Liquidation Heatmap** | 24h liquidation distribution by price level | `get_liquidation_levels` |
| **Market Overview** | Total positions, traders, OI, net PnL | `get_External_data` |
| **Top Gainers/Losers** | PnL-based rankings | `get_External_data` |
| **Platform Stats** | Overall platform statistics | `get_External_data` |

### HyperScreener API Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| **Liquidations** | `/node/liquidations` | All liquidations (sort_by, sort_order, limit) |
| | `/node/liquidations/{SYMBOL}` | Liquidations by symbol (limit, timeframe) |
| | `/node/liquidations/summary` | 24h summary stats |
| | `/node/liquidations/stats/symbols` | Stats grouped by symbol |
| **Positions** | `/node/positions` | All positions (sort_by, sort_order, limit) |
| | `/node/positions/{SYMBOL}` | Positions by symbol |
| | `/node/positions/{SYMBOL}/long` | Long positions only |
| | `/node/positions/{SYMBOL}/short` | Short positions only |
| **Market Summary** | `/node/market/summary` | All symbols with price change + liquidations |
| | `/node/market/summary/{SYMBOL}` | Per symbol market summary |
| **Market Data** | `/market-data/funding-rates` | Funding rates per symbol |
| | `/market-data/open-interest` | Open interest per symbol |
| | `/market-data/volume` | Volume 24h per symbol |
| | `/market-data/stats/24h` | 24h aggregate stats |

### Enhanced Hyperliquid Data

| Data Type | Description | Tools Using This Data |
|-----------|-------------|----------------------|
| **L2 Order Book** | Real-time bids/asks with depth | `get_orderbook_depth` |
| **All Mid Prices** | Real-time mid prices for all coins | All market data tools |
| **Bid-Ask Spread** | Spread calculation and analysis | `get_orderbook_depth` |
| **Order Book Imbalance** | Buy/sell pressure ratio | `get_orderbook_depth` |

## 📁 Project Structure

```
mcp-technical-analysis/
├── packages/
│   ├── .env.example                        # Environment variables template
│   └── geartrade-mcp-server/               # Main MCP server package (v1.1.0)
│       ├── src/                            # Source code (TypeScript)
│       │   ├── index.ts                    # Entry point (804 lines, 83.8% reduction!)
│       │   │                               # Registers 69 tools, 31 prompts, 4 resources
│       │   ├── formatters/                 # Output formatting utilities (17 files)
│       │   │   ├── indicators.ts           # Technical indicator formatting
│       │   │   ├── volume.ts               # Volume analysis formatting
│       │   │   ├── orderbook.ts            # Order book depth formatting
│       │   │   ├── liquidation.ts          # Liquidation levels formatting
│       │   │   ├── position.ts             # Position data formatting
│       │   │   └── ...                     # 12 other formatters
│       │   ├── memory/                     # AI Memory (Mem0) integration
│       │   │   └── [Memory storage files]  # Trade journal, preferences
│       │   ├── prompts/                    # AI prompt templates (31 prompts)
│       │   │   └── index.ts                # Day/Swing/Position trading workflows
│       │   ├── resources/                  # Educational resources (4 resources)
│       │   │   └── index.ts                # Trading guides and references
│       │   ├── server/                     # HTTP/SSE infrastructure
│       │   │   ├── cors.ts                 # CORS middleware
│       │   │   └── json-rpc.ts             # JSON-RPC 2.0 handler
│       │   ├── tools/                      # 69 MCP tools (Modular Architecture ✨)
│       │   │   ├── README.md               # Tools documentation
│       │   │   ├── index.ts                # Main registration (imports all categories)
│       │   │   ├── account/                # Account tools (10 tools)
│       │   │   │   ├── index.ts            # Export all account tools
│       │   │   │   ├── hyperliquid-account-operations.ts   # 1 tool, 6 operations
│       │   │   │   ├── hyperliquid-bridge-operations.ts    # 1 tool, 2 operations
│       │   │   │   └── memory-tools.ts     # 8 AI memory tools
│       │   │   ├── analysis/               # Analysis tools (15 tools)
│       │   │   │   ├── index.ts            # Export all analysis tools
│       │   │   │   ├── market-sentiment.ts # Market sentiment (1 tool)
│       │   │   │   ├── technical-analysis-tools.ts   # Indicators, volume, MTF (3 tools)
│       │   │   │   ├── market-data-tools.ts          # Orderbook, liquidations, correlation (4 tools)
│       │   │   │   ├── pattern-analysis-tools.ts     # Patterns, structure, regime (5 tools)
│       │   │   │   └── whale-analysis-tools.ts       # Whale tracking, tiers (2 tools)
│       │   │   ├── data/                   # Data tools (3 tools)
│       │   │   │   ├── index.ts            # Export all data tools
│       │   │   │   └── price-position-tools.ts       # Price, position, long/short (3 tools)
│       │   │   ├── indicators/             # Indicator tools (35 tools)
│       │   │   │   ├── index.ts            # Export all indicator tools
│       │   │   │   ├── moving-averages.ts  # 10 MA indicators
│       │   │   │   ├── oscillators.ts      # 14 oscillator indicators
│       │   │   │   ├── channels.ts         # 3 channel indicators (merged)
│       │   │   │   ├── pivot-points.ts     # 3 pivot indicators (merged)
│       │   │   │   ├── trend-indicators.ts # 6 trend indicators (merged)
│       │   │   │   ├── patterns.ts         # 3 pattern indicators (merged)
│       │   │   │   ├── strength-indicators.ts     # 4 strength indicators (merged)
│       │   │   │   ├── volatility-indicators.ts   # 6 volatility indicators (merged)
│       │   │   │   └── volume-indicators.ts       # 8 volume indicators (merged)
│       │   │   └── trading/                # Trading tools (6 tools)
│       │   │       ├── index.ts            # Export all trading tools
│       │   │       ├── hyperliquid-testnet-futures-trade.ts  # Testnet futures
│       │   │       ├── hyperliquid-mainnet-futures-trade.ts  # Mainnet futures
│       │   │       ├── spot-trading.ts     # Spot trading
│       │   │       ├── close-position.ts   # Position closing
│       │   │       └── risk-management-tools.ts   # Risk calculations (2 tools)
│       │   └── signal-generation/          # Core analysis engine
│       │       ├── analysis/               # Market analysis algorithms
│       │       │   ├── bounce.ts           # Bounce detection
│       │       │   ├── candlestick.ts      # Pattern recognition
│       │       │   ├── divergence.ts       # RSI divergence
│       │       │   ├── market-regime.ts    # Regime classification
│       │       │   ├── market-structure.ts # Structure analysis
│       │       │   ├── tier-classification.ts  # Trader tiers
│       │       │   ├── trend-detection.ts  # Trend identification
│       │       │   └── volume-analysis.ts  # Volume profile
│       │       ├── data-fetchers/          # External API integrations
│       │       │   ├── hyperliquid.ts      # Hyperliquid exchange API
│       │       │   ├── hyperscreener.ts    # HyperScreener liquidations/whales
│       │       │   └── market-data.ts      # Multi-source aggregation
│       │       ├── exit-conditions/        # Exit strategy calculations
│       │       │   └── stop-loss.ts        # SL/TP calculations
│       │       ├── risk-management/        # Risk calculations
│       │       │   ├── leverage.ts         # Dynamic leverage
│       │       │   └── margin.ts           # Margin requirements
│       │       ├── technical-indicators/   # 35+ indicator implementations
│       │       │   ├── momentum.ts         # RSI, MACD, Stochastic
│       │       │   ├── fibonacci.ts        # Fibonacci retracement
│       │       │   ├── correlation-analysis.ts  # BTC correlation
│       │       │   └── ...                 # 32 other indicators
│       │       ├── types/                  # TypeScript type definitions
│       │       └── utils/                  # Utility functions
│       ├── dist/                           # Compiled JavaScript output
│       ├── package.json                    # Package v1.1.0 configuration
│       ├── tsconfig.json                   # TypeScript configuration
│       └── local-server.ts                 # HTTP/SSE streaming server
├── scripts/                                # Automation scripts
│   ├── mcp-auto-start.sh                   # Linux/Mac auto-start
│   └── mcp-auto-start.bat                  # Windows auto-start
├── package.json                            # Workspace root config (v1.1.0)
├── pnpm-workspace.yaml                     # PNPM workspace config
├── pnpm-lock.yaml                          # Dependency lock file
├── mcp.json                                # MCP configuration
├── LICENSE                                 # MIT License
└── README.md                               # This file

📊 Code Statistics:
  - Total Files: 150+
  - Total Lines: 30,000+
  - TypeScript: 100%
  - Components: 104 (69 tools + 31 prompts + 4 resources)
  - Main File Reduction: 4,943 → 804 lines (83.8% reduction!)
```

### Key Directories

| No | Directory | Description |
|----|-----------|-------------|
| **Core Entry Points** | |
| 1 | `packages/geartrade-mcp-server/src/index.ts` | Main entry point (804 lines) - Registers 69 tools, 31 prompts, 4 resources |
| 2 | `packages/geartrade-mcp-server/local-server.ts` | HTTP/SSE streaming server for remote MCP connections |
| 3 | `packages/geartrade-mcp-server/dist/` | Compiled JavaScript output (auto-generated from TypeScript) |
| 4 | `packages/geartrade-mcp-server/package.json` | Package v1.1.0 - Dependencies and scripts |
| 5 | `packages/geartrade-mcp-server/tsconfig.json` | TypeScript compiler configuration |
| 6 | `packages/.env.example` | Environment variables template (copy to .env) |
| 7 | `src/tools/account/` | 10 tools - Account operations, bridge, AI memory (Mem0) |
| 8 | `src/tools/analysis/` | 15 tools - Market sentiment, technical analysis, whale tracking |
| 9 | `src/tools/data/` | 3 tools - Real-time prices, positions, long/short ratios |
| 10 | `src/tools/indicators/` | 35 tools - MAs, oscillators, channels, patterns, volatility |
| 11 | `src/tools/trading/` | 6 tools - Futures trading, spot trading, risk management |
| 12 | `src/formatters/` | 17 files - Output formatting for all tool responses |
| 13 | `src/prompts/` | 31 prompt templates - Day/Swing/Position trading workflows |
| 14 | `src/resources/` | 4 educational resources - Trading guides and references |
| 15 | `src/server/` | HTTP/SSE infrastructure - CORS and JSON-RPC handlers |
| 16 | `src/memory/` | AI Memory (Mem0) integration - Trade journal & preferences |
| 17 | `src/signal-generation/` | Core analysis engine - Market intelligence & indicators |
| 18 | `src/signal-generation/analysis/` | 8 modules - Bounce, candlestick, divergence, structure, trends |
| 19 | `src/signal-generation/technical-indicators/` | 35+ indicators - RSI, MACD, Fibonacci, correlations, etc. |
| 20 | `src/signal-generation/data-fetchers/` | 3 fetchers - Hyperliquid, HyperScreener, market data aggregation |
| 21 | `src/signal-generation/risk-management/` | 2 modules - Dynamic leverage & margin calculations |
| 22 | `src/signal-generation/exit-conditions/` | Exit strategies - Stop loss & take profit calculations |
| 23 | `scripts/mcp-auto-start.sh` | Linux/Mac auto-start script with build & restart logic |
| 24 | `scripts/mcp-auto-start.bat` | Windows auto-start script with build & restart logic |
| 25 | `README.md` (root) | This file - Complete project documentation |
| 26 | `src/*/README.md` | 16 README files - Detailed documentation for each directory |

**📝 README Files (16 total)**:
- 1 root README.md
- 3 main directory READMEs (scripts/, packages/, geartrade-mcp-server/)
- 3 src/ READMEs (src/, memory/, signal-generation/)
- 9 subdirectory READMEs (formatters/, prompts/, resources/, server/, tools/account/, tools/analysis/, tools/data/, tools/indicators/, tools/trading/)

## 🛠️ Development

```bash
# Development mode
pnpm run dev

# Build
pnpm run build

# Validate MCP config
pnpm run validate

# List tools & resources
pnpm run list
```

## 🔐 Security & Trading Safety

### Analysis & Trading Environment
This server provides both market analysis and trading execution capabilities with comprehensive safety measures.

**Security Features:**
- ✅ Zod schema validation for all inputs
- ✅ Testnet trading for safe testing (no real funds)
- ✅ Mainnet safety checks:
  - **Futures:** `confirmExecution: true` required, asset whitelist, min $10, max 25% equity
  - **Spot:** `confirmMainnet: true` required, start with small amounts ($5-10)
  - **Account Ops:** `confirmMainnet: true` for transfers and withdrawals
  - **Bridge:** 3-hour withdrawal to Arbitrum L1 with status tracking
- ✅ Slippage protection:
  - **Futures:** 0.01% - 50% configurable
  - **Spot:** 0.010% - 8.00% automatic retry (same mechanism as futures)
- ✅ Auto-fallback to GTC orders on no liquidity
- ✅ Environment variables for wallet security:
  - `AGENT_WALLET_PRIVATE_KEY` - API wallet private key
  - `MAIN_WALLET_ADDRESS` - Main trading account address
  - `MEM0_API_KEY` - Persistent AI memory
  - `ARBITRUM_RPC_URL` - L1 bridge endpoint (DRPC recommended)

## 🌐 API Endpoints (HTTP Streaming Mode)

When running `bash scripts/mcp-auto-start.sh`:

| No | Endpoint | Method | Description |
|----|----------|--------|-------------|
| 1 | `http://localhost:8787/` | GET | Server info & documentation |
| 2 | `http://localhost:8787/health` | GET | Health check (JSON) |
| 3 | `http://localhost:8787/mcp` | POST | MCP JSON-RPC endpoint |
| 4 | `http://localhost:8787/stream` | GET/POST | SSE streaming endpoint |

**Test Commands:**
```bash
# Health check
curl http://localhost:8787/health

# List all tools
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Get BTC price
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_price","arguments":{"ticker":"BTC"}}}'
```

## 📄 License

MIT

---

*Built for the AI analysis community - empowering AI assistants with professional technical analysis capabilities*
## 📊 Project Statistics

### Component Breakdown
```
Total Components:     104
├─ Tools:              69 (5 categories)
│  ├─ Account:         10 tools
│  ├─ Analysis:        15 tools
│  ├─ Data:             3 tools
│  ├─ Indicators:      35 tools
│  └─ Trading:          6 tools
├─ Resources:           4 (educational guides)
└─ Prompts:            31 (AI workflows)
```

### Code Quality Metrics
```
✅ TypeScript:        100%
✅ Build Status:      Passing
✅ Duplicates:        0 (zero!)
✅ Type Safety:       Full coverage
✅ Documentation:     Comprehensive
✅ Architecture:      Fully modular
```

### Refactoring Achievement  
```
Before:  4,943 lines (index.ts)
After:     804 lines (index.ts)
Savings: 4,139 lines (83.8% reduction!)
```

---

**Made with ❤️ by the GearTrade Team**
