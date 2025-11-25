/**
 * Terminal UI Components - GearTrade Edition
 * Standalone UI with Gear-themed ASCII art
 */

import * as readline from 'readline'

export interface Theme {
  primary: (text: string) => string
  success: (text: string) => string
  error: (text: string) => string
  warning: (text: string) => string
  info: (text: string) => string
  dim: (text: string) => string
  bold: (text: string) => string
  accent: (text: string) => string
}

// ANSI color codes - works everywhere
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
}

export function createTheme(): Theme {
  return {
    primary: (text) => `${colors.cyan}${text}${colors.reset}`,
    success: (text) => `${colors.green}${text}${colors.reset}`,
    error: (text) => `${colors.red}${text}${colors.reset}`,
    warning: (text) => `${colors.yellow}${text}${colors.reset}`,
    info: (text) => `${colors.blue}${text}${colors.reset}`,
    dim: (text) => `${colors.dim}${text}${colors.reset}`,
    bold: (text) => `${colors.bright}${text}${colors.reset}`,
    accent: (text) => `${colors.magenta}${text}${colors.reset}`,
  }
}

export function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f')
}

export function hideCursor() {
  process.stdout.write('\x1b[?25l')
}

export function showCursor() {
  process.stdout.write('\x1b[?25h')
}

export function moveCursor(x: number, y: number) {
  process.stdout.write(`\x1b[${y};${x}H`)
}

export class Banner {
  private theme: Theme

  constructor(theme: Theme) {
    this.theme = theme
  }

  draw() {
    // Gear ASCII Art Logo
    const gearArt = `
                        ${this.theme.dim('╭───────────────────────────────────────────╮')}
                        ${this.theme.dim('│')}                                           ${this.theme.dim('│')}
      ${this.theme.primary('    ▄▄▄  ')}          ${this.theme.dim('│')}   ${this.theme.bold(this.theme.primary('G E A R T R A D E'))}              ${this.theme.dim('│')}
     ${this.theme.primary('▄█████████▄')}         ${this.theme.dim('│')}                                           ${this.theme.dim('│')}
    ${this.theme.primary('███')}${this.theme.dim('░░░░░')}${this.theme.primary('███')}        ${this.theme.dim('│')}   ${this.theme.dim('AI-Powered Trading Terminal')}          ${this.theme.dim('│')}
   ${this.theme.primary('███')}${this.theme.dim('░')}${this.theme.accent('▓▓▓▓▓')}${this.theme.dim('░')}${this.theme.primary('███')}       ${this.theme.dim('│')}   ${this.theme.dim('Model Context Protocol Server')}         ${this.theme.dim('│')}
   ${this.theme.primary('███')}${this.theme.dim('░')}${this.theme.accent('▓███▓')}${this.theme.dim('░')}${this.theme.primary('███')}       ${this.theme.dim('│')}                                           ${this.theme.dim('│')}
   ${this.theme.primary('███')}${this.theme.dim('░')}${this.theme.accent('▓▓▓▓▓')}${this.theme.dim('░')}${this.theme.primary('███')}       ${this.theme.dim('╰───────────────────────────────────────────╯')}
    ${this.theme.primary('███')}${this.theme.dim('░░░░░')}${this.theme.primary('███')}
     ${this.theme.primary('▀█████████▀')}         ${this.theme.success('⚙')} ${this.theme.dim('Tools:')} ${this.theme.primary('36')}  ${this.theme.success('⚙')} ${this.theme.dim('Resources:')} ${this.theme.primary('25')}  ${this.theme.success('⚙')} ${this.theme.dim('Prompts:')} ${this.theme.primary('23')}
      ${this.theme.primary('    ▀▀▀  ')}
`
    console.log(gearArt)
  }

  drawMini() {
    const miniGear = `
  ${this.theme.primary('⚙')}${this.theme.dim('─')}${this.theme.primary('⚙')}  ${this.theme.bold('GearTrade')} ${this.theme.dim('v1.0.0')}
`
    console.log(miniGear)
  }
}

export class Menu {
  private theme: Theme
  private selectedIndex: number = 0
  private options: string[]

  constructor(theme: Theme, options: string[]) {
    this.theme = theme
    this.options = options
  }

  draw(title?: string) {
    if (title) {
      console.log(this.theme.bold(title))
      console.log()
    }

    this.options.forEach((option, index) => {
      const prefix = index === this.selectedIndex 
        ? this.theme.primary('⚙ ❯') 
        : this.theme.dim('  ○')
      const text = index === this.selectedIndex 
        ? this.theme.primary(this.theme.bold(option))
        : this.theme.dim(option)
      console.log(`${prefix} ${text}`)
    })
  }

