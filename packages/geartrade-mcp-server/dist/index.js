/**
 * GearTrade MCP Server
 * Exposes trading functionality via Model Context Protocol using Nullshot MCP SDK
 * Local development server only
 */
// Load environment variables from .env file
import "dotenv/config";
// Import merged tools
import { registerAllMergedTools } from './tools';
/**
 * OLD FORMATTER FUNCTIONS REMOVED
 * All formatter functions have been moved to ./formatters/ folder
 *
 * Functions removed (16 functions, ~940 lines):
 * - formatTechnicalIndicators_OLD
 * - formatVolumeAnalysis_OLD
 * - formatMultiTimeframe_OLD
 * - formatExternalData_OLD
 * - formatPosition_OLD
 * - formatRiskManagement_OLD
 * - formatPositionSetup_OLD
 * - formatFibonacci_OLD
 * - formatOrderBookDepth_OLD
 * - formatVolumeProfile_OLD
 * - formatMarketStructure_OLD
 * - formatCandlestickPatterns_OLD
 * - formatDivergence_OLD
 * - formatLiquidationLevels_OLD
 * - formatLongShortRatio_OLD
 * - formatSpotFuturesDivergence_OLD
 */
// Simplified server object for Cloudflare Workers compatibility
const server = {
    name: 'geartrade',
    version: '1.0.0',
    tools: new Map(),
    resources: new Map(),
    prompts: new Map(),
    registerTool(name, config, handler) {
        this.tools.set(name, { config, handler });
    },
    registerResource(name, uri, config, handler) {
        this.resources.set(name, { uri, config, handler });
    },
    registerPrompt(name, config, handler) {
        this.prompts.set(name, { config, handler });
    },
    // Add tool() method as alias for registerTool() for compatibility with new tools
    tool(name, description, schema, handler) {
        this.tools.set(name, {
            config: {
                title: name,
                description,
                inputSchema: schema
            },
            handler
        });
    }
};
// Register all merged tools (unified indicators)
// FIXED: Now 50 tools total (18 oscillators + 10 MAs + 22 others)
registerAllMergedTools(server);
// ALL INDIVIDUAL TOOLS HAVE BEEN MOVED TO MODULAR STRUCTURE
// The following 19 tools have been extracted to modular files:
//
// Data Tools (3 tools) → tools/data/price-position-tools.ts
//   - get_price
//   - get_position  
//   - get_correlation_analysis
//
// Trading Risk Tools (2 tools) → tools/trading/risk-management-tools.ts
//   - calculate_risk_management
//   - calculate_position_setup
//
// Analysis Tools (14 tools) → tools/analysis/
//   Market Data (4 tools) → market-data-tools.ts
//     - get_indicators
//     - get_volume_analysis
//     - get_Multitimeframe
//     - get_External_data
//   
//   Technical Analysis (4 tools) → technical-analysis-tools.ts
//     - get_orderbook_depth
//     - get_volume_profile
//     - get_market_structure
//     - get_market_regime
//   
//   Pattern Analysis (4 tools) → pattern-analysis-tools.ts
//     - get_candlestick_patterns
//     - get_divergence
//     - get_liquidation_levels
//     - get_long_short_ratio
//   
//   Whale Analysis (2 tools) → whale-analysis-tools.ts
//     - get_whale_position
//     - get_tier_classification
//
// All tools are automatically registered via registerAllMergedTools()
// Total: 36 modular tools covering 50+ operations
// WHALE TRACKING & TIER CLASSIFICATION TOOLS
// In-memory cache for position change detection
const walletPositionCache = new Map();
// DEPRECATED: Individual tools below have been merged into unified tools
// These are kept for backward compatibility but will be removed in future versions
// New unified tools: moving_averages, oscillators, volume_indicators,
//                   volatility_indicators, channels, pivot_points, trend_indicators
// Register Resources
/**
 * RESOURCES AND PROMPTS - MODULARIZED
 * Extracted to separate files for better organization
 * - Resources: 884 lines moved to ./resources/
 * - Prompts: 4,090 lines moved to ./prompts/
 * Total: 4,974 lines extracted
 */
