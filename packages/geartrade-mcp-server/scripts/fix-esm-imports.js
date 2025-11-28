#!/usr/bin/env node
/**
 * Post-build script to add .js extensions to relative imports in dist/
 * Required for Node.js ESM compatibility
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

function resolveImportPath(importPath, fromFile) {
  const fromDir = dirname(fromFile);
  const absolutePath = resolve(fromDir, importPath);
  
  // Check if it's a directory with index.js
  if (existsSync(absolutePath) && statSync(absolutePath).isDirectory()) {
    if (existsSync(join(absolutePath, 'index.js'))) {
      return importPath + '/index.js';
    }
  }
  
  // Check if adding .js makes it a valid file
  if (existsSync(absolutePath + '.js')) {
    return importPath + '.js';
  }
  
  // Default to adding .js
  return importPath + '.js';
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Match relative imports: from './...' or from '../...'
  const importRegex = /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g;
  
  content = content.replace(importRegex, (match, prefix, path, suffix) => {
    // Don't modify if it already has an extension
    if (path.endsWith('.js') || path.endsWith('.json') || path.endsWith('.mjs')) {
      return match;
    }
    const newPath = resolveImportPath(path, filePath);
    if (newPath !== path) {
      modified = true;
      return `${prefix}${newPath}${suffix}`;
    }
    return match;
  });

  // Also handle dynamic imports: import('./...')
  const dynamicImportRegex = /(import\s*\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g;
  
  content = content.replace(dynamicImportRegex, (match, prefix, path, suffix) => {
    if (path.endsWith('.js') || path.endsWith('.json') || path.endsWith('.mjs')) {
      return match;
    }
    const newPath = resolveImportPath(path, filePath);
    if (newPath !== path) {
      modified = true;
      return `${prefix}${newPath}${suffix}`;
    }
    return match;
  });

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  }
}

function processDirectory(dir) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

console.log('Adding .js extensions to ESM imports in dist/...');
processDirectory(distDir);
console.log('Done!');
