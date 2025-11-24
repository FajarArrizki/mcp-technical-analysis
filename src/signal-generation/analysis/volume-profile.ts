/**
 * Volume Profile Analysis
 * calculateSessionVolumeProfile, calculateCompositeVolumeProfile functions
 */

import { HistoricalDataPoint } from '../types'

export interface VolumeProfileNode {
  price: number
  volume: number
}

export interface SessionVolumeProfile {
  poc: number
  vah: number
  val: number
  hvn: VolumeProfileNode[]
  lvn: VolumeProfileNode[]
  profile: VolumeProfileNode[]
  totalVolume: number
  sessionType: string
  timestamp: number
}

export interface CompositeVolumeProfile extends SessionVolumeProfile {
  timeRange: string
  accumulationZone: {
    priceRange: [number, number]
    volumeRatio: number
    strength: string
  } | null
  distributionZone: {
    priceRange: [number, number]
    volumeRatio: number
    strength: string
  } | null
  balanceZones: Array<{
    priceRange: [number, number]
    volume: number
    center: number
  }>
  compositePoc: number
  compositeVah: number
  compositeVal: number
}

/**
 * Calculate Session Volume Profile (SVP)
 * SVP shows volume distribution across price levels for a specific session
 */
export function calculateSessionVolumeProfile(
  historicalData: HistoricalDataPoint[],
  currentPrice: number,
  sessionType: string = 'daily'
): SessionVolumeProfile | null {
  if (!historicalData || historicalData.length < 20 || !currentPrice || currentPrice <= 0) {
    return null
  }
  
  // const closes = historicalData.map(d => d.close)
  const highs = historicalData.map(d => d.high)
  const lows = historicalData.map(d => d.low)
  // const volumes = historicalData.map(d => d.volume || 0)
  
  // Determine price range and create bins
  const minPrice = Math.min(...lows)
  const maxPrice = Math.max(...highs)
  const priceRange = maxPrice - minPrice
  
  if (priceRange <= 0) {
    return null
  }
  
  // Create price bins (50 bins for detailed profile)
  const numBins = 50
  const binSize = priceRange / numBins
  const volumeProfile = new Array(numBins).fill(0)
  const binPrices: number[] = []
  
  // Initialize bin prices
  for (let i = 0; i < numBins; i++) {
    binPrices.push(minPrice + (i * binSize) + (binSize / 2)) // Center of bin
  }
  
  // Distribute volume across price bins
  // For each candle, distribute volume proportionally across price range (high to low)
  for (let i = 0; i < historicalData.length; i++) {
    const candle = historicalData[i]
    const high = candle.high
    const low = candle.low
    const volume = candle.volume || 0
    
    if (high <= low || volume <= 0) continue
    
    // Distribute volume evenly across price range of this candle
    const candleRange = high - low
    if (candleRange > 0) {
      // const volumePerBin = volume / numBins
      
      // Find bins that overlap with this candle's price range
      for (let j = 0; j < numBins; j++) {
        const binPrice = binPrices[j]
        if (binPrice >= low && binPrice <= high) {
          // Volume proportional to how much of candle range this bin represents
          const overlapRatio = binSize / candleRange
          volumeProfile[j] += volume * overlapRatio
        }
      }
    }
  }
  
  // Find POC (Point of Control) - price level with highest volume
  let maxVolume = 0
  let pocIndex = 0
  for (let i = 0; i < volumeProfile.length; i++) {
    if (volumeProfile[i] > maxVolume) {
      maxVolume = volumeProfile[i]
      pocIndex = i
    }
  }
  const poc = binPrices[pocIndex]
  
  // Calculate total volume for value area calculation
  const totalVolume = volumeProfile.reduce((sum, vol) => sum + vol, 0)
  
  // Calculate Value Area (70% of volume)
  // Method: Expand outward from POC, including highest volume bins first
  const valueAreaVolume = totalVolume * 0.70
  let accumulatedVolume = volumeProfile[pocIndex] // Start with POC volume
  let valIndex = pocIndex // Start from POC
  let vahIndex = pocIndex
  
  // Create array of indices sorted by volume (descending), but prioritize proximity to POC
  const indicesWithVolume: Array<{ index: number; volume: number; distanceFromPoc: number }> = []
  for (let i = 0; i < volumeProfile.length; i++) {
    indicesWithVolume.push({ 
      index: i, 
      volume: volumeProfile[i],
      distanceFromPoc: Math.abs(i - pocIndex)
    })
  }
  
  // Sort by volume descending, then by distance from POC (closer first)
  indicesWithVolume.sort((a, b) => {
    if (Math.abs(b.volume - a.volume) > 0.01) {
      return b.volume - a.volume // Higher volume first
    }
    return a.distanceFromPoc - b.distanceFromPoc // Closer to POC first
  })
  
  // Expand from POC to find 70% value area
  // Include POC and highest volume bins closest to POC until we reach 70% of total volume
  for (const item of indicesWithVolume) {
    if (accumulatedVolume >= valueAreaVolume) {
      break
    }
    
    // Skip POC (already included)
    if (item.index === pocIndex) {
      continue
    }
    
    accumulatedVolume += item.volume
    
    // Update VAH and VAL indices
    if (item.index < pocIndex && item.index < valIndex) {
      valIndex = item.index // Expand VAL downward
    } else if (item.index > pocIndex && item.index > vahIndex) {
      vahIndex = item.index // Expand VAH upward
    }
  }
  
  // Ensure VAH and VAL are set (fallback to min/max if not found)
  if (valIndex === pocIndex && pocIndex > 0) {
    valIndex = 0 // Fallback to lowest price bin
  }
  if (vahIndex === pocIndex && pocIndex < numBins - 1) {
    vahIndex = numBins - 1 // Fallback to highest price bin
  }
  
  const vah = binPrices[vahIndex] // Value Area High
  const val = binPrices[valIndex] // Value Area Low
  
  // Identify HVN (High Volume Nodes) - price levels with above-average volume
  const avgVolume = totalVolume / numBins
  const hvnThreshold = avgVolume * 1.5 // 1.5x average = high volume node
  const hvn: VolumeProfileNode[] = []
  for (let i = 0; i < volumeProfile.length; i++) {
    if (volumeProfile[i] > hvnThreshold) {
      hvn.push({ price: binPrices[i], volume: volumeProfile[i] })
    }
  }
  hvn.sort((a, b) => b.volume - a.volume) // Sort by volume descending
  hvn.splice(5) // Keep top 5 HVN
  
  // Identify LVN (Low Volume Nodes) - price levels with below-average volume
  const lvnThreshold = avgVolume * 0.5 // 0.5x average = low volume node
  const lvn: VolumeProfileNode[] = []
  for (let i = 0; i < volumeProfile.length; i++) {
    if (volumeProfile[i] < lvnThreshold && volumeProfile[i] > 0) {
      lvn.push({ price: binPrices[i], volume: volumeProfile[i] })
    }
  }
  lvn.sort((a, b) => a.volume - b.volume) // Sort by volume ascending
  lvn.splice(5) // Keep top 5 LVN (lowest volume)
  
  // Create full profile array
  const profile: VolumeProfileNode[] = []
  for (let i = 0; i < volumeProfile.length; i++) {
    if (volumeProfile[i] > 0) {
      profile.push({ price: binPrices[i], volume: volumeProfile[i] })
    }
  }
  
  return {
    poc: poc, // Point of Control
    vah: vah, // Value Area High
    val: val, // Value Area Low
    hvn: hvn, // High Volume Nodes (support/resistance zones)
    lvn: lvn, // Low Volume Nodes (potential breakout areas)
    profile: profile, // Full volume profile
    totalVolume: totalVolume,
    sessionType: sessionType,
    timestamp: Date.now()
  }
}

