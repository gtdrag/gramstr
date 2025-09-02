#!/usr/bin/env node
// Production Next.js starter using the programmatic API
const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

// Change to app directory first
const appDir = path.join(__dirname, '..');
process.chdir(appDir);

console.log('Starting Next.js server using API...');
console.log('Working directory:', process.cwd());

// Import Next.js after changing directory
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ 
  dev,
  dir: appDir
});

const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Listening on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});