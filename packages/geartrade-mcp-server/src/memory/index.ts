/**
 * Trading Memory Service using Mem0 Platform API
 * Provides persistent memory for trading preferences, trade history, and insights
 */

import { MemoryClient, type Message, type Memory } from 'mem0ai';
import type { MemoryMetadata, MemorySearchResult, MemoryAddResult } from './types';

class TradingMemory {
  private client: MemoryClient | null = null;
  private userId: string;
  private initialized: boolean = false;

  constructor(userId: string = "default_trader") {
    this.userId = userId;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      const apiKey = process.env.MEM0_API_KEY;
      if (!apiKey) {
        throw new Error("MEM0_API_KEY environment variable is not set. Get your API key from https://app.mem0.ai");
      }
      this.client = new MemoryClient({ apiKey });
      this.initialized = true;
    }
  }

  /**
   * Add a memory with optional metadata
   */
  async add(content: string, metadata?: MemoryMetadata): Promise<MemoryAddResult> {
    this.ensureInitialized();
    
    const enrichedMetadata = {
      ...metadata,
      timestamp: Date.now()
    };

    // Mem0 expects Message[] format
    const messages: Message[] = [
      { role: "user", content }
    ];

    const results: Memory[] = await this.client!.add(messages, {
      user_id: this.userId,
      metadata: enrichedMetadata
    });

    // Get the first result's ID or generate one
    const firstResult = results?.[0];
    return {
      id: firstResult?.id || `mem_${Date.now()}`,
      message: 'Memory added successfully'
    };
  }

  /**
   * Search memories by query
   */
  async search(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    this.ensureInitialized();

    const results: Memory[] = await this.client!.search(query, {
      user_id: this.userId,
      limit
    });

    return (results || []).map((r: Memory) => ({
      id: r.id,
      memory: r.memory || '',
      metadata: r.metadata as MemoryMetadata | undefined,
      score: r.score
    }));
  }

  /**
   * Get all memories for the user
   */
  async getAll(): Promise<MemorySearchResult[]> {
    this.ensureInitialized();

    const results: Memory[] = await this.client!.getAll({
      user_id: this.userId
    });

    return (results || []).map((r: Memory) => ({
      id: r.id,
      memory: r.memory || '',
      metadata: r.metadata as MemoryMetadata | undefined
    }));
  }

  /**
   * Delete a specific memory
   */
  async delete(memoryId: string): Promise<{ success: boolean }> {
    this.ensureInitialized();

    await this.client!.delete(memoryId);
    return { success: true };
  }

  /**
   * Update user ID for multi-user support
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Get current user ID
   */
  getUserId(): string {
    return this.userId;
  }
}

export const tradingMemory = new TradingMemory();
export { TradingMemory };
export * from './types';
