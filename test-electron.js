// Test Electron startup paths
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Log to file since console might not work
const logFile = path.join(app.getPath('userData'), 'startup-log.txt');

function log(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `${timestamp}: ${msg}\n`;
  fs.appendFileSync(logFile, logMsg);
  console.log(msg);
}

app.on('ready', () => {
  log('=== ELECTRON TEST STARTUP ===');
  log(`Platform: ${process.platform}`);
  log(`App path: ${app.getAppPath()}`);
  log(`Exe path: ${app.getPath('exe')}`);
  log(`Resources path: ${process.resourcesPath}`);
  log(`Is packaged: ${app.isPackaged}`);
  log(`__dirname: ${__dirname}`);
  
  // Check what exists
  const appPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.join(__dirname);
    
  log(`Checking appPath: ${appPath}`);
  log(`appPath exists: ${fs.existsSync(appPath)}`);
  
  if (fs.existsSync(appPath)) {
    const dirs = fs.readdirSync(appPath).filter(f => fs.statSync(path.join(appPath, f)).isDirectory());
    log(`Directories in appPath: ${dirs.join(', ')}`);
    
    // Check for critical files
    log(`.next exists: ${fs.existsSync(path.join(appPath, '.next'))}`);
    log(`node_modules exists: ${fs.existsSync(path.join(appPath, 'node_modules'))}`);
    log(`electron dir exists: ${fs.existsSync(path.join(appPath, 'electron'))}`);
    log(`package.json exists: ${fs.existsSync(path.join(appPath, 'package.json'))}`);
  }
  
  log('Log file location: ' + logFile);
  log('=== TEST COMPLETE ===');
  
  setTimeout(() => {
    app.quit();
  }, 2000);
});

app.on('window-all-closed', () => {
  app.quit();
});