# Model Context Protocol Server for AI-Powered Cryptocurrency Analysis

A comprehensive Model Context Protocol (MCP) server that bridges AI assistants with professional cryptocurrency market analysis capabilities. This server transforms AI conversations by providing real-time market data, sophisticated technical analysis, and intelligent trading insights through standardized MCP protocols. Whether you're building analysis tools, research systems, or AI financial advisors, this server delivers the complete infrastructure needed for data-driven market analysis and decision-making across multiple timeframes and asset classes.


**🎬 MCP Technical Analysis Server Demo**

*Watch the full demonstration of AI-powered cryptocurrency analysis capabilities*

<div align="center">
  <a href="https://www.youtube.com/watch?v=SVaSJQo2iSk&autoplay=1">
    <img src="https://img.youtube.com/vi/SVaSJQo2iSk/maxresdefault.jpg" alt="MCP Technical Analysis Server Demo" width="100%">
  </a>
  <br><br>
  <div style="position: relative; width: 100%;">
    <div style="position: absolute; left: 0; display: flex; gap: 10px;">
      <a href="https://www.youtube.com/watch?v=SVaSJQo2iSk&autoplay=1">
        <img src="https://img.shields.io/badge/Coming_Soon-FF0000?style=for-the-badge" alt="Coming Soon">
      </a>
      <a href="https://nullshot.ai/brainstorm/c5ee234a-da45-4c8e-8b1b-2df3cc5abadb">
        <img src="https://img.shields.io/badge/Upvote_Now-00ADD8?style=for-the-badge&logo=null&logoColor=white" alt="Upvote Now">
      </a>
    </div>
  </div>
</div>


**🔥 Key Features:**
- 🔴 **52 Analysis & Trading Tools** - Complete market analysis + trading execution toolkit
- 📊 **Real-time Market Data** - Live prices, indicators, volume analysis
- 🎯 **Advanced Technical Analysis** - RSI, MACD, Fibonacci, Order Book, etc.
- 💰 **Risk Management** - Position sizing, stop loss, take profit calculations
- 📈 **Multi-Timeframe Analysis** - Daily, 4H, 1H trend alignment
- 🤖 **32 AI Prompts** - Pre-configured analysis workflows for Day Trading, Swing Trading, Position Trading
- 📚 **22 Resources** - Comprehensive analysis documentation with usage patterns guide
- 🔄 **Streaming Support** - HTTP/SSE for real-time updates
- 💹 **Hyperliquid Trading** - Testnet & Mainnet futures execution with slippage protection
- 🐋 **HyperScreener Integration** - Whale positions, liquidations, top traders, large trades data
- 📈 **Enhanced L2 Order Book** - Real-time bids/asks with depth and imbalance from Hyperliquid
- ✅ **Fully Tested** - All 52 tools validated and working (November 2024)

## 📋 Recent Updates (November 2024)

### Bug Fixes
- ✅ **CVD (Cumulative Volume Delta)** - Fixed null data issue, now returns cvdTrend and cvdDelta
- ✅ **HyperScreener API Integration** - Fixed URL construction bug that caused all HyperScreener data to return null
- ✅ **API Response Handling** - Fixed array response parsing (API returns `[]` not `{value:[]}`)
- ✅ **Parameter Corrections** - Fixed `position_value` → `notional_value`, `long_short_ratio` → `notional_value`

### New HyperScreener Endpoints
- `/node/market/summary` - All symbols with price change + liquidations
- `/node/market/summary/{SYMBOL}` - Per symbol market summary  
- `/market-data/funding-rates` - Funding rates per symbol
- `/market-data/open-interest` - Open interest per symbol
- `/market-data/volume` - Volume 24h per symbol
- `/market-data/stats/24h` - 24h aggregate stats

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

