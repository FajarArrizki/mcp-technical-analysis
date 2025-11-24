/**
 * Test Script: Check Hyperliquid Wallet Balance
 * This script tests the connection to Hyperliquid wallet API and displays account balance
 * DOES NOT perform any trades - only reads balance information
 */

// Ensure .env is loaded before importing config
// Config module loads .env, but we need to ensure it's loaded from the correct path
import * as fs from 'fs'
import * as path from 'path'

// Try multiple possible paths for .env file
const possibleEnvPaths = [
  path.join(__dirname, '..', '..', '.env'), // From src/signal-generation/
  path.join(process.cwd(), '.env'), // From project root
  path.resolve('.env') // Current directory
]

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line: string) => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
        const trimmedKey = key.trim()
        if (trimmedKey && value && !process.env[trimmedKey]) {
          process.env[trimmedKey] = value.trim()
        }
      }
    })
    break // Stop after loading first found .env
  }
}

import { getUserState } from './data-fetchers/hyperliquid'
import { getHyperliquidAccountAddress, getHyperliquidWalletApiKey } from './config'
import { log } from './utils/logger'

async function testWalletBalance() {
  try {
    log('\n======================================================================', 'cyan')
    log('🔍 Testing Hyperliquid Wallet Balance Access', 'cyan')
    log('======================================================================\n', 'cyan')

    // Check if account address is configured
    const accountAddress = getHyperliquidAccountAddress()
    if (!accountAddress || accountAddress.trim() === '') {
      log('❌ Error: HYPERLIQUID_ACCOUNT_ADDRESS is not configured', 'red')
      log('   Please set it in your .env file:', 'yellow')
      log('   HYPERLIQUID_ACCOUNT_ADDRESS=your_wallet_address', 'yellow')
      process.exit(1)
    }

    log(`✅ Account Address: ${accountAddress}`, 'green')

    // Note: Info endpoint does NOT require HTTP authentication
    // API wallets (with private keys) are used for signing transactions on /exchange endpoint
    // See Hyperliquid API docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
    const apiKey = getHyperliquidWalletApiKey()
    if (apiKey && apiKey.trim() !== '') {
      log(`ℹ️  Wallet API Key: Configured (for transaction signing, not HTTP auth)`, 'cyan')
    } else {
      log(`ℹ️  Wallet API Key: Not configured (only needed for /exchange endpoint)`, 'cyan')
    }

    log('\n📊 Fetching account state...', 'cyan')
    log('   ℹ️  Note: Info endpoint is public - no HTTP authentication required', 'cyan')
    log('   ℹ️  API wallets are used for signing transactions, not HTTP auth', 'cyan')

    // Info endpoint does NOT require HTTP authentication - it's a public endpoint
    // According to Hyperliquid API docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
    // API wallets are used for signing transactions (EIP-712 signatures), not HTTP auth headers
    let userState: any
    try {
      userState = await getUserState(accountAddress, 3, 1000)
    } catch (error: any) {
      log('❌ Error fetching account state:', 'red')
      log(`   ${error.message}`, 'red')
      log('\n   Raw error:', 'yellow')
      console.error(error)
      process.exit(1)
    }

    if (!userState) {
      log('❌ Failed to fetch account state: Empty response', 'red')
      process.exit(1)
    }

    // Handle different response formats from Hyperliquid API
    // Some responses have data wrapper, others have data directly in root
    let stateData = userState.data
    if (!stateData) {
      // Response format: { marginSummary: {...}, crossMarginSummary: {...}, ... }
      // Wrap it in data object for consistent parsing
      if (userState.marginSummary || userState.crossMarginSummary || userState.assetPositions) {
        // Create a safe copy to avoid circular reference
        stateData = {
          marginSummary: userState.marginSummary,
          crossMarginSummary: userState.crossMarginSummary,
          assetPositions: userState.assetPositions,
          withdrawable: userState.withdrawable,
          crossMaintenanceMarginUsed: userState.crossMaintenanceMarginUsed,
          time: userState.time
        }
        userState.data = stateData
      } else {
        log('❌ Cannot parse account state from response', 'red')
        log('   Unexpected response format:', 'yellow')
        console.log(JSON.stringify(userState, null, 2))
        process.exit(1)
      }
    }

    // Debug: Show raw API response for troubleshooting
    if (process.env.DEBUG_HYPERLIQUID) {
      log('\n🔍 Debug: Raw API Response:', 'cyan')
      // Use stateData to avoid circular reference
      console.log(JSON.stringify({ data: stateData }, null, 2))
    }

    log('✅ Successfully connected to Hyperliquid API!\n', 'green')

    // Parse account state
    const marginSummary = stateData.marginSummary || stateData.crossMarginSummary
    if (!marginSummary) {
      log('⚠️  Warning: Margin summary not found in response', 'yellow')
      log('   Raw response:', 'yellow')
      console.log(JSON.stringify(userState, null, 2))
      process.exit(0)
    }

    // Display account information
    log('======================================================================', 'cyan')
    log('💰 Account Balance Information', 'cyan')
    log('======================================================================\n', 'cyan')

    // Parse account information from Hyperliquid API response
    const accountValue = parseFloat(marginSummary.accountValue || stateData.accountValue || '0')
    // Available Cash = Account Value - Total Margin Used (or use withdrawable if available)
    const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0')
    const withdrawable = parseFloat(stateData.withdrawable || '0')
    // Available Cash is the amount that can be withdrawn/used for new positions
    const availableCash = withdrawable > 0 ? withdrawable : Math.max(0, accountValue - totalMarginUsed)
    
    const totalCollateral = parseFloat(marginSummary.totalCollateral || marginSummary.totalCollateralValue || stateData.crossMarginSummary?.totalCollateral || '0')
    const totalNtlPos = parseFloat(marginSummary.totalNtlPos || '0')
    const totalRawUsd = parseFloat(marginSummary.totalRawUsd || '0')
    const totalMarginUsedDisplay = parseFloat(marginSummary.totalMarginUsed || '0')

    log(`📊 Account Value:      $${accountValue.toFixed(2)}`, 'green')
    log(`💵 Available Cash:     $${availableCash.toFixed(2)} ${withdrawable > 0 ? '(Withdrawable)' : '(Account Value - Margin Used)'}`, 'green')
    log(`💎 Total Collateral:   $${totalCollateral.toFixed(2)}`, 'cyan')
    log(`📈 Total Notional:     $${totalNtlPos.toFixed(2)}`, 'cyan')
    log(`💳 Total Raw USD:      $${totalRawUsd.toFixed(2)}`, 'cyan')
    if (totalMarginUsedDisplay > 0) {
      log(`🔒 Total Margin Used:  $${totalMarginUsedDisplay.toFixed(2)}`, 'yellow')
    }

    // Display active positions if any
    if (stateData.assetPositions && Array.isArray(stateData.assetPositions)) {
      const activePositions = stateData.assetPositions.filter((pos: any) => {
        if (!pos || !pos.position) return false
        const szi = parseFloat(pos.position.szi || '0')
        return Math.abs(szi) > 0.0001
      })

      if (activePositions.length > 0) {
        log('\n📊 Active Positions:', 'cyan')
        log('─'.repeat(60), 'cyan')
        activePositions.forEach((pos: any, index: number) => {
          const position = pos.position || {}
          const coin = position.coin || 'N/A'
          const szi = parseFloat(position.szi || '0')
          const entryPx = parseFloat(position.entryPx || '0')
          const unrealizedPnl = parseFloat(position.unrealizedPnl || '0')
          const side = szi > 0 ? 'LONG' : 'SHORT'
          const pnlColor = unrealizedPnl >= 0 ? 'green' : 'red'
          
          log(`${index + 1}. ${coin}: ${side} ${Math.abs(szi).toFixed(4)} @ $${entryPx.toFixed(2)}`, 'cyan')
          log(`   PnL: $${unrealizedPnl.toFixed(2)}`, pnlColor)
        })
      } else {
        log('\n✅ No active positions', 'green')
      }
    }

    log('\n✅ Wallet balance check completed successfully!', 'green')
    log('   ⚠️  Note: This is a read-only operation. No trades were executed.', 'yellow')
    log('======================================================================\n', 'cyan')

  } catch (error: any) {
    log('\n❌ Error fetching wallet balance:', 'red')
    log(`   ${error.message}`, 'red')
    
    if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
      log('\n💡 Troubleshooting:', 'yellow')
      log('   1. Check your internet connection', 'yellow')
      log('   2. Verify HYPERLIQUID_API_URL is correct (default: https://api.hyperliquid.xyz)', 'yellow')
      log('   3. Check if Hyperliquid API is accessible', 'yellow')
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      log('\n💡 Troubleshooting:', 'yellow')
      log('   1. Verify HYPERLIQUID_WALLET_API_KEY is correct in .env', 'yellow')
      log('   2. Check if the API key has the required permissions', 'yellow')
      log('   3. Ensure the API key is not expired', 'yellow')
    }
    
    process.exit(1)
  }
}

// Run the test
testWalletBalance()

