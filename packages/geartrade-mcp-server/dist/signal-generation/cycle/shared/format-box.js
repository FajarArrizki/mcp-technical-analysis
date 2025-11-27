/**
 * Format Box Utility
 * Create consistent box-formatted output for tracking information
 * Format matches signal formatting style
 */
const tableWidth = 72;
const labelWidth = 16;
const valueWidth = tableWidth - labelWidth - 4;
function padText(text, width) {
    const str = String(text || '');
    if (str.length > width) {
        return str.substring(0, width - 3) + '...';
    }
    return str.padEnd(width);
}
function fullWidthRow(text, color = 'cyan') {
    const cleanText = String(text || '').trim();
    if (!cleanText)
        return '';
    const availableWidth = tableWidth - 4;
    const words = cleanText.split(' ');
    let currentLine = '';
    let result = '';
    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (testLine.length <= availableWidth) {
            currentLine = testLine;
        }
        else {
            if (currentLine) {
                const colorCode = color === 'cyan' ? '\x1b[36m' : color === 'green' ? '\x1b[32m' : color === 'red' ? '\x1b[31m' : color === 'yellow' ? '\x1b[33m' : '';
                result += `${colorCode}│ ${currentLine.padEnd(availableWidth)} │\x1b[0m\n`;
            }
            if (word.length > availableWidth) {
                let remaining = word;
                while (remaining.length > availableWidth) {
                    const colorCode = color === 'cyan' ? '\x1b[36m' : color === 'green' ? '\x1b[32m' : color === 'red' ? '\x1b[31m' : color === 'yellow' ? '\x1b[33m' : '';
                    result += `${colorCode}│ ${remaining.substring(0, availableWidth)} │\x1b[0m\n`;
                    remaining = remaining.substring(availableWidth);
                }
                currentLine = remaining;
            }
            else {
                currentLine = word;
            }
        }
    }
    if (currentLine) {
        const colorCode = color === 'cyan' ? '\x1b[36m' : color === 'green' ? '\x1b[32m' : color === 'red' ? '\x1b[31m' : color === 'yellow' ? '\x1b[33m' : '';
        result += `${colorCode}│ ${currentLine.padEnd(availableWidth)} │\x1b[0m\n`;
    }
    return result;
}
function tableRow(label, value, valueColor) {
    const labelPart = padText(label, labelWidth);
    const valuePart = padText(value, valueWidth);
    if (valueColor) {
        const colorCodes = {
            green: '\x1b[32m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            cyan: '\x1b[36m'
        };
        const colorCode = colorCodes[valueColor] || '';
        return `\x1b[36m│ ${labelPart}│\x1b[0m ${colorCode}${valuePart}\x1b[0m\x1b[36m │\x1b[0m\n`;
    }
    return `\x1b[36m│ ${labelPart}│ ${valuePart} │\x1b[0m\n`;
}
export function createSection(title, content) {
    const topBorder = '\x1b[36m┌' + '─'.repeat(tableWidth - 2) + '┐\x1b[0m\n';
    const titleRow = `\x1b[1m│ ${padText(title, tableWidth - 4)} │\x1b[0m\n`;
    const separator = '\x1b[36m├' + '─'.repeat(tableWidth - 2) + '┤\x1b[0m\n';
    const bottomBorder = '\x1b[36m└' + '─'.repeat(tableWidth - 2) + '┘\x1b[0m';
    let result = topBorder + titleRow + separator;
    if (Array.isArray(content)) {
        for (const line of content) {
            if (typeof line === 'string') {
                // Check if it's already formatted (contains │ and color codes)
                if (line.includes('│')) {
                    result += line + (line.endsWith('\n') ? '' : '\n');
                }
                else if (line.trim() === '') {
                    // Empty line - add separator or skip
                    result += '\x1b[36m│'.padEnd(tableWidth - 1) + '│\x1b[0m\n';
                }
                else {
                    // Regular text - wrap if needed
                    result += fullWidthRow(line, 'cyan');
                }
            }
        }
    }
    else if (typeof content === 'string') {
        // String content - check if already formatted
        if (content.includes('│')) {
            result += content + (content.endsWith('\n') ? '' : '\n');
        }
        else {
            result += fullWidthRow(content, 'cyan');
        }
    }
    result += bottomBorder;
    return result;
}
export function formatKeyValue(key, value, valueColor) {
    return tableRow(key, value, valueColor);
}
