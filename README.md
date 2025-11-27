# GearTrade MCP Server

🤖 **Model Context Protocol Server for AI-Powered Cryptocurrency Analysis**

A comprehensive Model Context Protocol (MCP) server that bridges AI assistants with professional cryptocurrency market analysis capabilities. This server transforms AI conversations by providing real-time market data, sophisticated technical analysis, and intelligent trading insights through standardized MCP protocols. Whether you're building analysis tools, research systems, or AI financial advisors, this server delivers the complete infrastructure needed for data-driven market analysis and decision-making across multiple timeframes and asset classes.

**🔥 Key Features:**
- 🔴 **81+ Analysis Tools** - Complete market analysis toolkit
- 📊 **Real-time Market Data** - Live prices, indicators, volume analysis
- 🎯 **Advanced Technical Analysis** - RSI, MACD, Fibonacci, Order Book, etc.
- 💰 **Risk Management** - Position sizing, stop loss, take profit calculations
- 📈 **Multi-Timeframe Analysis** - Daily, 4H, 1H trend alignment
- 🤖 **24 AI Prompts** - Pre-configured analysis workflows
- 📚 **20 Resources** - Comprehensive trading documentation
- 🔄 **Streaming Support** - HTTP/SSE for real-time updates
- 📈 **Analysis-Only Focus** - Pure market intelligence without execution risks

🏠 **Local Development:** Run the MCP server locally for full control and privacy  
🌐 **HTTP Streaming:** Remote MCP connection via `mcp-remote` for Cursor IDE

## 🌟 **What's Included**

### 📊 **81+ Complete Analysis Tools**
- **Price Tools** (2): Real-time pricing for single/multiple assets
- **Technical Analysis** (2): 20+ indicators (RSI, EMA, MACD, Bollinger Bands, ATR, ADX, etc.)
- **Volume Analysis** (2): Buy/sell pressure, CVD, liquidity zones analysis
- **Multi-Timeframe** (2): Daily, 4H, 1H trend alignment analysis
- **Advanced Analysis** (3): Fibonacci, Order Book Depth, Liquidation Levels
- **Market Analysis** (8): Volume Profile, Market Structure, Candlestick Patterns, Divergence, Long/Short Ratio, Spot-Futures Divergence, External Data
- **Risk Management** (2): Position sizing, stop loss, take profit calculations
- **Comprehensive Analysis** (2): Complete crypto analysis with position setup
- **Analysis Tools** (4): Advanced market intelligence and research capabilities
- **Batch Operations** (11): Multi-asset analysis for all above tools

### 📚 **20 Analysis Resources**
- `geartrade://trading-strategies` - Comprehensive trading strategies guide
- `geartrade://risk-management` - Risk management best practices
- `geartrade://tools-overview` - Complete tools overview
- `geartrade://analysis-workflow` - Market analysis and research workflow
- `geartrade://technical-indicators-guide` - Technical indicators guide
- `geartrade://hyperliquid-api-reference` - Hyperliquid API reference
- Plus 13 more specialized guides (volume analysis, fibonacci, orderbook, etc.)

### 🤖 **24 AI Analysis Prompts**
- **Core Analysis**: `analyze_and_research`, `multi_asset_scan`, `comprehensive_analysis`
- **Technical Analysis**: `technical_indicator_analysis`, `volume_profile_analysis`, `market_structure_analysis`
- **Advanced**: `divergence_scan`, `liquidation_analysis`, `fibonacci_analysis_strategy`, `spot_futures_analysis`
- **Risk Management**: `risk_analysis`, `market_monitoring`, `portfolio_review`, `volatility_analysis`
- Plus 12 more specialized prompts

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


### 🔧 Configure MCP Client

## 🚀 Quick Start - MCP Integration

### Option 1: HTTP Streaming Mode (Recommended)

**Start the server:**
```bash
cd /root/GEARTRADE
bash scripts/mcp-auto-start.sh
```

