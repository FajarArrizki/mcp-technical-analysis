# Trading Tools

This directory contains tools for trade execution, position management, and risk calculations on Hyperliquid.

## 📁 Files

- **`index.ts`** - Export file for all trading tools (6 tools)
- **`hyperliquid-testnet-futures-trade.ts`** - Testnet futures trading (1 tool)
- **`hyperliquid-mainnet-futures-trade.ts`** - Mainnet futures trading (1 tool)
- **`spot-trading.ts`** - Spot trading (1 tool)
- **`close-position.ts`** - Position closing (1 tool)
- **`risk-management-tools.ts`** - Risk calculations (2 tools)

## 🔧 Tools (6 Total)

### Futures Trading (2 tools)

**`hyperliquid_testnet_futures_trade`** - Testnet futures execution
- Market orders with slippage protection
- Limit orders at exact price
- Custom entry with optional slippage
- Auto-retry slippage (0.010% → 8.00%)
- Leverage 1-100x

**`hyperliquid_mainnet_futures_trade`** - Mainnet futures execution (REAL MONEY!)
- Same features as testnet
- Requires `confirmExecution: true`
- Minimum order: $10
- Maximum position: 25% of equity
- Asset whitelist enforced

**Order Modes:**
- `market` - Immediate execution with slippage protection
- `limit` - Exact price execution, no slippage
- `custom` - User-defined entry price

**Slippage Types:**
- `retry` - Auto-retry with increasing slippage (default)
- `fixed` - Single attempt with fixed slippage

### Spot Trading (1 tool)

**`spot_trade`** - Hyperliquid spot trading
- Buy/sell spot tokens (HYPE, PURR, etc.)
- Market orders with slippage protection
- Limit orders at exact price
- Works on testnet and mainnet

**Warning:** Testnet spot has low liquidity. Use mainnet with small amounts.

### Position Management (1 tool)

**`close_position`** - Close open positions
- Full close (100%)
- Partial close (1-99%)
- Auto-detects position side
- Uses reduceOnly for safety
- Works on testnet and mainnet

### Risk Management (2 tools)

**`calculate_risk_management`** - Stop loss & take profit
- Calculate stop loss price
- Calculate take profit price
- Risk/reward ratio
- Potential loss/profit in USD
- Works for LONG and SHORT

**`calculate_position_setup`** - Position sizing
- Calculate position size in USD and asset units
- Dynamic leverage calculation
- Margin requirement
- Multiple sizing strategies:
  - `equal` - Fixed position size
  - `confidence_weighted` - Based on signal confidence
  - `ranking_weighted` - Based on asset ranking

## 🎯 Use Cases

### Testnet Futures Trading
```typescript
// Market order with auto-retry slippage
hyperliquid_testnet_futures_trade({
  symbol: 'BTC',
  side: 'buy',
  sizeInUsd: 100,
  orderMode: 'market',
  leverage: 10
})

// Limit order at exact price
hyperliquid_testnet_futures_trade({
  symbol: 'ETH',
  side: 'sell',
  size: '0.1',
  orderMode: 'limit',
  limitPrice: '3200',
  leverage: 5
})

// Custom entry with slippage
hyperliquid_testnet_futures_trade({
  symbol: 'SOL',
  side: 'buy',
  sizeInUsd: 50,
  orderMode: 'custom',
  customEntryPrice: '145.5',
  useSlippageForCustom: true,
  leverage: 15
})
```

### Mainnet Futures Trading (REAL MONEY!)
```typescript
// WARNING: This uses REAL money!
hyperliquid_mainnet_futures_trade({
  symbol: 'BTC',
  side: 'buy',
  sizeInUsd: 100,
  orderMode: 'market',
  leverage: 10,
  confirmExecution: true  // REQUIRED!
})
```

### Spot Trading
```typescript
// Buy HYPE with USDC
spot_trade({
  pair: 'HYPE',
  side: 'buy',
  size: '10',
  orderType: 'market',
  slippageType: 'retry',
  isTestnet: false,
  confirmMainnet: true
})

// Sell PURR for USDC (limit order)
spot_trade({
  pair: 'PURR',
  side: 'sell',
  size: '1000',
  orderType: 'limit',
  price: '0.05',
  isTestnet: false,
  confirmMainnet: true
})
```

### Position Closing
```typescript
// Close 100% of position
close_position({
  symbol: 'BTC',
  percentage: 100,
  isTestnet: false,
  confirmMainnet: true
})

// Close 50% of position
close_position({
  symbol: 'ETH',
  percentage: 50,
  isTestnet: false,
  confirmMainnet: true
})
```

### Risk Management
```typescript
// Calculate stop loss & take profit
calculate_risk_management({
  ticker: 'BTC',
  entryPrice: 90000,
  side: 'LONG',
  stopLossPct: 2,
  takeProfitPct: 4.5,
  positionSizeUsd: 1000
})

// Response:
{
  entryPrice: 90000,
  stopLoss: 88200,  // -2%
  takeProfit: 94050, // +4.5%
  riskRewardRatio: 2.25,
  potentialLoss: -20,   // $20 loss
  potentialProfit: 45   // $45 profit
}

// Calculate position sizing
calculate_position_setup({
  ticker: 'ETH',
  entryPrice: 3200,
  side: 'LONG',
  capital: 10000,
  riskPct: 1,
  strategy: 'equal'
})

// Response:
{
  positionSizeUsd: 100,
  positionSizeAsset: 0.03125,
  leverage: 10,
  marginRequired: 10,
  riskAmount: 100
}
```

## 🔐 Environment Variables

### Required for Trading
```bash
AGENT_WALLET_PRIVATE_KEY=0x...  # Trading wallet private key
MAIN_WALLET_ADDRESS=0x...        # Main wallet address
```

## ⚠️ Safety Features

### Testnet Trading
- No real money at risk
- Same execution logic as mainnet
- Perfect for testing strategies

### Mainnet Trading
- Requires `confirmExecution: true`
- Minimum order value: $10
- Maximum position size: 25% of account equity
- Asset whitelist enforced
- Slippage protection (0.010% - 8.00%)

### Position Closing
- Uses `reduceOnly` orders
- Cannot accidentally open new positions
- Safe position reduction

## 🏗️ Architecture

```
trading/
├── hyperliquid-testnet-futures-trade.ts (1 tool)
├── hyperliquid-mainnet-futures-trade.ts (1 tool)
├── spot-trading.ts                      (1 tool)
├── close-position.ts                    (1 tool)
└── risk-management-tools.ts             (2 tools)
```

## 📊 Slippage Protection

### Auto-Retry Slippage
Automatically retries with increasing slippage:
```
Attempt 1: 0.010% slippage
Attempt 2: 0.025% slippage
Attempt 3: 0.050% slippage
Attempt 4: 0.100% slippage
Attempt 5: 0.250% slippage
...
Max: 8.00% slippage
```

### Fixed Slippage
Single attempt with user-defined slippage:
```typescript
slippageConfig: {
  type: 'fixed',
  fixedSlippage: 0.01  // 1% slippage
}
```

## 🚀 Future Enhancements

- OCO orders (One-Cancels-Other)
- Trailing stop loss
- DCA (Dollar Cost Averaging)
- Grid trading
- Options trading
- Multi-leg strategies

---

**Note**: Always test on testnet first! Mainnet trading uses REAL money and is irreversible.
