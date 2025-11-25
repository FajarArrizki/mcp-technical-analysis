#!/usr/bin/env node
/**
 * GearTrade Terminal CLI
 * Interactive terminal UI for MCP server
 */

import { readFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  createTheme,
  clearScreen,
  Banner,
  Header,
  Spinner,
  select,
  prompt,
  confirm,
  table,
  Box,
  Divider,
  welcomeMessage,
} from './ui.js'
import { MCPClient, MCPServerConfig } from './mcp-client.js'
import { HTTPMCPClient } from './http-mcp-client.js'
import { StreamMCPClient } from './stream-mcp-client.js'
import type { IMCPClient } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface HTTPServerConfig {
  type: 'http'
  url: string
  headers?: Record<string, string>
}

interface StreamServerConfig {
  type: 'stream'
  url: string
  headers?: Record<string, string>
  description?: string
}

interface StdioServerConfig {
  type?: 'stdio'
  command: string
  args: string[]
  env?: Record<string, string>
}

type ServerConfig = HTTPServerConfig | StreamServerConfig | StdioServerConfig

interface Config {
  mcpServers: Record<string, ServerConfig>
}

// Use interface for unified client type
type UnifiedMCPClient = IMCPClient

const theme = createTheme()

async function loadConfig(): Promise<Config> {
  const configPath = resolve(process.cwd(), 'mcp.json')
  try {
    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(theme.error('✖ Failed to load mcp.json'))
    console.error(theme.dim('  Make sure mcp.json exists in the current directory'))
    process.exit(1)
  }
}

async function showWelcome() {
  clearScreen()
  
  // Draw gear banner
  const banner = new Banner(theme)
  banner.draw()
  
  // Show security message
  console.log(welcomeMessage())
  
  console.log()
  await confirm('Press Enter to continue', true)
}

async function selectServer(config: Config): Promise<string> {
  clearScreen()
  
  const serverNames = Object.keys(config.mcpServers)
  if (serverNames.length === 0) {
    console.error(theme.error('✖ No MCP servers configured in mcp.json'))
    process.exit(1)
  }
  
  if (serverNames.length === 1) {
    return serverNames[0]
  }
  
  const index = await select(
    theme.bold('Select MCP Server:'),
    serverNames
  )
  
  return serverNames[index]
}

async function connectToServer(serverName: string, config: ServerConfig): Promise<UnifiedMCPClient> {
  clearScreen()
  const header = new Header(theme)
  header.draw('1.0.0', serverName, process.cwd())
  
  const spinner = new Spinner(theme, `Connecting to ${serverName}...`)
  spinner.start()
  
  try {
    let client: UnifiedMCPClient
    
    if ('url' in config && config.type === 'stream') {
      // Streaming server (SSE)
      client = new StreamMCPClient({
        url: config.url,
        headers: config.headers,
      })
    } else if ('url' in config && config.type === 'http') {
      // HTTP-based server (Nullshot)
      client = new HTTPMCPClient({
        url: config.url,
        headers: config.headers,
      })
    } else {
      // Stdio-based server (standard MCP)
      const stdioConfig = config as StdioServerConfig
      client = new MCPClient({
        command: stdioConfig.command,
        args: stdioConfig.args,
        env: stdioConfig.env,
      })
    }
    
    await client.connect()
    spinner.succeed(`Connected to ${theme.primary(serverName)}`)
    return client
  } catch (error) {
    spinner.fail(`Failed to connect to ${serverName}`)
    console.error(theme.error('\n' + (error as Error).message))
    process.exit(1)
  }
}

async function mainMenu(client: UnifiedMCPClient, serverName: string): Promise<void> {
  while (true) {
    clearScreen()
    const header = new Header(theme)
    header.draw('1.0.0', serverName, process.cwd())
    
    console.log(theme.dim('> What would you like to do?'))
    console.log(theme.dim('─'.repeat(80)))
    console.log()
    
    const choice = await select(
      '',
      [
        'List available tools',
        'Execute a tool',
        'List resources',
        'Read a resource',
        'Server status',
        'Exit',
      ]
    )
    
    switch (choice) {
      case 0:
        await listTools(client)
        break
      case 1:
        await executeTool(client)
        break
      case 2:
        await listResources(client)
        break
      case 3:
        await readResource(client)
        break
      case 4:
        await serverStatus(client, serverName)
        break
      case 5:
        await client.disconnect()
        console.log(theme.success('\n✔ Disconnected from server'))
        process.exit(0)
    }
  }
}

