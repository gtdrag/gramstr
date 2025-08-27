const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Electron settings for stability
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-dev-shm-usage');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow = null;

function createWindow() {
  // Create browser window with stable settings
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    },
    backgroundColor: '#000000',
    show: false
  });

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Set up basic menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'App',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  // Load app - assumes Next.js is already running on port 3000
  mainWindow.loadURL('http://localhost:3000').catch((err) => {
    console.error('Failed to load app:', err);
    // Retry once after delay
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000').catch((err) => {
        console.error('Retry failed:', err);
      });
    }, 2000);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Basic error recovery
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process crashed:', details);
    if (details.reason === 'crashed' && !mainWindow.isDestroyed()) {
      console.log('Attempting recovery...');
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, 1000);
    }
  });
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App events
  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});