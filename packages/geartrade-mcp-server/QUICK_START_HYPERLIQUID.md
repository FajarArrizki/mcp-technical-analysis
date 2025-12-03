# 🚀 Quick Start: Hyperliquid Trading Tools

## 📝 Quick Reference

### 1. Check Balances

```json
// Check Spot Balance
{
  "operation": "check_spot_balance",
  "isTestnet": true
}

// Check Perpetual Balance
{
  "operation": "check_perp_balance",
  "isTestnet": true
}
```

### 2. Transfer Funds

```json
// Transfer $100: Spot → Perp
{
  "operation": "transfer_spot_to_perp",
  "amount": "100",
  "isTestnet": true
}

// Transfer $100: Perp → Spot
{
  "operation": "transfer_perp_to_spot",
  "amount": "100",
  "isTestnet": true
}
```

### 3. Send Tokens

```json
// Send 10 PURR tokens
{
  "operation": "send_spot_token",
  "destination": "0xRecipientAddress",
  "token": "PURR",
  "amount": "10",
  "isTestnet": true
}

// Send $50 USD
{
  "operation": "send_usd",
  "destination": "0xRecipientAddress",
  "amount": "50",
  "isTestnet": true
}
```

### 4. Spot Trading

```json
// Market Buy: Buy 10 PURR with USDC
{
  "pair": "PURR/USDC",
  "side": "buy",
  "size": "10",
  "orderType": "market",
  "slippage": 5,
  "isTestnet": true
}

// Limit Sell: Sell 10 PURR at $0.50
{
  "pair": "PURR/USDC",
  "side": "sell",
  "size": "10",
  "price": "0.5",
  "orderType": "limit",
  "isTestnet": true
}
```

### 5. Bridge to Arbitrum

```json
// Withdraw $100 to Arbitrum (~3 hours)
{
  "operation": "withdraw_to_arbitrum",
  "destination": "0xYourArbitrumAddress",
  "amount": "100",
  "isTestnet": true
}

// Check Withdrawable Balance
{
  "operation": "check_withdraw_status",
  "isTestnet": true
}
```

---

## 🧪 Testing Workflow

### Step 1: Verify Environment

```bash
# Check .env configuration
cat .env

# Ensure these are set:
# - AGENT_WALLET_PRIVATE_KEY
# - MAIN_WALLET_ADDRESS
# - HYPERLIQUID_TESTNET=true
```

### Step 2: Run Tests

```bash
# Test balance checks
npx tsx src/test-balance.ts

# Test spot trading (checks available pairs)
npx tsx src/test-spot-trade.ts

# Test account operations
npx tsx src/test-account-ops.ts
```

### Step 3: Fund Testnet Wallet

1. Get testnet USDC from Hyperliquid faucet
2. Visit: https://app.hyperliquid.xyz (select testnet)
3. Request testnet funds

### Step 4: Execute Real Trades (Testnet)

```typescript
// Uncomment test code in test scripts
// Example: test-spot-trade.ts line 32-44

const result = await spotTrade({
  pair: 'PURR/USDC',
  side: 'buy',
  size: '10',
  orderType: 'market',
  slippage: 5,
  isTestnet: true,
})
```

---

## ⚠️ Mainnet Checklist

Before using mainnet:

- [ ] Test all operations on testnet first
- [ ] Verify wallet addresses are correct
- [ ] Set `HYPERLIQUID_TESTNET=false` in `.env`
- [ ] Always include `confirmMainnet: true` in requests
- [ ] Start with small amounts
- [ ] Monitor positions on Hyperliquid dashboard

---

## 📊 Available Spot Pairs (Testnet)

Run this to see all 1,496 available pairs:

```bash
npx tsx src/test-spot-trade.ts
```

Popular pairs:
- PURR/USDC
- HYPE/USDC
- BREAD/USDC
- KOGU/USDC

---

## 🔧 Troubleshooting

### Error: "AGENT_WALLET_PRIVATE_KEY not set"
```bash
# Check .env file
nano .env

# Add your private key
AGENT_WALLET_PRIVATE_KEY=0x...
```

### Error: "Insufficient balance"
```bash
# Check balances first
npx tsx src/test-balance.ts

# Fund testnet wallet at app.hyperliquid.xyz
```

### Error: "Mainnet execution requires confirmMainnet"
```json
// Add this to your request
{
  "confirmMainnet": true,
  "isTestnet": false
}
```

### Error: "Token not found"
```bash
# List available tokens
npx tsx src/test-spot-trade.ts

# Use exact token name from output
```

---

## 📞 Support

**Documentation**: See `HYPERLIQUID_TOOLS.md` for detailed documentation

**Hyperliquid Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs/

**MCP Server Logs**: Check console output for detailed error messages

**Test Scripts**: All test scripts include example usage patterns

---

## 🎯 Common Use Cases

### Use Case 1: Day Trading Setup

```bash
# 1. Check balance
hyperliquid_account_operations -> check_perp_balance

# 2. Transfer funds to perp
hyperliquid_account_operations -> transfer_spot_to_perp

# 3. Execute futures trade
hyperliquid_testnet_futures_trade -> BTC long
```

### Use Case 2: Spot Trading

```bash
# 1. Check spot balance
hyperliquid_account_operations -> check_spot_balance

# 2. Buy spot tokens
spot_trade -> buy PURR/USDC

# 3. Sell spot tokens
spot_trade -> sell PURR/USDC
```

### Use Case 3: Withdraw to External Wallet

```bash
# 1. Transfer perp to spot
hyperliquid_account_operations -> transfer_perp_to_spot

# 2. Withdraw to Arbitrum
hyperliquid_bridge_operations -> withdraw_to_arbitrum

# 3. Wait ~3 hours, check Arbitrum wallet
```

---

**Ready to start trading!** 🚀

Begin with testnet, test thoroughly, then move to mainnet with `confirmMainnet: true`.
