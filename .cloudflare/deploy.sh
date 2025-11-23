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

# Check required environment variables
echo "🔍 Checking environment variables..."
if [ -z "$HYPERLIQUID_ACCOUNT_ADDRESS" ]; then
    echo "⚠️  Warning: HYPERLIQUID_ACCOUNT_ADDRESS not set"
fi

if [ -z "$HYPERLIQUID_WALLET_API_KEY" ]; then
    echo "⚠️  Warning: HYPERLIQUID_WALLET_API_KEY not set"
fi

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
echo "1. Set secrets via: wrangler secret put SECRET_NAME"
echo "2. Configure environment variables in Cloudflare Dashboard"
echo "3. Test the MCP server connection"
echo ""
echo "🔗 MCP Server URL: https://mcp.geartrade.ai"

