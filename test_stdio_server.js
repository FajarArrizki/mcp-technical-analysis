import { spawn } from 'child_process';

async function testStdioServer() {
  console.log('Testing STDIO MCP server...');
  
  const server = spawn('node', ['/root/GEARTRADE/packages/geartrade-mcp-server/stdio-server.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let output = '';
  let errorOutput = '';
  
  server.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  server.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  // Send initialize request
  const initRequest = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}\n';
  server.stdin.write(initRequest);
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  server.kill();
  
  console.log('STDERR:', errorOutput);
  console.log('STDOUT:', output);
  
  if (output.includes('serverInfo')) {
    console.log('✅ STDIO server test passed!');
  } else {
    console.log('❌ STDIO server test failed');
  }
}

testStdioServer().catch(console.error);
