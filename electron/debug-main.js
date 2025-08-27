const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('=== ELECTRON DEBUG MODE ===');
console.log('Node version:', process.versions.node);
console.log('Electron version:', process.versions.electron);
console.log('Chrome version:', process.versions.chrome);

let mainWindow = null;
let crashCount = 0;

// Log every important event
app.on('ready', () => {
  console.log('[EVENT] App ready');
  createWindow();
});

app.on('before-quit', (event) => {
  console.log('[EVENT] Before quit');
});

app.on('will-quit', (event) => {
  console.log('[EVENT] Will quit');
});

app.on('window-all-closed', () => {
  console.log('[EVENT] All windows closed');
  app.quit();
});

app.on('gpu-process-crashed', (event, killed) => {
  console.error('[CRASH] GPU process crashed. Killed:', killed);
});

app.on('render-process-gone', (event, webContents, details) => {
  console.error('[CRASH] Render process gone:', details);
});

function createWindow() {
  console.log('[WINDOW] Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Disable some features that might cause crashes
      webgl: false,
      experimentalFeatures: false,
      plugins: false
    },
    show: false
  });

  // Track all window events
  mainWindow.once('ready-to-show', () => {
    console.log('[WINDOW] Ready to show');
    mainWindow.show();
    console.log('[WINDOW] Window shown');
  });

  mainWindow.on('show', () => {
    console.log('[WINDOW] Show event');
  });

  mainWindow.on('closed', () => {
    console.log('[WINDOW] Closed');
    mainWindow = null;
  });

  mainWindow.on('unresponsive', () => {
    console.error('[WINDOW] Became unresponsive!');
  });

  mainWindow.on('responsive', () => {
    console.log('[WINDOW] Became responsive');
  });

  // Track webContents events
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('[CONTENT] Started loading');
  });

  mainWindow.webContents.on('did-stop-loading', () => {
    console.log('[CONTENT] Stopped loading');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[CONTENT] Finished loading');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[CONTENT] Failed to load:', errorDescription, 'Code:', errorCode, 'URL:', validatedURL);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    crashCount++;
    console.error(`[CRASH] WebContents crashed! (crash #${crashCount}) Killed:`, killed);
    
    // Try to recover
    if (crashCount < 3) {
      console.log('[RECOVERY] Attempting to reload...');
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, 1000);
    } else {
      console.error('[CRASH] Too many crashes, giving up');
    }
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[CRASH] Render process gone! Reason:', details.reason, 'Exit code:', details.exitCode);
    
    if (details.reason === 'crashed') {
      console.error('[CRASH] Process crashed with exit code:', details.exitCode);
    } else if (details.reason === 'killed') {
      console.error('[CRASH] Process was killed');
    } else if (details.reason === 'oom') {
      console.error('[CRASH] Out of memory!');
    }
  });

  mainWindow.webContents.on('destroyed', () => {
    console.log('[CONTENT] WebContents destroyed');
  });

  // Load simple content first
  console.log('[WINDOW] Loading test content...');
  mainWindow.loadURL('http://localhost:3000').catch((err) => {
    console.error('[ERROR] Failed to load localhost:3000:', err.message);
    // Fall back to simple HTML
    mainWindow.loadURL('data:text/html,<h1>Electron is running but cannot connect to localhost:3000</h1>');
  });
}

// Catch all errors
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled rejection:', reason);
});

// Keep alive logging
setInterval(() => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    console.log(`[HEARTBEAT] Window alive at ${new Date().toISOString()} - Size: ${bounds.width}x${bounds.height}`);
  } else {
    console.log(`[HEARTBEAT] No window at ${new Date().toISOString()}`);
  }
}, 5000);