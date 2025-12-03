# Account Tools

This directory contains tools for Hyperliquid account management, bridge operations, and AI memory features.

## 📁 Files

- **`index.ts`** - Export file for all account tools (10 tools)
- **`hyperliquid-account-operations.ts`** - Account balance and transfer operations (1 tool)
- **`hyperliquid-bridge-operations.ts`** - Bridge between Hyperliquid and Arbitrum (1 tool)
- **`memory-tools.ts`** - AI memory with Mem0 integration (8 tools)

## 🔧 Tools (10 Total)

### Hyperliquid Account Operations (1 tool)

**`hyperliquid_account_operations`**
- Check spot/perp balances
- Transfer between spot and perp accounts
- Send tokens to other wallets
- View positions and margin

**Supported Operations:**
- `check_spot_balance` - Check spot token balances
- `check_perp_balance` - Check perpetual account details
- `transfer_spot_to_perp` - Move USD from spot to perp
- `transfer_perp_to_spot` - Move USD from perp to spot
- `send_spot_token` - Send spot tokens to another wallet
- `send_usd` - Send USD to another wallet

### Hyperliquid Bridge Operations (1 tool)

**`hyperliquid_bridge_operations`**
- Withdraw USDC to Arbitrum L1 (~3 hours)
- Check withdrawable balance
- Track pending withdrawals

**Supported Operations:**
- `withdraw_to_arbitrum` - Withdraw USDC to Arbitrum
- `check_withdraw_status` - Check withdrawal status

**Networks:**
- Testnet: Hyperliquid Testnet ↔ Arbitrum Sepolia
- Mainnet: Hyperliquid ↔ Arbitrum One

### AI Memory Tools (8 tools)

**`memory_save_preference`** - Save trading preferences
- Leverage settings
- Risk per trade
- Favorite pairs
- Trading style

**`memory_log_trade`** - Log completed trades
- Entry/exit prices
- PnL tracking
- Lessons learned
- Pattern categorization

**`memory_get_insights`** - Get personalized insights
- Performance analysis
- Common mistakes
- Best setups
- Pattern recognition

**`memory_check_pattern`** - Check current setup vs history
- Match winning patterns
- Avoid losing patterns
- Setup similarity scoring

**`memory_remember`** - Store any trading note
- Market observations
- Key support/resistance levels
- News events
- Strategy notes

**`memory_recall`** - Search stored memories
- Query by keyword
- Filter by label/category
- Relevance ranking

**`memory_get_all`** - Get complete memory history
- All preferences
- All trades
- Trading statistics
- Performance metrics

**`memory_delete`** - Delete specific memory
- Remove outdated info
- Clean up incorrect data

## 🎯 Use Cases

### Account Management
```typescript
// Check perp balance
hyperliquid_account_operations({
  operation: 'check_perp_balance',
  walletAddress: '0x...',
  isTestnet: false,
  confirmMainnet: true
})

// Transfer USD from spot to perp
hyperliquid_account_operations({
  operation: 'transfer_spot_to_perp',
  amount: '100',
  walletAddress: '0x...',
  isTestnet: false,
  confirmMainnet: true
})
```

### Bridge Operations
```typescript
// Withdraw to Arbitrum
hyperliquid_bridge_operations({
  operation: 'withdraw_to_arbitrum',
  destination: '0x...',
  amount: '100',
  isTestnet: false,
  confirmMainnet: true
})

// Check withdrawal status
hyperliquid_bridge_operations({
  operation: 'check_withdraw_status',
  isTestnet: false,
  confirmMainnet: true
})
```

### AI Memory
```typescript
// Save trading preference
memory_save_preference({
  preference: 'Default leverage for BTC is 10x',
  label: 'leverage',
  categories: 'risk-management'
})

// Log completed trade
memory_log_trade({
  symbol: 'BTC',
  side: 'LONG',
  entryPrice: 90000,
  exitPrice: 92000,
  pnlPercent: 2.22,
  result: 'WIN',
  reason: 'RSI oversold + bullish divergence',
  lesson: 'Wait for volume confirmation',
  label: 'scalp',
  categories: 'momentum'
})

// Get insights
memory_get_insights({
  query: 'my BTC trading performance'
})

// Check pattern match
memory_check_pattern({
  symbol: 'ETH',
  setup: 'RSI oversold with bullish divergence at support'
})
```

## 🔐 Environment Variables

### Required for Account Operations
```bash
# Example .env configuration (replace with your actual values)
AGENT_WALLET_PRIVATE_KEY=<your-private-key>
MAIN_WALLET_ADDRESS=<your-wallet-address>
```

### Required for AI Memory
```bash
# Example .env configuration (replace with your actual values)
MEM0_API_KEY=<your-api-key>
MEM0_USER_ID=<your-user-id>
```

## 🏗️ Architecture

```
account/
├── hyperliquid-account-operations.ts (1 tool, 6 operations)
├── hyperliquid-bridge-operations.ts  (1 tool, 2 operations)
└── memory-tools.ts                   (8 tools)
```

## 🚀 Future Enhancements

- Multi-wallet management
- Transaction history tracking
- Automated trade journaling
- Performance analytics dashboard
- Pattern recognition ML model

---

**Note**: Account tools require proper API keys and wallet configuration. Always test on testnet first!
