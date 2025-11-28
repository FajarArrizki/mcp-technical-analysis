const { spawn } = require('child_process');

// Test script to verify MCP server functionality
async function testMCPServer() {
  console.log('🧪 Testing MCP Server Endpoints...\n');
  
  // Start server in background
  const serverProcess = spawn('bash', ['-c', 'cd packages/geartrade-mcp-server && pnpm tsx local-server.ts'], {
    detached: true,
    stdio: 'ignore'
  });
  serverProcess.unref();
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const testEndpoint = async (name, method, body = null) => {
    try {
      const curlCmd = body 
        ? `curl -s -X POST http://localhost:8787/mcp -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`
        : `curl -s http://localhost:8787/${method}`;
      
      const result = await new Promise((resolve, reject) => {
        const child = spawn('bash', ['-c', curlCmd], { stdio: 'pipe' });
        let output = '';
        let error = '';
        
        child.stdout.on('data', (data) => output += data.toString());
        child.stderr.on('data', (data) => error += data.toString());
        
        child.on('close', (code) => {
          if (code === 0) resolve(output.trim());
          else reject(new Error(`Exit code ${code}: ${error}`));
        });
      });
      
      const success = result && !result.includes('error');
      console.log(`${success ? '✅' : '❌'} ${name}: ${success ? 'OK' : 'FAILED'}`);
      if (!success) console.log(`   Error: ${result}`);
      return success;
    } catch (error) {
      console.log(`❌ ${name}: FAILED - ${error.message}`);
      return false;
    }
  };
  
  // Test health endpoint
  const healthOk = await testEndpoint('Health Check', 'health');
  
  // Test MCP initialize
  const initOk = await testEndpoint('MCP Initialize', 'mcp', {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2024-11-05' }
  });
  
  // Test MCP tools/list
  const toolsOk = await testEndpoint('MCP Tools List', 'mcp', {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });
  
  // Test MCP resources/list
  const resourcesOk = await testEndpoint('MCP Resources List', 'mcp', {
    jsonrpc: '2.0',
    id: 3,
    method: 'resources/list',
    params: {}
  });
  
  // Kill server
  spawn('pkill', ['-f', 'local-server.ts'], { stdio: 'ignore' });
  
  console.log(`\n📊 Test Results: ${[healthOk, initOk, toolsOk, resourcesOk].filter(Boolean).length}/4 passed`);
  
  if (healthOk && initOk && toolsOk && resourcesOk) {
    console.log('🎉 All MCP server endpoints are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some MCP server endpoints failed. Check the server implementation.');
    process.exit(1);
  }
}

testMCPServer().catch(console.error);
