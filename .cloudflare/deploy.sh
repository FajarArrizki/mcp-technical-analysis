#!/bin/bash

# GearTrade MCP Server - Cloudflare Deployment Script
# This script deploys the MCP server to Cloudflare Workers

set -e

echo "🚀 Deploying GearTrade MCP Server to Cloudflare..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Build the project
echo "📦 Building project..."
npm run build

# Check if build was successful
if [ ! -f "dist/mcp-server/index.js" ]; then
    echo "❌ Build failed! dist/mcp-server/index.js not found."
    exit 1
fi

# Check if secrets are set in Cloudflare
echo "🔍 Checking Cloudflare secrets..."
echo "⚠️  Note: Secrets must be set via Cloudflare Dashboard or 'wrangler secret put'"
echo "⚠️  Required secrets:"
echo "   - HYPERLIQUID_ACCOUNT_ADDRESS"
echo "   - HYPERLIQUID_WALLET_API_KEY"
echo ""
echo "💡 To set secrets, run:"
echo "   wrangler secret put HYPERLIQUID_ACCOUNT_ADDRESS"
echo "   wrangler secret put HYPERLIQUID_WALLET_API_KEY"
echo ""

# Deploy to Cloudflare
echo "☁️  Deploying to Cloudflare Workers..."
if [ "$1" == "staging" ]; then
    echo "📝 Deploying to staging environment..."
    wrangler deploy --env staging
else
    echo "📝 Deploying to production environment..."
    wrangler deploy --env production
fi

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. ⚠️  Set secrets via Cloudflare Dashboard or:"
echo "   wrangler secret put HYPERLIQUID_ACCOUNT_ADDRESS"
echo "   wrangler secret put HYPERLIQUID_WALLET_API_KEY"
echo ""
echo "2. Configure non-sensitive environment variables in Cloudflare Dashboard"
echo "3. Test the MCP server connection"
echo ""
echo "🔗 MCP Server URL: https://mcp.geartrade.ai"
echo ""
echo "🔒 Security Reminder:"
echo "   - Never commit secrets to Git"
echo "   - Always use Cloudflare's secret management"
echo "   - Secrets are encrypted and never exposed in code"

