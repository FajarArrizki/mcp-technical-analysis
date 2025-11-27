/**
 * Logging Utilities
 * log, logSection functions
 */
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};
export function log(message, color = 'reset') {
    const colorCode = colors[color] || colors.reset;
    console.log(`${colorCode}${message}${colors.reset}`);
}
export function logSection(title) {
    log('\n' + '='.repeat(70), 'cyan');
    log(title, 'cyan');
    log('='.repeat(70), 'cyan');
}
