# Memory

This directory contains AI memory management functionality using Mem0 integration for persistent trading context.

## 📁 Structure

The memory module provides persistent storage for:
- Trading preferences
- Trade history and journal
- Pattern recognition learning
- Performance analytics
- Market observations

## 🎯 Purpose

AI memory enables:
1. **Context Persistence** - Remember user preferences across sessions
2. **Pattern Learning** - Learn from winning and losing trades
3. **Performance Tracking** - Track trading statistics over time
4. **Personalized Insights** - Generate insights based on history
5. **Smart Recommendations** - Suggest setups based on past success

## 🔧 Features

### Trade Journaling
- Log every trade with entry/exit prices
- Record PnL and percentage gains/losses
- Document reasons for entry and exit
- Capture lessons learned
- Categorize by strategy type

### Preference Storage
- Default leverage per asset
- Risk per trade percentage
- Favorite trading pairs
- Preferred indicators
- Trading style (scalper, swing, position)

### Pattern Recognition
- Match current setups with historical trades
- Identify winning patterns
- Avoid losing patterns
- Calculate pattern success rate

### Performance Analytics
- Win rate by asset
- Average R/R ratio
- Best performing strategies
- Common mistakes
- Performance by timeframe

## 🔐 Configuration

### Environment Variables

```bash
# Required for AI memory features
MEM0_API_KEY=<your-mem0-api-key>
MEM0_USER_ID=<your-unique-user-id>
```

Get your API key from: https://mem0.ai

### User ID
- Unique identifier per user/trader
- Used to isolate memories
- Can be any string (email, username, UUID)

## 📊 Data Structure

### Memory Types

1. **Preferences**
```json
{
  "type": "preference",
  "label": "leverage",
  "categories": ["risk-management"],
  "content": "Default leverage for BTC is 10x"
}
```

2. **Trades**
```json
{
  "type": "trade",
  "symbol": "BTC",
  "side": "LONG",
  "entryPrice": 90000,
  "exitPrice": 92000,
  "pnlPercent": 2.22,
  "result": "WIN",
  "reason": "RSI oversold + bullish divergence",
  "lesson": "Wait for volume confirmation",
  "label": "scalp",
  "categories": ["momentum"]
}
```

3. **Notes**
```json
{
  "type": "note",
  "label": "support",
  "categories": ["technical-analysis"],
  "tags": ["BTC", "key-level"],
  "content": "BTC has strong support at 94k"
}
```

## 🔄 Integration

### With Tools
Memory tools are registered in `tools/account/memory-tools.ts`:
- `memory_save_preference`
- `memory_log_trade`
- `memory_get_insights`
- `memory_check_pattern`
- `memory_remember`
- `memory_recall`
- `memory_get_all`
- `memory_delete`

### With AI Assistants
AI assistants can:
- Query past performance
- Check pattern matches
- Get personalized recommendations
- Learn from trade history

## 🎯 Use Cases

### Example 1: Save Trading Preference
```typescript
// User says: "I always use 10x leverage for BTC"
memory_save_preference({
  preference: 'Default leverage for BTC is 10x',
  label: 'leverage',
  categories: 'risk-management'
})
```

### Example 2: Log Completed Trade
```typescript
// After closing a trade
memory_log_trade({
  symbol: 'ETH',
  side: 'LONG',
  entryPrice: 3000,
  exitPrice: 3150,
  pnlPercent: 5.0,
  result: 'WIN',
  reason: 'Broke above resistance with volume',
  lesson: 'Volume confirmation is key',
  label: 'breakout',
  categories: 'momentum'
})
```

### Example 3: Get Insights
```typescript
// User asks: "How's my BTC trading performance?"
memory_get_insights({
  query: 'my BTC trading performance'
})

// Returns:
// - Win rate: 65%
// - Average gain: +3.2%
// - Best strategy: RSI oversold + divergence
// - Common mistake: Taking profit too early
```

### Example 4: Check Pattern Match
```typescript
// Before entering a trade
memory_check_pattern({
  symbol: 'SOL',
  setup: 'RSI oversold with bullish divergence at support'
})

// Returns:
// - Pattern found in 5 previous trades
// - 4 wins, 1 loss (80% success rate)
// - Average gain: +4.5%
// - Recommendation: FAVORABLE
```

## 📈 Analytics

### Performance Metrics
- **Win Rate**: Percentage of winning trades
- **Average R/R**: Risk/reward ratio across all trades
- **Best Asset**: Asset with highest win rate
- **Best Strategy**: Strategy with best performance
- **Longest Streak**: Consecutive wins/losses
- **Profit Factor**: Gross profit / Gross loss

### Pattern Statistics
- **Pattern Count**: How many times pattern occurred
- **Pattern Success Rate**: Win percentage for pattern
- **Average Gain/Loss**: Expected outcome
- **Reliability Score**: Confidence in pattern

## 🛡️ Privacy & Security

- Memories stored on Mem0 cloud (secure)
- Isolated per user ID
- No sensitive data (wallet keys) stored
- Only trading context and performance
- User can delete memories anytime

## 🚀 Future Enhancements

- [ ] Local memory storage option (SQLite)
- [ ] Export trade journal to CSV
- [ ] Visual performance dashboard
- [ ] Machine learning pattern recognition
- [ ] Automated trade suggestions
- [ ] Risk anomaly detection
- [ ] Correlation with market conditions
- [ ] Multi-user comparison (anonymous)

## 📝 Implementation Details

### Memory Storage
- Uses Mem0 API for cloud storage
- Automatic semantic search
- Context-aware retrieval
- Vector embeddings for similarity

### Search & Retrieval
- Natural language queries
- Semantic matching
- Relevance ranking
- Category filtering

### Data Retention
- Unlimited storage duration
- User-controlled deletion
- No automatic expiration
- Persistent across sessions

## 🔧 Troubleshooting

### Memory Not Saving
- Check `MEM0_API_KEY` is set correctly
- Verify `MEM0_USER_ID` is provided
- Ensure internet connection is stable
- Check Mem0 API status

### Recall Not Working
- Use more specific queries
- Check if data was actually saved
- Verify user ID matches
- Try different search terms

### Insights Not Accurate
- Need more trade data (minimum 10 trades)
- Log trades consistently
- Include detailed reasons and lessons
- Categorize trades properly

## 📞 Support

- **Mem0 Documentation**: https://docs.mem0.ai
- **API Reference**: https://docs.mem0.ai/api-reference
- **Get API Key**: https://app.mem0.ai

---

**Note**: AI memory is optional but highly recommended for personalized trading insights and pattern learning.
