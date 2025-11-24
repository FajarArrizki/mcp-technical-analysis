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

# Note about credentials
echo "📝 Credentials Information:"
echo "   ℹ️  This MCP server supports multi-user credentials"
echo "   ℹ️  Users can provide their own credentials via tool parameters:"
echo "      - accountAddress: Hyperliquid account address"
echo "      - walletApiKey: Hyperliquid wallet API key / private key"
echo "   ℹ️  Environment variables are optional (for backward compatibility)"
echo "   ℹ️  If credentials are not provided, tools will use paper executor (simulation)"
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
echo "1. ✅ No secrets required! Users can provide their own credentials via tool parameters"
echo "2. Configure non-sensitive environment variables in Cloudflare Dashboard (optional)"
echo "3. Test the MCP server connection"
echo ""
echo "💡 How users provide credentials:"
echo "   - Pass accountAddress and walletApiKey as parameters to execution tools"
echo "   - Or set environment variables (for backward compatibility)"
echo "   - If not provided, tools default to paper executor (simulation)"
echo ""
echo "🔗 MCP Server URL: https://mcp.geartrade.ai"
echo ""
echo "🔒 Security Reminder:"
echo "   - Never commit secrets to Git"
echo "   - Always use Cloudflare's secret management"
echo "   - Secrets are encrypted and never exposed in code"

