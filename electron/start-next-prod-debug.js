#!/usr/bin/env node
// Production Next.js starter with debug logging
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Setup logging
const logFile = path.join(process.env.HOME || '/tmp', 'gramstr-next-debug.log');
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFile, logMsg);
};

log('=== STARTING NEXT.JS DEBUG ===');
log(`Process: ${process.pid}`);
log(`Node version: ${process.version}`);
log(`Script location: ${__filename}`);
log(`Current dir: ${process.cwd()}`);

// Change to app directory
const appDir = path.join(__dirname, '..');
try {
  process.chdir(appDir);
  log(`Changed to directory: ${process.cwd()}`);
} catch (err) {
  log(`ERROR changing directory: ${err.message}`);
}

// Check if Next.js exists
const nextPath = path.join(appDir, 'node_modules', 'next');
log(`Checking Next.js at: ${nextPath}`);
log(`Next.js exists: ${fs.existsSync(nextPath)}`);

// Check if .next build exists
const nextBuildPath = path.join(appDir, '.next');
log(`Checking .next build at: ${nextBuildPath}`);
log(`Build exists: ${fs.existsSync(nextBuildPath)}`);

// Check environment files
const envLocal = path.join(appDir, '.env.local');
const envProd = path.join(appDir, '.env.production');
log(`Env.local exists: ${fs.existsSync(envLocal)}`);
log(`Env.production exists: ${fs.existsSync(envProd)}`);

// Try to start Next.js
try {
  log('Attempting to load Next.js module...');
  const next = require('next');
  log('Next.js module loaded successfully');
  
  const dev = false;
  const hostname = 'localhost';
  const port = parseInt(process.env.PORT || '3000', 10);
  
  log(`Creating Next.js app instance...`);
  const app = next({ 
    dev,
    dir: appDir
  });
  
  const { createServer } = require('http');
  const { parse } = require('url');
  const handle = app.getRequestHandler();
  
  log('Preparing Next.js app...');
  app.prepare().then(() => {
    log('Next.js app prepared, creating server...');
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        log(`Request error: ${err.message}`);
        res.statusCode = 500;
        res.end('internal server error');
      }
    }).listen(port, (err) => {
      if (err) {
        log(`Listen error: ${err.message}`);
        throw err;
      }
      log(`SUCCESS: Server listening on http://${hostname}:${port}`);
      console.log(`> Listening on http://${hostname}:${port}`);
    });
  }).catch((err) => {
    log(`ERROR preparing Next.js: ${err.message}`);
    log(`Stack trace: ${err.stack}`);
    process.exit(1);
  });
} catch (err) {
  log(`FATAL ERROR: ${err.message}`);
  log(`Stack trace: ${err.stack}`);
  process.exit(1);
}

// Keep process alive
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  process.exit(0);
});