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

Set the following environment variables in Cloudflare Dashboard or via Wrangler:

**Required:**
```bash
wrangler secret put HYPERLIQUID_ACCOUNT_ADDRESS
wrangler secret put HYPERLIQUID_WALLET_API_KEY
```

**Optional:**
```bash
wrangler secret put AI_PROVIDER_API_KEY
wrangler secret put MODEL_ID
```

Or set via Cloudflare Dashboard:
1. Go to Workers & Pages → Your Worker → Settings → Variables
2. Add environment variables and secrets

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

1. **Use Secrets**: Store sensitive data (API keys, private keys) as Cloudflare secrets
2. **Enable Zero Trust**: Implement access control via Cloudflare Zero Trust
3. **Rate Limiting**: Configure rate limits to prevent abuse
4. **HTTPS Only**: Ensure all connections use HTTPS
5. **API Keys**: Use API keys for authentication
6. **CORS**: Configure CORS properly if needed
7. **Input Validation**: Validate all inputs in your MCP server

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