Server runs at `http://localhost:8787` with SSE streaming support!

**Configure Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "geartrade-local-stream": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/mcp"
      ],
    }
  }
}
```

**Note:** Server runs with default configurations for analysis. No additional setup required.

### MCP Client Configuration

**For Cursor IDE** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "bash",
      "args": ["/root/GEARTRADE/scripts/mcp-auto-start.sh"],
      "description": "GearTrade MCP Server - Localhost Only"
    }
  }
}
```

**For Claude Code (CLI)**:
```bash
# Add the MCP server to Claude Code
claude mcp add --transport http geartrade http://localhost:8787/mcp

# List configured servers
claude mcp list

# Check server status in Claude Code
/mcp
```

**For Claude Desktop** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "geartrade": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

**Alternative: Inline in plugin.json** (for plugin development):
```json
{
  "name": "my-plugin",
  "mcpServers": {
    "geartrade": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8787/mcp"]
    }
  }
}
```

## 📦 MCP Capabilities

### 🔧 Tools (81+)

| Tool Name | Description |
|-----------|-------------|
| **Price & Market Data** | |
| `get_price` | Get latest prices for multiple trading tickers/symbols at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_indicators` | Get comprehensive technical analysis indicators for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_volume_analysis` | Get comprehensive volume analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_Multitimeframe` | Get multi-timeframe trend alignment analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_External_data` | Get external market data for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| **Order Book & Market Depth** | |
| `get_orderbook_depth` | Get order book depth analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_volume_profile` | Get volume profile analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| **Market Structure & Patterns** | |
| `get_market_structure` | Get market structure analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_candlestick_patterns` | Get candlestick pattern detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_divergence` | Get RSI divergence detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_liquidation_levels` | Get liquidation level analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| `get_long_short_ratio` | Get long/short ratio analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"]) |
| **Risk Management & Position Sizing** | |
| `calculate_risk_management` | Calculate stop loss, take profit, and risk/reward ratio for a trading position |
| `calculate_position_setup` | Calculate position size, leverage, margin, and quantity for a trading signal |
| **Comprehensive Analysis** | |
| `analisis_crypto` | Get comprehensive trading analysis for multiple crypto assets at once. This tool aggregates all available data for complete market analysis across multiple tickers. |
| **Moving Averages & Trend Indicators** | |
| `ma_envelope` | Calculate moving average envelopes for volatility-based support/resistance and overbought/oversold signals |
| `vwma` | Calculate volume-weighted moving average that gives more weight to periods with higher volume |
| `mcginley_dynamic` | Calculate adaptive moving average that adjusts to market volatility and reduces lag compared to traditional MAs |
| `rainbow_ma` | Calculate multiple moving averages with different periods for comprehensive trend visualization and alignment analysis |
| `kaufman_adaptive_ma` | Calculate adaptive moving average that adjusts smoothing based on market efficiency and volatility |
| `hull_moving_average` | Calculate Hull Moving Average that reduces lag while maintaining smoothness for better trend identification |
| `weighted_moving_average` | Calculate Weighted Moving Average that gives more weight to recent prices for responsive trend analysis |
| `smoothed_moving_average` | Calculate Smoothed Moving Average that provides smooth trend following with reduced noise |
| `double_exponential_moving_average` | Calculate Double Exponential Moving Average that reduces lag compared to traditional EMA |
| `triple_exponential_moving_average` | Calculate Triple Exponential Moving Average that further reduces lag and provides smooth trend signals |
| **Momentum & Oscillator Indicators** | |
| `detrended_price_oscillator` | Calculate detrended price oscillator that removes trend from price data to identify cycles and overbought/oversold conditions |
| `relative_vigor_index` | Calculate Relative Vigor Index that compares close vs open momentum to identify trend strength and reversals |
| `gator_oscillator` | Calculate Gator Oscillator that shows convergence/divergence of Alligator lines and identifies trend strength |
| `elder_ray` | Calculate Elder-Ray Index that measures buying and selling pressure using Bull Power and Bear Power |
| `fisher_transform` | Calculate Fisher Transform that normalizes price data using Gaussian distribution for sharp reversal signals |
| `know_sure_thing` | Calculate Know Sure Thing oscillator that combines multiple timeframe ROC calculations for momentum analysis |
| `chande_momentum_oscillator` | Calculate Chande Momentum Oscillator that measures momentum on both up and down moves with range of -100 to +100 |
| `bull_bear_power` | Calculate Bull Bear Power that measures the strength of bulls vs bears using price action and volume |
| `true_strength_index` | Calculate True Strength Index that uses double-smoothed momentum to reduce noise and provide clearer signals |
| `percentage_price_oscillator` | Calculate Percentage Price Oscillator that expresses MACD as a percentage for better cross-asset comparability |
| `accelerator_oscillator` | Calculate Accelerator Oscillator from Bill Williams trading system that measures acceleration/deceleration of momentum |
| `schaff_trend_cycle` | Calculate Schaff Trend Cycle that combines MACD with Stochastic oscillator and double smoothing for early trend signals |
| `coppock_curve` | Calculate Coppock Curve that combines two ROC periods for identifying major market bottoms and long-term momentum |
| `stochastic_rsi` | Calculate Stochastic RSI that applies stochastic oscillator formula to RSI values |
| `money_flow_index` | Calculate Money Flow Index that uses price and volume to measure buying and selling pressure |
| `ultimate_oscillator` | Calculate Ultimate Oscillator that combines three different timeframes to reduce false signals |
| `balance_of_power` | Calculate Balance of Power that measures the strength of buyers vs sellers by analyzing the relationship between price close and range |
| **Volume & Flow Indicators** | |
| `klinger_oscillator` | Calculate Klinger Volume Oscillator that combines volume and price action for volume-based trend analysis |
| `volume_oscillator` | Calculate Volume Oscillator that compares short-term and long-term volume moving averages to identify volume trends |
| `ease_of_movement` | Calculate Ease of Movement that measures how easily price moves by combining price change and volume |
| `price_volume_trend` | Calculate Price Volume Trend that accumulates volume based on price percentage changes |
| `positive_volume_index` | Calculate Positive Volume Index that accumulates price changes on days when volume increases from the previous day |
| `volume_roc` | Calculate Volume Rate of Change that measures the percentage change in volume over a specified period |
| `anchored_vwap` | Calculate Anchored VWAP that computes volume-weighted average price from a specific anchor point instead of session start |
| `chaikin_money_flow` | Calculate Chaikin Money Flow that provides volume-weighted measure of accumulation/distribution over a specified period |
| `volume_zone_oscillator` | Calculate Volume Zone Oscillator that analyzes volume distribution across price zones to identify accumulation/distribution patterns |
| `chaikin_volatility` | Calculate Chaikin Volatility that measures the rate of change of the trading range over a specified period |
| **Volatility & Statistical Indicators** | |
| `mass_index` | Calculate Mass Index that uses EMA of High-Low range to identify potential reversals when the index exceeds 27 |
| `ulcer_index` | Calculate Ulcer Index that measures downside volatility and risk by focusing on drawdowns from recent highs |
| `bollinger_percent_b` | Calculate Bollinger %B that shows where the price is relative to the Bollinger Bands |
| `bollinger_band_width` | Calculate Bollinger Band Width that measures the distance between the upper and lower bands |
| `historical_volatility` | Calculate Historical Volatility that measures the standard deviation of price changes over a specified period |
| `trix` | Calculate TRIX (Triple Exponential Average) oscillator that shows the rate of change of a triple exponentially smoothed moving average |
| `vortex` | Calculate Vortex Indicator that identifies the start of a new trend by comparing upward and downward price movements |
| `center_of_gravity` | Calculate Center of Gravity oscillator that identifies potential reversal points based on weighted moving averages |
| **Price Channels & Support/Resistance** | |
| `price_channel` | Calculate price channels using highest high and lowest low for support/resistance and breakout signals |
| `pivot_camarilla` | Calculate Camarilla Pivot Points for advanced support and resistance levels |
| `fibonacci_retracement` | Calculate Fibonacci retracement levels for potential support and resistance zones |
| `standard_pivot_points` | Calculate Standard Pivot Points for traditional support and resistance levels |
| `keltner_channels` | Calculate Keltner Channels that combine moving averages with ATR for volatility-based support and resistance |
| `donchian_channels` | Calculate Donchian Channels using highest high and lowest low over a specified period |
| **Complex Indicators** | |
| `alligator` | Calculate Alligator Indicator from Bill Williams trading system using three smoothed moving averages |
| `awesome_oscillator` | Calculate Awesome Oscillator that shows momentum changes using simple moving averages of the median price |
| `ichimoku_cloud` | Calculate Ichimoku Cloud for comprehensive trend analysis with multiple timeframe support/resistance |
| `r_squared` | Calculate R-squared (coefficient of determination) to measure how well data fits a statistical model |
| `momentum_indicator` | Calculate Momentum Indicator that measures the rate of price change over a specified period |
| `rate_of_change` | Calculate Rate of Change that measures the percentage change in price over a specified period |
| `force_index` | Calculate Force Index that combines price change direction with volume to measure buying/selling pressure |
| `supertrend` | Calculate SuperTrend indicator that combines ATR and price action for trend-following stop levels |
| `linear_regression` | Calculate linear regression line, slope, intercept, R-squared, and regression bands for trend analysis |
| **Breadth & Market Indicators** | |
| `advance_decline_line` | Calculate Advance Decline Line that measures market breadth by comparing advancing vs declining assets |
| **Fractal & Pattern Recognition** | |
| `fractals` | Calculate Bill Williams Fractals that identify potential reversal points in price action |
| `zigzag_indicator` | Calculate ZigZag indicator that filters out market noise and shows significant price swings |
| `trend_detection` | Detect market trends and change of character points using advanced market structure analysis |
| **Price Action & Candlestick** | |
| `chaikin_oscillator` | Calculate Chaikin Oscillator that combines accumulation/distribution with exponential moving averages |

