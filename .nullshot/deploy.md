# Nullshot MCP Server Deployment Guide

## Overview

This guide explains how to deploy GearTrade MCP Server to Nullshot platform with Cloudflare integration.

## Prerequisites

1. **Nullshot Account**: Sign up at [nullshot.ai](https://nullshot.ai)
2. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
3. **Node.js**: Version 18+ installed
4. **Wrangler CLI**: Cloudflare Workers CLI tool

## Installation

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Install Dependencies

```bash
npm install
```

## Configuration

### 1. Environment Variables

⚠️ **IMPORTANT**: This MCP server supports **multi-user credentials**!

- **Users can provide their own credentials** via tool parameters (`accountAddress`, `walletApiKey`)
- **Environment variables are optional** (for backward compatibility only)
- **If credentials are not provided**, tools default to paper executor (simulation)
- **Never commit secrets** to the repository
- **Never hardcode secrets** in configuration files

**For backward compatibility** (optional), you can set environment variables in Cloudflare Dashboard or via Wrangler:

```bash
# Via Wrangler CLI (optional, only if you want default credentials)
wrangler secret put HYPERLIQUID_ACCOUNT_ADDRESS
wrangler secret put HYPERLIQUID_WALLET_API_KEY
```

**Optional Secrets:**
```bash
wrangler secret put AI_PROVIDER_API_KEY
wrangler secret put MODEL_ID
```

**Via Cloudflare Dashboard (Recommended for first-time setup):**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages → Your Worker → Settings → Variables
3. Click "Add variable" → Select "Secret" (not "Environment Variable")
4. Add each secret:
   - `HYPERLIQUID_ACCOUNT_ADDRESS` - Your Hyperliquid wallet address
   - `HYPERLIQUID_WALLET_API_KEY` - Your Hyperliquid private key (64 hex chars)
   - `AI_PROVIDER_API_KEY` (optional) - AI provider API key
   - `MODEL_ID` (optional) - AI model identifier

**Non-sensitive Environment Variables:**
These can be set in `wrangler.toml` under `[vars]`:
```toml
[vars]
HYPERLIQUID_API_URL = "https://api.hyperliquid.xyz"
CYCLE_INTERVAL_MS = "10000"
PAPER_CAPITAL = "10000"
```

### 2. Configure Domain (Optional)

Edit `wrangler.toml` to set your domain:

```toml
[env.production]
route = { pattern = "mcp.yourdomain.com/*", zone_name = "yourdomain.com" }
```

## Deployment

### Option 1: Using Deployment Script

```bash
# Production
bash .cloudflare/deploy.sh

# Staging
bash .cloudflare/deploy.sh staging
```

### Option 2: Manual Deployment

```bash
# Build
npm run build

# Deploy to production
wrangler deploy --env production

# Deploy to staging
wrangler deploy --env staging
```

## Nullshot Integration

### 1. Register MCP Server in Nullshot

1. Go to Nullshot Dashboard
2. Navigate to MCP Servers section
3. Click "Add New Server"
4. Enter server details:
   - **Name**: GearTrade MCP Server
   - **URL**: `https://mcp.geartrade.ai` (or your Cloudflare Workers URL)
   - **Transport**: HTTP/SSE
   - **Authentication**: API Key (if configured)

### 2. Configure MCP Client

In your Nullshot agent configuration:

```json
{
  "mcpServers": {
    "geartrade": {
      "url": "https://mcp.geartrade.ai",
      "transport": "sse",
      "apiKey": "your-api-key-here"
    }
  }
}
```

### 3. Test Connection

Use Nullshot's MCP inspector or test tool to verify connection:

```bash
# Test via curl
curl https://mcp.geartrade.ai/health

# Or use MCP inspector
npm run inspector
```

## Cloudflare Configuration

### 1. Zero Trust Setup (Recommended)

For enhanced security, configure Cloudflare Zero Trust:

1. Go to Cloudflare Zero Trust Dashboard
2. Create a new Access Application
3. Configure access policies based on:
   - User identity
   - Group membership
   - IP address
   - Device posture

### 2. MCP Server Portal

Cloudflare provides MCP Server Portals for centralized management:

1. Enable MCP Server Portal in Cloudflare Dashboard
2. Configure access policies
3. Set up monitoring and logging
4. Configure rate limiting

### 3. Performance Optimization

- Enable Cloudflare CDN caching for static resources
- Configure Workers KV for caching market data
- Set up Durable Objects for state management (if needed)
- Enable Workers Analytics for monitoring

## Monitoring

### 1. Cloudflare Analytics

Monitor your MCP server via:
- Cloudflare Dashboard → Workers → Analytics
- Real-time metrics
- Request logs
- Error tracking

### 2. Nullshot Dashboard

Monitor MCP server usage in Nullshot:
- Request count
- Response times
- Error rates
- Tool usage statistics

## Security Best Practices

1. **Use Secrets**: 
   - ✅ Store sensitive data (API keys, private keys) as Cloudflare secrets
   - ❌ Never commit secrets to Git
   - ❌ Never hardcode secrets in code or config files
   - ❌ Never share secrets in documentation or public channels

2. **Enable Zero Trust**: Implement access control via Cloudflare Zero Trust

3. **Rate Limiting**: Configure rate limits to prevent abuse

4. **HTTPS Only**: Ensure all connections use HTTPS

5. **API Keys**: Use API keys for authentication

6. **CORS**: Configure CORS properly if needed

7. **Input Validation**: Validate all inputs in your MCP server

8. **Secret Rotation**: Regularly rotate secrets and API keys

9. **Access Control**: Limit who can access and modify secrets in Cloudflare Dashboard

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version (18+)
   - Verify all dependencies are installed
   - Check TypeScript compilation errors

2. **Deployment Failures**
   - Verify Wrangler is logged in
   - Check Cloudflare account permissions
   - Verify environment variables are set

3. **Connection Issues**
   - Check Cloudflare Workers URL
   - Verify domain DNS settings
   - Check firewall/security settings

4. **Runtime Errors**
   - Check Cloudflare Workers logs
   - Verify environment variables
   - Check API key validity

## Support

- **Nullshot Docs**: [nullshot.ai/docs](https://nullshot.ai/en/docs)
- **Cloudflare Workers Docs**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
- **MCP Protocol**: [modelcontextprotocol.io](https://modelcontextprotocol.io)

