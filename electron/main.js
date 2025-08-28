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
    // Update status to running
    global.updateStatus(1, 'running', 'Launching...');
    
    // In production, backend is in extraResources, not in asar
    const backendPath = isDev 
      ? path.join(__dirname, '..', 'backend')
      : path.join(process.resourcesPath, 'backend');
    
    const scriptPath = path.join(backendPath, 'main.py');
    
    // Check if venv exists and use it, otherwise fall back to system python3
    const projectRoot = isDev ? path.join(__dirname, '..') : process.resourcesPath;
    const venvPython = isDev 
      ? path.join(projectRoot, 'venv', 'bin', 'python')
      : path.join(process.resourcesPath, 'venv', 'bin', 'python');
    const fs = require('fs');
    
    // In production, we MUST have the venv bundled
    let pythonCmd;
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython;
    } else if (!isDev) {
      // Production build must have venv
      console.error('Production build missing Python venv at:', venvPython);
      global.updateStatus(1, 'error', 'Missing Python environment');
      return;
    } else {
      pythonCmd = 'python3';
    }
    
    console.log(`Using Python: ${pythonCmd}`);
    
    pythonServer = spawn(pythonCmd, [scriptPath], {
      cwd: backendPath,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PORT: '8000' }
    });
    
    let pythonReady = false;
    
    pythonServer.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`Python: ${output}`);
      
      // Check if Python server is ready
      if (!pythonReady && (output.includes('Uvicorn running') || output.includes('8000'))) {
        pythonReady = true;
        global.updateStatus(1, 'success', 'Port 8000');
      }
    });
    
    pythonServer.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`Python stderr: ${output}`);
      
      // Check for startup success in stderr too (uvicorn logs there)
      if (!pythonReady && output.includes('Application startup complete')) {
        pythonReady = true;
        global.updateStatus(1, 'success', 'Port 8000');
      }
    });
    
    pythonServer.on('error', (error) => {
      console.error('Failed to start Python backend:', error);
      global.updateStatus(1, 'error', error.message);
    });
    
    pythonServer.on('exit', (code) => {
      if (code !== 0 && !pythonReady) {
        global.updateStatus(1, 'error', `Exit code ${code}`);
      }
    });
    
    // Timeout fallback - assume success after 5 seconds
    setTimeout(() => {
      if (!pythonReady) {
        global.updateStatus(1, 'success', 'Assumed ready');
      }
    }, 5000);
  } catch (error) {
    console.error('Python backend error:', error);
    global.updateStatus(1, 'error', error.message);
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
    global.updateStatus(2, 'running', 'Starting dev server...');
    
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
        // Extract port from output if possible
        const portMatch = output.match(/localhost:(\d+)/);
        const port = portMatch ? portMatch[1] : '3000';
        console.log(`Next.js is ready on port ${port}`);
        global.updateStatus(2, 'success', `Port ${port}`);
        if (callback) setTimeout(callback, 2000);
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });
  } else {
    // Production mode
    console.log('Running in PRODUCTION mode');
    global.updateStatus(2, 'running', 'Starting prod server...');
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
          global.updateStatus(2, 'success', 'Port 3000');
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

  // Show startup status board
  const getStatusHTML = (statuses) => {
    const statusItems = statuses.map(s => {
      let icon = '⏳';
      let color = '#888';
      if (s.status === 'success') {
        icon = '✓';
        color = '#4ade80';
      } else if (s.status === 'error') {
        icon = '✗';
        color = '#ef4444';
      } else if (s.status === 'running') {
        icon = '⚡';
        color = '#fbbf24';
      }
      return `
        <div style="display: flex; align-items: center; margin: 12px 0; font-size: 16px;">
          <span style="color: ${color}; width: 30px; font-size: 20px;">${icon}</span>
          <span style="color: ${s.status === 'pending' ? '#666' : '#fff'}; flex: 1;">${s.text}</span>
          ${s.detail ? `<span style="color: #666; font-size: 14px; margin-left: 20px;">${s.detail}</span>` : ''}
        </div>
      `;
    }).join('');
    
    return `<!DOCTYPE html>
    <html>
    <head>
    <style>
    body { 
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      color: #fff; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0;
    }
    .container {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      min-width: 400px;
    }
    h2 {
      margin: 0 0 30px 0;
      font-size: 28px;
      font-weight: 600;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .version {
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      text-align: center;
    }
    </style>
    </head>
    <body>
    <div class="container">
      <h2>🚀 Gramstr Starting...</h2>
      <div>${statusItems}</div>
      <div class="version">v2.0.0</div>
    </div>
    </body>
    </html>`;
  };
  
  // Initialize status tracking
  global.startupStatus = [
    { text: 'Initializing Electron app', status: 'success' },
    { text: 'Starting Python backend', status: 'pending', detail: '' },
    { text: 'Starting Next.js server', status: 'pending', detail: '' },
    { text: 'Loading application', status: 'pending', detail: '' }
  ];
  
  global.updateStatus = (index, status, detail = '') => {
    global.startupStatus[index].status = status;
    if (detail) global.startupStatus[index].detail = detail;
    // Only update if window is still showing the status page
    if (mainWindow && !mainWindow.isDestroyed()) {
      const currentURL = mainWindow.webContents.getURL();
      if (currentURL.startsWith('data:text/html')) {
        // Use executeJavaScript to update in-place instead of reloading
        const js = `
          const items = document.querySelectorAll('.container > div > div');
          if (items[${index}]) {
            const statusDiv = items[${index}];
            const iconSpan = statusDiv.querySelector('span:first-child');
            const textSpan = statusDiv.querySelectorAll('span')[1];
            const detailSpan = statusDiv.querySelectorAll('span')[2];
            
            // Update icon and color
            const status = '${status}';
            if (status === 'success') {
              iconSpan.innerHTML = '\u2713';
              iconSpan.style.color = '#4ade80';
              textSpan.style.color = '#fff';
            } else if (status === 'error') {
              iconSpan.innerHTML = '\u2717';
              iconSpan.style.color = '#ef4444';
              textSpan.style.color = '#fff';
            } else if (status === 'running') {
              iconSpan.innerHTML = '\u26a1';
              iconSpan.style.color = '#fbbf24';
              textSpan.style.color = '#fff';
            }
            
            // Update detail if present
            if (detailSpan) {
              detailSpan.textContent = '${detail}';
            } else if ('${detail}') {
              const newDetail = document.createElement('span');
              newDetail.style.cssText = 'color: #666; font-size: 14px; margin-left: 20px;';
              newDetail.textContent = '${detail}';
              statusDiv.appendChild(newDetail);
            }
          }
        `;
        mainWindow.webContents.executeJavaScript(js).catch(() => {
          // Ignore errors - page may have changed
        });
      }
    }
  };
  
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getStatusHTML(global.startupStatus)));

  // Function to attempt loading the app
  let retryCount = 0;
  const maxRetries = 30; // 30 seconds max
  let currentPort = 3000; // Track which port we're checking
  
  const tryLoadApp = () => {
    const net = require('net');
    
    // Try ports in order: 3000, then 3001
    const tryPort = (port) => {
      const client = new net.Socket();
      
      client.setTimeout(500);
      client.on('connect', () => {
        console.log(`Port ${port} is OPEN - loading app`);
        client.destroy();
        currentPort = port;
        
        // Update status to loading
        global.updateStatus(3, 'running', 'Connecting...');
        
        // Load the gallery page
        mainWindow.loadURL(`http://localhost:${port}/gallery`)
        .then(() => {
          console.log('✅ Successfully loaded app!');
          global.updateStatus(3, 'success', 'Ready!');
          // Status board will be replaced by the actual app
        })
        .catch((err) => {
          console.error('Failed to load app:', err.message);
          global.updateStatus(3, 'error', err.message);
          // Retry after a delay
          if (retryCount < maxRetries) {
            setTimeout(tryLoadApp, 1000);
          }
        });
    });
    
      
      client.on('error', () => {
        client.destroy();
        // If port 3000 failed, try 3001
        if (port === 3000) {
          console.log('Port 3000 not available, trying 3001...');
          tryPort(3001);
        } else {
          // Both ports failed, retry
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`Server not ready, retry ${retryCount}/${maxRetries}...`);
            setTimeout(() => tryPort(3000), 1000);
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
        }
      });
      
      client.on('timeout', () => {
        client.destroy();
        // Treat timeout same as error
        if (port === 3000) {
          tryPort(3001);
        } else {
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(() => tryPort(3000), 1000);
          }
        }
      });
      
      client.connect(port, 'localhost');
    };
    
    // Start by trying port 3000
    tryPort(3000);
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