/**
 * Calculate Composite Range Volume Profile (CRVP)
 * CRVP combines volume profiles across multiple sessions for long-term analysis
 */
export function calculateCompositeVolumeProfile(
  historicalData: HistoricalDataPoint[],
  currentPrice: number,
  timeRange: string = 'weekly'
): CompositeVolumeProfile | null {
  if (!historicalData || historicalData.length < 50 || !currentPrice || currentPrice <= 0) {
    return null
  }
  
  // For composite profile, use all available historical data
  // Group by sessions if needed (daily, weekly)
  let dataToUse = historicalData
  
  if (timeRange === 'weekly' && historicalData.length >= 168) {
    // Use last 7 days (168 hours) for weekly profile
    dataToUse = historicalData.slice(-168)
  } else if (timeRange === 'monthly' && historicalData.length >= 720) {
    // Use last 30 days (720 hours) for monthly profile
    dataToUse = historicalData.slice(-720)
  }
  
  // Use same calculation as SVP but with longer timeframe
  const svpResult = calculateSessionVolumeProfile(dataToUse, currentPrice, timeRange)
  
  if (!svpResult) {
    return null
  }
  
  // Additional composite analysis: identify accumulation/distribution zones
  // Accumulation = high volume at lower prices (bullish)
  // Distribution = high volume at higher prices (bearish)
  const profile = svpResult.profile || []
  const lowerHalf = profile.filter(p => p.price < currentPrice)
  const upperHalf = profile.filter(p => p.price > currentPrice)
  
  const lowerVolume = lowerHalf.reduce((sum, p) => sum + p.volume, 0)
  const upperVolume = upperHalf.reduce((sum, p) => sum + p.volume, 0)
  const totalVolume = lowerVolume + upperVolume
  
  let accumulationZone: {
    priceRange: [number, number]
    volumeRatio: number
    strength: string
  } | null = null
  let distributionZone: {
    priceRange: [number, number]
    volumeRatio: number
    strength: string
  } | null = null
  
  if (totalVolume > 0) {
    const lowerRatio = lowerVolume / totalVolume
    const upperRatio = upperVolume / totalVolume
    
    // Accumulation: more volume at lower prices
    if (lowerRatio > 0.55) {
      accumulationZone = {
        priceRange: [Math.min(...lowerHalf.map(p => p.price)), Math.max(...lowerHalf.map(p => p.price))] as [number, number],
        volumeRatio: lowerRatio,
        strength: 'strong'
      }
    }
    
    // Distribution: more volume at higher prices
    if (upperRatio > 0.55) {
      distributionZone = {
        priceRange: [Math.min(...upperHalf.map(p => p.price)), Math.max(...upperHalf.map(p => p.price))] as [number, number],
        volumeRatio: upperRatio,
        strength: 'strong'
      }
    }
  }
  
  // Identify balance zones (areas where price spent significant time)
  // Balance zone = price range with consistent volume distribution
  const balanceZones: Array<{
    priceRange: [number, number]
    volume: number
    center: number
  }> = []
  if (profile.length > 0) {
    // Find price ranges with similar volume distribution
    const sortedProfile = [...profile].sort((a, b) => a.price - b.price)
    let currentZone = { start: sortedProfile[0].price, end: sortedProfile[0].price, volume: sortedProfile[0].volume }
    
    for (let i = 1; i < sortedProfile.length; i++) {
      const priceDiff = sortedProfile[i].price - currentZone.end
      const volumeDiff = currentZone.volume > 0 
        ? Math.abs(sortedProfile[i].volume - currentZone.volume) / currentZone.volume 
        : 1
      
      // If price is close and volume is similar, extend zone
      if (priceDiff < currentPrice * 0.02 && volumeDiff < 0.3) {
        currentZone.end = sortedProfile[i].price
        currentZone.volume += sortedProfile[i].volume
      } else {
        // Save current zone and start new one
        if (currentZone.end - currentZone.start > currentPrice * 0.01) {
          balanceZones.push({
            priceRange: [currentZone.start, currentZone.end] as [number, number],
            volume: currentZone.volume,
            center: (currentZone.start + currentZone.end) / 2
          })
        }
        currentZone = { start: sortedProfile[i].price, end: sortedProfile[i].price, volume: sortedProfile[i].volume }
      }
    }
    
    // Add last zone
    if (currentZone.end - currentZone.start > currentPrice * 0.01) {
      balanceZones.push({
        priceRange: [currentZone.start, currentZone.end] as [number, number],
        volume: currentZone.volume,
        center: (currentZone.start + currentZone.end) / 2
      })
    }
  }
  
  return {
    ...svpResult, // Include all SVP data
    timeRange: timeRange,
    accumulationZone: accumulationZone,
    distributionZone: distributionZone,
    balanceZones: balanceZones,
    compositePoc: svpResult.poc, // Composite POC
    compositeVah: svpResult.vah, // Composite VAH
    compositeVal: svpResult.val, // Composite VAL
    timestamp: Date.now()
  }
}

