/**
 * AI API Integration
 * callAIAPI function - calls OpenRouter API
 */
import { getAIProvider, getAIModel, getAIProviderApiKey } from '../config';
/**
 * Call OpenRouter API with system and user prompts
 *
 * PERFORMANCE: Zero delay policy - All AI API calls execute immediately in parallel.
 * No artificial delays or throttling between calls. Delay can be configured via
 * AI_API_DELAY_MS env var (default: 0ms = no delay) if needed in the future.
 */
export async function callAIAPI(systemPrompt, userPrompt) {
    const startTime = Date.now();
    // PERFORMANCE: AI_API_DELAY_MS defaults to 0 (no delay) for maximum parallel execution speed
    // NO LIMIT: All AI API calls execute immediately in parallel without throttling or rate limiting
    // If you need delays, set AI_API_DELAY_MS env var (default: 0 = no delay)
    const aiApiDelayMs = parseInt(process.env.AI_API_DELAY_MS || '0');
    // Apply delay ONLY if explicitly configured (default is 0 = no delay = maximum parallel speed)
    // This allows unlimited concurrent AI API calls
    if (aiApiDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, aiApiDelayMs));
    }
    const AI_PROVIDER = getAIProvider();
    const MODEL_ID = getAIModel();
    const AI_PROVIDER_API_KEY = getAIProviderApiKey();
    // Only support OpenRouter
    if (AI_PROVIDER !== 'openrouter') {
        throw new Error(`Unsupported AI provider: ${AI_PROVIDER}. Only 'openrouter' is supported.`);
    }
    // Get API key - prioritize OPENROUTER_API_KEY
    const apiKey = process.env.OPENROUTER_API_KEY || AI_PROVIDER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is required');
    }
    // Prepare headers
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    // Add optional headers if provided (for OpenRouter rankings)
    if (process.env.OPENROUTER_HTTP_REFERER) {
        headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
    }
    else if (process.env.OPENROUTER_REFERER) {
        headers['HTTP-Referer'] = process.env.OPENROUTER_REFERER;
    }
    if (process.env.OPENROUTER_X_TITLE) {
        headers['X-Title'] = process.env.OPENROUTER_X_TITLE;
    }
    // Prepare request body
    const body = JSON.stringify({
        model: MODEL_ID,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: {
            type: 'json_object'
        },
        temperature: 0.7,
        max_tokens: 8000
    });
    try {
        // PERFORMANCE: Timeout set to 30 seconds for faster failure detection (default fetch timeout is much longer)
        const timeoutMs = parseInt(process.env.AI_API_TIMEOUT_MS || '30000'); // 30 seconds default
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        // Use fetch API (Node.js 18+ native fetch) with timeout
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: headers,
            body: body,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        // Handle non-200 status codes
        if (!response.ok) {
            const errorData = await response.text();
            let errorMsg = errorData.substring(0, 500);
            // Try to parse as JSON for structured error
            try {
                const errorResult = JSON.parse(errorData);
                errorMsg = errorResult.error?.message || errorResult.error?.raw || errorResult.message || errorMsg;
            }
            catch (parseErr) {
                // If not JSON, use raw data
                errorMsg = errorData.trim() || `HTTP ${response.status} error`;
            }
            // OPTIMIZATION FINAL: Only log API errors if verbose logging enabled (reduce error spam)
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.error(`OpenRouter API Error (${response.status}):`, errorMsg);
            }
            throw new Error(`API error: ${response.status} - ${errorMsg}`);
        }
        const result = await response.json();
        // Extract text from response
        const text = result.choices?.[0]?.message?.content || '';
        if (!text) {
            // OPTIMIZATION FINAL: Only log response structure errors if verbose logging enabled
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.error('OpenRouter Response structure:', JSON.stringify(result, null, 2));
            }
            throw new Error('No content in OpenRouter response');
        }
        // PERFORMANCE: Log API call duration if verbose logging enabled
        const duration = Date.now() - startTime;
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.log(`⏱️  AI API call completed in ${duration}ms`);
        }
        return { text };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        // Handle timeout errors
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            // OPTIMIZATION FINAL: Only log timeout errors if verbose logging enabled (reduce error spam)
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.error(`OpenRouter API Timeout after ${duration}ms`);
            }
            throw new Error(`API request timeout after ${duration}ms`);
        }
        // Handle network errors and other exceptions
        if (error.message && error.message.includes('API error:')) {
            throw error;
        }
        // OPTIMIZATION FINAL: Only log network errors if verbose logging enabled (reduce error spam)
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.error(`OpenRouter Request Error (${duration}ms):`, error.message || error.toString());
        }
        // Throw error with clear message for upstream handling
        const errorMsg = error.message || error.toString();
        throw new Error(`Request failed: ${errorMsg}`);
    }
}