### 📚 Resources (20)

| Resource URI | Description |
|--------------|-------------|
| `geartrade://trading-strategies` | Comprehensive guide on trading strategies, technical analysis, and best practices for using GearTrade MCP Server |
| `geartrade://risk-management` | Guide on risk management, position sizing, stop loss, and take profit strategies |
| `geartrade://tools-overview` | Complete tools documentation and usage examples |
| `geartrade://execution-workflow` | Step-by-step guide for analysis to execution workflow |
| `geartrade://technical-indicators-guide` | Complete reference for all technical indicators and their usage |
| `geartrade://hyperliquid-api-reference` | Hyperliquid API documentation and integration guide |
| `geartrade://volume-analysis-guide` | Comprehensive volume analysis techniques and interpretation |
| `geartrade://fibonacci-trading-guide` | Fibonacci retracement and extension strategies |
| `geartrade://market-structure-guide` | Market structure analysis and change of character detection |
| `geartrade://orderbook-analysis-guide` | Order book depth analysis and market maker behavior |
| `geartrade://candlestick-patterns-guide` | Candlestick pattern recognition and trading signals |
| `geartrade://divergence-trading-guide` | RSI and price divergence identification and trading |
| `geartrade://liquidation-analysis-guide` | Liquidation level analysis and risk assessment |
| `geartrade://long-short-ratio-guide` | Long/short ratio analysis for market sentiment |
| `geartrade://spot-futures-divergence-guide` | Spot-futures price divergence opportunities |
| `geartrade://external-data-guide` | External market data integration and usage |
| `geartrade://multitimeframe-analysis-guide` | Multi-timeframe trend alignment analysis |
| `geartrade://moving-averages-guide` | Moving averages, envelopes, and trend analysis |
| `geartrade://momentum-oscillators-guide` | Momentum indicators and oscillator-based strategies |
| `geartrade://volume-indicators-guide` | Volume-based indicators and flow analysis |
| `geartrade://volatility-indicators-guide` | Volatility measurement and option strategies |

