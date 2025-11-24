/**
 * Hyperliquid EIP-712 Signing
 * Implements EIP-712 signature for Hyperliquid order submission
 */

import { ethers } from 'ethers'
import { getAssetMetadata } from '../data-fetchers/hyperliquid'

// Hyperliquid EIP-712 Domain
const HYPERLIQUID_DOMAIN = {
  name: 'Hyperliquid',
  version: '1',
  chainId: 1337, // Hyperliquid uses chainId 1337
  verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`
}

// Order action types
export type OrderAction = 'order' | 'cancel' | 'update'

/**
 * Get asset index from symbol
 */
export async function getAssetIndex(symbol: string): Promise<number> {
  try {
    const metadata = await getAssetMetadata()
    let universe: any[] = []
    
    if (Array.isArray(metadata) && metadata.length >= 2) {
      const metaObj = metadata[0]
      if (metaObj && metaObj.universe) {
        universe = metaObj.universe || []
      }
    } else if (metadata && (metadata as any).data) {
      universe = (metadata as any).data.universe || []
    }
    
    const index = universe.findIndex((item: any) => {
      if (typeof item === 'string') return item === symbol
      return item.name === symbol || item.symbol === symbol
    })
    
    if (index < 0) {
      throw new Error(`Asset ${symbol} not found in Hyperliquid universe`)
    }
    
    return index
  } catch (error: any) {
    throw new Error(`Failed to get asset index: ${error.message}`)
  }
}

/**
 * Create EIP-712 order message for Hyperliquid
 */
export function createOrderMessage(params: {
  assetIndex: number
  isBuy: boolean
  reduceOnly: boolean
  limitPx?: string
  sz: string
  orderType: 'Market' | 'Limit'
  cloid?: string
}): any {
  const order: any = {
    a: params.assetIndex,
    b: params.isBuy,
    p: params.limitPx || '0',
    s: params.sz,
    r: params.reduceOnly,
  }

  // Add order type
  if (params.orderType === 'Limit') {
    order.t = { limit: { tif: 'Gtc' } }
  }

  // Add client order ID if provided (optional, for order tracking)
  if (params.cloid) {
    order.c = params.cloid
  }

  // Remove undefined/null fields to match Hyperliquid API format
  const cleanOrder: any = {}
  if (order.a !== undefined) cleanOrder.a = order.a
  if (order.b !== undefined) cleanOrder.b = order.b
  if (order.p !== undefined) cleanOrder.p = order.p
  if (order.s !== undefined) cleanOrder.s = order.s
  if (order.r !== undefined) cleanOrder.r = order.r
  if (order.t !== undefined) cleanOrder.t = order.t
  if (order.c !== undefined) cleanOrder.c = order.c

  return {
    action: {
      type: 'order',
      orders: [cleanOrder],
      grouping: 'na' // 'na' = no grouping, 'gtd' = good till date grouping
    }
  }
}

/**
 * Sign EIP-712 message for Hyperliquid
 * Hyperliquid uses a specific EIP-712 structure for order signing
 * Returns signature in format { r, s, v } for Hyperliquid API
 */
export async function signHyperliquidOrder(
  wallet: ethers.Wallet,
  message: any
): Promise<{ r: string; s: string; v: number }> {
  try {
    // Hyperliquid EIP-712 types - must match Hyperliquid's exact structure
    const types = {
      Order: [
        { name: 'a', type: 'uint64' },
        { name: 'b', type: 'bool' },
        { name: 'p', type: 'string' },
        { name: 's', type: 'string' },
        { name: 'r', type: 'bool' },
        { name: 't', type: 'Limit' },
        { name: 'c', type: 'string' }
      ],
      Limit: [
        { name: 'tif', type: 'string' }
      ],
      Action: [
        { name: 'type', type: 'string' },
        { name: 'orders', type: 'Order[]' },
        { name: 'grouping', type: 'string' }
      ]
    }

    // Sign the typed data using EIP-712
    const signature = await wallet.signTypedData(
      HYPERLIQUID_DOMAIN,
      types,
      message.action
    )

    // Parse signature into r, s, v components
    // ethers.js signature format: 0x + r (64 chars) + s (64 chars) + v (2 chars) = 132 chars
    const sig = ethers.Signature.from(signature)
    
    return {
      r: sig.r, // Already includes 0x prefix
      s: sig.s, // Already includes 0x prefix
      v: sig.v  // Recovery ID (27 or 28)
    }
  } catch (error: any) {
    throw new Error(`Failed to sign order: ${error.message}`)
  }
}

/**
 * Create wallet from private key
 */
export function createWalletFromPrivateKey(privateKey: string): ethers.Wallet {
  try {
    // Remove '0x' prefix if present
    const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
    
    // Validate private key length (64 hex chars = 32 bytes)
    if (key.length !== 64) {
      throw new Error('Invalid private key length. Must be 64 hex characters (32 bytes)')
    }
    
    return new ethers.Wallet(`0x${key}`)
  } catch (error: any) {
    throw new Error(`Failed to create wallet: ${error.message}`)
  }
}