// Import and register resources
import { registerResources } from './resources';
registerResources(server);
// Import and register prompts
import { registerPrompts } from './prompts';
registerPrompts(server);
// JSON-RPC 2.0 response helper
function jsonRpcResponse(id, result) {
    return {
        jsonrpc: '2.0',
        id,
        result
    };
}
function jsonRpcError(id, code, message, data) {
    return {
        jsonrpc: '2.0',
        id,
        error: { code, message, data }
    };
}
// MCP method handlers
async function handleMcpMethod(method, params, id) {
    switch (method) {
        case 'initialize':
            return jsonRpcResponse(id, {
                protocolVersion: params?.protocolVersion || '2024-11-05',
                serverInfo: {
                    name: server.name,
                    version: server.version
                },
                capabilities: {
                    tools: { listChanged: false },
                    resources: { listChanged: false, subscribe: false },
                    prompts: { listChanged: false }
                }
            });
        case 'initialized':
            // Notification, no response needed but return empty result for compatibility
            return jsonRpcResponse(id, {});
        case 'tools/list':
            const tools = Array.from(server.tools.entries()).map(([name, { config }]) => ({
                name,
                description: config.description || '',
                inputSchema: {
                    type: 'object',
                    properties: (() => {
                        try {
                            // Check if inputSchema is a Zod object schema
                            if (config.inputSchema && config.inputSchema._def && config.inputSchema._def.typeName === 'ZodObject') {
                                // Extract shape from Zod object schema
                                const shape = config.inputSchema._def.shape;
                                const shapeObj = typeof shape === 'function' ? shape() : shape || {};
                                return Object.fromEntries(Object.entries(shapeObj).map(([key, schema]) => {
                                    // Safely extract type and description from Zod schema
                                    let type = 'string'; // default fallback
                                    let description = '';
                                    try {
                                        if (schema && schema._def) {
                                            const typeName = schema._def.typeName;
                                            switch (typeName) {
                                                case 'ZodNumber':
                                                    type = 'number';
                                                    break;
                                                case 'ZodBoolean':
                                                    type = 'boolean';
                                                    break;
                                                case 'ZodArray':
                                                    type = 'array';
                                                    break;
                                                case 'ZodEnum':
                                                    type = 'string'; // enums are strings
                                                    break;
                                                case 'ZodString':
                                                default:
                                                    type = 'string';
                                                    break;
                                            }
                                            description = schema._def.description || '';
                                        }
                                    }
                                    catch (error) {
                                        // If anything fails, use safe defaults
                                        type = 'string';
                                        description = '';
                                    }
                                    return [
                                        key,
                                        {
                                            type,
                                            description
                                        }
                                    ];
                                }));
                            }
                            else {
                                // Fallback for plain objects (old format)
                                return Object.fromEntries(Object.entries(config.inputSchema || {})
                                    .filter(([key]) => !key.startsWith('~')) // Filter out internal Zod properties
                                    .map(([key, schema]) => {
                                    // Safely extract type and description from Zod schema
                                    let type = 'string'; // default fallback
                                    let description = '';
                                    try {
                                        if (schema && schema._def) {
                                            const typeName = schema._def.typeName;
                                            switch (typeName) {
                                                case 'ZodNumber':
                                                    type = 'number';
                                                    break;
                                                case 'ZodBoolean':
                                                    type = 'boolean';
                                                    break;
                                                case 'ZodArray':
                                                    type = 'array';
                                                    break;
                                                case 'ZodString':
                                                default:
                                                    type = 'string';
                                                    break;
                                            }
                                            description = schema._def.description || '';
                                        }
                                        else if (schema && typeof schema === 'object') {
                                            // Fallback for non-Zod objects
                                            type = schema.type || 'string';
                                            description = schema.description || '';
                                        }
                                    }
                                    catch (error) {
                                        // If anything fails, use safe defaults
                                        type = 'string';
                                        description = '';
                                    }
                                    return [
                                        key,
                                        {
                                            type,
                                            description
                                        }
                                    ];
                                }));
                            }
                        }
                        catch (error) {
                            // If all else fails, return empty properties
                            return {};
                        }
                    })(),
                    required: (() => {
                        try {
                            // Check if inputSchema is a Zod object schema
                            if (config.inputSchema && config.inputSchema._def && config.inputSchema._def.typeName === 'ZodObject') {
                                // Extract required fields from Zod object schema
                                const shape = config.inputSchema._def.shape;
                                const shapeObj = typeof shape === 'function' ? shape() : shape || {};
                                return Object.keys(shapeObj);
                            }
                            else {
                                // Fallback for plain objects
                                return Object.keys(config.inputSchema || {}).filter(key => !key.startsWith('~'));
                            }
                        }
                        catch (error) {
                            return [];
                        }
                    })()
                }
            }));
            return jsonRpcResponse(id, { tools });
        case 'tools/call':
            const toolName = params?.name;
            const toolArgs = params?.arguments || {};
            const tool = server.tools.get(toolName);
            if (!tool) {
                return jsonRpcError(id, -32601, `Tool not found: ${toolName}`);
            }
            try {
                const result = await tool.handler(toolArgs);
                return jsonRpcResponse(id, result);
            }
            catch (err) {
                return jsonRpcError(id, -32603, err.message || 'Tool execution failed');
            }
        case 'resources/list':
            const resources = Array.from(server.resources.entries()).map(([name, { config }]) => ({
                uri: `geartrade://${name}`,
                name: config.title || name,
                description: config.description || '',
                mimeType: 'text/plain'
            }));
            return jsonRpcResponse(id, { resources });
        case 'resources/read':
            const resourceUri = params?.uri || '';
            const resourceName = resourceUri.replace('geartrade://', '');
            const resource = server.resources.get(resourceName);
            if (!resource) {
                return jsonRpcError(id, -32601, `Resource not found: ${resourceUri}`);
            }
            try {
                const content = await resource.handler();
                return jsonRpcResponse(id, {
                    contents: [{
                            uri: resourceUri,
                            mimeType: 'text/plain',
                            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
                        }]
                });
            }
            catch (err) {
                return jsonRpcError(id, -32603, err.message || 'Resource read failed');
            }
        case 'prompts/list':
            const prompts = Array.from(server.prompts.entries()).map(([name, { config }]) => {
                // Extract arguments from argsSchema (Zod schemas)
                const args = [];
                if (config.argsSchema) {
                    for (const [key, schema] of Object.entries(config.argsSchema)) {
                        const zodSchema = schema;
                        const isRequired = !zodSchema?._def?.typeName?.includes('Optional');
                        args.push({
                            name: key,
                            description: zodSchema?._def?.description || '',
                            required: isRequired
                        });
                    }
                }
                return {
                    name,
                    description: config.description || '',
                    arguments: args
                };
            });
            return jsonRpcResponse(id, { prompts });
        case 'prompts/get':
            const promptName = params?.name;
            const promptData = server.prompts.get(promptName);
            if (!promptData) {
                return jsonRpcError(id, -32601, `Prompt not found: ${promptName}`);
            }
            const { config: promptConfig, handler: promptHandler } = promptData;
            const promptArgs = params?.arguments || {};
            // If there's a handler function, call it with arguments
            if (promptHandler && typeof promptHandler === 'function') {
                try {
                    const result = await promptHandler(promptArgs);
                    return jsonRpcResponse(id, {
                        description: promptConfig.description,
                        messages: result.messages || [{
                                role: 'user',
                                content: { type: 'text', text: promptConfig.description }
                            }]
                    });
                }
                catch (err) {
                    return jsonRpcError(id, -32603, err.message || 'Prompt handler failed');
                }
            }
            // Fallback: use template or description
            let promptText = promptConfig.template || promptConfig.description || '';
            for (const [key, value] of Object.entries(promptArgs)) {
                promptText = promptText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
            }
            return jsonRpcResponse(id, {
                description: promptConfig.description,
                messages: [{
                        role: 'user',
                        content: { type: 'text', text: promptText }
                    }]
            });
        case 'ping':
            return jsonRpcResponse(id, {});
        default:
            return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
}
// Default export for local HTTP server with streaming support
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        // Enhanced CORS headers for streaming support
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID',
            'Access-Control-Max-Age': '86400'
        };
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        // Basic health check endpoint
        if (request.method === 'GET' && request.url.endsWith('/health')) {
            return new Response(JSON.stringify({
                status: 'ok',
                server: server.name,
                version: server.version,
                streaming: true,
                endpoints: ['/stream', '/mcp', '/events']
            }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        // SSE (Server-Sent Events) streaming endpoint
        if (request.method === 'GET' && url.pathname === '/stream') {
            const streamHeaders = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID'
            };
            let eventId = 0;
            const stream = new ReadableStream({
                start(controller) {
                    // Send initial connection event
                    const initEvent = `id: ${eventId++}\nevent: connected\ndata: ${JSON.stringify({
                        type: 'connection',
                        message: 'Connected to MCP streaming server',
                        server: server.name,
                        version: server.version,
                        timestamp: new Date().toISOString()
                    })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(initEvent));
                    // Send periodic heartbeat
                    const heartbeatInterval = setInterval(() => {
                        const heartbeat = `id: ${eventId++}\nevent: heartbeat\ndata: ${JSON.stringify({
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        try {
                            controller.enqueue(new TextEncoder().encode(heartbeat));
                        }
                        catch (error) {
                            clearInterval(heartbeatInterval);
                        }
                    }, 30000); // 30 seconds heartbeat
                    // Handle client disconnect
                    request.signal.addEventListener('abort', () => {
                        clearInterval(heartbeatInterval);
                        controller.close();
                    });
                }
            });
            return new Response(stream, { headers: streamHeaders });
        }
        // WebSocket-like streaming for MCP commands over HTTP
        if (request.method === 'POST' && url.pathname === '/stream') {
            const streamHeaders = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID'
            };
            try {
                const body = await request.json();
                const { jsonrpc, id, method, params } = body;
                const stream = new ReadableStream({
                    async start(controller) {
                        let eventId = 0;
                        // Send request received event
                        const requestEvent = `id: ${eventId++}\nevent: request_received\ndata: ${JSON.stringify({
                            type: 'request',
                            method,
                            params,
                            id,
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        controller.enqueue(new TextEncoder().encode(requestEvent));
                        // Process the MCP method
                        try {
                            // Send processing event
                            const processingEvent = `id: ${eventId++}\nevent: processing\ndata: ${JSON.stringify({
                                type: 'processing',
                                method,
                                message: 'Processing MCP request...',
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(processingEvent));
                            const response = await handleMcpMethod(method, params, id);
                            // Send response event
                            const responseEvent = `id: ${eventId++}\nevent: response\ndata: ${JSON.stringify({
                                type: 'response',
                                response,
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(responseEvent));
                            // Send completion event
                            const completionEvent = `id: ${eventId++}\nevent: completed\ndata: ${JSON.stringify({
                                type: 'completed',
                                method,
                                success: true,
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(completionEvent));
                        }
                        catch (error) {
                            // Send error event
                            const errorEvent = `id: ${eventId++}\nevent: error\ndata: ${JSON.stringify({
                                type: 'error',
                                error: error.message,
                                method,
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(errorEvent));
                        }
                        finally {
                            controller.close();
                        }
                    }
                });
                return new Response(stream, { headers: streamHeaders });
            }
            catch (error) {
                const errorStream = new ReadableStream({
                    start(controller) {
                        const errorEvent = `id: 0\nevent: error\ndata: ${JSON.stringify({
                            type: 'error',
                            error: error.message,
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        controller.enqueue(new TextEncoder().encode(errorEvent));
                        controller.close();
                    }
                });
                return new Response(errorStream, { headers: streamHeaders });
            }
        }
        // Handle MCP JSON-RPC requests (traditional endpoint)
        if (request.method === 'POST' && url.pathname !== '/stream') {
            try {
                const body = await request.json();
                // Handle batch requests
                if (Array.isArray(body)) {
                    const responses = await Promise.all(body.map((req) => handleMcpMethod(req.method, req.params, req.id)));
                    return new Response(JSON.stringify(responses), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }
                // Single request
                const { jsonrpc, id, method, params } = body;
                if (jsonrpc !== '2.0') {
                    return new Response(JSON.stringify(jsonRpcError(id || null, -32600, 'Invalid Request: jsonrpc must be "2.0"')), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }
                const response = await handleMcpMethod(method, params, id);
                return new Response(JSON.stringify(response), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            catch (err) {
                return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error', err.message)), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }
        // GET request - return server info (for debugging)
        return new Response(JSON.stringify({
            name: server.name,
            version: server.version,
            endpoint: '/mcp',
            streaming: {
                enabled: true,
                endpoints: {
                    sse: '/stream',
                    mcp_stream: '/stream',
                    health: '/health'
                }
            },
            protocol: 'JSON-RPC 2.0',
            methods: ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get'],
            features: ['http-streaming', 'sse-events', 'real-time-responses']
        }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
};
