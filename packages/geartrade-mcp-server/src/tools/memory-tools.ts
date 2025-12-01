/**
 * Memory Tools for GearTrade MCP Server
 * Provides 8 tools for trading memory management using Mem0 Platform
 */

import { z } from 'zod';
import { tradingMemory } from '../memory';

export function registerMemoryTools(server: any) {

  // Tool 1: Save Trading Preference
  server.registerTool(
    "memory_save_preference",
    {
      title: "Save Trading Preference",
      description: "Save trading preference (leverage, risk, pairs, style, etc.). The AI will remember this for future interactions.",
      inputSchema: z.object({
        preference: z.string().describe("What to remember, e.g., 'Default leverage for BTC is 5x' or 'Risk per trade is 1%'"),
        label: z.string().optional().describe("Optional label for categorization, e.g., 'leverage', 'risk', 'strategy'"),
        categories: z.string().optional().describe("Optional categories, e.g., 'risk-management', 'position-sizing'")
      }),
      outputSchema: z.object({
        success: z.boolean(),
        memory_id: z.string().optional(),
        message: z.string().optional(),
        label: z.string().optional(),
        categories: z.string().optional(),
        error: z.string().optional()
      }).passthrough(),
    },
    async ({ preference, label, categories }: { preference: string; label?: string; categories?: string }) => {
      try {
        const result = await tradingMemory.add(preference, { 
          type: "preference",
          label: label || undefined,
          categories: categories || undefined
        });
        const data = {
          success: true,
          memory_id: result.id,
          message: `Preference saved: "${preference}"`,
          label: label || null,
          categories: categories || null
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 2: Log Trade for Learning
  server.registerTool(
    "memory_log_trade",
    {
      title: "Log Trade for Learning",
      description: "Log a completed trade with full context for pattern learning. Helps AI learn from your trading history.",
      inputSchema: z.object({
        symbol: z.string().describe("Trading pair symbol, e.g., 'BTC', 'ETH', 'SOL'"),
        side: z.enum(["LONG", "SHORT"]).describe("Trade direction"),
        entryPrice: z.number().describe("Entry price"),
        exitPrice: z.number().describe("Exit price"),
        pnlPercent: z.number().describe("PnL percentage, e.g., 2.5 for +2.5%, -1.2 for -1.2%"),
        result: z.enum(["win", "loss", "breakeven"]).describe("Trade result"),
        reason: z.string().describe("Entry and exit reason, e.g., 'RSI divergence at support, took profit at resistance'"),
        lesson: z.string().optional().describe("Optional lesson learned from this trade"),
        label: z.string().optional().describe("Optional label for categorization, e.g., 'scalp', 'swing', 'position'"),
        categories: z.string().optional().describe("Optional categories, e.g., 'momentum', 'reversal', 'breakout'")
      }),
      outputSchema: z.object({
        success: z.boolean(),
        memory_id: z.string().optional(),
        trade_summary: z.object({}).passthrough().optional(),
        message: z.string().optional(),
        error: z.string().optional()
      }).passthrough(),
    },
    async ({ symbol, side, entryPrice, exitPrice, pnlPercent, result, reason, lesson, label, categories }: {
      symbol: string;
      side: "LONG" | "SHORT";
      entryPrice: number;
      exitPrice: number;
      pnlPercent: number;
      result: "win" | "loss" | "breakeven";
      reason: string;
      lesson?: string;
      label?: string;
      categories?: string;
    }) => {
      try {
        const content = `Trade ${symbol} ${side}: Entry $${entryPrice}, Exit $${exitPrice}, PnL ${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%, Result: ${result}. Reason: ${reason}.${lesson ? ` Lesson: ${lesson}` : ''}`;
        
        const memResult = await tradingMemory.add(content, {
          type: "trade",
          symbol,
          result,
          label: label || undefined,
          categories: categories || undefined
        });

        const data = {
          success: true,
          memory_id: memResult.id,
          trade_summary: { symbol, side, entryPrice, exitPrice, pnlPercent, result },
          message: "Trade logged successfully for learning"
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 3: Get Personalized Insights
  server.registerTool(
    "memory_get_insights",
    {
      title: "Get Personalized Insights",
      description: "Get personalized trading insights based on your history. Query can be about performance, patterns, mistakes, etc.",
      inputSchema: z.object({
        query: z.string().describe("What insight you want, e.g., 'my SOL trading performance', 'common mistakes', 'best setups'")
      }),
      outputSchema: z.object({
        query: z.string(),
        insights_found: z.number(),
        insights: z.array(z.object({}).passthrough())
      }).passthrough(),
    },
    async ({ query }: { query: string }) => {
      try {
        const memories = await tradingMemory.search(query, 10);
        
        const data = {
          query,
          insights_found: memories.length,
          insights: memories.map(m => ({
            memory: m.memory,
            relevance: m.score,
            metadata: m.metadata
          }))
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 4: Check Pattern Match
  server.registerTool(
    "memory_check_pattern",
    {
      title: "Check Pattern Match",
      description: "Check if current trading setup matches past winning or losing patterns from your history.",
      inputSchema: z.object({
        symbol: z.string().describe("Symbol to check, e.g., 'BTC', 'ETH'"),
        setup: z.string().describe("Current setup description, e.g., 'RSI oversold with bullish divergence at support'")
      }),
      outputSchema: z.object({
        symbol: z.string(),
        setup: z.string(),
        similar_trades_found: z.number(),
        recommendation: z.string()
      }).passthrough(),
    },
    async ({ symbol, setup }: { symbol: string; setup: string }) => {
      try {
        const query = `${symbol} trade with ${setup}`;
        const memories = await tradingMemory.search(query, 5);
        
        let wins = 0;
        let losses = 0;
        memories.forEach(m => {
          if (m.metadata?.result === 'win') wins++;
          if (m.metadata?.result === 'loss') losses++;
        });
        
        const total = wins + losses;
        const winRate = total > 0 ? (wins / total * 100).toFixed(1) : null;
        
        let recommendation = "No similar patterns found in history - proceed with standard risk management";
        if (total > 0) {
          if (parseFloat(winRate!) >= 60) {
            recommendation = `High probability setup! Historical win rate: ${winRate}% (${wins}W/${losses}L)`;
          } else if (parseFloat(winRate!) >= 40) {
            recommendation = `Neutral setup. Historical win rate: ${winRate}% (${wins}W/${losses}L) - use standard position size`;
          } else {
            recommendation = `Warning: Low win rate setup! Historical: ${winRate}% (${wins}W/${losses}L) - consider reducing size or skipping`;
          }
        }

        const data = {
          symbol,
          setup,
          similar_trades_found: memories.length,
          historical_stats: total > 0 ? { wins, losses, winRate: `${winRate}%` } : null,
          recommendation,
          similar_trades: memories.map(m => ({
            memory: m.memory,
            result: m.metadata?.result,
            relevance: m.score
          }))
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 5: Remember (General Purpose)
  server.registerTool(
    "memory_remember",
    {
      title: "Remember",
      description: "Store any important note, context, or information for future reference. Use for market observations, key levels, etc.",
      inputSchema: z.object({
        content: z.string().describe("What to remember, e.g., 'BTC has strong support at 94k' or 'Avoid trading during FOMC'"),
        label: z.string().optional().describe("Optional label for categorization, e.g., 'support', 'resistance', 'news', 'strategy'"),
        categories: z.string().optional().describe("Optional categories, e.g., 'technical-analysis', 'fundamental', 'macro'"),
        tags: z.array(z.string()).optional().describe("Optional tags for categorization, e.g., ['support', 'BTC']")
      }),
      outputSchema: z.object({
        success: z.boolean(),
        memory_id: z.string().optional(),
        stored: z.string().optional(),
        label: z.string().optional(),
        categories: z.string().optional(),
        tags: z.array(z.string()).optional()
      }).passthrough(),
    },
    async ({ content, label, categories, tags }: { content: string; label?: string; categories?: string; tags?: string[] }) => {
      try {
        const result = await tradingMemory.add(content, {
          type: "note",
          label: label || undefined,
          categories: categories || undefined,
          tags: tags?.join(",")
        });

        const data = {
          success: true,
          memory_id: result.id,
          stored: content,
          label: label || null,
          categories: categories || null,
          tags: tags || []
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 6: Recall Memories
  server.registerTool(
    "memory_recall",
    {
      title: "Recall Memories",
      description: "Search and recall stored memories based on a query. Use to retrieve past preferences, trades, or notes.",
      inputSchema: z.object({
        query: z.string().describe("Search query, e.g., 'leverage settings', 'BTC trades', 'support levels'"),
        limit: z.number().default(5).describe("Maximum number of results to return (default: 5)")
      }),
      outputSchema: z.object({
        query: z.string(),
        results_found: z.number(),
        memories: z.array(z.object({}).passthrough())
      }).passthrough(),
    },
    async ({ query, limit }: { query: string; limit: number }) => {
      try {
        const memories = await tradingMemory.search(query, limit);

        const data = {
          query,
          results_found: memories.length,
          memories: memories.map(m => ({
            id: m.id,
            memory: m.memory,
            metadata: m.metadata,
            relevance: m.score
          }))
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 7: Get All Memories
  server.registerTool(
    "memory_get_all",
    {
      title: "Get All Memories",
      description: "Get all stored memories. Useful for reviewing complete trading history and preferences.",
      inputSchema: z.object({}),
      outputSchema: z.object({
        total_memories: z.number(),
        memories: z.array(z.object({}).passthrough())
      }).passthrough(),
    },
    async () => {
      try {
        const memories = await tradingMemory.getAll();

        const data = {
          total_memories: memories.length,
          memories: memories.map(m => ({
            id: m.id,
            memory: m.memory,
            metadata: m.metadata
          }))
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );

  // Tool 8: Delete Memory
  server.registerTool(
    "memory_delete",
    {
      title: "Delete Memory",
      description: "Delete a specific memory by its ID. Use to remove outdated or incorrect information.",
      inputSchema: z.object({
        memoryId: z.string().describe("The memory ID to delete (get IDs from memory_get_all or memory_recall)")
      }),
      outputSchema: z.object({
        success: z.boolean(),
        deleted_id: z.string().optional(),
        message: z.string().optional(),
        error: z.string().optional()
      }).passthrough(),
    },
    async ({ memoryId }: { memoryId: string }) => {
      try {
        await tradingMemory.delete(memoryId);

        const data = {
          success: true,
          deleted_id: memoryId,
          message: "Memory deleted successfully"
        };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data
        };
      } catch (error: any) {
        const data = { success: false, error: error.message };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data,
          isError: true
        };
      }
    }
  );
}
