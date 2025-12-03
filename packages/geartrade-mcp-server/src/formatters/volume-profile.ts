/**
 * Formatters for Volume Profile Data
 * Extracted from index.ts for better modularity
 */

import type { SessionVolumeProfile, CompositeVolumeProfile } from '../signal-generation/analysis/volume-profile'

/**
 * Format volume profile data (session and composite)
 */
export function formatVolumeProfile(
  sessionProfile: SessionVolumeProfile | null,
  compositeProfile: CompositeVolumeProfile | null
) {
  if (!sessionProfile && !compositeProfile) return null

  return {
    session: sessionProfile
      ? {
          poc: sessionProfile.poc,
          vah: sessionProfile.vah,
          val: sessionProfile.val,
          hvn: sessionProfile.hvn,
          lvn: sessionProfile.lvn,
          totalVolume: sessionProfile.totalVolume,
          sessionType: sessionProfile.sessionType,
          timestamp: sessionProfile.timestamp,
        }
      : null,
    composite: compositeProfile
      ? {
          poc: compositeProfile.poc,
          vah: compositeProfile.vah,
          val: compositeProfile.val,
          compositePoc: compositeProfile.compositePoc,
          compositeVah: compositeProfile.compositeVah,
          compositeVal: compositeProfile.compositeVal,
          accumulationZone: compositeProfile.accumulationZone,
          distributionZone: compositeProfile.distributionZone,
          balanceZones: compositeProfile.balanceZones,
          timeRange: compositeProfile.timeRange,
          timestamp: compositeProfile.timestamp,
        }
      : null,
  }
}
