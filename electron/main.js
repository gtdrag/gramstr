const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Stability settings for macOS
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

const isDev = process.env.ELECTRON_IS_DEV === '1' || (!app.isPackaged && process.env.NODE_ENV !== 'production');

// Helper to get correct path for packaged app
function getAppPath() {
  // In production, everything is unpacked due to asarUnpack: "**/*"
  if (app.isPackaged) {
    // The app files are in Resources/app.asar.unpacked
    const resourcesPath = process.resourcesPath;
    return path.join(resourcesPath, 'app.asar.unpacked');
  }
  // Development mode
  return path.join(__dirname, '..');
}

let mainWindow = null;
let pythonServer = null;
let nextServer = null;

// Start Python backend
function startPythonBackend() {
  try {
    // In production, backend is in extraResources, not in asar
    const backendPath = isDev 
      ? path.join(__dirname, '..', 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    const scriptPath = path.join(backendPath, 'main.py');
    pythonServer = spawn('python', [scriptPath], {
      cwd: backendPath,
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

// Start Next.js server
function startNextServer(callback) {
  console.log('=== STARTING NEXT.JS SERVER ===');
  console.log('isDev:', isDev);
  console.log('__dirname:', __dirname);
  
  if (isDev) {
    // Development mode - use npm run dev
    console.log('Running in DEVELOPMENT mode');
    nextServer = spawn('npm', ['run', 'dev'], {
      shell: true,
      cwd: getAppPath(),
      stdio: 'pipe'
    });
    
    let ready = false;
    nextServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Next.js:', output);
      if (!ready && (output.includes('Ready') || output.includes('started server') || output.includes('Listening on'))) {
        ready = true;
        console.log('Next.js is ready');
        if (callback) setTimeout(callback, 2000);
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });
  } else {
    // Production mode
    console.log('Running in PRODUCTION mode');
    const appPath = getAppPath();
    console.log('App path:', appPath);
    console.log('Process resource path:', process.resourcesPath);
    console.log('__dirname:', __dirname);
    console.log('app.isPackaged:', app.isPackaged);
    
    const fs = require('fs');
    
    // Check what exists
    console.log('Checking production paths:');
    console.log('- appPath exists:', fs.existsSync(appPath));
    console.log('- .next exists:', fs.existsSync(path.join(appPath, '.next')));
    console.log('- node_modules exists:', fs.existsSync(path.join(appPath, 'node_modules')));
    console.log('- electron dir:', fs.existsSync(path.join(appPath, 'electron')));
    
    // Read .env.local if it exists
    let envVars = { ...process.env, PORT: '3000', NODE_ENV: 'production' };
    const envPath = path.join(appPath, '.env.local');
    
    try {
      if (fs.existsSync(envPath)) {
        console.log('Loading environment variables...');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        });
      } else {
        // Add hardcoded env vars for production
        envVars.DATABASE_URL = 'postgresql://postgres:W5FKrYBa!7caR62@db.jrhyqcugjnddbbmbplbk.supabase.co:5432/postgres';
        envVars.NEXT_PUBLIC_SUPABASE_URL = 'https://jrhyqcugjnddbbmbplbk.supabase.co';
        envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInT5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyaHlxY3VnanRkZGJibWJwbGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5ODQxNTUsImV4cCI6MjA1MDU2MDE1NX0.lhsOAuFFOiN0o9-S1HEwJwCtWBvlQ-Lzj7R2qlGC1C8';
      }
    } catch (err) {
      console.error('Error reading .env.local:', err);
    }
    
    // Use Electron's fork to run Node.js code
    const { fork } = require('child_process');
    const nextStartScript = path.join(appPath, 'electron', 'start-next-prod.js');
    
    console.log('Starting Next.js server with Electron fork...');
    console.log('Script path:', nextStartScript);
    console.log('Script exists:', fs.existsSync(nextStartScript));
    console.log('Working directory:', appPath);
    
    try {
      // Fork the script using Electron's Node runtime
      nextServer = fork(nextStartScript, [], {
        cwd: appPath,
        env: envVars,
        silent: true // Capture output
      });
      
      console.log('Next.js spawn successful, PID:', nextServer.pid);
      
      // Handle output
      let serverReady = false;
      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Next.js:', output);
        if (!serverReady && output.includes('Listening on')) {
          serverReady = true;
          console.log('Next.js server is ready');
          if (callback) setTimeout(callback, 1000);
        }
      });
      
      nextServer.stderr.on('data', (data) => {
        console.error('Next.js Error:', data.toString());
      });
      
      nextServer.on('exit', (code, signal) => {
        console.error('Next.js process exited with code:', code, 'signal:', signal);
      });
      
      nextServer.on('error', (err) => {
        console.error('Next.js spawn error:', err);
      });
    } catch (spawnError) {
      console.error('Failed to spawn Next.js:', spawnError);
    }
    
    // Fallback if server doesn't report ready
    setTimeout(() => {
      console.log('Proceeding after timeout...');
      if (callback) callback();
    }, 8000);
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: true, // SHOW IMMEDIATELY
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading from localhost
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Initially show a simple loading message
  const loadingHTML = `<!DOCTYPE html>
<html>
<head>
<style>
body { background: #000; color: #fff; font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
</style>
</head>
<body>
<h2>Starting Gramstr...</h2>
</body>
</html>`;
  
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(loadingHTML));

  // Function to attempt loading the app
  let retryCount = 0;
  const maxRetries = 30; // 30 seconds max
  
  const tryLoadApp = () => {
    const net = require('net');
    const client = new net.Socket();
    
    client.setTimeout(500);
    client.on('connect', () => {
      console.log('Port 3000 is OPEN - loading app');
      client.destroy();
      
      // Load the gallery page directly for Electron app
      mainWindow.loadURL('http://localhost:3000/gallery')
        .then(() => {
          console.log('✅ Successfully loaded app!');
        })
        .catch((err) => {
          console.error('Failed to load app:', err.message);
          // Retry after a delay
          if (retryCount < maxRetries) {
            setTimeout(tryLoadApp, 1000);
          }
        });
    });
    
    client.on('error', () => {
      client.destroy();
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`Server not ready, retry ${retryCount}/${maxRetries}...`);
        setTimeout(tryLoadApp, 1000);
      } else {
        console.error('Failed to connect after max retries');
        // Show error page
        const errorHTML = `<!DOCTYPE html>
<html>
<body style="background:#000;color:#fff;font-family:system-ui;padding:40px;">
<h2>Failed to start server</h2>
<p>Please try restarting the application.</p>
<p style="color:#888;font-size:14px;">If the problem persists, try running from terminal for debugging.</p>
</body>
</html>`;
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHTML));
      }
    });
    
    client.on('timeout', () => {
      client.destroy();
      retryCount++;
      if (retryCount < maxRetries) {
        setTimeout(tryLoadApp, 1000);
      }
    });
    
    client.connect(3000, 'localhost');
  };
  
  // Start trying after a short delay
  setTimeout(tryLoadApp, 3000);

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
            shell.openExternal('http://localhost:3000/gallery');
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
  console.log('=== ELECTRON APP READY ===');
  console.log('Platform:', process.platform);
  console.log('App path:', app.getPath('exe'));
  console.log('Resources path:', process.resourcesPath);
  console.log('Is packaged:', app.isPackaged);
  
  createMenu();
  
  // Create window immediately but don't load URL yet
  console.log('=== CREATING WINDOW ===');
  createWindow();
  
  // Start Python backend
  console.log('Starting Python backend...');
  startPythonBackend();
  
  // Start Next.js and load URL when ready
  console.log('Starting Next.js server...');
  startNextServer(() => {
    console.log('Next.js server ready, loading app...');
  });
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