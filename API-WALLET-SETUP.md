# 🔑 Hyperliquid API Wallet Setup Guide

## 📚 Berdasarkan Dokumentasi Resmi Hyperliquid

Source: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets

---

## 🎯 Apa Itu API Wallet (Agent Wallet)?

**API Wallet** adalah wallet terpisah yang di-approve oleh Master Account untuk melakukan trading **tanpa memiliki permission untuk withdraw**. Ini lebih aman untuk bot trading.

###  Key Features:
- ✅ Bisa sign transactions untuk trading
- ✅ Tidak bisa withdraw funds (lebih aman)
- ✅ Master account tetap control penuh
- ⚠️ Tetap butuh **PRIVATE KEY** untuk sign transactions

---

## 🔄 Cara Kerja API Wallet

```
┌─────────────────┐         approve         ┌─────────────────┐
│  Master Account │ ─────────────────────> │   API Wallet    │
│                 │                         │  (Agent Wallet) │
├─────────────────┤                         ├─────────────────┤
│ • Has balance   │                         │ • Signs orders  │
│ • Has positions │                         │ • Uses priv key │
│ • For queries   │                         │ • No withdraw   │
└─────────────────┘                         └─────────────────┘
        ↓                                           ↓
   Query dengan                             Sign dengan
   ACCOUNT_ADDRESS                          PRIVATE_KEY
```

---

## 🔑 Yang Kamu Butuhkan

### 1. Master Account Address (42 chars)
- Address dari akun utama yang punya balance
- Digunakan untuk **query** balance, positions, trades
- **Example:** `0x464BF4046f2c71CbB67483E2Ff23640D21199A1C`

### 2. API Wallet Private Key (66 chars)
- Private key dari API wallet "TestTrade"
- Digunakan untuk **sign** transactions
- **Example:** `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

### 3. API Wallet Address (42 chars)
- Address dari API wallet (kamu sudah punya ini)
- **Yang kamu punya:** `0x045b7e3c2c9b5885bc63f38871a680977def4a61`
- **Note:** Address alone tidak cukup - need private key!

---

## ❓ Pertanyaan Penting

### Q: Aku cuma punya API Wallet Address, cukup gak?
**A:** ❌ TIDAK CUKUP. Kamu tetap butuh **PRIVATE KEY** dari API wallet tersebut untuk sign transactions.

### Q: Dimana private key API wallet?
**A:** Waktu kamu buat API wallet "TestTrade" di Hyperliquid, pasti ada private key yang ditampilkan/disimpan. Cek:
1. File backup kamu
2. Hyperliquid UI settings (setelah connect wallet)
3. Wallet manager yang kamu gunakan saat create

### Q: Kalau private key hilang, gimana?
**A:** Buat API wallet baru:
1. Go to https://app.hyperliquid-testnet.xyz
2. Connect master account wallet
3. Settings → API Wallets → Create New
4. **SAVE the private key** (66 chars) immediately!
5. Copy API wallet address (42 chars)

---

## 🔧 Config File Format

File: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "geartrade-local-stream": {
      "command": "bash",
      "args": ["/root/GEARTRADE/scripts/mcp-auto-start.sh"],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "OPENROUTER_API_KEY": "YOUR_OPENROUTER_KEY",
        
        "HYPERLIQUID_API_URL": "https://api.hyperliquid-testnet.xyz",
        "HYPERLIQUID_TESTNET": "true",
        
        // ⚠️ API WALLET PRIVATE KEY (66 chars) - FOR SIGNING
        "HYPERLIQUID_WALLET_API_KEY": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        
        // ⚠️ MASTER ACCOUNT ADDRESS (42 chars) - FOR QUERIES
        "HYPERLIQUID_ACCOUNT_ADDRESS": "0x464BF4046f2c71CbB67483E2Ff23640D21199A1C",
        
        "CANDLES_COUNT": "100"
      }
    }
  }
}
```

---

## 📊 Perbedaan Private Key vs Address