### 🤖 Prompts (24)

| Prompt Name | Description |
|-------------|-------------|
| **Core Trading Prompts** | |
| `analyze_and_execute` | Analyze a crypto asset and prepare execution plan with risk management |
| `multi_asset_scan` | Scan multiple assets for trading opportunities |
| `comprehensive_analysis` | Complete market analysis with technical indicators and risk assessment |
| **Quick Analysis Prompts** | |
| `quick_price_check` | Fast price check with basic market data |
| `trend_analysis` | Trend direction and strength analysis |
| `market_overview` | High-level market sentiment and key levels |
| **Technical Analysis Prompts** | |
| `technical_indicator_analysis` | Deep dive into technical indicators and signals |
| `volume_profile_analysis` | Volume profile and liquidity analysis |
| `market_structure_analysis` | Market structure and change of character detection |
| **Advanced Strategy Prompts** | |
| `divergence_scan` | RSI and price divergence identification |
| `liquidation_analysis` | Liquidation level analysis and risk zones |
| `fibonacci_trading_strategy` | Fibonacci retracement and extension trading |
| `spot_futures_arbitrage` | Spot-futures price divergence opportunities |
| **Risk Management Prompts** | |
| `risk_analysis` | Comprehensive risk assessment and position sizing |
| `position_monitoring` | Active position monitoring and adjustment recommendations |
| `portfolio_review` | Portfolio performance and rebalancing analysis |
| `volatility_analysis` | Volatility measurement and risk assessment |
| **Specialized Trading Prompts** | |
| `entry_exit_strategy` | Entry and exit timing optimization |
| `momentum_trading` | Momentum-based trading strategies |
| `mean_reversion` | Mean reversion trading opportunities |
| `breakout_trading` | Breakout pattern recognition and execution |
| `scalping_strategy` | High-frequency scalping strategies |
| `swing_trading` | Medium-term swing trading analysis |
| `trend_following` | Long-term trend following strategies |
| `arbitrage_opportunities` | Cross-exchange and cross-asset arbitrage |
| `options_strategy` | Options trading and volatility plays |