async function listTools(client: IMCPClient): Promise<void> {
  clearScreen()
  console.log(theme.bold('Available Tools'))
  console.log()
  
  const spinner = new Spinner(theme, 'Loading tools...')
  spinner.start()
  
  try {
    const tools = await client.listTools()
    spinner.stop()
    
    if (tools.length === 0) {
      console.log(theme.warning('  No tools available'))
    } else {
      tools.forEach((tool, index) => {
        console.log(`\n${theme.primary(`${index + 1}. ${tool.name}`)}`)
        console.log(`   ${theme.dim(tool.description || 'No description')}`)
        
        if (tool.inputSchema?.properties) {
          const params = Object.keys(tool.inputSchema.properties)
          if (params.length > 0) {
            console.log(`   ${theme.dim('Parameters:')} ${params.join(', ')}`)
          }
        }
      })
    }
  } catch (error) {
    spinner.fail('Failed to load tools')
    console.error(theme.error((error as Error).message))
  }
  
  console.log()
  await confirm('Press Enter to continue', true)
}

async function executeTool(client: IMCPClient): Promise<void> {
  clearScreen()
  console.log(theme.bold('Execute Tool'))
  console.log()
  
  const spinner = new Spinner(theme, 'Loading tools...')
  spinner.start()
  
  let tools
  try {
    tools = await client.listTools()
    spinner.stop()
  } catch (error) {
    spinner.fail('Failed to load tools')
    console.error(theme.error((error as Error).message))
    await confirm('Press Enter to continue', true)
    return
  }
  
  if (tools.length === 0) {
    console.log(theme.warning('No tools available'))
    await confirm('Press Enter to continue', true)
    return
  }
  
  const toolIndex = await select(
    theme.bold('Select tool to execute:'),
    tools.map(t => `${t.name} - ${t.description || 'No description'}`)
  )
  
  const tool = tools[toolIndex]
  clearScreen()
  console.log(theme.bold(`Execute: ${tool.name}`))
  console.log(theme.dim(tool.description || ''))
  console.log()
  
  // Get parameters
  const args: any = {}
  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties
    const required = tool.inputSchema.required || []
    
    for (const [key, schema] of Object.entries(properties)) {
      const schemaObj = schema as any
      const isRequired = required.includes(key)
      const description = schemaObj.description || ''
      const type = schemaObj.type || 'string'
      
      console.log(`${theme.primary(key)} ${isRequired ? theme.error('(required)') : theme.dim('(optional)')}`)
      console.log(theme.dim(`  ${description}`))
      console.log(theme.dim(`  Type: ${type}`))
      
      const value = await prompt(`  Value`)
      
      if (value) {
        // Type conversion
        if (type === 'number') {
          args[key] = parseFloat(value)
        } else if (type === 'boolean') {
          args[key] = value.toLowerCase() === 'true'
        } else if (type === 'object' || type === 'array') {
          try {
            args[key] = JSON.parse(value)
          } catch {
            args[key] = value
          }
        } else {
          args[key] = value
        }
      } else if (isRequired) {
        console.log(theme.error('  Required parameter cannot be empty'))
        await confirm('Press Enter to continue', true)
        return
      }
      
      console.log()
    }
  }
  
  // Confirm execution
  console.log(theme.bold('Parameters:'))
  console.log(JSON.stringify(args, null, 2))
  console.log()
  
  const shouldExecute = await confirm('Execute tool?', true)
  if (!shouldExecute) return
  
  // Execute
  const execSpinner = new Spinner(theme, 'Executing tool...')
  execSpinner.start()
  
  try {
    const result = await client.callTool(tool.name, args)
    execSpinner.succeed('Tool executed successfully')
    
    console.log()
    console.log(theme.bold('Result:'))
    const box = new Box(theme)
    box.draw(JSON.stringify(result, null, 2))
  } catch (error) {
    execSpinner.fail('Tool execution failed')
    console.error(theme.error((error as Error).message))
  }
  
  console.log()
  await confirm('Press Enter to continue', true)
}

