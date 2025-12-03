# Signal Generation

This is the core analysis engine that powers all technical analysis, market data fetching, and trading signal generation.

## 📁 Directory Structure

```
signal-generation/
├── analysis/               Market analysis algorithms
│   ├── bounce.ts          Bounce detection and persistence
│   ├── candlestick.ts     Candlestick pattern recognition
│   ├── divergence.ts      RSI divergence detection
│   ├── enhanced-metrics.ts Enhanced trading metrics
│   ├── market-regime.ts   Market regime classification
│   ├── market-structure.ts Structure analysis (COC, BOS)
│   ├── tier-classification.ts Trader tier classification
│   ├── trend-detection.ts  Trend identification
│   └── volume-analysis.ts  Volume profile and analysis
├── data-fetchers/         External API integrations
│   ├── hyperliquid.ts     Hyperliquid exchange API
│   ├── hyperscreener.ts   HyperScreener liquidations/whales
│   └── market-data.ts     Multi-source market data aggregation
├── exit-conditions/       Exit strategy calculations
│   └── stop-loss.ts       Stop loss and take profit
├── position-management/   Position tracking and management
├── risk-management/       Risk and leverage calculations
│   ├── leverage.ts        Dynamic leverage calculation
│   └── margin.ts          Margin requirement calculation
├── technical-indicators/  Indicator implementations
│   ├── momentum.ts        RSI, MACD, Stochastic
│   ├── fibonacci.ts       Fibonacci retracement
│   ├── correlation-analysis.ts BTC correlation
│   ├── liquidation.ts     Liquidation level calculations
│   ├── long-short-ratio.ts Long/short ratio analysis
│   └── [35+ other indicators]
├── types/                 TypeScript type definitions
└── utils/                 Utility functions
```

## 🎯 Purpose

The signal-generation module is the brain of the MCP server, providing:
1. **Data Fetching** - Real-time market data from multiple sources
2. **Technical Analysis** - 35+ technical indicators
3. **Pattern Recognition** - Candlestick patterns, divergences, structures
4. **Risk Management** - Position sizing, leverage, stop loss
5. **Market Analysis** - Volume, trend, regime, correlation

## 📊 Components

### 1. Analysis Modules

#### Bounce Detection (`analysis/bounce.ts`)
- Identify bounce setups at support/resistance
- Check bounce persistence
- Volume confirmation
- Success probability

#### Candlestick Patterns (`analysis/candlestick.ts`)
- Doji, Hammer, Shooting Star
- Engulfing, Harami, Piercing
- Morning/Evening Star
- Pattern strength and reliability

#### Divergence Detection (`analysis/divergence.ts`)
- Bullish divergence (price down, RSI up)
- Bearish divergence (price up, RSI down)
- Hidden divergence
- Divergence strength scoring

#### Market Regime (`analysis/market-regime.ts`)
- Trending (strong directional movement)
- Choppy (range-bound, no clear trend)
- Volatile (high volatility, unpredictable)
- Regime strength and recommendations

#### Market Structure (`analysis/market-structure.ts`)
- Change of Character (COC) detection
- Break of Structure (BOS)
- Swing highs and lows
- Trend continuation/reversal signals

#### Tier Classification (`analysis/tier-classification.ts`)
- 🦐 Shrimp: < $10K
- 🦀 Crab: $10K - $50K
- 🐟 Fish: $50K - $100K
- 🐬 Dolphin: $100K - $500K
- 🦈 Shark: $500K - $1M
- 🐋 Whale: $1M - $5M
- 🐉 Institutional: > $5M

#### Trend Detection (`analysis/trend-detection.ts`)
- Uptrend, downtrend, sideways
- Trend strength (weak, moderate, strong)
- Multi-timeframe alignment
- Trend reversal signals

#### Volume Analysis (`analysis/volume-analysis.ts`)
- Volume profile (POC, VAH, VAL)
- Cumulative Volume Delta (CVD)
- Volume trends and spikes
- Accumulation/distribution

### 2. Data Fetchers

#### Hyperliquid API (`data-fetchers/hyperliquid.ts`)
- Real-time prices (WebSocket & REST)
- L2 order book depth
- User positions and balances
- Funding rates
- Historical OHLCV data

#### HyperScreener API (`data-fetchers/hyperscreener.ts`)
- Liquidation data and heatmap
- Whale positions tracking
- Long/short ratios
- Top traders ranking
- Large trades monitoring
- Platform statistics

#### Market Data Aggregator (`data-fetchers/market-data.ts`)
- Multi-exchange price aggregation
- Historical data fetching
- Timeframe conversion
- Data normalization

### 3. Exit Conditions

#### Stop Loss Calculator (`exit-conditions/stop-loss.ts`)
- Fixed percentage stop loss
- ATR-based stop loss
- Support/resistance stop loss
- Trailing stop loss
- Dynamic adjustment based on volatility

### 4. Risk Management

#### Leverage Calculator (`risk-management/leverage.ts`)
- Account balance-based leverage
- Risk-adjusted leverage
- Maximum leverage limits
- Leverage recommendations by market regime

#### Margin Calculator (`risk-management/margin.ts`)
- Initial margin requirement
- Maintenance margin
- Liquidation price calculation
- Margin utilization percentage

### 5. Technical Indicators

Over 35 indicator implementations:

#### Trend Indicators
- EMA, SMA, WMA, VWMA
- MACD (Moving Average Convergence Divergence)
- ADX (Average Directional Index)
- Parabolic SAR
- Ichimoku Cloud
- SuperTrend

