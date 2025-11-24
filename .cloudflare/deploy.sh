#!/bin/bash

# GearTrade MCP Server - Cloudflare Deployment Script
# This script deploys the GearTrade MCP server to Cloudflare Workers

set -e

echo "🚀 Deploying GearTrade MCP Server to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Login to Cloudflare (if not already logged in)
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please login to Cloudflare:"
    wrangler login
fi

# Navigate to the MCP server package
cd packages/geartrade-mcp-server

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Optional: Set secrets (uncomment and modify as needed)
# echo "🔐 Setting up secrets..."
# wrangler secret put HYPERLIQUID_ACCOUNT_ADDRESS
# wrangler secret put HYPERLIQUID_WALLET_API_KEY
# wrangler secret put AI_PROVIDER_API_KEY

# Deploy to Cloudflare Workers
echo "☁️  Deploying to Cloudflare Workers..."
wrangler deploy

echo "✅ Deployment completed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Configure your MCP client to use the deployed worker URL"
echo "2. Set up environment variables for your Hyperliquid credentials"
echo "3. Test the MCP server connection"
echo ""
echo "🔧 Worker configuration:"
echo "- Account: $(wrangler whoami)"
echo "- Worker name: geartrade-mcp-server"
echo "- Compatibility date: 2024-01-15"