/**
 * Main Entry Point
 * Entry point for signal generation application
 */
import { log, logSection } from './utils/logger';
import { getMarketData } from './data-fetchers/market-data';
import { getAssetMetadata, getUserState } from './data-fetchers/hyperliquid';
import { generateSignals } from './signal-generation/generate-signals';
import { formatSignal } from './formatting/format-signal';
import { getAIProviderApiKey, getTradingConfig, getAIModel, getAIProvider, getHyperliquidAccountAddress, getHyperliquidApiUrl, getHyperliquidWalletApiKey } from './config';
import { detectContradictions as detectContradictionsBasic } from './analysis/contradiction';
import { getActivePositions, updateActivePositions } from './position-management/positions';
import { collectWarning, signalWarnings } from './position-management/warnings';
import { rankAssetsByIndicatorQuality } from './analysis/indicator-quality';
import { formatPrice } from './formatting/price'; // OPTIMIZATION: Static import instead of dynamic import inside loop
export async function main() {
    logSection('🚀 Signal Generation Test');
    // Check configuration
    if (!getAIProviderApiKey()) {
        log('❌ Error: getAIProviderApiKey() is required', 'red');
        log('   Set it with: export AI_PROVIDER_API_KEY=your_api_key', 'yellow');
        process.exit(1);
    }
    const TRADING_CONFIG = getTradingConfig();
    const signalHistory = new Map();
    log(`AI Provider: ${getAIProvider()}`, 'cyan');
    log(`Model: ${getAIModel()}`, 'cyan');
    log(`Hyperliquid API: ${getHyperliquidApiUrl()}`, 'cyan');
    if (getHyperliquidAccountAddress()) {
        log(`Account Address: ${getHyperliquidAccountAddress()}`, 'cyan');
    }
    const walletApiKey = getHyperliquidWalletApiKey();
    if (walletApiKey && walletApiKey.trim() !== '') {
        log(`Wallet API Key: Configured (${walletApiKey.substring(0, 8)}...)`, 'green');
    }
    else {
        log('⚠️  No account address provided. Using mock account state.', 'yellow');
    }
    try {
        // Step 1: Get market data with technical analysis
        logSection('📊 Fetching Market Data');
        // Get all available assets from Hyperliquid universe
        const metadata = await getAssetMetadata();
        let universe = [];
        if (Array.isArray(metadata) && metadata.length >= 2) {
            const metaObj = metadata[0];
            if (metaObj && metaObj.universe) {
                universe = metaObj.universe || [];
            }
        }
        else if (metadata && metadata.data) {
            universe = metadata.data.universe || [];
        }
        // Extract asset names from universe, FILTER OUT DELISTED ASSETS
        const allAvailableAssets = universe
            .map((item) => {
            // Skip delisted assets
            if (typeof item === 'object' && item.isDelisted === true) {
                return null;
            }
            if (typeof item === 'string')
                return item;
            return item.name || item.symbol || '';
        })
            .filter((name) => name && name.length > 0);
        // Use ALL assets from Hyperliquid universe (full expansion)
        // Filter to only include assets that have Binance pairs for data fetching
        // This gives us access to all 221+ assets available on Hyperliquid
        const maxAssets = parseInt(process.env.MAX_ASSETS || '0'); // Default: 0 = use all available assets
        let allowedAssets = allAvailableAssets; // Start with all Hyperliquid assets
        // If MAX_ASSETS is set, limit to that number (prioritize major assets)
        if (maxAssets > 0 && allowedAssets.length > maxAssets) {
            // Prioritize major assets if limiting
            const priorityAssets = [
                'BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'DOGE', 'LTC', 'AVAX', 'ARB',
                'HYPER', 'RENDER', 'TRUMP', 'PYTH', 'BLUR', 'TON', 'STX',
                'INJ', 'SEI', 'FET', 'RUNE', 'TIA', 'JTO', 'ORDI', 'DYDX', 'BCH',
                'ETC', 'XLM', 'TRX', 'NEAR', 'FTM', 'ALGO', 'FIL', 'ICP', 'ATOM',
                'DOT', 'LINK', 'UNI', 'AAVE', 'MATIC', 'OP', 'SUI', 'APT', 'WLD'
            ];
            const priorityInAvailable = priorityAssets.filter((a) => allowedAssets.includes(a));
            const rest = allowedAssets.filter((a) => !priorityAssets.includes(a));
            allowedAssets = [...priorityInAvailable, ...rest].slice(0, maxAssets);
        }
        // Note: Using all Hyperliquid assets (full expansion) - no limit unless MAX_ASSETS is set
        // If MAX_ASSETS is 0 (default), use all available assets from Hyperliquid (221+ assets)
        // If MAX_ASSETS is set, apply the limit
        if (maxAssets > 0 && allowedAssets.length > maxAssets) {
            allowedAssets = allowedAssets.slice(0, maxAssets);
        }
        // OPTIMIZATION FINAL: Limit assets to fetch based on TOP_ASSETS_FOR_AI to reduce overhead for small batches
        // When TOP_ASSETS_FOR_AI is small (e.g., 1-3), we don't need to fetch many assets for ranking
        // Reduced multipliers for small batches to minimize overhead: very small (1.5x), small (2x), medium (2x), large (1.5x)
        const topNForAI = parseInt(process.env.TOP_ASSETS_FOR_AI || '15');
        let maxAssetsToFetch = allowedAssets.length;
        // OPTIMIZATION FINAL: Limit fetch size based on TOP_ASSETS_FOR_AI (aggressively reduce overhead for small batches)
        if (topNForAI === 1) {
            // Single asset: fetch only 1 asset (no ranking needed)
            maxAssetsToFetch = 1;
        }
        else if (topNForAI <= 3) {
            // Very small batch: fetch 1.5x TOP_ASSETS_FOR_AI for ranking (e.g., TOP_ASSETS_FOR_AI=3 → fetch 4-5 assets)
            // Minimal fetch to reduce overhead while maintaining ranking quality
            maxAssetsToFetch = Math.min(maxAssetsToFetch, Math.max(3, Math.ceil(topNForAI * 1.5)));
        }
        else if (topNForAI <= 5) {
            // Small batch: fetch 2x TOP_ASSETS_FOR_AI for ranking (e.g., TOP_ASSETS_FOR_AI=5 → fetch 10 assets)
            maxAssetsToFetch = Math.min(maxAssetsToFetch, topNForAI * 2);
        }
        else if (topNForAI <= 10) {
            // Medium batch: fetch 2x TOP_ASSETS_FOR_AI for ranking (e.g., TOP_ASSETS_FOR_AI=10 → fetch 20 assets)
            maxAssetsToFetch = Math.min(maxAssetsToFetch, topNForAI * 2);
        }
        else if (topNForAI <= 20) {
            // Large batch: fetch 1.5x TOP_ASSETS_FOR_AI for ranking (e.g., TOP_ASSETS_FOR_AI=20 → fetch 30 assets)
            maxAssetsToFetch = Math.min(maxAssetsToFetch, Math.ceil(topNForAI * 1.5));
        }
        // For very large TOP_ASSETS_FOR_AI (>20), fetch all assets (no limit needed)
        // Limit assets to fetch for ranking (reduce overhead when TOP_ASSETS_FOR_AI is small)
        const assetsToFetch = allowedAssets.slice(0, maxAssetsToFetch);
        // Format assets as pairs (e.g., "BTC-USDC", "ETH-USDC")
        const formattedAssets = assetsToFetch.length <= 10
            ? assetsToFetch.map((asset) => `${asset}-USDC`).join(', ')
            : `${assetsToFetch.slice(0, 10).map((asset) => `${asset}-USDC`).join(', ')} ... (${assetsToFetch.length} total)`;
        log(`📊 Step 1: Loading data for ${assetsToFetch.length} assets from Binance API (limited for TOP_ASSETS_FOR_AI=${topNForAI})`, 'cyan');
        log(`   Assets: ${formattedAssets}`, 'cyan');
        // OPTIMIZATION: Reuse metadata to avoid duplicate API call
        // Pass metadata to getMarketData to avoid calling getAssetMetadata() again inside it
        const [marketDataResult, userStateResult] = await Promise.all([
            getMarketData(assetsToFetch, metadata), // Pass metadata to avoid duplicate API call
            getHyperliquidAccountAddress()
                ? getUserState(getHyperliquidAccountAddress(), 3, 1000).catch(() => null)
                : Promise.resolve(null)
        ]);
        const result = marketDataResult;
        // Handle return value - getMarketData returns { marketDataMap, allowedAssets }
        const marketData = result.marketDataMap || result;
        // const fetchedAssets = result.allowedAssets || allowedAssets
        if (!marketData) {
            throw new Error('Invalid market data returned from getMarketData');
        }
        // Ensure marketData is the correct type (Map or Record)
        const normalizedMarketData = marketData instanceof Map ? marketData :
            (typeof marketData === 'object' && marketData.marketDataMap) ? marketData.marketDataMap :
                marketData;
        // Ensure marketData is iterable (Map or Object)
        const marketDataSize = marketData instanceof Map
            ? marketData.size
            : (typeof marketData === 'object' ? Object.keys(marketData).length : 0);
        log(`✅ Step 1 Complete: Fetched market data for ${marketDataSize} assets`, 'green');
        // CORRECT FLOW: Step 2 - Rank fetched assets, then select top N based on TOP_ASSETS_FOR_AI
        // OPTIMIZATION: topNForAI already calculated above, reuse it
        logSection('📊 Step 2: Ranking Assets by Indicator Quality');
        log(`   Analyzing ${marketDataSize} assets to find the best indicators...`, 'cyan');
        // OPTIMIZATION: Rank ALL fetched assets ONCE (avoid duplicate ranking calls)
        const assetsToRank = assetsToFetch; // Rank all assets we fetched
        const rankedScores = rankAssetsByIndicatorQuality(normalizedMarketData, assetsToRank);
        const assetQualityScoreMap = new Map();
        rankedScores.forEach(rs => assetQualityScoreMap.set(rs.asset, rs.score));
        // Compute expected confidence and influence mismatches per asset (pre-AI)
        const { computeExpectedConfidence } = await import('./analysis/expected-confidence');
        const expectedConfMap = new Map();
        const mdEntries = marketData instanceof Map ? Array.from(marketData.entries()) : Object.entries(marketData || {});
        for (const [asset, data] of mdEntries) {
            try {
                const ec = computeExpectedConfidence(asset, data);
                expectedConfMap.set(asset, { expected: ec.expected, majorMismatches: ec.majorMismatches });
            }
            catch {
                // ignore compute errors to avoid blocking
            }
        }
        // Display pre-ranked assets (confidence-aware) - limit to top 5
        const PRE_W_INDICATORS = parseFloat(process.env.PRE_W_INDICATORS || '0.6');
        const PRE_W_EXPECTED = parseFloat(process.env.PRE_W_EXPECTED || '0.4');
        const WEAKNESS_PENALTY = parseFloat(process.env.WEAKNESS_PENALTY || '5');
        const EXPECTED_CONF_FLOOR = parseFloat(process.env.EXPECTED_CONF_FLOOR || '50');
        const preRanked = rankedScores
            .map(rs => {
            const ec = expectedConfMap.get(rs.asset)?.expected ?? 0;
            const weaknessCount = Array.isArray(rs.weaknesses) ? rs.weaknesses.length : 0;
            let preRank = (PRE_W_INDICATORS * rs.score) + (PRE_W_EXPECTED * ec);
            if (weaknessCount > 0)
                preRank -= WEAKNESS_PENALTY * weaknessCount;
            if (ec < EXPECTED_CONF_FLOOR)
                preRank -= 1e6; // hard demote low expected confidence
            return { asset: rs.asset, preRank, indicator: rs.score, expected: ec, weaknesses: weaknessCount };
        })
            .sort((a, b) => b.preRank - a.preRank);
        // Step 3: Select top N assets for AI signal generation (based on TOP_ASSETS_FOR_AI) from preRanked
        const topAssetsForAI = preRanked
            .slice(0, topNForAI)
            .map(x => x.asset)
            .filter(asset => asset && asset.length > 0);
        log(`\n🎯 Step 2 Complete: Selected top ${topAssetsForAI.length} assets for AI signal generation`, 'green');
        log(`   Selected assets: ${topAssetsForAI.map(asset => `${asset}-USDC`).join(', ')}`, 'cyan');
        log(`   💡 Cost savings: Reduced AI API calls from ${assetsToFetch.length} to ${topAssetsForAI.length} (${((1 - topAssetsForAI.length / assetsToFetch.length) * 100).toFixed(0)}% reduction)`, 'yellow');
        // Update allowedAssets to only include top assets for AI generation
        // This ensures generateSignals() only processes top assets
        allowedAssets = topAssetsForAI;
        // Display market data for selected assets only (to avoid clutter)
        log(`\n📊 Market Data for Selected Assets (${allowedAssets.length} assets):`, 'cyan');
        // const marketDataEntries = marketData instanceof Map 
        //   ? Array.from(marketData.entries())
        //   : Object.entries(marketData || {})
        // OPTIMIZATION: formatPrice already imported statically at top of file
        // Only show data for selected (top) assets (using original Hyperliquid price format)
        for (const asset of allowedAssets) {
            const data = marketData instanceof Map ? marketData.get(asset) : marketData[asset];
            const priceString = data?.data?.priceString || data?.data?.markPxString || data?.priceString || data?.markPxString || null;
            const price = data?.price || data?.data?.price || 0;
            if (data && data.indicators) {
                const priceFormatted = formatPrice(price, asset, priceString);
                log(`   ${asset}: $${priceFormatted} | RSI(14): ${data.indicators.rsi14?.toFixed(2) || 'N/A'} | EMA(20): $${data.indicators.ema20?.toFixed(2) || 'N/A'} | MACD: ${data.indicators.macd ? data.indicators.macd.histogram.toFixed(4) : 'N/A'}`, 'cyan');
            }
            else if (data) {
                const priceFormatted = formatPrice(price, asset, priceString);
                log(`   ${asset}: $${priceFormatted} | Technical analysis not available`, 'yellow');
            }
        }
        // Step 2: Process account state (already fetched in parallel above)
        logSection('💰 Fetching Account State');
        let accountState = {
            accountValue: 90, // $90 capital
            availableCash: 90, // $90 capital
            totalReturnPercent: 0,
            activePositions: [],
            sharpeRatio: 0
        };
        let accountStateFetchFailed = false;
        let accountStateFetchAttempts = 0;
        const MAX_ACCOUNT_STATE_FAILURES = 2;
        // Use userStateResult that was already fetched in parallel with market data
        if (userStateResult) {
            // Info endpoint does NOT require HTTP authentication - it's a public endpoint
            // API wallets are used for signing transactions, not HTTP auth headers
            // See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
            const userState = userStateResult;
            // Handle different response formats from Hyperliquid API
            // Some responses have data wrapper, others have data directly in root
            const stateData = userState.data || (userState.marginSummary || userState.crossMarginSummary ? userState : null);
            if (userState && stateData) {
                accountStateFetchAttempts = 0; // Reset on success
                const marginSummary = stateData.marginSummary || stateData.crossMarginSummary;
                if (marginSummary) {
                    const accountValue = parseFloat(marginSummary.accountValue || '0');
                    const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || '0');
                    const withdrawable = parseFloat(stateData.withdrawable || '0');
                    // Available Cash = Withdrawable (if available) or Account Value - Margin Used
                    const availableCash = withdrawable > 0 ? withdrawable : Math.max(0, accountValue - totalMarginUsed);
                    accountState.accountValue = accountValue;
                    accountState.availableCash = availableCash;
                }
                log(`✅ Account Value: $${accountState.accountValue.toFixed(2)}`, 'green');
                log(`✅ Available Cash: $${accountState.availableCash.toFixed(2)}`, 'green');
                // Parse active positions from userState
                // Hyperliquid returns: { assetPositions: [{ position: { coin: "BTC", szi: "1.5", entryPx: "50000", ... } }] }
                const assetPositions = stateData.assetPositions || [];
                if (assetPositions && Array.isArray(assetPositions)) {
                    accountState.activePositions = assetPositions
                        .filter(pos => {
                        // Filter out positions with zero size
                        if (!pos || !pos.position)
                            return false;
                        const szi = parseFloat(pos.position.szi || '0');
                        return Math.abs(szi) > 0.0001; // Only include non-zero positions
                    })
                        .map(pos => {
                        const position = pos.position || {};
                        const coin = position.coin || '';
                        const szi = parseFloat(position.szi || '0'); // Size (positive = LONG, negative = SHORT)
                        const entryPx = parseFloat(position.entryPx || '0'); // Entry price
                        const unrealizedPnl = parseFloat(position.unrealizedPnl || '0'); // Unrealized PnL
                        // Leverage might be in different formats: { value: "2" } or just a number/string
                        let leverage = 1;
                        if (position.leverage) {
                            if (typeof position.leverage === 'object' && position.leverage.value) {
                                leverage = parseFloat(position.leverage.value || '1');
                            }
                            else {
                                leverage = parseFloat(position.leverage || '1');
                            }
                        }
                        // Get current price from market data
                        const assetData = marketData instanceof Map ? marketData.get(coin) : marketData[coin];
                        const currentPrice = assetData?.price || entryPx;
                        return {
                            symbol: coin,
                            quantity: Math.abs(szi),
                            entryPrice: entryPx,
                            currentPrice: currentPrice,
                            leverage: leverage || 1,
                            unrealizedPnl: unrealizedPnl,
                            side: szi > 0 ? 'LONG' : 'SHORT',
                            entryTime: Date.now() // Hyperliquid doesn't provide entry time, use current time
                        };
                    });
                    if (accountState.activePositions.length > 0) {
                        log(`✅ Found ${accountState.activePositions.length} active position(s)`, 'green');
                        for (const pos of accountState.activePositions) {
                            const pnlPercent = pos.entryPrice > 0
                                ? (((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'LONG' ? 1 : -1)).toFixed(2)
                                : '0.00';
                            const pnlColor = parseFloat(pnlPercent) >= 0 ? 'green' : 'red';
                            log(`   ${pos.symbol}: ${pos.side} ${pos.quantity} @ $${pos.entryPrice.toFixed(2)} | PnL: ${pnlPercent}% ($${pos.unrealizedPnl.toFixed(2)})`, pnlColor);
                        }
                    }
                    else {
                        log(`✅ No active positions`, 'green');
                    }
                }
            }
            else {
                accountStateFetchAttempts++;
                accountStateFetchFailed = accountStateFetchAttempts > MAX_ACCOUNT_STATE_FAILURES;
                log('⚠️  Could not fetch account state. Using mock data.', 'yellow');
                if (accountStateFetchFailed) {
                    log('❌ Account state fetch failed >2x. BLOCKING ALL SIGNALS until resolved.', 'red');
                    log('   Please check your Hyperliquid API connection and account address.', 'yellow');
                }
            }
        }
        else {
            log('⚠️  No account address provided. Using mock account state.', 'yellow');
        }
        // Step 3: Check AI configuration
        logSection('🤖 Step 3: AI Configuration');
        if (!getAIProviderApiKey()) {
            log('❌ Error: getAIProviderApiKey() is required', 'red');
            log('   Set it with: export getAIProviderApiKey()=your_api_key', 'yellow');
            process.exit(1);
        }
        log(`✅ AI Provider: ${getAIProvider()}`, 'green');
        log(`✅ Model: ${getAIModel()}`, 'green');
        log(`✅ Assets for AI generation: ${allowedAssets.length} assets (top ${allowedAssets.length} by indicator quality)`, 'green');
        // Step 4: Generate signals (ONLY for top assets selected in Step 2)
        logSection('📡 Step 4: Generating Trading Signals (AI)');
        log(`   Generating signals for ${allowedAssets.length} assets with best indicators...`, 'cyan');
        log(`   Assets: ${allowedAssets.map((asset) => `${asset}-USDC`).join(', ')}`, 'cyan');
        // Block signals if account state fetch failed >2x
        if (accountStateFetchFailed) {
            log('❌ SIGNAL GENERATION BLOCKED: Account state fetch failed >2x', 'red');
            log('   All signals are blocked until account state can be fetched successfully.', 'yellow');
            log('   Please check your Hyperliquid API connection and account address.', 'yellow');
            log('   Exiting without generating signals.', 'red');
            process.exit(1);
        }
        log('   AI is analyzing market data and generating signals... This may take a moment...', 'cyan');
        // OPTIMIZATION: Get positions once and pass to generateSignals (avoid duplicate call)
        const positionsForSignals = getActivePositions(accountState);
        // Generate signals ONLY for top assets (allowedAssets has been updated to topAssetsForAI)
        const signals = await generateSignals(null, marketData, accountState, allowedAssets, signalHistory, positionsForSignals);
        log(`✅ Step 4 Complete: Generated ${signals.length} signals from ${allowedAssets.length} assets`, 'green');
        log(`   📊 Flow Summary:`, 'cyan');
        log(`      • Step 1: Loaded data for ${assetsToFetch.length} assets from Binance API`, 'cyan');
        log(`      • Step 2: Ranked ${marketDataSize} assets by indicator quality`, 'cyan');
        log(`      • Step 3: Selected top ${allowedAssets.length} assets with best indicators`, 'cyan');
        log(`      • Step 4: Generated ${signals.length} signals using AI (${allowedAssets.length - signals.length} assets did not generate signals)`, 'cyan');
        log(`      • Success rate: ${((signals.length / allowedAssets.length) * 100).toFixed(0)}%`, 'cyan');
        log(`      • Cost savings: ${((1 - allowedAssets.length / assetsToFetch.length) * 100).toFixed(0)}% reduction in AI API calls`, 'yellow');
        // OPTIMIZATION: Reuse positions already computed above (avoid duplicate call)
        // Step 5: Get and display active positions
        const positions = positionsForSignals;
        if (positions.size > 0) {
            logSection('📊 Active Positions');
            for (const [asset, pos] of positions) {
                const assetData = marketData instanceof Map ? marketData.get(asset) : marketData[asset];
                const currentPrice = assetData?.price || pos.currentPrice || 0;
                const pnlPercent = pos.entryPrice > 0
                    ? (((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 * (pos.side === 'LONG' ? 1 : -1)).toFixed(2)
                    : '0.00';
                const pnlColor = parseFloat(pnlPercent) >= 0 ? 'green' : 'red';
                log(`   ${asset}: ${pos.side} ${Math.abs(pos.quantity)} @ $${pos.entryPrice.toFixed(2)} | Current: $${currentPrice.toFixed(2)} | PnL: ${pnlPercent}% ($${pos.unrealizedPnl?.toFixed(2) || '0.00'})`, pnlColor);
            }
        }
        else {
            logSection('📊 Active Positions');
            log(`   No active positions`, 'yellow');
        }
        // Step 6: Display warnings first (before signals table)
        if (signalWarnings.length > 0) {
            console.log(''); // Empty line
            logSection('⚠️  Signal Processing Warnings');
            // Group warnings by asset
            const warningsByAsset = {};
            signalWarnings.forEach((warning) => {
                if (!warningsByAsset[warning.asset]) {
                    warningsByAsset[warning.asset] = [];
                }
                warningsByAsset[warning.asset].push(warning);
            });
            // Display warnings grouped by asset with better formatting
            for (const [asset, assetWarnings] of Object.entries(warningsByAsset)) {
                log(`   📊 ${asset}:`, 'yellow');
                assetWarnings.forEach((warning, idx) => {
                    if (idx > 0) {
                        console.log(''); // Empty line between warnings
                    }
                    log(`   ${warning.message}`, 'yellow');
                    if (warning.details) {
                        if (Array.isArray(warning.details)) {
                            warning.details.forEach((detail) => {
                                if (detail && typeof detail === 'string') { // Skip null/undefined details
                                    log(`      ${detail}`, 'yellow');
                                }
                            });
                        }
                        else if (typeof warning.details === 'string') {
                            log(`      ${warning.details}`, 'yellow');
                        }
                    }
                });
            }
            console.log(''); // Empty line after warnings
        }
        // Step 7: Filter signals by contradiction score and display all qualifying signals
        logSection('📊 Generated Signals');
        // Filter out HOLD signals and calculate contradiction score for each signal
        const actionableSignals = signals.filter(s => s.signal === 'buy_to_enter' ||
            s.signal === 'sell_to_enter' ||
            s.signal === 'add' ||
            s.signal === 'close_all' ||
            s.signal === 'reduce');
        // Calculate contradiction score for each signal
        // Contradiction score is based on how many indicators contradict the signal
        const signalsWithContradiction = actionableSignals.map(signal => {
            const assetData = marketData instanceof Map ? marketData.get(signal.coin) : marketData[signal.coin];
            const indicators = assetData?.indicators || assetData?.data?.indicators;
            const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment;
            // Calculate contradiction score using detectContradictions
            const contradictionResult = detectContradictionsBasic(signal, indicators, trendAlignment);
            const contradictionScore = contradictionResult.contradictionScore || 0;
            const hasContradictions = contradictionResult.hasContradictions || false;
            // Store contradiction score in signal
            signal.contradictionScore = contradictionScore;
            signal.hasContradictions = hasContradictions;
            signal.contradictions = contradictionResult.contradictions || [];
            // Store conflict flags in metadata for downstream filters/formatters
            if (!signal.metadata)
                signal.metadata = {};
            signal.metadata.aroon_vs_ema_contradiction = contradictionResult.aroonVsEmaContradiction === true;
            signal.metadata.dual_overbought = contradictionResult.dualOverboughtDetected === true;
            signal.metadata.contradiction_severity = contradictionResult.severity;
            return signal;
        });
        // Log contradiction scores for debugging
        console.log(`\n📊 Contradiction Score Analysis:`);
        const scores = signalsWithContradiction.map(s => ({
            coin: s.coin,
            signal: s.signal,
            score: s.contradictionScore || 0,
            contradictions: s.contradictions?.length || 0
        })).sort((a, b) => b.score - a.score);
        scores.forEach(s => {
            console.log(`   ${s.coin}-USDC ${s.signal.toUpperCase()}: Score=${s.score}, Contradictions=${s.contradictions}`);
        });
        // Calculate statistics
        const maxScore = Math.max(...scores.map(s => s.score), 0);
        const minScore = Math.min(...scores.map(s => s.score), 0);
        const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s.score, 0) / scores.length : 0;
        const medianScore = scores.length > 0 ? scores[Math.floor(scores.length / 2)].score : 0;
        console.log(`   Max Score: ${maxScore}, Min Score: ${minScore}, Avg Score: ${avgScore.toFixed(2)}, Median Score: ${medianScore}`);
        // Filter signals by HIGH CONFIDENCE (>=0.60 = 60%) and contradiction score 0-3
        // Reward: If confidence > 60%, reduce contradiction score by 2 points
        // Get HIGH CONFIDENCE threshold from config (updated to 60%)
        const HIGH_CONFIDENCE_THRESHOLD = TRADING_CONFIG?.thresholds?.confidence?.high || 0.60;
        const HIGH_CONFIDENCE_REWARD_THRESHOLD = 0.60; // 60% - if above this, get -2 points reward
        const CONTRADICTION_REWARD = 2; // Points to subtract for high confidence signals
        const MIN_CONTRADICTION_SCORE = 0;
        const MAX_CONTRADICTION_SCORE = 4; // Range: 0-4 (changed from 0-3 to 0-4)
        // Apply confidence reward: reduce contradiction score by 2 if confidence > 60%
        const signalsWithReward = signalsWithContradiction.map(signal => {
            const confidence = signal.confidence || 0;
            let adjustedScore = signal.contradictionScore || 0;
            // Reward: If confidence > 60%, reduce contradiction score by 2 points
            if (confidence > HIGH_CONFIDENCE_REWARD_THRESHOLD) {
                const originalScore = adjustedScore;
                adjustedScore = Math.max(0, adjustedScore - CONTRADICTION_REWARD); // Don't go below 0
                if (originalScore !== adjustedScore) {
                    console.log(`   🎁 Reward applied: ${signal.coin}-USDC ${signal.signal.toUpperCase()} (Confidence: ${(confidence * 100).toFixed(2)}% > 60%) - Contradiction Score: ${originalScore} → ${adjustedScore} (-${CONTRADICTION_REWARD})`);
                }
            }
            return {
                ...signal,
                adjustedContradictionScore: adjustedScore,
                originalContradictionScore: signal.contradictionScore || 0
            };
        });
        // Filter: HIGH CONFIDENCE + adjusted contradiction score 0-4
        // CRITICAL: Reject signals with critical volume contradictions even if confidence >60%
        const qualifyingSignals = signalsWithReward.filter(signal => {
            const confidence = signal.confidence || 0;
            const adjustedScore = signal.adjustedContradictionScore || 0;
            const originalScore = signal.originalContradictionScore || 0;
            const contradictions = signal.contradictions || [];
            const conflictSeverity = (signal.metadata && signal.metadata.contradiction_severity) || 'low';
            const aroonVsEma = !!(signal.metadata && signal.metadata.aroon_vs_ema_contradiction);
            const dualOverbought = !!(signal.metadata && signal.metadata.dual_overbought);
            // CRITICAL FILTER: Check for volume spike contradictions (>50% contradicting direction)
            // Even with high confidence, volume contradictions are too risky
            const hasCriticalVolumeContradiction = contradictions.some(contra => contra.includes('CRITICAL:') &&
                (contra.includes('volume spike') || contra.includes('volume drop')));
            // Also check for non-critical volume contradictions (>50% but <100%)
            const hasVolumeContradiction = contradictions.some(contra => (contra.includes('volume spike') || contra.includes('volume drop')) &&
                !contra.includes('CRITICAL:'));
            // REJECT: Critical volume contradiction (>100% spike or <-80% drop) - NO EXCEPTIONS
            if (hasCriticalVolumeContradiction) {
                const reason = `CRITICAL volume contradiction detected (volume spike/drop contradicting signal direction)`;
                collectWarning(signal.coin, `🚫 REJECTED: ${signal.signal} signal: ${reason}`, [
                    `   Signal filtered: Critical volume contradiction`,
                    `   Confidence: ${(confidence * 100).toFixed(2)}%, Original Contradiction Score: ${originalScore}`,
                    `   Rule: Critical volume contradictions (>100% spike or <-80% drop) are rejected regardless of confidence`
                ]);
                console.log(`   🚫 REJECTED: ${signal.coin}-USDC ${signal.signal.toUpperCase()} - CRITICAL volume contradiction (Confidence: ${(confidence * 100).toFixed(2)}%, Contradiction Score: ${originalScore})`);
                return false;
            }
            // REJECT: Significant volume contradiction (>50% contradicting direction) with contradiction score >= 2 after reward
            // Volume contradictions are critical - even with other contradictions, they indicate strong opposing pressure
            // If original score was >= 2 (meaning volume contradiction + at least one other contradiction), reject if adjusted >= 1
            // OR if original score >= 3, reject if adjusted >= 2
            if (hasVolumeContradiction) {
                if (originalScore >= 3 && adjustedScore >= 2) {
                    const reason = `Volume contradiction (>50% contradicting direction) with high contradiction score (${originalScore} → ${adjustedScore} after reward)`;
                    collectWarning(signal.coin, `🚫 REJECTED: ${signal.signal} signal: ${reason}`, [
                        `   Signal filtered: Volume contradiction with high risk score`,
                        `   Confidence: ${(confidence * 100).toFixed(2)}%, Original Score: ${originalScore}, Adjusted Score: ${adjustedScore}`,
                        `   Rule: Volume contradictions with score >= 3 (adjusted >= 2) are rejected even with high confidence`
                    ]);
                    console.log(`   🚫 REJECTED: ${signal.coin}-USDC ${signal.signal.toUpperCase()} - Volume contradiction with high risk (Confidence: ${(confidence * 100).toFixed(2)}%, Contradiction: ${originalScore} → ${adjustedScore})`);
                    return false;
                }
                // STRICTER: Volume contradiction >50% with any other contradiction (originalScore >= 2, adjusted >= 1)
                // Volume contradictions are significant enough that combined with other contradictions, risk is too high
                if (originalScore >= 2 && adjustedScore >= 1) {
                    const reason = `Volume contradiction (>50% contradicting direction) combined with other contradictions (${originalScore} → ${adjustedScore} after reward)`;
                    collectWarning(signal.coin, `🚫 REJECTED: ${signal.signal} signal: ${reason}`, [
                        `   Signal filtered: Volume contradiction with multiple contradictions`,
                        `   Confidence: ${(confidence * 100).toFixed(2)}%, Original Score: ${originalScore}, Adjusted Score: ${adjustedScore}`,
                        `   Rule: Volume contradictions >50% with score >= 2 (adjusted >= 1) are rejected even with high confidence`
                    ]);
                    console.log(`   🚫 REJECTED: ${signal.coin}-USDC ${signal.signal.toUpperCase()} - Volume contradiction with multiple contradictions (Confidence: ${(confidence * 100).toFixed(2)}%, Contradiction: ${originalScore} → ${adjustedScore})`);
                    return false;
                }
            }
            // Score-Confidence Coupling: derive minimum confidence from indicator score tier
            const indicatorScore = assetQualityScoreMap.get(signal.coin) || 0;
            const tierMin = indicatorScore >= 100 ? 0.9 : (indicatorScore >= 80 ? 0.8 : 0.75);
            // Must be HIGH CONFIDENCE (>= max(0.60, MIN_CONF_OVERALL, tierMin)) AND adjusted contradiction score between 0-3
            const MIN_CONF_OVERALL = parseFloat(process.env.MIN_CONF_OVERALL || '0.75');
            const baseThreshold = Math.max(HIGH_CONFIDENCE_THRESHOLD, isFinite(MIN_CONF_OVERALL) ? MIN_CONF_OVERALL : HIGH_CONFIDENCE_THRESHOLD, tierMin);
            const isHighConfidence = confidence >= baseThreshold;
            // Score 4 means no indicators available, so filter it out (< 4, not <= 4)
            const hasValidContradictionScore = adjustedScore >= MIN_CONTRADICTION_SCORE && adjustedScore < MAX_CONTRADICTION_SCORE; // < 4 (not <= 4)
            // Stricter threshold for HIGH conflicts: require >= CONFLICT_HIGH_MIN_CONF (default 0.70)
            const CONFLICT_HIGH_MIN_CONF = parseFloat(process.env.CONFLICT_HIGH_MIN_CONF || '0.70');
            const hasHighConflict = conflictSeverity === 'high' || conflictSeverity === 'critical' || (aroonVsEma && dualOverbought);
            if (hasHighConflict && confidence < CONFLICT_HIGH_MIN_CONF) {
                collectWarning(signal.coin, `🚫 REJECTED (High Conflict): ${signal.signal} requires ≥ ${(CONFLICT_HIGH_MIN_CONF * 100).toFixed(0)}% confidence (got ${(confidence * 100).toFixed(2)}%)`, [
                    `   Reason: High conflict (${conflictSeverity})${aroonVsEma ? ' + Aroon vs EMA' : ''}${dualOverbought ? ' + Dual Overbought' : ''}`,
                    `   Rule: High-conflict signals require higher confidence threshold`
                ]);
                console.log(`   🚫 REJECTED (High Conflict): ${signal.coin}-USDC ${signal.signal.toUpperCase()} (Confidence: ${(confidence * 100).toFixed(2)}%)`);
                return false;
            }
            // Optional extra bump threshold (environment override)
            const EXTRA_CONF_THRESHOLD = parseFloat(process.env.EXTRA_CONF_THRESHOLD || '0');
            const meetsExtra = EXTRA_CONF_THRESHOLD > 0 ? (confidence >= Math.max(HIGH_CONFIDENCE_THRESHOLD, EXTRA_CONF_THRESHOLD)) : isHighConfidence;
            if (!meetsExtra || !hasValidContradictionScore) {
                const scoreInfo = originalScore !== adjustedScore
                    ? `${originalScore} (adjusted: ${adjustedScore}${confidence > HIGH_CONFIDENCE_REWARD_THRESHOLD ? `, -${CONTRADICTION_REWARD} reward` : ''})`
                    : adjustedScore;
                const reason = adjustedScore === 4
                    ? `No indicators available (score: ${scoreInfo})`
                    : !meetsExtra
                        ? `Confidence too low (${(confidence * 100).toFixed(2)}% < ${((EXTRA_CONF_THRESHOLD > 0 ? Math.max(baseThreshold, EXTRA_CONF_THRESHOLD) : baseThreshold) * 100).toFixed(0)}%)`
                        : `Contradiction score out of range (${scoreInfo}, must be 0-3 after adjustment)`;
                collectWarning(signal.coin, `⚠️  Filtering out ${signal.signal} signal: ${reason}`, [
                    `   Signal filtered: Confidence=${(confidence * 100).toFixed(2)}%, Contradiction Score=${scoreInfo}`,
                    `   Requirements: Confidence >= ${((EXTRA_CONF_THRESHOLD > 0 ? Math.max(baseThreshold, EXTRA_CONF_THRESHOLD) : baseThreshold) * 100).toFixed(0)}%, Contradiction Score 0-3 (after ${confidence > HIGH_CONFIDENCE_REWARD_THRESHOLD ? `${CONTRADICTION_REWARD}-point reward if >60%` : 'no reward'})`
                ]);
                console.log(`   ❌ Filtered: ${signal.coin}-USDC ${signal.signal.toUpperCase()} (Confidence: ${(confidence * 100).toFixed(2)}%, Contradiction: ${scoreInfo})`);
                return false;
            }
            // Stricter confidence when non-critical volume contradiction exists
            const MIN_CONF_VOL_SPIKE = parseFloat(process.env.MIN_CONF_VOL_SPIKE || '0.85');
            if (hasVolumeContradiction && confidence < MIN_CONF_VOL_SPIKE) {
                collectWarning(signal.coin, `🚫 REJECTED (Volume Contradiction): ${signal.signal} requires ≥ ${(MIN_CONF_VOL_SPIKE * 100).toFixed(0)}% confidence (got ${(confidence * 100).toFixed(2)}%)`, [
                    `   Reason: Significant volume contradiction present`
                ]);
                console.log(`   🚫 REJECTED (Vol Contradiction): ${signal.coin}-USDC ${signal.signal.toUpperCase()} (Confidence: ${(confidence * 100).toFixed(2)}%)`);
                return false;
            }
            // EC consistency gate: expected vs actual confidence gap
            const EC_GAP_MAX = parseFloat(process.env.EC_GAP_MAX || '30');
            const expected = expectedConfMap.get(signal.coin)?.expected ?? null;
            if (expected != null) {
                const gap = Math.abs(expected - (confidence * 100));
                if (gap > EC_GAP_MAX) {
                    collectWarning(signal.coin, `🚫 REJECTED (EC Gap ${gap.toFixed(1)} > ${EC_GAP_MAX}): Expected ${(expected).toFixed(0)} vs Model ${(confidence * 100).toFixed(0)}`, [
                        '   Reason: Model confidence inconsistent with pre-AI expected confidence'
                    ]);
                    console.log(`   🚫 REJECTED (EC Gap): ${signal.coin}-USDC ${signal.signal.toUpperCase()} gap=${gap.toFixed(1)}`);
                    return false;
                }
            }
            // Autoban on major mismatches from influence graph
            const MAJOR_MISMATCH_AUTOBAN = parseInt(process.env.MAJOR_MISMATCH_AUTOBAN || '3');
            const majorMismatches = expectedConfMap.get(signal.coin)?.majorMismatches ?? 0;
            if (majorMismatches >= MAJOR_MISMATCH_AUTOBAN) {
                collectWarning(signal.coin, `🚫 REJECTED (Major Mismatches: ${majorMismatches} ≥ ${MAJOR_MISMATCH_AUTOBAN})`, [
                    '   Reason: Influence graph detected excessive incoherence'
                ]);
                console.log(`   🚫 REJECTED (Influence Autoban): ${signal.coin}-USDC ${signal.signal.toUpperCase()}`);
                return false;
            }
            return true;
        });
        const filteredCount = signalsWithContradiction.length - qualifyingSignals.length;
        console.log(`   ✅ Qualifying signals: ${qualifyingSignals.length}/${signalsWithContradiction.length} (HIGH CONFIDENCE >=${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%, Contradiction Score 0-3${HIGH_CONFIDENCE_REWARD_THRESHOLD * 100 > 0 ? `, -${CONTRADICTION_REWARD} reward if >${(HIGH_CONFIDENCE_REWARD_THRESHOLD * 100).toFixed(0)}%` : ''})`);
        // Sort by confidence-weighted ranking with futures bonus, expected, and conflict penalties
        const RANK_W1 = parseFloat(process.env.RANK_W_INDICATORS || '0.2');
        const RANK_W2 = parseFloat(process.env.RANK_W_CONFIDENCE || '0.7');
        const RANK_W3 = parseFloat(process.env.RANK_W_FUTURES || '0.1');
        const RANK_W4 = parseFloat(process.env.RANK_W_EXPECTED || '0.2');
        const DEMOTE_PENALTY = parseFloat(process.env.DEMOTE_PENALTY || '30');
        const CONF_FLOOR = parseFloat(process.env.CONF_FLOOR || '0.5');
        const CONF_DEMOTE = parseFloat(process.env.CONF_DEMOTE || '0.7');
        const GAP_MAX = parseFloat(process.env.GAP_MAX || '20');
        const EC_GAP_MAX = parseFloat(process.env.EC_GAP_MAX || '20');
        const MAJOR_MISMATCH_AUTOBAN = parseInt(process.env.MAJOR_MISMATCH_AUTOBAN || '2');
        const { computeConflictPenalties } = await import('./analysis/conflict-penalties');
        const { computeRewardBonuses } = await import('./analysis/reward-bonuses');
        function computeCombinedScore(s) {
            const confPct = (s.confidence || 0) * 100;
            const quality = assetQualityScoreMap.get(s.coin) || 0;
            const futuresScore = typeof s.metadata?.futuresScores?.totalScore === 'number' ? s.metadata.futuresScores.totalScore : 0;
            const expected = expectedConfMap.get(s.coin)?.expected ?? 0;
            const assetData = marketData instanceof Map ? marketData.get(s.coin) : marketData[s.coin];
            const conflict = computeConflictPenalties(s.coin, assetData || {});
            let penalty = conflict.penalty;
            let reward = 0;
            const rewardRes = computeRewardBonuses(s.coin, assetData || {});
            if (rewardRes && rewardRes.reward)
                reward += rewardRes.reward;
            // Confidence floors/demotion
            if (s.confidence < CONF_FLOOR) {
                // Disqualify via heavy penalty
                penalty += 1e6;
            }
            else if (s.confidence < CONF_DEMOTE) {
                penalty += DEMOTE_PENALTY;
            }
            // Consistency penalties
            const gap = Math.abs(quality - confPct);
            const ecGap = Math.abs(expected - confPct);
            if (gap > GAP_MAX)
                penalty += (gap - GAP_MAX);
            if (ecGap > EC_GAP_MAX)
                penalty += (ecGap - EC_GAP_MAX);
            // Consistency bonuses
            const GAP_BONUS_MAX = parseFloat(process.env.GAP_BONUS_MAX || '10');
            const EC_BONUS_MAX = parseFloat(process.env.EC_BONUS_MAX || '10');
            if (gap <= GAP_MAX)
                reward += Math.min(GAP_BONUS_MAX, Math.max(0, GAP_MAX - gap));
            if (ecGap <= EC_GAP_MAX)
                reward += Math.min(EC_BONUS_MAX, Math.max(0, EC_GAP_MAX - ecGap));
            // Autoban on major mismatches
            if (conflict.majorMismatches >= MAJOR_MISMATCH_AUTOBAN)
                penalty += 1e6;
            const REWARD_CAP = parseFloat(process.env.REWARD_CAP || '60');
            if (reward > REWARD_CAP)
                reward = REWARD_CAP;
            const base = (RANK_W1 * quality) + (RANK_W2 * confPct) + (RANK_W3 * futuresScore) + (RANK_W4 * expected);
            const rank = base - penalty + reward;
            const info = `rank=${rank.toFixed(2)} base=${base.toFixed(2)} penalty=${penalty.toFixed(2)} reward=${reward.toFixed(2)} (quality=${quality.toFixed(1)}, conf=${confPct.toFixed(1)}%, futures=${futuresScore.toFixed(1)}, expected=${expected.toFixed(1)}, gap=${gap.toFixed(1)}, ecGap=${ecGap.toFixed(1)}, major=${conflict.majorMismatches})`;
            return { rank, info };
        }
        const sortedSignals = qualifyingSignals
            .map(s => {
            const res = computeCombinedScore(s);
            s.__rankInfo = res.info;
            return { s, rankScore: res.rank };
        })
            .sort((a, b) => b.rankScore - a.rankScore || (b.s.confidence - a.s.confidence))
            .map(x => x.s);
        if (sortedSignals.length === 0) {
            log('⚠️  No qualifying signals generated', 'yellow');
            log('\n✅ Signal generation test completed successfully!', 'green');
            log('⚠️  Note: No trades were executed. This is signal-only mode.', 'yellow');
            return;
        }
        log(`✅ Found ${sortedSignals.length} qualifying signal(s) (HIGH CONFIDENCE >=${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%, Contradiction Score 0-3${HIGH_CONFIDENCE_REWARD_THRESHOLD * 100 > 0 ? `, -${CONTRADICTION_REWARD} reward if >${(HIGH_CONFIDENCE_REWARD_THRESHOLD * 100).toFixed(0)}%` : ''})`, 'green');
        log(`   Total signals generated: ${signals.length}`, 'cyan');
        log(`   Actionable signals: ${actionableSignals.length}`, 'cyan');
        log(`   Signals filtered out: ${filteredCount} (not HIGH CONFIDENCE >=${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% or contradiction score >= 4 or > 3 after adjustment)`, 'cyan');
        log(`   Qualifying signals: ${qualifyingSignals.length} (HIGH CONFIDENCE + Contradiction 0-3${HIGH_CONFIDENCE_REWARD_THRESHOLD * 100 > 0 ? `, with -${CONTRADICTION_REWARD} reward for >${(HIGH_CONFIDENCE_REWARD_THRESHOLD * 100).toFixed(0)}%` : ''})`, 'cyan');
        // Display all qualifying signals with full format
        for (let i = 0; i < sortedSignals.length; i++) {
            const signal = sortedSignals[i];
            // Determine signal color for log
            const signalType = signal.signal.toUpperCase();
            let signalColor = 'yellow';
            if (signalType === 'BUY_TO_ENTER' || signalType === 'ADD')
                signalColor = 'green';
            else if (signalType === 'SELL_TO_ENTER')
                signalColor = 'red';
            else if (signalType === 'HOLD')
                signalColor = 'yellow';
            // Log signal header
            // Display adjusted contradiction score if reward was applied
            const adjustedScore = signal.adjustedContradictionScore !== undefined ? signal.adjustedContradictionScore : (signal.contradictionScore || 0);
            const originalScore = signal.originalContradictionScore !== undefined ? signal.originalContradictionScore : (signal.contradictionScore || 0);
            const hasReward = originalScore !== adjustedScore && signal.confidence > 0.60;
            const contradictionInfo = adjustedScore > 0 || hasReward
                ? ` (Contradiction Score: ${adjustedScore}${hasReward ? ` [${originalScore} → ${adjustedScore}, -2 reward]` : ''})`
                : '';
            log(`\n📊 Signal ${i + 1}/${sortedSignals.length}: ${signal.coin} - ${signal.signal.toUpperCase()} (Confidence: ${((signal.confidence || 0) * 100).toFixed(2)}%${contradictionInfo})`, signalColor);
            // Track entry price and confidence from signal (for weighted decay)
            if ((signal.signal === 'buy_to_enter' || signal.signal === 'sell_to_enter') && signal.entry_price && signal.entry_price > 0) {
                signalHistory.set(signal.coin, {
                    entryPrice: signal.entry_price,
                    signal: signal.signal,
                    confidence: signal.confidence || 0.5,
                    timestamp: Date.now()
                });
            }
            // Display signal with full format
            // OPTIMIZATION: Pass metadata to formatSignal to avoid duplicate API call in getRealTimePrice
            await formatSignal(signal, i, marketData, positions, signalHistory, accountState, metadata);
            // Update positions for next iteration (simulation)
            updateActivePositions(signal);
            // Add separator between signals (except for last one)
            if (i < sortedSignals.length - 1) {
                console.log(''); // Empty line between signals
            }
        }
        // Step 7: Summary (for all qualifying signals)
        logSection('📈 Signal Summary');
        log(`Total Signals Generated: ${signals.length} from ${allowedAssets.length} assets (${allowedAssets.length - signals.length} assets did not generate signals)`, 'cyan');
        log(`Actionable Signals: ${actionableSignals.length}`, 'cyan');
        log(`Signals Filtered Out: ${filteredCount} (not HIGH CONFIDENCE >=${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}% or contradiction score >= 4 or > 3 after adjustment)`, 'cyan');
        log(`Qualifying Signals (HIGH CONFIDENCE >=${(HIGH_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%, Contradiction Score 0-3${HIGH_CONFIDENCE_REWARD_THRESHOLD * 100 > 0 ? `, -${CONTRADICTION_REWARD} reward if >${(HIGH_CONFIDENCE_REWARD_THRESHOLD * 100).toFixed(0)}%` : ''}): ${qualifyingSignals.length}`, 'cyan');
        log(`Signals Displayed: ${sortedSignals.length}`, 'cyan');
        // Show signal details
        for (const signal of sortedSignals) {
            const signalType = signal.signal.toUpperCase();
            let signalColor = 'yellow';
            if (signalType === 'BUY_TO_ENTER' || signalType === 'ADD')
                signalColor = 'green';
            else if (signalType === 'SELL_TO_ENTER')
                signalColor = 'red';
            // Display adjusted contradiction score if reward was applied
            const adjustedScore = signal.adjustedContradictionScore !== undefined ? signal.adjustedContradictionScore : (signal.contradictionScore || 0);
            const originalScore = signal.originalContradictionScore !== undefined ? signal.originalContradictionScore : (signal.contradictionScore || 0);
            const hasReward = originalScore !== adjustedScore && signal.confidence > 0.60;
            const contradictionInfo = adjustedScore > 0 || hasReward
                ? ` | Contradiction Score: ${adjustedScore}${hasReward ? ` [${originalScore}→${adjustedScore}, -2 reward]` : ''}`
                : '';
            log(`   - ${signal.coin}-USDC: ${signal.signal.toUpperCase()} (Confidence: ${((signal.confidence || 0) * 100).toFixed(2)}%${contradictionInfo})`, signalColor);
        }
        log('\n✅ Signal generation test completed successfully!', 'green');
        log('⚠️  Note: No trades were executed. This is signal-only mode.', 'yellow');
    }
    catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
        if (error.stack) {
            log(`\nStack trace:\n${error.stack}`, 'red');
        }
        process.exit(1);
    }
}