#### Momentum Indicators
- RSI (Relative Strength Index)
- Stochastic Oscillator
- CCI (Commodity Channel Index)
- Williams %R
- ROC (Rate of Change)
- CMO (Chande Momentum Oscillator)

#### Volume Indicators
- OBV (On-Balance Volume)
- CVD (Cumulative Volume Delta)
- VWAP (Volume Weighted Average Price)
- Chaikin Money Flow
- MFI (Money Flow Index)
- Volume Oscillator

#### Volatility Indicators
- Bollinger Bands
- ATR (Average True Range)
- Keltner Channels
- Donchian Channels
- Standard Deviation

#### Support/Resistance
- Pivot Points (Standard, Fibonacci, Camarilla)
- Fibonacci Retracement
- Swing Highs/Lows

## 🔄 Data Flow

```
External APIs (Hyperliquid, HyperScreener)
    ↓
data-fetchers/ (Fetch raw data)
    ↓
technical-indicators/ (Calculate indicators)
    ↓
analysis/ (Analyze patterns and structure)
    ↓
risk-management/ (Calculate position sizing)
    ↓
exit-conditions/ (Determine stop loss/take profit)
    ↓
Tools (Expose to AI assistants)
    ↓
Formatters (Format output)
    ↓
Response to User
```

## 🎯 Key Features

### Real-time Data
- WebSocket connections for live prices
- Millisecond latency for order book
- Streaming liquidation updates

### Advanced Analysis
- Multi-timeframe analysis (1m to 1W)
- Pattern recognition with ML potential
- Market structure detection
- Regime classification

### Risk Management
- Dynamic position sizing
- Leverage optimization
- Stop loss automation
- Risk/reward calculation

### Performance
- Efficient calculations
- Caching for repeated queries
- Parallel data fetching
- Minimal API calls

## 📝 Usage Examples

### Fetch Real-time Price
```typescript
import { getRealTimePrice } from './data-fetchers/hyperliquid'

const price = await getRealTimePrice('BTC')
console.log(`BTC Price: $${price}`)
```

### Calculate RSI
```typescript
import { calculateRSI } from './technical-indicators/momentum'

const closes = [100, 102, 101, 103, 105, 104, 106]
const rsi = calculateRSI(closes, 14)
console.log(`RSI: ${rsi}`)
```

### Detect Divergence
```typescript
import { detectDivergence } from './analysis/divergence'

const result = detectDivergence(prices, rsi, 'BULLISH')
if (result.detected) {
  console.log('Bullish divergence detected!')
}
```

### Calculate Position Size
```typescript
import { calculateDynamicLeverage } from './risk-management/leverage'

const leverage = calculateDynamicLeverage(10000, 0.01, 90000)
console.log(`Recommended leverage: ${leverage}x`)
```

## 🔧 Configuration

### API Endpoints
Configured via environment variables or constants:
- Hyperliquid: `https://api.hyperliquid.xyz`
- HyperScreener: `https://api.hyperscreener.io`

### Calculation Parameters
Default periods and thresholds:
- RSI: 14 periods
- MACD: 12, 26, 9
- Bollinger Bands: 20 periods, 2 std dev
- ATR: 14 periods

### Rate Limiting
- Respects API rate limits
- Automatic retry with backoff
- Request queuing

## 🚀 Extending

### Adding a New Indicator

1. **Create indicator file**:
```typescript
// technical-indicators/new-indicator.ts
export function calculateNewIndicator(
  data: number[],
  period: number
): { value: number; signal: string } {
  // Implementation
  return { value: result, signal: 'BUY' }
}
```

2. **Export from index**:
```typescript
export { calculateNewIndicator } from './new-indicator'
```

3. **Create corresponding tool** in `tools/indicators/`

### Adding a New Data Source

1. **Create fetcher**:
```typescript
// data-fetchers/new-source.ts
export async function fetchFromNewSource(symbol: string) {
  // API call
  return data
}
```

2. **Integrate with existing tools** or create new tool

## 📊 Performance Optimization

### Caching Strategy
- Cache indicator calculations for repeated requests
- Cache market data for configurable duration
- Invalidate cache on new data

### Parallel Processing
- Fetch data from multiple sources in parallel
- Calculate multiple indicators simultaneously
- Use Promise.all for concurrent operations

### Memory Management
- Limit historical data stored
- Stream large datasets
- Cleanup after calculations

## 🔐 Security

- No storage of sensitive data
- API keys via environment variables
- Input validation for all functions
- Safe error handling

## 🚀 Future Enhancements

- [ ] Machine learning pattern recognition
- [ ] Backtesting engine integration
- [ ] Real-time alerts system
- [ ] Multi-exchange arbitrage detection
- [ ] Social sentiment analysis
- [ ] On-chain data integration
- [ ] Options flow analysis
- [ ] Predictive analytics with ML

## 📚 Dependencies

### External
- `axios` - HTTP requests
- `ws` - WebSocket connections
- `ethers` - Blockchain interactions

### Internal
- `types/` - Type definitions
- `utils/` - Helper functions

## 📄 Related Documentation

- [Analysis Modules](analysis/)
- [Data Fetchers](data-fetchers/)
- [Technical Indicators](technical-indicators/)
- [Risk Management](risk-management/)
- [Exit Conditions](exit-conditions/)

---

**Note**: This module is the core engine. It should remain independent of MCP-specific code for potential reuse in other projects.
