# Volume-Based Analysis Module

Modul analisis berbasis volume yang komprehensif untuk trading signals.

## Fungsi Utama

### 1. Volume Confirmation for Breakout (`confirmBreakoutWithVolume`)
Validasi breakout dengan analisis volume:
- **Strong confirmation**: Volume ≥2x average, change ≥100%
- **Moderate confirmation**: Volume ≥1.5x average, change ≥50%
- **Weak confirmation**: Volume ≥1.2x average, change ≥20%
- **False breakout**: Volume <1.2x average - skip signal

**Usage:**
```typescript
const confirmation = confirmBreakoutWithVolume(
  historicalData,
  breakoutPrice,
  currentPrice,
  'up' | 'down',
  volumeProfile // optional
)
```

### 2. Liquidity Zones (`identifyLiquidityZones`)
Identifikasi zona likuiditas tinggi berdasarkan volume & open interest:
- Group price levels dengan volume tinggi
- Hitung liquidity score (volume 70% + OI 30%)
- Tentukan support/resistance zones
- Strength: high/medium/low

**Usage:**
```typescript
const zones = identifyLiquidityZones(
  historicalData,
  openInterestData, // optional
  volumeProfile // optional
)
```

### 3. Footprint Charts (`analyzeFootprint`)
Analisis buying vs selling pressure real-time:
- Estimate buy/sell volume dari price action
- Calculate net delta (buy - sell)
- Identify significant price levels
- Dominant side: buy/sell/neutral

**Usage:**
```typescript
const footprint = analyzeFootprint(historicalData, currentPrice)
```

### 4. Comprehensive Volume Analysis (`performComprehensiveVolumeAnalysis`)
Kombinasi semua indikator volume untuk trading decision:
- Volume confirmation
- Liquidity zones
- Footprint analysis
- Recommendations: enter/exit/hold/wait
- Confidence score & risk level

**Usage:**
```typescript
const analysis = performComprehensiveVolumeAnalysis(
  historicalData,
  currentPrice,
  breakoutLevel, // optional
  breakoutDirection, // optional
  volumeProfile, // optional
  cvd, // optional
  openInterestData // optional
)
```

## Integration

Modul ini sudah terintegrasi di `data-fetchers/market-data.ts`:
- Otomatis dihitung untuk setiap asset
- Tersedia di `externalData.comprehensiveVolumeAnalysis`
- Bisa digunakan di signal generation

## Output Structure

```typescript
{
  volumeConfirmation?: {
    isValid: boolean
    strength: 'strong' | 'moderate' | 'weak' | 'false'
    volumeRatio: number
    volumeChange: number
    reason: string
  },
  liquidityZones: Array<{
    priceRange: [number, number]
    volume: number
    openInterest: number
    liquidityScore: number
    type: 'support' | 'resistance' | 'neutral'
    strength: 'high' | 'medium' | 'low'
  }>,
  footprint: {
    totalBuyVolume: number
    totalSellVolume: number
    netDelta: number
    buyPressure: number
    sellPressure: number
    dominantSide: 'buy' | 'sell' | 'neutral'
    significantLevels: Array<...>
  },
  recommendations: {
    action: 'enter' | 'exit' | 'hold' | 'wait'
    reason: string
    confidence: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}
```

## Best Practices

1. **Breakout Trading**: Selalu gunakan `confirmBreakoutWithVolume` sebelum enter
2. **Liquidity Zones**: Hindari enter di resistance zone, tunggu breakout dengan volume
3. **Footprint**: Monitor buying/selling pressure untuk exit timing
4. **Comprehensive Analysis**: Gunakan untuk overall market sentiment