  select(index: number) {
    this.selectedIndex = Math.max(0, Math.min(index, this.options.length - 1))
  }

  getSelected(): number {
    return this.selectedIndex
  }
}

export class Box {
  private theme: Theme

  constructor(theme: Theme) {
    this.theme = theme
  }

  draw(content: string, width: number = 76) {
    const topLine = '═'.repeat(width)
    const bottomLine = '═'.repeat(width)
    console.log(this.theme.dim(`╔${topLine}╗`))
    content.split('\n').forEach(line => {
      const padding = width - line.replace(/\x1b\[[0-9;]*m/g, '').length
      console.log(this.theme.dim('║') + ` ${line}${' '.repeat(Math.max(0, padding - 1))}` + this.theme.dim('║'))
    })
    console.log(this.theme.dim(`╚${bottomLine}╝`))
  }

  drawSimple(content: string, width: number = 76) {
    const line = '─'.repeat(width)
    console.log(this.theme.dim(`┌${line}┐`))
    content.split('\n').forEach(line => {
      console.log(this.theme.dim('│') + ` ${line}`)
    })
    console.log(this.theme.dim(`└${line}┘`))
  }
}

export class Spinner {
  private theme: Theme
  // Gear-themed spinner frames
  private frames = ['⚙', '⚙', '⚙', '⚙', '⚙', '⚙', '⚙', '⚙']
  private rotations = ['◐', '◓', '◑', '◒']
  private currentFrame = 0
  private interval?: NodeJS.Timeout
  private text: string

  constructor(theme: Theme, text: string) {
    this.theme = theme
    this.text = text
  }

  start() {
    hideCursor()
    this.interval = setInterval(() => {
      const gear = this.theme.primary('⚙')
      const rotation = this.rotations[this.currentFrame % this.rotations.length]
      process.stdout.write(`\r${gear} ${this.theme.dim(rotation)} ${this.text}`)
      this.currentFrame = (this.currentFrame + 1) % this.rotations.length
    }, 150)
  }

  stop(message?: string) {
    if (this.interval) {
      clearInterval(this.interval)
      process.stdout.write('\r\x1b[K') // Clear line
      if (message) {
        console.log(message)
      }
      showCursor()
    }
  }

  succeed(message: string) {
    this.stop(`${this.theme.success('⚙ ✔')} ${message}`)
  }

  fail(message: string) {
    this.stop(`${this.theme.error('⚙ ✖')} ${message}`)
  }
}

export class ProgressBar {
  private theme: Theme
  private total: number
  private current: number = 0
  private label: string

  constructor(theme: Theme, total: number, label: string = '') {
    this.theme = theme
    this.total = total
    this.label = label
  }

  update(current: number, label?: string) {
    this.current = current
    if (label) this.label = label
    this.draw()
  }

  private draw() {
    const width = 30
    const percentage = Math.min(100, Math.floor((this.current / this.total) * 100))
    const filled = Math.floor((percentage / 100) * width)
    const empty = width - filled
    
    // Gear-themed progress bar
    const filledBar = this.theme.primary('█'.repeat(filled))
    const emptyBar = this.theme.dim('░'.repeat(empty))
    const gear = this.theme.primary('⚙')
    const text = this.label ? ` ${this.label}` : ''
    
    process.stdout.write(`\r${gear} [${filledBar}${emptyBar}] ${percentage}%${text}`)
    
    if (this.current >= this.total) {
      console.log()
    }
  }

  complete(message?: string) {
    this.update(this.total, message)
  }
}

export class Header {
  private theme: Theme

  constructor(theme: Theme) {
    this.theme = theme
  }

  draw(version: string, serverName: string, path: string) {
    const gearLogo = `
  ${this.theme.primary('╔═══════════════════════════════════════════════════════════════════════════╗')}
  ${this.theme.primary('║')}  ${this.theme.bold(this.theme.primary('⚙'))}  ${this.theme.bold('GearTrade Terminal')} ${this.theme.dim(`v${version}`)}                                          ${this.theme.primary('║')}
  ${this.theme.primary('║')}      ${this.theme.dim('Server:')} ${this.theme.success(serverName)} ${this.theme.dim('·')} ${this.theme.dim('MCP Protocol')}                              ${this.theme.primary('║')}
  ${this.theme.primary('║')}      ${this.theme.dim('Path:')} ${this.theme.dim(path.substring(0, 50))}                              ${this.theme.primary('║')}
  ${this.theme.primary('╚═══════════════════════════════════════════════════════════════════════════╝')}
`
    console.log(gearLogo)
  }

