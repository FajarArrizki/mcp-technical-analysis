# 🧪 Testnet Trading Setup Guide

## ⚠️ CRITICAL: Private Key vs Address

### ❌ WRONG (Address - 42 characters):
```
HYPERLIQUID_WALLET_API_KEY="0x045b7e3c2c9b5885bc63f38871a680977def4a61"
```

### ✅ CORRECT (Private Key - 66 characters):
```
HYPERLIQUID_WALLET_API_KEY="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
```

---

## 📋 Setup Steps

### 1. Get Hyperliquid Testnet Credentials

Visit: https://app.hyperliquid-testnet.xyz

1. **Connect Wallet** or **Create New Wallet**
2. **Export Private Key** from your wallet
   - MetaMask: Settings → Security & Privacy → Reveal Private Key
   - Or create a NEW wallet specifically for testnet
3. **Get Testnet Funds** (faucet if available)

### 2. Configure Cursor MCP

Copy the example file and edit it:

```bash
cp mcp.example.json ~/.cursor/mcp.json
```

Then edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "geartrade-local-stream": {
      "command": "bash",
      "args": ["/root/GEARTRADE/scripts/mcp-auto-start.sh"],
      "env": {
        "HYPERLIQUID_API_URL": "https://api.hyperliquid-testnet.xyz",
        "HYPERLIQUID_TESTNET": "true",
        "HYPERLIQUID_WALLET_API_KEY": "0xYOUR_64_CHARACTER_PRIVATE_KEY_HERE",
        "HYPERLIQUID_ACCOUNT_ADDRESS": "0xYOUR_40_CHARACTER_ADDRESS_HERE",
        "CANDLES_COUNT": "100"
      }
    }
  }
}
```

### 3. Verify Configuration

```bash
# Check balance
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_balance",
      "arguments": {"useTestnet": true}
    }
  }'
```

### 4. Execute Test Trade

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_execution_spot",
      "arguments": {
        "ticker": "BTC",
        "side": "LONG",
        "quantity": 0.001,
        "execute": true,
        "useLiveExecutor": true
      }
    }
  }'
```

---

## 🔑 Key Formats

| Type | Length (with 0x) | Example |
|------|------------------|---------|
| **Private Key** | 66 chars | `0x1234...cdef` (64 hex chars) |
| **Address** | 42 chars | `0x464B...9A1C` (40 hex chars) |

**Remember:** 
- `HYPERLIQUID_WALLET_API_KEY` = Private Key (66 chars)
- `HYPERLIQUID_ACCOUNT_ADDRESS` = Address (42 chars)

---

## 🔒 Security

⚠️ **NEVER commit real private keys to git!**

The file `~/.cursor/mcp.json` is already in `.gitignore`.

For team sharing, use:
- `mcp.example.json` (template with placeholders)
- Environment variables
- Secrets management tools

---

## 🧪 Test vs Live Trading

### Testnet (Safe Testing)
```json
{
  "HYPERLIQUID_API_URL": "https://api.hyperliquid-testnet.xyz",
  "HYPERLIQUID_TESTNET": "true"
}
```

### Mainnet (Real Money)
```json
{
  "HYPERLIQUID_API_URL": "https://api.hyperliquid.xyz",
  "HYPERLIQUID_TESTNET": "false"
}
```

---

## 📞 Support

- Hyperliquid Docs: https://hyperliquid.gitbook.io/
- Testnet UI: https://app.hyperliquid-testnet.xyz
- Discord: https://discord.gg/hyperliquid

