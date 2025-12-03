/**
 * Hyperliquid Account Operations Tool (Merged)
 * Handles balance checks and internal transfers
 * 
 * Operations:
 * - check_balance: Check spot/perp balances
 * - transfer: Transfer between spot<->perp or send to other wallets
 */

import { z } from 'zod'
import * as hl from '@nktkas/hyperliquid'

// ============================================================================
// SCHEMAS
// ============================================================================

const accountOperationsSchema = z.object({
  operation: z.enum([
    'check_spot_balance',
    'check_perp_balance',
    'transfer_spot_to_perp',
    'transfer_perp_to_spot',
    'send_spot_token',
    'send_usd',
  ]).describe('Type of account operation to perform'),
  
  // For balance checks
  walletAddress: z.string().optional().describe('Wallet address (optional, uses MAIN_WALLET_ADDRESS if not provided)'),
  
  // For transfers
  amount: z.string().optional().describe('Amount to transfer/send'),
  
  // For send operations
  destination: z.string().optional().describe('Recipient wallet address (for send operations)'),
  token: z.string().optional().describe('Token name for send_spot_token (e.g., "PURR", "HYPE")'),
  
  // Network
  isTestnet: z.boolean().default(true).describe('Use testnet (true) or mainnet (false)'),
  confirmMainnet: z.boolean().optional().describe('Required for mainnet execution'),
})

export type AccountOperationsInput = z.infer<typeof accountOperationsSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWalletAddress(providedAddress?: string): string {
  const address = providedAddress || process.env.MAIN_WALLET_ADDRESS
  if (!address) {
    throw new Error('Wallet address not provided and MAIN_WALLET_ADDRESS not set')
  }
  return address
}

function getClients(isTestnet: boolean): {
  infoClient: hl.InfoClient
  exchClient: hl.ExchangeClient
} {
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('AGENT_WALLET_PRIVATE_KEY not set')
  }

  const transport = new hl.HttpTransport({ isTestnet })
  
  return {
    infoClient: new hl.InfoClient({ transport }),
    exchClient: new hl.ExchangeClient({
      wallet: privateKey as `0x${string}`,
      transport,
    }),
  }
}

async function getTokenId(token: string, isTestnet: boolean): Promise<string> {
  const { infoClient } = getClients(isTestnet)
  const spotMeta = await infoClient.spotMeta()
  
  const tokenInfo = spotMeta.tokens.find((t: any) => 
    t.name?.toUpperCase() === token.toUpperCase()
  )
  
  if (!tokenInfo) {
    throw new Error(`Token ${token} not found`)
  }
  
  return `${tokenInfo.name}:${tokenInfo.tokenId}`
}

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

async function checkSpotBalance(walletAddress: string, isTestnet: boolean) {
  const { infoClient } = getClients(isTestnet)
  const spotState = await infoClient.spotClearinghouseState({ user: walletAddress as `0x${string}` })

  return {
    success: true,
    operation: 'check_spot_balance',
    address: walletAddress,
    balances: spotState.balances.map((b: any) => ({
      token: b.coin || b.token,
      total: b.total || '0',
      hold: b.hold || '0',
      available: (parseFloat(b.total || '0') - parseFloat(b.hold || '0')).toFixed(6),
    })),
    timestamp: Date.now(),
  }
}

async function checkPerpBalance(walletAddress: string, isTestnet: boolean) {
  const { infoClient } = getClients(isTestnet)
  const perpState = await infoClient.clearinghouseState({ user: walletAddress as `0x${string}` })

  const marginSummary = perpState.marginSummary || perpState.crossMarginSummary
  const accountValue = marginSummary?.accountValue || '0'
  const totalMarginUsed = marginSummary?.totalMarginUsed || '0'
  const withdrawable = (marginSummary as any)?.withdrawable || '0'
  
  return {
    success: true,
    operation: 'check_perp_balance',
    address: walletAddress,
    accountValue,
    totalMarginUsed,
    availableMargin: (parseFloat(accountValue) - parseFloat(totalMarginUsed)).toFixed(6),
    withdrawable,
    positions: (perpState.assetPositions || []).map((pos: any) => ({
      coin: pos.position?.coin || 'unknown',
      szi: pos.position?.szi || '0',
      leverage: pos.position?.leverage?.value || '0',
      entryPrice: pos.position?.entryPx || '0',
      unrealizedPnl: pos.position?.unrealizedPnl || '0',
      marginUsed: pos.position?.marginUsed || '0',
    })),
    timestamp: Date.now(),
  }
}