## 🏗️ Architecture

```
╔═══════════════════════════════════════════════════════════════════════╗
║                        GearTrade MCP Server                           ║
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
║  │                  Core MCP Server (81 Tools)                     │  ║
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
║  │  │  │ Research Prompts  ││  │  │ Analysis-Only Mode      │  │   │  ║
║  │  │  │ Strategy Guides   ││  │  │ No Execution Risk       │  │   │  ║
║  │  │  └───────────────────┘│  │  └─────────────────────────┘  │   │  ║
║  │  └───────────────────────┘  └───────────────────────────────┘   │  ║
║  └─────────────────────────────────────────────────────────────────┘  ║
║                                       │                               ║
║                                       ▼                               ║
║  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │              Data Sources & AI Integration                      │  ║
║  │  ┌───────────────────────┐  ┌───────────────────────────────┐   │  ║
║  │  │   Market Data APIs    │  │      AI Providers             │   │  ║
║  │  │  ┌───────────────────┐│  │  ┌─────────────────────────┐  │   │  ║
║  │  │  │ Hyperliquid       ││  │  │ OpenRouter              │  │   │  ║
║  │  │  │ Binance           ││  │  │ OpenAI                  │  │   │  ║
║  │  │  │ Real-time Data    ││  │  │ Custom Models           │  │   │  ║
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
╚═══════════════════════════════════════════════════════════════════════╝
```

### Component Details