| Type | Length | Purpose | Example |
|------|--------|---------|---------|
| **Private Key** | 66 chars (64 hex + 0x) | **Sign transactions** | `0x1234...cdef` |
| **Address** | 42 chars (40 hex + 0x) | Identify wallet | `0x045b...f4a61` |

**Critical:** 
- Private Key = Full control, can sign
- Address = Just identifier, cannot sign

---

## 💻 Implementation (Sudah Support!)

Code kita sudah support API wallet pattern! Di `live-executor.ts`:

```typescript
// 1. Create wallet from API wallet private key
const wallet = createWalletFromPrivateKey(walletApiKey)

// 2. Sign order with API wallet
const signature = await signHyperliquidOrder(wallet, orderMessage)

// 3. Query balance using master account address
// Uses HYPERLIQUID_ACCOUNT_ADDRESS for info requests
```

This is EXACTLY how Hyperliquid API wallets work! ✅

---

## 🚀 Step-by-Step Setup

### Step 1: Get API Wallet Private Key

**Option A:** Find existing key for "TestTrade" API wallet
- Check your backups
- Check Hyperliquid UI after connecting
- Check where you saved it when creating

**Option B:** Create new API wallet
1. Go to https://app.hyperliquid-testnet.xyz
2. Click "Connect" button
3. Connect your master account wallet (MetaMask/etc)
4. Go to Settings → API Wallets
5. Click "Create New API Wallet"
6. Name it (e.g., "TestTrade2")
7. **SAVE THE PRIVATE KEY** (66 chars) - won't show again!
8. Copy the address (42 chars)

### Step 2: Update Config

Edit `~/.cursor/mcp.json`:

```bash
nano ~/.cursor/mcp.json
```

Update these two lines:
```json
"HYPERLIQUID_WALLET_API_KEY": "0xYOUR_66_CHAR_PRIVATE_KEY_HERE",
"HYPERLIQUID_ACCOUNT_ADDRESS": "0xYOUR_42_CHAR_MASTER_ACCOUNT_HERE"
```

### Step 3: Restart MCP Server

```bash
pkill -f "local-server"
sleep 2
bash scripts/mcp-auto-start.sh
```

### Step 4: Test

```bash
# Test balance
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_balance","arguments":{"useTestnet":true}}}'

# Test trade
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_execution_spot","arguments":{"ticker":"BTC","side":"LONG","quantity":0.001,"execute":true,"useLiveExecutor":true}}}'
```

---

## ⚠️ Security Notes

1. **Never share private keys** - Full control of API wallet
2. **API wallet cannot withdraw** - Safer for bots
3. **Master account has full control** - Can revoke API wallet anytime
4. **Use testnet first** - Test with fake money
5. **`.cursor/mcp.json` is in .gitignore** - Safe from git commits

---

## 🆘 Troubleshooting

### Error: "Invalid private key length"
→ Private key must be exactly 66 characters (64 hex + 0x prefix)

### Error: "Wallet API key not configured"
→ Check if HYPERLIQUID_WALLET_API_KEY is set in ~/.cursor/mcp.json

### Error: "Wallet address does not match"
→ The private key must derive the same address as the API wallet
→ Make sure you're using the correct private key for the API wallet

### Position is null after trade
→ Check server logs: `tail -f /tmp/mcp-direct.log`
→ Verify trade was submitted successfully

---

## 📖 Official Documentation

- API Wallets: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets
- Exchange Endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint
- Signing: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/signing
- Testnet: https://app.hyperliquid-testnet.xyz

---

## ✅ Summary

**Key Points:**
1. API wallet address alone is NOT enough
2. Need PRIVATE KEY (66 chars) to sign transactions  
3. Need MASTER ACCOUNT address (42 chars) for queries
4. Our code already supports this pattern
5. Update config → Restart server → Test trade

**What you need to do:**
1. Get API wallet private key (66 chars)
2. Confirm master account address (42 chars)
3. Update `~/.cursor/mcp.json`
4. Restart MCP server
5. Execute test trade → Should work! 🚀

---

**Created:** 2025-11-25
**Source:** Hyperliquid Official Documentation