async function transferSpotToPerp(amount: string, isTestnet: boolean) {
  const { exchClient } = getClients(isTestnet)
  
  const result = await exchClient.usdClassTransfer({
    amount,
    toPerp: true,
  })

  return {
    success: result.status === 'ok',
    operation: 'transfer_spot_to_perp',
    from: 'spot',
    to: 'perp',
    amount,
    details: result,
    timestamp: Date.now(),
  }
}

async function transferPerpToSpot(amount: string, isTestnet: boolean) {
  const { exchClient } = getClients(isTestnet)
  
  const result = await exchClient.usdClassTransfer({
    amount,
    toPerp: false,
  })

  return {
    success: result.status === 'ok',
    operation: 'transfer_perp_to_spot',
    from: 'perp',
    to: 'spot',
    amount,
    details: result,
    timestamp: Date.now(),
  }
}

async function sendSpotToken(destination: string, token: string, amount: string, isTestnet: boolean) {
  const { exchClient } = getClients(isTestnet)
  const tokenId = await getTokenId(token, isTestnet)
  
  const result = await exchClient.spotSend({
    destination: destination as `0x${string}`,
    token: tokenId,
    amount,
  })

  return {
    success: result.status === 'ok',
    operation: 'send_spot_token',
    from: process.env.MAIN_WALLET_ADDRESS,
    to: destination,
    token,
    amount,
    details: result,
    timestamp: Date.now(),
  }
}

async function sendUsd(destination: string, amount: string, isTestnet: boolean) {
  const { exchClient } = getClients(isTestnet)
  
  const result = await exchClient.usdSend({
    destination: destination as `0x${string}`,
    amount,
  })

  return {
    success: result.status === 'ok',
    operation: 'send_usd',
    from: process.env.MAIN_WALLET_ADDRESS,
    to: destination,
    amount,
    details: result,
    timestamp: Date.now(),
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function executeAccountOperation(input: AccountOperationsInput) {
  // Safety check for mainnet
  if (!input.isTestnet && !input.confirmMainnet) {
    return {
      success: false,
      operation: input.operation,
      error: 'Mainnet execution requires confirmMainnet: true',
      timestamp: Date.now(),
    }
  }

  try {
    console.log(`🔧 Executing: ${input.operation}`)
    console.log(`   Network: ${input.isTestnet ? 'TESTNET' : 'MAINNET'}`)

    switch (input.operation) {
      case 'check_spot_balance': {
        const address = getWalletAddress(input.walletAddress)
        return await checkSpotBalance(address, input.isTestnet)
      }

      case 'check_perp_balance': {
        const address = getWalletAddress(input.walletAddress)
        return await checkPerpBalance(address, input.isTestnet)
      }

      case 'transfer_spot_to_perp': {
        if (!input.amount) throw new Error('amount is required for transfer')
        return await transferSpotToPerp(input.amount, input.isTestnet)
      }

      case 'transfer_perp_to_spot': {
        if (!input.amount) throw new Error('amount is required for transfer')
        return await transferPerpToSpot(input.amount, input.isTestnet)
      }

      case 'send_spot_token': {
        if (!input.destination) throw new Error('destination is required')
        if (!input.token) throw new Error('token is required')
        if (!input.amount) throw new Error('amount is required')
        return await sendSpotToken(input.destination, input.token, input.amount, input.isTestnet)
      }

      case 'send_usd': {
        if (!input.destination) throw new Error('destination is required')
        if (!input.amount) throw new Error('amount is required')
        return await sendUsd(input.destination, input.amount, input.isTestnet)
      }

      default:
        throw new Error(`Unknown operation: ${input.operation}`)
    }
  } catch (error: any) {
    console.error(`❌ Error in ${input.operation}:`, error)
    return {
      success: false,
      operation: input.operation,
      error: error.message || String(error),
      timestamp: Date.now(),
    }
  }
}

// ============================================================================
// MCP REGISTRATION
// ============================================================================

export function registerHyperliquidAccountOperations(server: any) {
  server.tool(
    'hyperliquid_account_operations',
    `Manage Hyperliquid account: check balances, transfer between spot/perp, send tokens.
    
Operations:
- check_spot_balance: Check spot token balances
- check_perp_balance: Check perpetual account (positions, margin, PnL)
- transfer_spot_to_perp: Move USD from spot to perp account
- transfer_perp_to_spot: Move USD from perp to spot account  
- send_spot_token: Send spot tokens to another wallet
- send_usd: Send USD to another wallet`,
    accountOperationsSchema,
    async (args: AccountOperationsInput) => {
      const result = await executeAccountOperation(args)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    }
  )

  console.log('✅ Registered: hyperliquid_account_operations (6 operations merged)')
}
