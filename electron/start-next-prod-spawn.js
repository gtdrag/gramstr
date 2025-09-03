#!/usr/bin/env node
// Production Next.js starter for Electron - using spawn method
const { spawn } = require('child_process');
const path = require('path');

// Set up environment
const port = process.env.PORT || '3000';

// Change to app directory
const appDir = path.join(__dirname, '..');

console.log('Starting Next.js server in production mode...');
console.log('Working directory:', appDir);
console.log('Port:', port);

// Find the next executable
const nextBin = path.join(appDir, 'node_modules', '.bin', 'next');

// Spawn Next.js server
const nextProcess = spawn(nextBin, ['start'], {
  cwd: appDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: port
  },
  stdio: 'pipe'
});

// Handle output
nextProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  if (output.includes('Listening on')) {
    console.log('Next.js server is ready!');
  }
});

nextProcess.stderr.on('data', (data) => {
  console.error('Next.js Error:', data.toString());
});

nextProcess.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code);
});

// Keep this process alive
process.on('SIGINT', () => {
  nextProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextProcess.kill();
  process.exit(0);
});