/**
 * AI Processor for Signal Generation
 * Handles AI API calls and response parsing for a single asset
 */
import { callAIAPI } from '../ai/call-api';
/**
 * Call AI API for a single asset
 */
export async function callAIForAsset(asset, systemPrompt, userPrompt) {
    try {
        const response = await callAIAPI(systemPrompt, userPrompt);
        return response;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // OPTIMIZATION FINAL: Only log AI API errors if verbose logging enabled (reduce error spam for network issues)
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.error(`❌ Failed to call AI API for ${asset}:`, errorMsg);
        }
        throw new Error(`Failed to call AI API for ${asset}: ${errorMsg}`);
    }
}
/**
 * Parse AI response and extract signal for a single asset
 */
export function parseAIResponse(response, asset) {
    // Log response for debugging (only if enabled)
    if (process.env.DEBUG_AI_RESPONSE === 'true') {
        console.log(`🔍 AI Response for ${asset} length:`, response.text.length);
        console.log(`🔍 AI Response for ${asset} (first 500 chars):`, response.text.substring(0, 500));
    }
    // Clean response text - remove markdown code blocks if present
    let cleanedText = response.text.trim();
    // Check if response is an array of numbers (wrong format)
    if (cleanedText.startsWith('[') && cleanedText.match(/^\[[\d\s.,]+\]$/)) {
        // OPTIMIZATION FINAL: Only log format errors if verbose logging enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.error(`❌ AI model returned array of numbers instead of JSON object for ${asset}`);
        }
        throw new Error(`AI_MODEL_RETURNED_NON_JSON: Model returned array of numbers instead of JSON object for ${asset}.`);
    }
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```')) {
        const lines = cleanedText.split('\n');
        cleanedText = lines.slice(1, -1).join('\n').trim();
    }
    // OPTIMIZATION: Direct JSON parse first (most common case - structured output)
    let jsonData;
    try {
        jsonData = JSON.parse(cleanedText);
    }
    catch (parseError) {
        // Fallback: Try to extract JSON object from text (simple regex match)
        const jsonMatch = cleanedText.match(/\{[\s\S]{1,50000}\}/);
        if (jsonMatch) {
            try {
                // Try to fix common JSON issues quickly
                let fixedJson = jsonMatch[0]
                    .replace(/,\s*}/g, '}')
                    .replace(/,\s*]/g, ']');
                jsonData = JSON.parse(fixedJson);
            }
            catch (fallbackError) {
                // If fallback fails, log and throw
                // OPTIMIZATION FINAL: Only log JSON parse errors if verbose logging enabled
                if (process.env.VERBOSE_LOGGING === 'true') {
                    console.error(`❌ Failed to parse JSON for ${asset}:`, parseError instanceof Error ? parseError.message : String(parseError));
                }
                throw new Error(`Failed to parse JSON response for ${asset}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
            }
        }
        else {
            // No JSON found - throw error
            // OPTIMIZATION FINAL: Only log JSON not found errors if verbose logging enabled
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.error(`❌ No valid JSON found in response for ${asset}`);
            }
            throw new Error(`No valid JSON found in AI response for ${asset}`);
        }
    }
    // Extract signal from response
    // For single asset, response should be a single signal object or have a "coin" field
    let signal = null;
    // If response is already a signal object (has coin and signal fields)
    if (jsonData && jsonData.coin && jsonData.signal) {
        signal = jsonData;
    }
    else if (jsonData && typeof jsonData === 'object') {
        // If response has signal fields but no coin, add the asset
        if (jsonData.signal) {
            signal = {
                ...jsonData,
                coin: asset
            };
        }
        else {
            // Try to find signal in nested structure
            if (jsonData.signals && Array.isArray(jsonData.signals) && jsonData.signals.length > 0) {
                // Find signal for this asset
                signal = jsonData.signals.find((s) => s.coin === asset || !s.coin);
                if (signal && !signal.coin) {
                    signal.coin = asset;
                }
            }
            else if (jsonData.data && Array.isArray(jsonData.data) && jsonData.data.length > 0) {
                // Try data key
                signal = jsonData.data.find((s) => s.coin === asset || !s.coin);
                if (signal && !signal.coin) {
                    signal.coin = asset;
                }
            }
            else if (Array.isArray(jsonData) && jsonData.length > 0) {
                // Response is array, find signal for this asset or use first
                signal = jsonData.find((s) => s.coin === asset || !s.coin);
                if (signal && !signal.coin) {
                    signal.coin = asset;
                }
            }
        }
    }
    // Validate signal structure
    if (!signal || typeof signal !== 'object' || !signal.coin || !signal.signal) {
        // OPTIMIZATION FINAL: Only log validation errors if verbose logging enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.error(`❌ Invalid signal structure for ${asset}`);
            console.error(`❌ Signal type:`, typeof signal);
            console.error(`❌ Signal value:`, JSON.stringify(signal, null, 2));
            console.error(`❌ Expected structure: { coin: "${asset}", signal: "buy_to_enter", ... }`);
        }
        throw new Error(`AI_MODEL_RETURNED_INVALID_SIGNALS: Invalid signal structure for ${asset}. The AI model may not have followed the JSON format requirements.`);
    }
    // Ensure coin field matches asset
    signal.coin = asset;
    // CRITICAL FIX: Ensure confidence is always set (default to 0.60 if missing from AI response)
    // Confidence will be recalculated in processSignal, but we need a valid value here
    // Use minimum threshold (0.60) instead of 0.5 to meet minimum requirements
    const MIN_CONFIDENCE_THRESHOLD = 0.60;
    if (signal.confidence === null || signal.confidence === undefined || isNaN(signal.confidence)) {
        signal.confidence = MIN_CONFIDENCE_THRESHOLD; // Default confidence - will be recalculated based on indicators
    }
    // Validate confidence is within valid range (0-1)
    if (signal.confidence < 0 || signal.confidence > 1) {
        console.warn(`⚠️  ${asset}: AI returned invalid confidence ${signal.confidence}, defaulting to minimum threshold ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
        signal.confidence = MIN_CONFIDENCE_THRESHOLD;
    }
    return signal;
}
