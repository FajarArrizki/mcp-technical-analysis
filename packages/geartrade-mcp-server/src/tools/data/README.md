# Data Tools

This directory contains tools for retrieving raw market data, prices, and positions.

## 📁 Files

- **`index.ts`** - Export file for all data tools (3 tools)
- **`price-position-tools.ts`** - Price and position data retrieval (3 tools)

## 🔧 Tools (3 Total)

### Price Data (1 tool)

**`get_price`** - Get latest prices for multiple tickers
- Real-time price data from Hyperliquid
- Supports multiple tickers in single call
- Returns current market price

**Example:**
```typescript
get_price({ tickers: ['BTC', 'ETH', 'SOL'] })

// Response:
{
  BTC: { price: 93867, timestamp: 1764803237061 },
  ETH: { price: 3194, timestamp: 1764803237061 },
  SOL: { price: 144.5, timestamp: 1764803237061 }
}
```

### Position Data (2 tools)

**`get_position`** - Get current open positions for a wallet
- Account value and margin details
- All open positions with PnL
- Unrealized profit/loss per position
- Leverage and entry price

**Example:**
```typescript
get_position({ walletAddress: '0x...' })

// Response:
{
  success: true,
  walletAddress: '0x...',
  accountValue: 715.34,
  totalMarginUsed: 51.55,
  totalUnrealizedPnl: 15.15,
  withdrawable: 663.79,
  positions: [
    {
      coin: 'BTC',
      szi: '0.00552',
      leverage: 10,
      entryPrice: '90648.0',
      unrealizedPnl: '15.1524',
      marginUsed: '51.552936'
    }
  ],
  openOrders: 0
}
```

**`get_long_short_ratio`** - Get long/short ratio with whale data
- Long/short ratio from funding rates
- Whale positions from HyperScreener (optional)
- Top traders breakdown (optional)
- Position distribution analysis

**Example:**
```typescript
get_long_short_ratio({
  tickers: ['BTC', 'ETH'],
  includeWhales: true
})

// Response per ticker:
{
  BTC: {
    longShortRatio: 1.35,
    interpretation: 'More longs than shorts (bullish sentiment)',
    whalePositions: [
      {
        address: '0x...',
        side: 'LONG',
        notionalValue: 50000000,
        leverage: 10
      }
    ],
    topTraders: [...],
    marketSentiment: 'Bullish'
  }
}
```

## 🎯 Use Cases

### Price Monitoring
```typescript
// Single ticker
get_price({ tickers: ['BTC'] })

// Multiple tickers
get_price({ tickers: ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB'] })

// Use for:
// - Real-time price alerts
// - Entry/exit price verification
// - Multi-asset monitoring
```

### Position Management
```typescript
// Check your positions
get_position({ walletAddress: process.env.MAIN_WALLET_ADDRESS })

// Check another wallet
get_position({ walletAddress: '0x...' })

// Use for:
// - Portfolio monitoring
// - Risk assessment
// - PnL tracking
// - Margin utilization
```

### Market Sentiment
```typescript
// Long/short ratio only
get_long_short_ratio({
  tickers: ['BTC'],
  includeWhales: false
})

// With whale positions
get_long_short_ratio({
  tickers: ['BTC', 'ETH'],
  includeWhales: true
})

// Use for:
// - Sentiment analysis
// - Contrarian signals
// - Whale tracking
// - Position crowding detection
```

## 📊 Data Sources

- **Hyperliquid API** - Real-time prices and positions
- **HyperScreener** - Whale positions and top traders (optional)
- **Funding Rates** - Derived long/short ratio

## 🔐 Environment Variables

### For Position Data
```bash
MAIN_WALLET_ADDRESS=0x...  # Default wallet for get_position
```

## 🏗️ Architecture

```
data/
└── price-position-tools.ts
    ├── get_price           (1 tool)
    ├── get_position        (1 tool)
    └── get_long_short_ratio (1 tool)
```

## 🚀 Performance Tips

### Batch Requests
Always request multiple tickers in a single call:
```typescript
// ✅ Good - Single call
get_price({ tickers: ['BTC', 'ETH', 'SOL'] })

// ❌ Bad - Multiple calls
get_price({ tickers: ['BTC'] })
get_price({ tickers: ['ETH'] })
get_price({ tickers: ['SOL'] })
```

### Caching
For price data that doesn't need real-time updates:
- Cache responses for 1-5 seconds
- Reduces API calls
- Improves performance

## 🔄 Integration

Data tools are foundational and used by:
- **Analysis Tools** - Technical analysis requires price data
- **Trading Tools** - Order execution needs current prices
- **Risk Management** - Position sizing based on account balance

## 🚀 Future Enhancements

- Historical price data (OHLCV)
- Multi-exchange price aggregation
- Position history and PnL tracking
- Portfolio analytics
- Performance metrics

---

**Note**: Data tools provide raw market data. For interpreted analysis, use Analysis Tools.