**🎯 MCP Protocol Layer**
- **Tool Execution**: 81+ specialized analysis tools for comprehensive market intelligence
- **Resource Management**: 20 detailed documentation resources for research and education
- **Prompt System**: 24 AI-optimized prompts for structured analysis workflows

**🔒 Security & Validation Layer**
- **Analysis-Only Environment**: Pure market research with zero execution capabilities
- **Input Validation**: Comprehensive Zod schema validation for all data inputs
- **Read-Only Access**: Market data access without trading permissions
- **No Credentials Required**: Zero wallet or API key dependencies for core functionality

**📊 Analysis Engine Components**
- **Technical Indicators**: 70+ indicators across momentum, volume, volatility, and trend analysis
- **Market Structure**: Advanced change-of-character detection and fractal analysis
- **Risk Management**: Position sizing and stop-loss calculations for research purposes
- **Multi-Timeframe**: Cross-timeframe trend alignment and confirmation signals

**🌐 Data Integration**
- **Real-time Market Data**: Live price feeds from Hyperliquid and Binance
- **AI Enhancement**: OpenRouter and OpenAI integration for intelligent analysis
- **Streaming Architecture**: Server-sent events for real-time data updates
- **Cloud Deployment**: Global CDN distribution via Cloudflare Workers

## 📁 Project Structure

```
GEARTRADE/
├── packages/
│   └── geartrade-mcp-server/               # Main MCP server package
│       ├── src/
│       │   ├── index.ts                    # MCP server entry (81+ tools, 20 resources, 24 prompts)
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
│       │   └── index.ts                    # Main MCP server entry (81+ tools, 20 resources, 24 prompts)
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

| Directory | Description |
|-----------|-------------|
| `packages/geartrade-mcp-server/src/index.ts` | Main MCP server entry with 81+ analysis tools, 20 resources, 24 prompts |
| `packages/geartrade-mcp-server/local-server.ts` | HTTP/SSE streaming server for remote MCP client connections |
| `packages/geartrade-mcp-server/package.json` | MCP server package configuration and dependencies |
| `packages/geartrade-mcp-server/tsconfig.json` | TypeScript configuration for MCP server compilation |
| `packages/geartrade-mcp-server/src/signal-generation/` | Core analysis engine with market intelligence and indicators |
| `packages/geartrade-mcp-server/src/signal-generation/analysis/` | Market analysis modules for pattern recognition |
| `packages/geartrade-mcp-server/src/signal-generation/technical-indicators/` | Technical indicator implementations (70+ indicators) |
| `packages/geartrade-mcp-server/src/signal-generation/data-fetchers/` | Multi-source market data fetchers (Hyperliquid, Binance, etc.) |
| `packages/geartrade-mcp-server/src/signal-generation/risk-management/` | Risk assessment and position sizing calculations |
| `packages/geartrade-mcp-server/src/signal-generation/ai/` | AI integration for enhanced market analysis |
| `packages/geartrade-mcp-server/src/signal-generation/monitoring/` | Real-time market monitoring and alerts |
| `scripts/` | Utility scripts for development and deployment |
| `logs/` | Application logs and debugging information |

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

## 🔐 Security & Analysis-Only Focus

### Pure Analysis Environment
This server is designed exclusively for market analysis and research. No trading execution capabilities are included.

**Security Features:**
- ✅ No wallet credentials required
- ✅ Zod schema validation for all inputs
- ✅ Read-only market data access
- ✅ No execution permissions
- ✅ Analysis-focused security model
- ✅ Multi-user support for research teams

## 🌐 API Endpoints (HTTP Streaming Mode)

When running `bash scripts/mcp-auto-start.sh`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `http://localhost:8787/` | GET | Server info & documentation |
| `http://localhost:8787/health` | GET | Health check (JSON) |
| `http://localhost:8787/mcp` | POST | MCP JSON-RPC endpoint |
| `http://localhost:8787/stream` | GET/POST | SSE streaming endpoint |

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

*Built for the AI analysis community - empowering AI assistants with professional market analysis capabilities*
