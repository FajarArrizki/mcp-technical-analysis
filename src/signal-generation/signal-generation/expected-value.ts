/**
 * Expected Value Calculation
 * calculateExpectedValue function
 */

// import { Signal } from '../types'

export function calculateExpectedValue(
  confidence: number,
  riskRewardRatio: number,
  riskAmount: number
): number {
  if (!confidence || !riskRewardRatio || !riskAmount || riskAmount <= 0) {
    return 0
  }
  
  // Expected Value = (Win Probability * Win Amount) - (Loss Probability * Loss Amount)
  // Win Probability = Confidence
  // Loss Probability = 1 - Confidence
  // Win Amount = Risk Amount * Risk/Reward Ratio
  // Loss Amount = Risk Amount
  
  const winProbability = confidence
  const lossProbability = 1 - confidence
  const winAmount = riskAmount * riskRewardRatio
  const lossAmount = riskAmount
  
  const expectedValue = (winProbability * winAmount) - (lossProbability * lossAmount)
  
  return expectedValue
}