  drawCompact(version: string, serverName: string) {
    console.log(`  ${this.theme.primary('⚙')} ${this.theme.bold('GearTrade')} ${this.theme.dim(`v${version}`)} · ${this.theme.success(serverName)}`)
    console.log(this.theme.dim('  ─'.repeat(38)))
  }
}

export class Divider {
  private theme: Theme

  constructor(theme: Theme) {
    this.theme = theme
  }

  draw(style: 'gear' | 'line' | 'dots' = 'gear') {
    switch (style) {
      case 'gear':
        console.log(this.theme.dim('  ─────') + this.theme.primary(' ⚙ ') + this.theme.dim('─────────────────────────────────────────────────────────────'))
        break
      case 'line':
        console.log(this.theme.dim('  ' + '─'.repeat(74)))
        break
      case 'dots':
        console.log(this.theme.dim('  ' + '·'.repeat(74)))
        break
    }
  }
}

export function prompt(message: string, defaultValue?: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const theme = createTheme()
    const width = 80
    const line = '─'.repeat(width)
    
    // Draw input box like Claude Code
    console.log(theme.dim(line))
    console.log(theme.primary('>') + ' ' + message + (defaultValue ? theme.dim(` (${defaultValue})`) : ''))
    console.log(theme.dim(line))
    
    const inputPrompt = theme.dim('  ⏵⏵ ') 
    
    rl.question(inputPrompt, (answer: string) => {
      rl.close()
      resolve(answer.trim() || defaultValue || '')
    })
  })
}

export function confirm(message: string, defaultValue: boolean = true): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const theme = createTheme()
    const width = 80
    const line = '─'.repeat(width)
    
    // Draw confirm box like Claude Code
    console.log(theme.dim(line))
    const suffix = defaultValue 
      ? `${theme.dim('[')}${theme.success('Y')}${theme.dim('/n]')}` 
      : `${theme.dim('[y/')}${theme.error('N')}${theme.dim(']')}`
    console.log(theme.primary('>') + ' ' + message + ' ' + suffix)
    console.log(theme.dim(line))
    
    const inputPrompt = theme.dim('  ⏵⏵ ')
    
    rl.question(inputPrompt, (answer: string) => {
      rl.close()
      const normalized = answer.trim().toLowerCase()
      if (!normalized) {
        resolve(defaultValue)
      } else {
        resolve(normalized === 'y' || normalized === 'yes')
      }
    })
  })
}

export function select(message: string, choices: string[]): Promise<number> {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin)
    
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }

    let selectedIndex = 0
    const theme = createTheme()
    const width = 80
    const line = '─'.repeat(width)
    
    function render() {
      clearScreen()
      
      // Claude Code style header
      console.log()
      console.log(theme.dim(line))
      console.log(theme.primary('>') + ' ' + theme.bold(message))
      console.log(theme.dim(line))
      console.log()
      
      choices.forEach((choice, index) => {
        const isSelected = index === selectedIndex
        const prefix = isSelected 
          ? theme.primary('  ⚙ ❯') 
          : theme.dim('    ○')
        const text = isSelected 
          ? theme.primary(theme.bold(choice))
          : theme.dim(choice)
        console.log(`${prefix} ${text}`)
      })
      
      console.log()
      console.log(theme.dim(line))
      console.log(theme.dim('  ⏵⏵ ↑↓ navigate · enter confirm · esc cancel'))
    }

    render()

    const onKeypress = (str: string, key: any) => {
      if (key.name === 'up') {
        selectedIndex = Math.max(0, selectedIndex - 1)
        render()
      } else if (key.name === 'down') {
        selectedIndex = Math.min(choices.length - 1, selectedIndex + 1)
        render()
      } else if (key.name === 'return') {
        cleanup()
        resolve(selectedIndex)
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup()
        process.exit(0)
      } else if (str >= '1' && str <= String(choices.length)) {
        selectedIndex = parseInt(str) - 1
        render()
      }
    }

    function cleanup() {
      process.stdin.off('keypress', onKeypress)
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }
      clearScreen()
    }

    process.stdin.on('keypress', onKeypress)
  })
}

