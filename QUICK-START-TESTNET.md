# ⚡ Quick Start - Testnet Trading

## 🚀 1-Minute Setup

```bash
# 1. Copy example config
cp mcp.example.json ~/.cursor/mcp.json

# 2. Edit config (replace YOUR_XXX placeholders)
nano ~/.cursor/mcp.json

# 3. Start MCP server
bash scripts/mcp-auto-start.sh

# 4. Test balance
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_balance","arguments":{"useTestnet":true}}}'

# 5. Execute test trade
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_execution_spot","arguments":{"ticker":"BTC","side":"LONG","quantity":0.001,"execute":true,"useLiveExecutor":true}}}'
```

---

## 📁 Files Overview

| File | Purpose | Location |
|------|---------|----------|
| **mcp.example.json** | Testnet config template | Copy to `~/.cursor/mcp.json` |
| **mcp.mainnet.example.json** | Mainnet config template | Copy to `~/.cursor/mcp.json` |
| **README-TESTNET-SETUP.md** | Complete setup guide | Read for details |
| **~/.cursor/mcp.json** | YOUR real config | ⚠️ In .gitignore (safe) |

---

## 🔑 Key Requirements

| Variable | Format | Example |
|----------|--------|---------|
| `HYPERLIQUID_WALLET_API_KEY` | 66 chars (private key) | `0x1234...cdef` |
| `HYPERLIQUID_ACCOUNT_ADDRESS` | 42 chars (address) | `0x464B...9A1C` |

**⚠️ IMPORTANT:** Must use **private key** (66 chars), not address (42 chars)!

---

## 🧪 Testnet vs Mainnet

### Testnet (Safe Testing - No Real Money)
```json
{
  "HYPERLIQUID_API_URL": "https://api.hyperliquid-testnet.xyz",
  "HYPERLIQUID_TESTNET": "true"
}
```

### Mainnet (Real Trading - Real Money)
```json
{
  "HYPERLIQUID_API_URL": "https://api.hyperliquid.xyz",
  "HYPERLIQUID_TESTNET": "false"
}
```

---

## ✅ Verification Checklist

- [ ] Copied `mcp.example.json` to `~/.cursor/mcp.json`
- [ ] Updated `HYPERLIQUID_WALLET_API_KEY` (66 chars)
- [ ] Updated `HYPERLIQUID_ACCOUNT_ADDRESS` (42 chars)
- [ ] Started MCP server (`bash scripts/mcp-auto-start.sh`)
- [ ] Checked balance (should show $999 for testnet)
- [ ] Executed test trade
- [ ] Verified position with `get_position` tool

---

## 🆘 Troubleshooting

### "Wallet API key not configured"
→ Check if key is 66 chars (private key), not 42 chars (address)

### "Invalid private key length"
→ Private key must be 64 hex chars + `0x` prefix = 66 total

### "Position is null" after trade
→ Order may have failed. Check server logs: `/tmp/mcp-direct.log`

### Server not starting
→ Check port 8787 is free: `lsof -i :8787`

---

## 📞 Get Testnet Key

1. Visit: https://app.hyperliquid-testnet.xyz
2. Connect/create wallet
3. Export private key:
   - MetaMask: Settings → Security → Reveal Private Key
   - Other wallets: Look for "Export" or "Backup"
4. Copy the 66-character private key (includes `0x` prefix)

---

## 🎯 Next Steps

After testnet works:
1. Switch to mainnet config (`mcp.mainnet.example.json`)
2. Use real Hyperliquid account
3. Start with small amounts
4. Monitor trades carefully

---

**📖 For complete details, see:** `README-TESTNET-SETUP.md`