### 📊 **52 Complete Analysis & Trading Tools**
- **Market Data** (5): Price, indicators, volume analysis, multi-timeframe, external data
- **Order Book & Market** (8): Order book depth, volume profile, market structure, regime, patterns, divergence, liquidation, long/short ratio
- **Risk Management** (2): Position sizing and risk/reward calculations
- **Moving Averages** (10): MA envelope, VWMA, McGinley, Rainbow, Kaufman, Hull, WMA, SMMA, DEMA, TEMA
- **Oscillators** (18): Stochastic RSI, CMO, PPO, AO, Gator, Elder Ray, Fisher, KST, Schaff, Coppock, TSI, RVI, DPO, Momentum, ROC, Ultimate, TRIX
- **Merged Indicator Tools** (7): Volume indicators, volatility, trend, strength, channels, pivot points, patterns
- **Trading Execution** (2): Hyperliquid Testnet & Mainnet futures trading with intelligent slippage handling

### 📚 **22 Analysis Resources**
- Comprehensive documentation for trading strategies, risk management, and technical analysis
- API references and integration guides
- Specialized guides for volume analysis, Fibonacci, orderbook, and more
- **NEW:** Usage patterns guide for Day Trading, Swing Trading, Position Trading
- **NEW:** Complete tools reference (52 tools with parameters)

### 🤖 **32 AI Analysis Prompts**
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

### ⚡ Fastest Way - Streaming Mode (Recommended)

```bash
# Terminal 1 - Start Streaming Server
bash scripts/mcp-auto-start.sh

# Terminal 2 - Test with MCP client for analysis
pnpm run terminal
```

Server runs at `http://localhost:8787` with SSE streaming support for real-time market analysis!

📖 **Full Guide**: See [QUICKSTART.md](./QUICKSTART.md) and [STREAMING_GUIDE.md](./STREAMING_GUIDE.md)

### Installation:
```bash
# Clone the repository
git clone https://github.com/FajarArrizki/mcp-technical-analysis.git
cd mcp-technical-analysis

# Install dependencies
pnpm install

# Build the server
pnpm run build
```


### 🔧 MCP Client Configuration

#### Windows Configuration