export function table(headers: string[], rows: string[][], theme: Theme) {
  const columnWidths = headers.map((header, i) => {
    const maxRowWidth = Math.max(...rows.map(row => (row[i] || '').replace(/\x1b\[[0-9;]*m/g, '').length))
    return Math.max(header.length, maxRowWidth) + 2
  })

  const separator = columnWidths.map(w => '─'.repeat(w)).join('┼')
  
  // Gear-themed table header
  console.log(theme.primary('  ⚙') + theme.dim(' ┌' + separator.replace(/┼/g, '┬') + '┐'))
  
  const headerRow = headers
    .map((h, i) => theme.bold(h.padEnd(columnWidths[i])))
    .join(theme.dim('│'))
  
  console.log(theme.dim('    │') + headerRow + theme.dim('│'))
  console.log(theme.dim('    ├' + separator + '┤'))
  
  // Rows
  rows.forEach((row, index) => {
    const rowText = row
      .map((cell, i) => (cell || '').padEnd(columnWidths[i]))
      .join(theme.dim('│'))
    console.log(theme.dim('    │') + rowText + theme.dim('│'))
    
    if (index < rows.length - 1) {
      console.log(theme.dim('    ├' + separator + '┤'))
    }
  })
  
  console.log(theme.dim('    └' + separator.replace(/┼/g, '┴') + '┘'))
}

// Gear animation for loading
export function gearAnimation(duration: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    const theme = createTheme()
    const frames = ['◜', '◠', '◝', '◞', '◡', '◟']
    let i = 0
    
    hideCursor()
    
    const interval = setInterval(() => {
      const frame = frames[i % frames.length]
      process.stdout.write(`\r  ${theme.primary('⚙')} ${theme.dim(frame)} Loading...`)
      i++
    }, 100)
    
    setTimeout(() => {
      clearInterval(interval)
      process.stdout.write('\r\x1b[K')
      showCursor()
      resolve()
    }, duration)
  })
}

// Welcome message with gear theme
export function welcomeMessage(): string {
  const theme = createTheme()
  return `
${theme.dim('╔══════════════════════════════════════════════════════════════════════════╗')}
${theme.dim('║')}                                                                          ${theme.dim('║')}
${theme.dim('║')}   ${theme.warning('⚠ Security Notes:')}                                                      ${theme.dim('║')}
${theme.dim('║')}                                                                          ${theme.dim('║')}
${theme.dim('║')}   ${theme.dim('•')} Always review tool execution results before acting                   ${theme.dim('║')}
${theme.dim('║')}   ${theme.dim('•')} MCP servers can execute code and make network requests               ${theme.dim('║')}
${theme.dim('║')}   ${theme.dim('•')} Only use with trusted server configurations                          ${theme.dim('║')}
${theme.dim('║')}   ${theme.dim('•')} Paper trading is recommended for testing strategies                  ${theme.dim('║')}
${theme.dim('║')}                                                                          ${theme.dim('║')}
${theme.dim('║')}   ${theme.dim('For more details:')} ${theme.primary('https://github.com/FajarArrizki/ai-trading-mcp-server')}   ${theme.dim('║')}
${theme.dim('║')}                                                                          ${theme.dim('║')}
${theme.dim('╚══════════════════════════════════════════════════════════════════════════╝')}
`
}

// Input field class - Claude Code style
export class InputField {
  private theme: Theme
  private width: number

  constructor(theme: Theme, width: number = 80) {
    this.theme = theme
    this.width = width
  }

  drawHeader(title: string, subtitle?: string) {
    const line = '─'.repeat(this.width)
    console.log()
    console.log(this.theme.dim(line))
    console.log(this.theme.primary('>') + ' ' + this.theme.bold(title))
    if (subtitle) {
      console.log(this.theme.dim('  ' + subtitle))
    }
    console.log(this.theme.dim(line))
  }

  drawFooter(hints: string[] = []) {
    const line = '─'.repeat(this.width)
    console.log(this.theme.dim(line))
    if (hints.length > 0) {
      console.log(this.theme.dim('  ⏵⏵ ' + hints.join(' · ')))
    }
  }

  getPrompt(): string {
    return this.theme.dim('  ⏵⏵ ')
  }
}

// Main menu with Claude Code style input
export function drawMainMenu(serverName: string, version: string = '1.0.0') {
  const theme = createTheme()
  const width = 80
  const line = '─'.repeat(width)
  
  console.log()
  console.log(`  ${theme.primary('⚙')} ${theme.bold('GearTrade Terminal')} ${theme.dim(`v${version}`)} · ${theme.success(serverName)}`)
  console.log()
  console.log(theme.dim(line))
  console.log(theme.primary('>') + ' ' + theme.dim('What would you like to do?'))
  console.log(theme.dim(line))
}

// Status bar at bottom
export function drawStatusBar(status: string, hints: string[] = []) {
  const theme = createTheme()
  const width = 80
  const line = '─'.repeat(width)
  
  console.log()
  console.log(theme.dim(line))
  console.log(theme.dim('  ⏵⏵ ' + hints.join(' · ')) + theme.dim(' │ ') + theme.dim(status))
}
