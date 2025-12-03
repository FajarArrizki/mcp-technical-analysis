/**
 * Hyperliquid Bridge Operations Tool
 * Handles withdraw to Arbitrum L1 and deposit tracking
 * 
 * Operations:
 * - withdraw_to_arbitrum: Withdraw USDC from Hyperliquid to Arbitrum L1
 * - check_withdraw_status: Check status of withdrawal (pending/completed)
 * 
 * Note: Deposit from Arbitrum requires direct interaction with bridge contract
 */

import { z } from 'zod'
import * as hl from '@nktkas/hyperliquid'

// ============================================================================
// SCHEMAS
// ============================================================================

const bridgeOperationsSchema = z.object({
  operation: z.enum([
    'withdraw_to_arbitrum',
    'check_withdraw_status',
  ]).describe('Type of bridge operation'),
  
  // For withdraw
  destination: z.string().optional().describe('Destination address on Arbitrum (for withdraw)'),
  amount: z.string().optional().describe('Amount to withdraw in USD (e.g., "100" for $100)'),
  
  // Network
  isTestnet: z.boolean().default(true).describe('Use testnet (Arbitrum Sepolia) or mainnet (Arbitrum One)'),
  confirmMainnet: z.boolean().optional().describe('Required for mainnet execution'),
})

export type BridgeOperationsInput = z.infer<typeof bridgeOperationsSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExchangeClient(isTestnet: boolean): hl.ExchangeClient {
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY
  
  if (!privateKey) {
    throw new Error('AGENT_WALLET_PRIVATE_KEY not set')
  }

  const transport = new hl.HttpTransport({ isTestnet })
  
  return new hl.ExchangeClient({
    wallet: privateKey as `0x${string}`,
    transport,
  })
}

function getInfoClient(isTestnet: boolean): hl.InfoClient {
  return new hl.InfoClient({
    transport: new hl.HttpTransport({ isTestnet }),
  })
}

function getArbitrumRpcUrl(isTestnet: boolean): string {
  return isTestnet 
    ? (process.env.ARBITRUM_TESTNET_RPC_URL || 'https://arbitrum-sepolia.drpc.org')
    : (process.env.ARBITRUM_RPC_URL || 'https://arbitrum.drpc.org')
}

// ============================================================================
// OPERATION HANDLERS
// ============================================================================

async function withdrawToArbitrum(
  destination: string, 
  amount: string, 
  isTestnet: boolean
) {
  const exchClient = getExchangeClient(isTestnet)
  
  console.log(`💸 Initiating withdrawal to Arbitrum`)
  console.log(`   Destination: ${destination}`)
  console.log(`   Amount: $${amount}`)
  console.log(`   Network: ${isTestnet ? 'Arbitrum Sepolia (Testnet)' : 'Arbitrum One (Mainnet)'}`)
  console.log(`   RPC: ${getArbitrumRpcUrl(isTestnet)}`)

  const result = await exchClient.withdraw3({
    destination: destination as `0x${string}`,
    amount,
  })

  if (result.status === 'ok') {
    console.log('✅ Withdrawal request submitted successfully')
    console.log('⏳ Note: Withdrawal requires ~3 hours to process (Hyperliquid → Arbitrum bridge)')
    
    return {
      success: true,
      operation: 'withdraw_to_arbitrum',
      destination,
      amount,
      network: isTestnet ? 'Arbitrum Sepolia' : 'Arbitrum One',
      status: 'pending',
      estimatedTime: '~3 hours',
      note: 'Withdrawal is being processed. Check your Arbitrum wallet in ~3 hours.',
      details: result,
      timestamp: Date.now(),
    }
  } else {
    return {
      success: false,
      operation: 'withdraw_to_arbitrum',
      destination,
      amount,
      error: `Withdrawal failed: ${result.response?.type || 'unknown error'}`,
      details: result,
      timestamp: Date.now(),
    }
  }
}

async function checkWithdrawStatus(walletAddress: string, isTestnet: boolean) {
  const infoClient = getInfoClient(isTestnet)
  
  console.log(`🔍 Checking withdrawal status for ${walletAddress}`)
  
  // Get user state to check pending withdrawals
  const userState = await infoClient.clearinghouseState({ 
    user: walletAddress as `0x${string}` 
  })

  // Check withdrawable amount
  const marginSummary = userState.marginSummary || userState.crossMarginSummary
  const withdrawable = (marginSummary as any)?.withdrawable || '0'

  return {
    success: true,
    operation: 'check_withdraw_status',
    address: walletAddress,
    withdrawable,
    note: 'To check completed withdrawals on Arbitrum, use block explorer: arbiscan.io (mainnet) or sepolia.arbiscan.io (testnet)',
    timestamp: Date.now(),
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function executeBridgeOperation(input: BridgeOperationsInput) {
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
    console.log(`🌉 Executing: ${input.operation}`)
    console.log(`   Network: ${input.isTestnet ? 'TESTNET (Sepolia)' : 'MAINNET'}`)

    switch (input.operation) {
      case 'withdraw_to_arbitrum': {
        if (!input.destination) throw new Error('destination is required')
        if (!input.amount) throw new Error('amount is required')
        return await withdrawToArbitrum(input.destination, input.amount, input.isTestnet)
      }

      case 'check_withdraw_status': {
        const walletAddress = process.env.MAIN_WALLET_ADDRESS
        if (!walletAddress) throw new Error('MAIN_WALLET_ADDRESS not set')
        return await checkWithdrawStatus(walletAddress, input.isTestnet)
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

export function registerHyperliquidBridgeOperations(server: any) {
  server.tool(
    'hyperliquid_bridge_operations',
    `Bridge operations between Hyperliquid and Arbitrum L1.

Operations:
- withdraw_to_arbitrum: Withdraw USDC from Hyperliquid to Arbitrum L1 (takes ~3 hours)
- check_withdraw_status: Check withdrawable balance and pending withdrawals

Network:
- Testnet: Hyperliquid Testnet ↔ Arbitrum Sepolia
- Mainnet: Hyperliquid ↔ Arbitrum One

Note: Deposits from Arbitrum to Hyperliquid must be done via Hyperliquid UI (app.hyperliquid.xyz) or direct bridge contract interaction.`,
    bridgeOperationsSchema,
    async (args: BridgeOperationsInput) => {
      const result = await executeBridgeOperation(args)
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

  console.log('✅ Registered: hyperliquid_bridge_operations (2 operations)')
}
