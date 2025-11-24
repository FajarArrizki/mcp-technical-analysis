# GearTrade MCP Server - Nullshot + Cloudflare Deployment Guide

This guide covers deploying the GearTrade MCP Server using Nullshot MCP SDK with Cloudflare Workers integration.

## Overview

GearTrade MCP Server has been migrated to the Nullshot MCP SDK for serverless deployment on Cloudflare Workers. This provides:

- ✅ **Serverless Deployment**: Global edge network with auto-scaling
- ✅ **Zero Trust Security**: Access control via Cloudflare Zero Trust
- ✅ **MCP Server Portal**: Centralized management via Cloudflare
- ✅ **Multi-User Support**: Each user provides their own credentials
- ✅ **TypeScript Support**: Full type safety with modern tooling

## Prerequisites

1. **Node.js 18+** and **npm** or **pnpm**
2. **Cloudflare Account** with Workers enabled
3. **Wrangler CLI** installed globally
4. **Hyperliquid Account** (for live trading)

## Quick Start

### 1. Install Dependencies

```bash
# Install workspace dependencies
npm install

# Install MCP dependencies via Nullshot
npm run install:mcp
```

### 2. Configure Environment Variables

Create `.env` file in root:

```bash
# AI Provider Configuration
AI_PROVIDER=openrouter
AI_PROVIDER_API_KEY=your_api_key_here
MODEL_ID=anthropic/claude-3-5-sonnet

# Hyperliquid Configuration (optional - users can provide via tool params)
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_ACCOUNT_ADDRESS=0x...  # Optional
HYPERLIQUID_WALLET_API_KEY=your_private_key_here  # Optional

# Trading Configuration
CYCLE_INTERVAL_MS=10000
PAPER_CAPITAL=10000
TOP_ASSETS_FOR_AI=15
```

### 3. Development Mode

```bash
# Run MCP servers in development mode
npm run dev
```

### 4. Deploy to Production

```bash
# Deploy to Cloudflare Workers
bash .cloudflare/deploy.sh
```

## Project Structure

```
GEARTRADE/
├── packages/
│   └── geartrade-mcp-server/     # Main MCP server package
│       ├── src/
│       │   ├── index.ts          # MCP server entry point (Nullshot SDK)
│       │   └── signal-generation/ # All trading logic
│       ├── dist/                 # Built output
│       ├── package.json          # Package dependencies
│       ├── tsconfig.json         # TypeScript configuration
│       └── wrangler.toml         # Cloudflare Workers config
├── mcp.json                      # Nullshot MCP configuration
├── pnpm-workspace.yaml           # Workspace configuration
├── package.json                  # Root package configuration
├── .cloudflare/
│   └── deploy.sh                 # Deployment script
└── .nullshot/
    └── deploy.md                 # This guide
```

## Configuration Files

### mcp.json
Defines the MCP server configuration, tools, and resources for Nullshot.

### wrangler.toml
Cloudflare Workers configuration including environment variables and build settings.

### tsconfig.json
TypeScript configuration optimized for Cloudflare Workers runtime.

## Multi-User Credentials Support

GearTrade MCP Server supports **multi-user credentials** for open-source deployment:

### How It Works

1. **Tool Parameters**: Users provide `accountAddress` and `walletApiKey` directly in tool calls
2. **No Secrets Required**: Perfect for open-source deployment
3. **Paper Trading Default**: If no credentials provided, tools default to simulation
4. **Secure**: Credentials are never stored or logged

### Example Usage

```json
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "LONG",
    "quantity": 0.1,
    "leverage": 10,
    "execute": true,
    "useLiveExecutor": true,
    "accountAddress": "0xUserAddress",     // User's own address
    "walletApiKey": "UserPrivateKey"       // User's own private key
  }
}
```

## Security Best Practices

### Cloudflare Workers Security

- **Zero Trust**: Implement Cloudflare Zero Trust policies
- **HTTPS Only**: All connections are encrypted by default
- **Rate Limiting**: Configure rate limits via Cloudflare dashboard
- **Secret Management**: Use Cloudflare secrets for sensitive data

### Credential Management

- ✅ **Recommended**: Users provide credentials via tool parameters
- ✅ **No Hardcoded Secrets**: Never commit credentials to repository
- ✅ **Environment Variables**: Use Cloudflare secrets for optional defaults
- ✅ **Paper Trading**: Always test with paper trading first

## Monitoring and Troubleshooting

### Cloudflare Workers Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to Workers & Pages
3. Select `geartrade-mcp-server`
4. Monitor logs, analytics, and usage metrics

### Local Development

```bash
# Check MCP configuration
npm run validate

# List installed MCP servers
npm run list

# Run with verbose logging
nullshot dev --verbose
```

### Common Issues

1. **Build Errors**:
   ```bash
   cd packages/geartrade-mcp-server
   npm run build
   ```

2. **Deployment Failures**:
   ```bash
   wrangler whoami  # Check authentication
   wrangler deploy --dry-run  # Test deployment
   ```

3. **Runtime Errors**:
   - Check Cloudflare Workers logs
   - Verify environment variables
   - Ensure all dependencies are compatible with Workers runtime

## API Integration

### AI Provider Setup

Supports multiple AI providers:

- **OpenRouter**: `AI_PROVIDER=openrouter`
- **Anthropic**: `AI_PROVIDER=anthropic`
- **OpenAI**: `AI_PROVIDER=openai`
- **Zai**: `AI_PROVIDER=zai`

Set appropriate API keys and model IDs in environment variables.

### Hyperliquid Integration

- **API Endpoint**: `https://api.hyperliquid.xyz`
- **Authentication**: EIP-712 signed orders
- **Order Types**: Market, Limit orders
- **Leverage**: 1-50x for futures
- **Settlement**: Instant settlement with paper trading option

## Performance Optimization

### Cloudflare Workers

- **Cold Starts**: Minimize initialization time
- **Memory Usage**: Optimize for 128MB limit
- **CPU Time**: Stay within 50ms CPU limit
- **Bundle Size**: Keep under 1MB compressed

### Best Practices

1. **Batch Operations**: Use multiple analysis tools for efficiency
2. **Caching**: Implement response caching where appropriate
3. **Error Handling**: Graceful degradation for API failures
4. **Monitoring**: Track performance metrics and errors

## Scaling and Costs

### Auto-scaling

- **Global Edge**: Automatic deployment to 200+ edge locations
- **Load Balancing**: Built-in load balancing
- **Failover**: Automatic failover between regions

### Cost Management

- **Free Tier**: 100,000 requests/day free
- **Bundling**: Efficient request/response handling
- **Monitoring**: Track usage via Cloudflare dashboard

## Support and Documentation

### Resources

- **Nullshot Documentation**: [GitHub Repository](https://github.com/null-shot/typescript-agent-tookit)
- **Cloudflare Workers**: [Developer Docs](https://developers.cloudflare.com/workers/)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)

### Community

- **Issues**: Report bugs via GitHub issues
- **Discussions**: Community discussions and Q&A
- **Updates**: Follow project repository for updates

## Next Steps

1. **Test locally**: `npm run dev`
2. **Deploy to staging**: Test with non-production data
3. **Configure monitoring**: Set up alerts and logging
4. **Scale production**: Gradual rollout with monitoring
5. **Maintain security**: Regular updates and security reviews