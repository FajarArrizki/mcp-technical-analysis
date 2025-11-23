/**
 * Runner for Signal Generation
 * Execute: npx tsx src/run-signal-generation.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env file from project root manually
// IMPORTANT: Don't override environment variables already set in shell (they have priority)
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      const envKey = key.trim()
      const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
      // Only set if not already in environment (shell/env variables have priority)
      if (envKey && value && !process.env[envKey]) {
        process.env[envKey] = value.trim()
      }
    }
  })
}

import { main } from './signal-generation/main'

// Run main function
main().catch((error: any) => {
  console.error(`\n❌ Fatal error: ${error.message}`)
  if (error.stack) {
    console.error(`\nStack trace:\n${error.stack}`)
  }
  process.exit(1)
})