**For Cursor IDE / Claude Desktop** (`mcp.json` or `.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "geartrade-v2": {
      "command": "cmd",
      "args": ["/c", "cd /d C:\\Users\\hp5cd\\mcp-technical-analysis\\mcp-technical-analysis\\packages\\geartrade-mcp-server && node dist\\local-server.js"],
      "env": {
        "CANDLES_COUNT": "75"
      },
      "description": "GearTrade MCP Server v2 - Windows"
    }
  }
}
```

#### Linux Configuration

**Start the server:**
```bash
cd /root/GEARTRADE
bash scripts/mcp-auto-start.sh
```

Server runs at `http://localhost:8787` with SSE streaming support!

**For Cursor IDE / Claude Desktop** (`.cursor/mcp.json` or `mcp.json`):
```json
{
  "mcpServers": {
    "mcp-technical-analysis": {
      "command": "bash",
      "args": ["/root/GEARTRADE/scripts/mcp-auto-start.sh"],
      "description": "MCP Technical Analysis Server - Localhost Only"
    }
  }
}
```

#### Claude Code (CLI) - Both Platforms

```bash
# Add the MCP server to Claude Code
claude mcp add --transport http mcp-technical-analysis http://localhost:8787/mcp

# List configured servers
claude mcp list

# Check server status in Claude Code
/mcp
```

#### Remote Access via mcp-remote

**For remote MCP connection** (`.mcp.json` in project root):
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

### 🔧 Tools (52)

| No | Tool Name | Description |
|----|-----------|-------------|
| | **Price & Market Data** | |
| 1 | `get_price` | Get latest prices for multiple trading tickers/symbols at once (e.g., ["BTC", "ETH", "SOL"]) |
| 2 | `get_indicators` | Get comprehensive technical analysis indicators for multiple trading tickers at once |
| 3 | `get_volume_analysis` | Get comprehensive volume analysis for multiple trading tickers at once |
| 4 | `get_Multitimeframe` | Get multi-timeframe trend alignment analysis (Daily, 4H, 1H) |
| 5 | `get_External_data` | Get external market data (funding rate, open interest, liquidations, whale positions, top traders, large trades from HyperScreener) |
| | **Order Book & Market Analysis** | |
| 6 | `get_orderbook_depth` | Get real-time L2 order book depth from Hyperliquid (bids/asks, spread, imbalance) |
| 7 | `get_volume_profile` | Get volume profile analysis (POC, VAH, VAL, HVN, LVN) |
| 8 | `get_market_structure` | Get market structure analysis (swing highs/lows, COC) |
| 9 | `get_market_regime` | Get market regime analysis (trending/ranging/volatile) |
| 10 | `get_candlestick_patterns` | Get candlestick pattern detection (doji, engulfing, etc.) |
| 11 | `get_divergence` | Get RSI/price divergence detection |
| 12 | `get_liquidation_levels` | Get liquidation level analysis with heatmap data from HyperScreener |
| 13 | `get_long_short_ratio` | Get long/short ratio with whale positions and top traders from HyperScreener |
| | **Risk Management** | |
| 14 | `calculate_risk_management` | Calculate stop loss, take profit, and risk/reward ratio |
| 15 | `calculate_position_setup` | Calculate position size, leverage, margin, and quantity |
| | **Moving Averages (Merged Tool)** | |
| 16 | `ma_envelope` | MA Envelope for volatility-based support/resistance |
| 17 | `vwma` | Volume-Weighted Moving Average |
| 18 | `mcginley_dynamic` | McGinley Dynamic - adaptive MA with reduced lag |
| 19 | `rainbow_ma` | Rainbow MA - multiple MAs for trend visualization |
| 20 | `kaufman_adaptive_ma` | Kaufman Adaptive MA - adjusts to market efficiency |
| 21 | `hull_ma` | Hull Moving Average - reduced lag, smooth trend |
| 22 | `weighted_ma` | Weighted Moving Average |
| 23 | `smoothed_ma` | Smoothed Moving Average |
| 24 | `double_ema` | Double Exponential Moving Average (DEMA) |
| 25 | `triple_ema` | Triple Exponential Moving Average (TEMA) |
| | **Oscillators (Merged Tool)** | |
| 26 | `stochastic_rsi` | Stochastic RSI - RSI with stochastic formula |
| 27 | `chande_momentum` | Chande Momentum Oscillator (-100 to +100) |
| 28 | `percentage_price_oscillator` | PPO - MACD as percentage |
| 29 | `accelerator_oscillator` | Accelerator Oscillator (Bill Williams) |
| 30 | `awesome_oscillator` | Awesome Oscillator - momentum via median price |
| 31 | `gator_oscillator` | Gator Oscillator - Alligator convergence/divergence |
| 32 | `elder_ray` | Elder-Ray Index - Bull/Bear Power |
| 33 | `fisher_transform` | Fisher Transform - Gaussian normalized reversals |
| 34 | `know_sure_thing` | KST - multi-timeframe ROC momentum |
| 35 | `schaff_trend_cycle` | Schaff Trend Cycle - MACD + Stochastic |
| 36 | `coppock_curve` | Coppock Curve - long-term momentum bottoms |
| 37 | `true_strength_index` | TSI - double-smoothed momentum |
| 38 | `relative_vigor_index` | RVI - close vs open momentum |
| 39 | `detrended_price` | Detrended Price Oscillator - cycle identification |
| 40 | `momentum` | Momentum Indicator - rate of price change |
| 41 | `rate_of_change` | ROC - percentage price change |
| 42 | `ultimate_oscillator` | Ultimate Oscillator - 3 timeframe combination |
| 43 | `trix` | TRIX - triple smoothed EMA rate of change |
| | **Volume Indicators (Merged Tool)** | |
| 44 | `volume_indicators` | Merged volume tool with types: chaikin_money_flow, chaikin_oscillator, klinger_oscillator, volume_oscillator, ease_of_movement, price_volume_trend, positive_volume_index, volume_roc, anchored_vwap, volume_zone_oscillator, money_flow_index |
| | **Volatility Indicators (Merged Tool)** | |
| 45 | `volatility_indicators` | Merged volatility tool with types: bollinger_band_width, bollinger_percent_b, chaikin_volatility, historical_volatility, mass_index, ulcer_index |
| | **Trend Indicators (Merged Tool)** | |
| 46 | `trend_indicators` | Merged trend tool with types: supertrend, alligator, ichimoku_cloud, vortex, linear_regression, r_squared |
| | **Strength Indicators (Merged Tool)** | |
| 47 | `strength_indicators` | Merged strength tool with types: bull_bear_power, force_index, center_of_gravity, balance_of_power, advance_decline_line |
| | **Channels (Merged Tool)** | |
| 48 | `channels` | Merged channels tool with types: keltner_channels, donchian_channels, price_channel |
| | **Pivot Points (Merged Tool)** | |
| 49 | `pivot_points` | Merged pivot tool with types: camarilla, standard, fibonacci_retracement |
| | **Patterns (Merged Tool)** | |
| 50 | `patterns` | Merged patterns tool with types: fractals, zigzag, change_of_character |
| | **Trading Execution (Hyperliquid)** | |
| 51 | `hyperliquid_testnet_futures_trade` | Execute futures trades on Hyperliquid TESTNET. Supports market/limit/custom orders, sizeInUsd ($100), leverage (1-100x), slippage protection (0.01%-50%), auto-fallback to GTC on no liquidity. |
| 52 | `hyperliquid_mainnet_futures_trade` | Execute REAL futures trades on Hyperliquid MAINNET. Safety checks: confirmExecution=true required, asset whitelist, min $10, max 25% equity. |

### 📚 Resources (22)

| No | Resource URI | Description |
|----|--------------|-------------|
| 1 | `geartrade://trading-strategies` | Comprehensive guide on trading strategies, technical analysis, and best practices for using MCP Technical Analysis Server |
| 2 | `geartrade://risk-management` | Guide on risk management, position sizing, stop loss, and take profit strategies |
| 3 | `geartrade://tools-overview` | Complete tools documentation and usage examples |
| 4 | `geartrade://execution-workflow` | Step-by-step guide for analysis to execution workflow |
| 5 | `geartrade://technical-indicators-guide` | Complete reference for all technical indicators and their usage |
| 6 | `geartrade://hyperliquid-api-reference` | Hyperliquid API documentation and integration guide |
| 7 | `geartrade://volume-analysis-guide` | Comprehensive volume analysis techniques and interpretation |
| 8 | `geartrade://fibonacci-trading-guide` | Fibonacci retracement and extension strategies |
| 9 | `geartrade://market-structure-guide` | Market structure analysis and change of character detection |
| 10 | `geartrade://orderbook-analysis-guide` | Order book depth analysis and market maker behavior |
| 11 | `geartrade://candlestick-patterns-guide` | Candlestick pattern recognition and trading signals |
| 12 | `geartrade://divergence-trading-guide` | RSI and price divergence identification and trading |
| 13 | `geartrade://liquidation-analysis-guide` | Liquidation level analysis and risk assessment |
| 14 | `geartrade://long-short-ratio-guide` | Long/short ratio analysis for market sentiment |
| 15 | `geartrade://spot-futures-divergence-guide` | Spot-futures price divergence opportunities |
| 16 | `geartrade://external-data-guide` | External market data integration and usage |
| 17 | `geartrade://multitimeframe-analysis-guide` | Multi-timeframe trend alignment analysis |
| 18 | `geartrade://moving-averages-guide` | Moving averages, envelopes, and trend analysis |
| 19 | `geartrade://momentum-oscillators-guide` | Momentum indicators and oscillator-based strategies |
| 20 | `geartrade://volume-indicators-guide` | Volume-based indicators and flow analysis |
| 21 | `geartrade://volatility-indicators-guide` | Volatility measurement and option strategies |
| 22 | `geartrade://usage-patterns` | **NEW:** Recommended usage patterns for Day Trading, Swing Trading, Position Trading |
| 23 | `geartrade://complete-tools` | **NEW:** Complete reference of all 52 MCP tools with parameters and use cases |

### 🤖 Prompts (32)

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

## 🏗️ Architecture

```
╔═══════════════════════════════════════════════════════════════════════╗
║                     MCP Technical Analysis Server                     ║
║                  AI-Powered Cryptocurrency Analysis                   ║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  ┌──────────────────────┐    ┌───────────────────────────────┐        ║
║  │   AI Assistants      │◄──►│      MCP Protocol             │        ║
║  │  ┌──────────────────┐│    │  ┌─────────────────────────┐  │        ║
║  │  │   Claude         ││    │  │  Tool Execution         │  │        ║
║  │  │   Cursor IDE     ││    │  │  Resource Access        │  │        ║
║  │  │   Custom Apps    ││    │  │  Prompt Management      │  │        ║
║  │  └──────────────────┘│    │  └─────────────────────────┘  │        ║
║  └──────────────────────┘    └───────────────────────────────┘        ║
║                                       │                               ║
║                                       ▼                               ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │                Core MCP Server (52 Tools incl. Trading)         │  ║
║  │  ┌───────────────────────┐  ┌───────────────────────────────┐   │  ║
║  │  │   Analysis Engine     │  │       Resources (20)          │   │  ║
║  │  │  ┌───────────────────┐│  │  ┌─────────────────────────┐  │   │  ║
║  │  │  │ Price Analysis    ││  │  │ Trading Strategies      │  │   │  ║
║  │  │  │ Technical Ind.    ││  │  │ Risk Management         │  │   │  ║
║  │  │  │ Volume Analysis   ││  │  │ Technical Indicators    │  │   │  ║
║  │  │  │ Risk Management   ││  │  │ API Documentation       │  │   │  ║
║  │  │  │ Market Structure  ││  │  │ Analysis Guides         │  │   │  ║
║  │  │  └───────────────────┘│  │  └─────────────────────────┘  │   │  ║
║  │  └───────────────────────┘  └───────────────────────────────┘   │  ║
║  │                                                                 │  ║
║  │  ┌───────────────────────┐  ┌───────────────────────────────┐   │  ║
║  │  │   AI Prompts (24)     │  │   Security & Validation       │   │  ║
║  │  │  ┌───────────────────┐│  │  ┌─────────────────────────┐  │   │  ║
║  │  │  │ Analysis Workflows││  │  │ Input Validation        │  │   │  ║
║  │  │  │ Research Prompts  ││  │  │ Trading Safety Checks   │  │   │  ║
║  │  │  │ Strategy Guides   ││  │  │ Slippage Protection     │  │   │  ║
║  │  │  └───────────────────┘│  │  └─────────────────────────┘  │   │  ║
║  │  └───────────────────────┘  └───────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                                       │                               ║
║                                       ▼                               ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │              Data Sources & Analysis Engine                     │  ║
║  │  ┌───────────────────────┐  ┌───────────────────────────────┐   │  ║
║  │  │   Market Data APIs    │  │    Analysis Components        │   │  ║
║  │  │  ┌───────────────────┐│  │  ┌─────────────────────────┐  │   │  ║
║  │  │  │ Hyperliquid       ││  │  │ Analysis Engine         │  │   │  ║
║  │  │  │ HyperScreener     ││  │  │ Technical Indicators    │  │   │  ║
║  │  │  │ Binance           ││  │  │ Market Intelligence     │  │   │  ║
║  │  │  └───────────────────┘│  │  └─────────────────────────┘  │   │  ║
║  │  └───────────────────────┘  └───────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                                       │                               ║
║                                       ▼                               ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │                Streaming & Deployment                           │  ║
║  │  ┌───────────────────────┐  ┌───────────────────────────────┐   │  ║
║  │  │   HTTP Streaming      │  │     Cloud Deployment          │   │  ║
║  │  │  ┌───────────────────┐│  │  ┌─────────────────────────┐  │   │  ║
║  │  │  │ Server-Sent       ││  │  │ Cloudflare Workers      │  │   │  ║
║  │  │  │ Events (SSE)      ││  │  │ Real-time Updates       │  │   │  ║
║  │  │  │ Remote Access     ││  │  │ Global CDN              │  │   │  ║
║  │  │  └───────────────────┘│  │  └─────────────────────────┘  │   │  ║
║  │  └───────────────────────┘  └───────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                                       │                               ║
║                                       ▼                               ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │                Trading Execution (Hyperliquid)                  │  ║
║  │  ┌───────────────────────┐  ┌───────────────────────────────┐   │  ║
║  │  │   Testnet Trading     │  │     Mainnet Trading           │   │  ║
║  │  │  ┌───────────────────┐│  │  ┌─────────────────────────┐  │   │  ║
║  │  │  │ Market/Limit/     ││  │  │ Safety Checks           │  │   │  ║
║  │  │  │ Custom Orders     ││  │  │ Asset Whitelist         │  │   │  ║
║  │  │  │ Slippage Control  ││  │  │ Position Limits         │  │   │  ║
║  │  │  │ GTC Fallback      ││  │  │ Confirm Required        │  │   │  ║
║  │  │  └───────────────────┘│  │  └─────────────────────────┘  │   │  ║
║  │  └───────────────────────┘  └───────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Component Details

**🎯 MCP Protocol Layer**
- **Tool Execution**: 52 specialized analysis & trading tools for comprehensive market intelligence
- **Resource Management**: 20 detailed documentation resources for research and education
- **Prompt System**: 24 AI-optimized prompts for structured analysis workflows

**🔒 Security & Validation Layer**
- **Input Validation**: Comprehensive Zod schema validation for all data inputs
- **Trading Safety**: Mainnet trading requires explicit confirmation, asset whitelist, position size limits
- **Testnet Support**: Full trading capabilities on testnet for safe testing
- **Configurable Slippage**: Dynamic slippage with auto-retry (0.01% to 50%)

**📊 Analysis Engine Components**
- **Technical Indicators**: 70+ indicators across momentum, volume, volatility, and trend analysis with correlation and market breadth indicators
- **Market Structure**: Advanced change-of-character detection, market regime analysis, and fractal analysis
- **Enhanced Analytics**: Bounce analysis, trend detection, correlation coefficients, and multi-timeframe analysis
- **Risk Management**: Position sizing, stop-loss, take-profit, and trailing stop calculations for research purposes
- **Multi-Timeframe**: Cross-timeframe trend alignment and confirmation signals

**🌐 Data Integration**
- **Real-time Market Data**: Live price feeds from Hyperliquid and Binance
- **HyperScreener Data**: Liquidations, whale positions, long/short ratio, large trades, top traders
- **L2 Order Book**: Real-time bids/asks from Hyperliquid with spread and imbalance analysis
- **Advanced Analytics**: Comprehensive technical analysis and market intelligence
- **Streaming Architecture**: Server-sent events for real-time data updates
- **Cloud Deployment**: Global CDN distribution via Cloudflare Workers
- **Parallel Fetching**: Hyperliquid metadata, allMids, and HyperScreener data fetched in parallel
- **Smart Caching**: HyperScreener (60s), L2 Order Book (5s), AllMids (3s)

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
GEARTRADE/
├── packages/
│   └── geartrade-mcp-server/               # Main MCP server package
│       ├── src/
│       │   ├── index.ts                    # MCP server entry (80 tools, 20 resources, 24 prompts)
│       │   └── signal-generation/          # Analysis engine modules
│       │       ├── ai/                     # AI integration
│       │       ├── analysis/               # Market analysis modules
│       │       ├── config/                 # Configuration
│       │       ├── data-fetchers/          # Market data sources
│       │       ├── exit-conditions/        # Exit condition logic
│       │       ├── formatting/             # Data formatting utilities
│       │       ├── monitoring/             # Monitoring and logging
│       │       ├── position-management/    # Position management
│       │       ├── risk-management/        # Risk management
│       │       ├── signal-generation/      # Signal generation logic
│       │       ├── technical-indicators/   # Technical analysis
│       │       ├── types/                  # TypeScript types
│       │       ├── utils/                  # Utilities
│       │       └── validation/             # Input validation
│       ├── local-server.ts                 # HTTP/SSE streaming server for MCP
│       ├── package.json                    # MCP server package configuration
│       ├── tsconfig.json                   # TypeScript configuration
│       └── dist/                           # Compiled JavaScript output
├── scripts/                                # Utility scripts
│   └── mcp-auto-start.sh                   # Auto-start MCP server
├── config-backups/                         # Configuration backup files
├── logs/                                   # Application logs
├── package.json                            # Workspace root config
├── pnpm-workspace.yaml                     # PNPM workspace config
├── pnpm-lock.yaml                          # Dependency lock file
├── package-lock.json                       # NPM dependency lock file
├── mcp.json                                # MCP configuration
├── LICENSE                                 # MIT License
└── README.md                               # This file
```

### Key Directories

| No | Directory | Description |
|----|-----------|-------------|
| 1 | `packages/geartrade-mcp-server/src/index.ts` | Main MCP server entry with 80 analysis tools, 20 resources, 24 prompts |
| 2 | `packages/geartrade-mcp-server/local-server.ts` | HTTP/SSE streaming server for remote MCP client connections |
| 3 | `packages/geartrade-mcp-server/package.json` | MCP server package configuration and dependencies |
| 4 | `packages/geartrade-mcp-server/tsconfig.json` | TypeScript configuration for MCP server compilation |
| 5 | `packages/geartrade-mcp-server/src/signal-generation/` | Core analysis engine with market intelligence and indicators |
| 6 | `packages/geartrade-mcp-server/src/signal-generation/analysis/` | Market analysis modules for pattern recognition |
| 7 | `packages/geartrade-mcp-server/src/signal-generation/technical-indicators/` | Technical indicator implementations (70+ indicators) |
| 8 | `packages/geartrade-mcp-server/src/signal-generation/data-fetchers/` | Multi-source market data fetchers (Hyperliquid, HyperScreener, Binance) |
| 9 | `packages/geartrade-mcp-server/src/signal-generation/risk-management/` | Risk assessment and position sizing calculations |
| 10 | `packages/geartrade-mcp-server/src/signal-generation/ai/` | Market analysis utilities |
| 11 | `packages/geartrade-mcp-server/src/signal-generation/monitoring/` | Real-time market monitoring and alerts |
| 12 | `scripts/` | Utility scripts for development and deployment |
| 13 | `logs/` | Application logs and debugging information |

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
  - `confirmExecution: true` required
  - Asset whitelist (BTC, ETH, SOL, etc.)
  - Minimum order value: $10
  - Maximum position size: 25% of equity
- ✅ Configurable slippage protection (0.01% - 50%)
- ✅ Auto-fallback to GTC orders on no liquidity
- ✅ Environment variables for wallet security (AGENT_WALLET_PRIVATE_KEY, MAIN_WALLET_ADDRESS)

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