async function listResources(client: IMCPClient): Promise<void> {
  clearScreen()
  console.log(theme.bold('Available Resources'))
  console.log()
  
  const spinner = new Spinner(theme, 'Loading resources...')
  spinner.start()
  
  try {
    const resources = await client.listResources()
    spinner.stop()
    
    if (resources.length === 0) {
      console.log(theme.warning('  No resources available'))
    } else {
      resources.forEach((resource, index) => {
        console.log(`\n${theme.primary(`${index + 1}. ${resource.name}`)}`)
        console.log(`   ${theme.dim('URI:')} ${resource.uri}`)
        if (resource.description) {
          console.log(`   ${theme.dim(resource.description)}`)
        }
        if (resource.mimeType) {
          console.log(`   ${theme.dim('Type:')} ${resource.mimeType}`)
        }
      })
    }
  } catch (error) {
    spinner.fail('Failed to load resources')
    console.error(theme.error((error as Error).message))
  }
  
  console.log()
  await confirm('Press Enter to continue', true)
}

async function readResource(client: IMCPClient): Promise<void> {
  clearScreen()
  console.log(theme.bold('Read Resource'))
  console.log()
  
  const spinner = new Spinner(theme, 'Loading resources...')
  spinner.start()
  
  let resources
  try {
    resources = await client.listResources()
    spinner.stop()
  } catch (error) {
    spinner.fail('Failed to load resources')
    console.error(theme.error((error as Error).message))
    await confirm('Press Enter to continue', true)
    return
  }
  
  if (resources.length === 0) {
    console.log(theme.warning('No resources available'))
    await confirm('Press Enter to continue', true)
    return
  }
  
  const resourceIndex = await select(
    theme.bold('Select resource to read:'),
    resources.map(r => `${r.name} - ${r.uri}`)
  )
  
  const resource = resources[resourceIndex]
  
  const readSpinner = new Spinner(theme, 'Reading resource...')
  readSpinner.start()
  
  try {
    const content = await client.readResource(resource.uri)
    readSpinner.succeed('Resource loaded')
    
    console.log()
    console.log(theme.bold(`Resource: ${resource.name}`))
    const box = new Box(theme)
    box.draw(JSON.stringify(content, null, 2))
  } catch (error) {
    readSpinner.fail('Failed to read resource')
    console.error(theme.error((error as Error).message))
  }
  
  console.log()
  await confirm('Press Enter to continue', true)
}

async function serverStatus(client: IMCPClient, serverName: string): Promise<void> {
  clearScreen()
  console.log(theme.bold('Server Status'))
  console.log()
  
  const spinner = new Spinner(theme, 'Checking server status...')
  spinner.start()
  
  try {
    const [tools, resources] = await Promise.all([
      client.listTools(),
      client.listResources(),
    ])
    
    spinner.succeed('Server is healthy')
    
    console.log()
    const rows = [
      ['Server Name', serverName],
      ['Status', theme.success('Connected')],
      ['Available Tools', String(tools.length)],
      ['Available Resources', String(resources.length)],
      ['Protocol Version', '2024-11-05'],
    ]
    
    table(['Property', 'Value'], rows, theme)
  } catch (error) {
    spinner.fail('Server check failed')
    console.error(theme.error((error as Error).message))
  }
  
  console.log()
  await confirm('Press Enter to continue', true)
}

async function main() {
  try {
    // Show welcome screen
    await showWelcome()
    
    // Load configuration
    const config = await loadConfig()
    
    // Select server
    const serverName = await selectServer(config)
    const serverConfig = config.mcpServers[serverName]
    
    // Connect to server
    const client = await connectToServer(serverName, serverConfig)
    
    // Show main menu
    await mainMenu(client, serverName)
  } catch (error) {
    console.error(theme.error('\n✖ Fatal error:'))
    console.error(theme.error((error as Error).message))
    process.exit(1)
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(theme.dim('\n\nGoodbye! 👋'))
  process.exit(0)
})

main()

