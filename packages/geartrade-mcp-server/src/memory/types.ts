/**
 * Memory Types for GearTrade Trading Memory System
 */

export interface TradeMemory {
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  result: 'win' | 'loss' | 'breakeven';
  reason: string;
  lesson?: string;
  timestamp?: number;
}

export interface MemoryMetadata {
  type: 'preference' | 'trade' | 'note' | 'pattern' | 'insight';
  label?: string;
  categories?: string;
  symbol?: string;
  result?: string;
  tags?: string;
  timestamp?: number;
}

export interface MemorySearchResult {
  id: string;
  memory: string;
  metadata?: MemoryMetadata;
  score?: number;
}

export interface MemoryAddResult {
  id: string;
  message?: string;
}

export interface TradingPreference {
  leverage?: Record<string, number>;
  riskPerTrade?: number;
  preferredPairs?: string[];
  stopLossStyle?: 'fixed' | 'atr' | 'structure';
  takeProfitStyle?: 'fixed' | 'rr_ratio' | 'levels';
}

export interface PatternCheckResult {
  similar_trades: MemorySearchResult[];
  recommendation: string;
  historicalWinRate?: number;
}

export interface InsightResult {
  insights: MemorySearchResult[];
  summary?: string;
}
