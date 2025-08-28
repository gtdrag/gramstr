#!/usr/bin/env node
// Production Next.js starter for Electron
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';

// Change to app directory
const appDir = path.join(__dirname, '..');
process.chdir(appDir);

console.log('Starting Next.js server in production mode...');
console.log('Working directory:', process.cwd());
console.log('Port:', process.env.PORT);

// Start Next.js CLI
process.argv = [
  process.argv[0],
  'next',
  'start'
];

// Run Next.js CLI directly
try {
  require(path.join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next'));
} catch (error) {
  console.error('Failed to start Next.js:', error);
  process.exit(1);
}