# Tools Module - Modular Structure

This directory contains all MCP tools organized by functionality category.

## 📁 Directory Structure

```
tools/
├── index.ts                  # Main entry point - exports all tools
├── indicators/               # Technical analysis indicators (9 tools)
│   ├── index.ts
│   ├── moving-averages.ts
│   ├── oscillators.ts
│   ├── volume-indicators.ts
│   ├── volatility-indicators.ts
│   ├── channels.ts
│   ├── pivot-points.ts
│   ├── trend-indicators.ts
│   ├── patterns.ts
│   └── strength-indicators.ts
├── trading/                  # Trading execution & risk (6 tools)
│   ├── index.ts
│   ├── hyperliquid-testnet-futures-trade.ts
│   ├── hyperliquid-mainnet-futures-trade.ts
│   ├── spot-trading.ts
│   ├── close-position.ts
│   └── risk-management-tools.ts
├── account/                  # Account management (3 tools)
│   ├── index.ts
│   ├── memory-tools.ts
│   ├── hyperliquid-account-operations.ts
│   └── hyperliquid-bridge-operations.ts
├── analysis/                 # Market analysis (15 tools)
│   ├── index.ts
│   ├── market-sentiment.ts
│   ├── market-data-tools.ts
│   ├── technical-analysis-tools.ts
│   ├── pattern-analysis-tools.ts
│   └── whale-analysis-tools.ts
└── data/                     # Data fetching (3 tools)
    ├── index.ts
    └── price-position-tools.ts
```

## 📊 Categories Overview

### 1. **Indicators** (9 tools)
Technical analysis indicators for market analysis:
- **Moving Averages**: MA Envelope, VWMA, McGinley Dynamic, Rainbow MA, Kaufman Adaptive MA
- **Oscillators**: Stochastic RSI, Chande Momentum, PPO, Accelerator, Awesome, Gator, Elder Ray, Fisher Transform, KST, Schaff Trend Cycle, Coppock Curve, TSI, RVI, DPO, Momentum, ROC, Ultimate Oscillator, TRIX
- **Volume**: CMF, Chaikin Oscillator, Volume Oscillator, PVT, PVI, Volume ROC, VZO, MFI
- **Volatility**: BB Width, %B, Chaikin Volatility, Historical Volatility, Mass Index, Ulcer Index
- **Channels**: Keltner Channels, Donchian Channels, Price Channel
- **Pivot Points**: Camarilla, Standard, Fibonacci Retracement
- **Trend**: SuperTrend, Alligator, Ichimoku Cloud, Vortex, Linear Regression, R-Squared
- **Patterns**: Fractals, ZigZag, Change of Character
- **Strength**: Bull Bear Power, Force Index, Center of Gravity, Balance of Power

### 2. **Trading** (6 tools)
Tools for executing and managing trades:
- **Testnet Futures**: Execute futures trades on Hyperliquid testnet
- **Mainnet Futures**: Execute real futures trades on Hyperliquid mainnet
- **Spot Trading**: Buy/sell spot tokens with slippage protection
- **Close Position**: Close or reduce existing positions
- **Risk Management Tools** (2 tools):
  - calculate_risk_management: Calculate stop loss, take profit, risk/reward ratio
  - calculate_position_setup: Calculate position size, leverage, margin, quantity

### 3. **Account** (3 tools)
Account management and memory operations:
- **Memory Tools**: 8 operations (save preference, log trade, get insights, check pattern, remember, recall, get all, delete)
- **Account Operations**: 6 operations (check spot balance, check perp balance, transfer spot↔perp, send spot token, send USD)
- **Bridge Operations**: 2 operations (withdraw to Arbitrum, check withdraw status)

### 4. **Analysis** (15 tools)
Market-wide analysis tools:
- **Market Sentiment**: Fear & Greed Index, BTC Dominance, Funding Rate Summary
- **Market Data Tools** (4 tools):
  - get_indicators: Comprehensive technical indicators
  - get_volume_analysis: Volume analysis
  - get_Multitimeframe: Multi-timeframe trend alignment
  - get_External_data: External market data (funding, OI, liquidations)
