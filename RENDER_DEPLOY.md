# Deployment ke Render

Panduan deployment GearTrade MCP Server ke Render platform.

## Cara Deploy

### Opsi 1: Via Render Dashboard (Recommended)

1. **Login ke Render Dashboard**
   - Buka https://dashboard.render.com
   - Login dengan akun Anda

2. **Create New Service**
   - Klik "New +" → "Background Worker" atau "Web Service"
   - Connect repository GitHub/GitLab/Bitbucket
   - Pilih repository `GEARTRADE`

3. **Configure Service**
   - **Name**: `geartrade-mcp-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter (atau sesuai kebutuhan)

4. **Environment Variables**
   Set via Render Dashboard → Environment:
   - `HYPERLIQUID_API_URL` = `https://api.hyperliquid.xyz` (optional, ada default)
   - `CYCLE_INTERVAL_MS` = `10000` (optional)
   - `PAPER_CAPITAL` = `10000` (optional)
   
   **Optional (untuk backward compatibility):**
   - `HYPERLIQUID_ACCOUNT_ADDRESS` (jika ingin set default credentials)
   - `HYPERLIQUID_WALLET_API_KEY` (jika ingin set default credentials)
   - `AI_PROVIDER` = `openrouter` (optional)
   - `AI_PROVIDER_API_KEY` (optional)
   - `MODEL_ID` = `anthropic/claude-3-5-sonnet` (optional)

   **Note**: Untuk multi-user support, credentials bisa di-pass via tool parameters, jadi environment variables ini optional.

5. **Deploy**
   - Klik "Create Service"
   - Render akan otomatis build dan deploy

### Opsi 2: Via Render CLI

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy
render deploy
```

### Opsi 3: Via Git Push

1. **Push code ke GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Connect ke Render**
   - Di Render Dashboard, connect repository
   - Render akan auto-deploy setiap push

## Konfigurasi

### File yang sudah dibuat:
- ✅ `render.yaml` - Konfigurasi Render
- ✅ `.renderignore` - File yang di-ignore saat deploy
- ✅ `package.json` - Sudah ada `start` script

### Build & Start Commands

**Build**: `npm install && npm run build`
- Install dependencies
- Compile TypeScript ke JavaScript

**Start**: `npm start`
- Menjalankan `node dist/mcp-server/index.js`
- MCP server berjalan dengan stdio transport

## Testing

Setelah deploy, test MCP server:
```bash
# Via MCP Inspector (lokal)
npx @modelcontextprotocol/inspector "ssh user@your-render-service.onrender.com node dist/mcp-server/index.js"

# Atau via MCP client
# Connect ke stdio transport
```

## Environment Variables

### Required: None
Semua environment variables adalah optional karena server mendukung multi-user credentials via tool parameters.

### Optional Environment Variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HYPERLIQUID_API_URL` | `https://api.hyperliquid.xyz` | Hyperliquid API endpoint |
| `CYCLE_INTERVAL_MS` | `10000` | Cycle interval in milliseconds |
| `PAPER_CAPITAL` | `10000` | Paper trading capital in USD |
| `HYPERLIQUID_ACCOUNT_ADDRESS` | - | Default Hyperliquid account (optional) |
| `HYPERLIQUID_WALLET_API_KEY` | - | Default Hyperliquid private key (optional) |
| `AI_PROVIDER` | - | AI provider (openrouter, etc.) |
| `AI_PROVIDER_API_KEY` | - | AI provider API key |
| `MODEL_ID` | - | AI model ID |

## Multi-User Support

GearTrade MCP Server mendukung multi-user credentials:
- ✅ Users bisa provide `accountAddress` dan `walletApiKey` via tool parameters
- ✅ Tidak perlu set environment variables untuk credentials
- ✅ Secure: credentials tidak disimpan di environment
- ✅ Default ke paper trading jika tidak ada credentials

## Monitoring

- **Logs**: Lihat di Render Dashboard → Logs
- **Metrics**: Render Dashboard → Metrics
- **Health Check**: Set sebagai Background Worker (tidak perlu HTTP health check)

## Troubleshooting

### Build Failed
- Pastikan `package.json` dependencies sudah lengkap
- Cek build logs di Render Dashboard

### Start Failed
- Pastikan `dist/mcp-server/index.js` sudah ada setelah build
- Cek start command di Render Dashboard

### MCP Connection Issues
- Pastikan MCP client connect ke stdio transport
- Untuk testing, bisa gunakan MCP Inspector dengan SSH connection

## Catatan Penting

1. **Stdio Transport**: MCP server ini menggunakan stdio transport, bukan HTTP
   - Cocok untuk Background Worker di Render
   - Untuk Web Service, perlu HTTP adapter (tidak direkomendasikan untuk MCP)

2. **File System**: MCP server menggunakan file system untuk:
   - Config files (optional, bisa via environment variables)
   - Trade history (optional, bisa dinonaktifkan)

3. **Persistent Storage**: Jika perlu persistent storage:
   - Gunakan Render Disk (untuk file storage)
   - Atau gunakan external database (PostgreSQL, MongoDB, dll)

## Support

Untuk pertanyaan atau masalah deployment:
- Render Docs: https://render.com/docs
- Render Support: https://render.com/support

