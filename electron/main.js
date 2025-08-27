const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Stability settings for macOS
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

const isDev = process.env.NODE_ENV !== 'production' || process.env.ELECTRON_IS_DEV === '1';

let mainWindow = null;
let pythonServer = null;
let nextServer = null;

// Start Python backend
function startPythonBackend() {
  try {
    const scriptPath = path.join(__dirname, '..', 'backend', 'main.py');
    pythonServer = spawn('python', [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });
    
    pythonServer.stdout.on('data', (data) => {
      console.log(`Python: ${data.toString().trim()}`);
    });
    
    pythonServer.stderr.on('data', (data) => {
      const output = data.toString().trim();
      // Filter out non-error messages
      if (!output.includes('INFO:') && !output.includes('WARNING:')) {
        console.error(`Python Error: ${output}`);
      }
    });
  } catch (error) {
    console.error('Python backend error:', error);
  }
}

// Start Next.js in development
function startNextDev(callback) {
  if (!isDev) {
    if (callback) callback();
    return;
  }

  console.log('Starting Next.js dev server...');
  nextServer = spawn('npm', ['run', 'dev'], {
    shell: true,
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

  let ready = false;
  nextServer.stdout.on('data', (data) => {
    const output = data.toString();
    if (!ready && (output.includes('Ready') || output.includes('started server'))) {
      ready = true;
      console.log('Next.js is ready');
      if (callback) setTimeout(callback, 2000);
    }
  });

  nextServer.stderr.on('data', (data) => {
    console.error(`Next.js: ${data}`);
  });
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,  // Changed to false to allow preload script to work
      preload: path.join(__dirname, 'preload.js'),
      // Allow loading extensions in dev mode
      webSecurity: isDev ? false : true
    },
    backgroundColor: '#000000',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  const loadApp = () => {
    const appUrl = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../out/index.html')}`;
    mainWindow.loadURL(appUrl).catch((err) => {
      console.error('Failed to load:', err);
      setTimeout(() => mainWindow.reload(), 3000);
    });
  };

  if (isDev) {
    // In dev, wait a bit for server
    setTimeout(loadApp, 3000);
  } else {
    loadApp();
  }

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Crash recovery
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    if (details.reason === 'crashed') {
      console.error('Renderer crashed, reloading...');
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.reload();
        }
      }, 1000);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Menu
function createMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open in Web Browser (for Alby)',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => {
            shell.openExternal('http://localhost:3000');
          }
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single instance
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
}

// App events
app.whenReady().then(() => {
  startPythonBackend();
  
  if (isDev) {
    // Check if Next.js is already running
    const http = require('http');
    http.get('http://localhost:3000', () => {
      console.log('Next.js already running');
      createWindow();
      createMenu();
    }).on('error', () => {
      // Start Next.js then create window
      startNextDev(() => {
        createWindow();
        createMenu();
      });
    });
  } else {
    createWindow();
    createMenu();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) nextServer.kill();
  if (pythonServer) pythonServer.kill();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup
app.on('before-quit', () => {
  if (nextServer) nextServer.kill();
  if (pythonServer) pythonServer.kill();
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled:', reason);
});