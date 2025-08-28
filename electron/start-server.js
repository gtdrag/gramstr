#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Simple server starter that works in production
const startServer = () => {
  const nextPath = require.resolve('next/dist/bin/next');
  const cwd = path.join(__dirname, '..');
  
  const server = spawn(process.execPath, [nextPath, 'start'], {
    cwd,
    env: {
      ...process.env,
      PORT: '3000',
      NODE_ENV: 'production'
    },
    stdio: 'inherit'
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  
  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;