- **Technical Analysis Tools** (4 tools):
  - get_orderbook_depth: L2 order book depth analysis
  - get_volume_profile: Volume profile analysis
  - get_market_structure: Market structure analysis
  - get_market_regime: Market regime (trending/choppy/volatile)
- **Pattern Analysis Tools** (4 tools):
  - get_candlestick_patterns: Candlestick pattern detection
  - get_divergence: RSI divergence detection
  - get_liquidation_levels: Liquidation level analysis with heatmap
  - get_long_short_ratio: Long/short ratio analysis
- **Whale Analysis Tools** (2 tools):
  - get_whale_position: Track positions from wallet addresses
  - get_tier_classification: Market breakdown by trader tier

### 5. **Data** (3 tools)
Data fetching tools:
- **get_price**: Get latest prices for multiple tickers
- **get_position**: Get current open positions and account info
- **get_correlation_analysis**: BTC dominance, altcoin correlation, beta analysis

## 🔧 Usage

### Import All Tools
```typescript
import { registerAllMergedTools } from './tools'

// Register all tools at once
registerAllMergedTools(server)
```

### Import by Category
```typescript
import { 
  registerIndicatorTools,
  registerTradingTools,
  registerAccountTools,
  registerAnalysisTools
} from './tools'

// Register only specific categories
registerIndicatorTools(server)
registerTradingTools(server)
```

### Import Individual Tools
```typescript
import { 
  registerMovingAveragesTool,
  registerOscillatorsTool,
  registerTestnetFuturesTradeTool
} from './tools'

// Register individual tools
registerMovingAveragesTool(server)
registerTestnetFuturesTradeTool(server)
```

## 📝 Adding New Tools

### Step 1: Create Tool File
Add your tool file to the appropriate category directory:
```typescript
// tools/indicators/my-new-indicator.ts
import { z } from 'zod'

export function registerMyNewIndicatorTool(server: any) {
  server.registerTool(
    "my_new_indicator",
    {
      title: "My New Indicator",
      description: "Description of your indicator",
      inputSchema: z.object({
        // your schema
      })
    },
    async (params: any) => {
      // your implementation
    }
  )
}
```

### Step 2: Update Category Index
Add export to the category's `index.ts`:
```typescript
// tools/indicators/index.ts
import { registerMyNewIndicatorTool } from './my-new-indicator'

export function registerIndicatorTools(server: any) {
  // ... existing tools
  registerMyNewIndicatorTool(server)
}

export { registerMyNewIndicatorTool }
```

### Step 3: Update Main Index
Add re-export to main `tools/index.ts`:
```typescript
// tools/index.ts
export {
  // ... existing exports
  registerMyNewIndicatorTool
} from './indicators'
```

## 🎯 Benefits of Modular Structure

1. **Better Organization**: Tools grouped by functionality
2. **Easy Navigation**: Find tools quickly by category
3. **Selective Loading**: Import only needed categories
4. **Maintainability**: Changes isolated to specific categories
5. **Scalability**: Easy to add new tools and categories
6. **Clear Ownership**: Each category has clear responsibility
7. **Type Safety**: Full TypeScript support maintained
8. **Backward Compatible**: Old imports still work

## 📦 Total Tools Count

- **Indicators**: 9 tools
- **Trading**: 6 tools (4 execution + 2 risk management)
- **Account**: 3 tools (17 operations total)
- **Analysis**: 15 tools (1 sentiment + 14 analysis)
- **Data**: 3 tools

**Total**: 36 tool files covering 87+ operations

## 🔄 Migration Notes

All import paths have been updated automatically:
- Tools in subdirectories use `../../` prefix for parent imports
- All tools maintain backward compatibility
- Build process verified and working
- No breaking changes to external API
