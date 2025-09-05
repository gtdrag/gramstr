const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const UninstallManager = require('./uninstall');

// Set up file logging
const logPath = path.join(app.getPath('userData'), 'installer.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(...args) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(...args);
  logStream.write(message + '\n');
}

// Override console.log to also write to file
const originalConsoleLog = console.log;
console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  logStream.write(message + '\n');
};

// Override console.error to also write to file  
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ERROR: ${args.join(' ')}`;
  logStream.write(message + '\n');
};
const https = require('https');

// Stability settings for macOS
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

const isDev = process.env.ELECTRON_IS_DEV === '1' || (!app.isPackaged && process.env.NODE_ENV !== 'production');

// Helper to get correct path for packaged app
function getAppPath() {
  // In production, Next.js files are downloaded to userData
  if (app.isPackaged) {
    return app.getPath('userData');
  }
  // Development mode
  return path.join(__dirname, '..');
}

let mainWindow = null;
let installerWindow = null;
let pythonServer = null;
let nextServer = null;

// Global port configuration
global.pythonPort = null;
global.nextPort = null;

// Helper function to check if port is available
async function checkPort(port) {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

// Find available port for Python backend
async function findPythonPort() {
  let port = 8000;
  let attempts = 0;
  while (attempts < 10) {
    if (await checkPort(port)) {
      console.log(`Found available port for Python backend: ${port}`);
      return port;
    }
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
    attempts++;
  }
  throw new Error('Could not find available port for Python backend');
}

// Start Python backend
async function startPythonBackend() {
  console.log('\n=== STARTING PYTHON BACKEND ===');
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  
  try {
    // Update status to running
    global.updateStatus(1, 'running', 'Launching...');
    
    // Check for backend in user data directory first (installed via installer)
    const userDataPath = app.getPath('userData');
    const installedBackendPath = path.join(userDataPath, 'backend');
    
    console.log('Checking backend paths:');
    console.log('  User data backend:', installedBackendPath, fs.existsSync(installedBackendPath) ? '✓' : '✗');
    console.log('  Resources backend:', path.join(process.resourcesPath, 'backend'), fs.existsSync(path.join(process.resourcesPath, 'backend')) ? '✓' : '✗');
    
    // In production, backend should be in user data directory
    const backendPath = isDev 
      ? path.join(__dirname, '..', 'backend')
      : fs.existsSync(installedBackendPath) 
        ? installedBackendPath 
        : path.join(process.resourcesPath, 'backend');
    
    console.log('Using backend path:', backendPath);
    
    const scriptPath = path.join(backendPath, 'main.py');
    console.log('Python script:', scriptPath, fs.existsSync(scriptPath) ? '✓' : '✗');
    
    // Check if venv exists and use it, otherwise fall back to system python3
    const installedVenvPath = path.join(userDataPath, 'venv');
    console.log('Checking venv paths:');
    console.log('  User data venv:', installedVenvPath, fs.existsSync(installedVenvPath) ? '✓' : '✗');
    
    const projectRoot = isDev ? path.join(__dirname, '..') : userDataPath;
    const venvPython = isDev 
      ? path.join(projectRoot, 'venv', 'bin', 'python')
      : fs.existsSync(installedVenvPath)
        ? path.join(installedVenvPath, 'bin', 'python')
        : path.join(process.resourcesPath, 'venv', 'bin', 'python');
    
    console.log('Checking Python executable:', venvPython, fs.existsSync(venvPython) ? '✓' : '✗');
    
    // In production, we'll use system python3 since venv is not included
    let pythonCmd;
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython;
      console.log('Using venv Python:', pythonCmd);
    } else if (!isDev) {
      // Production build must have venv
      console.error('CRITICAL: Python venv not found at:', venvPython);
      console.error('The installer should have downloaded python-venv component');
      global.updateStatus(1, 'error', 'Missing Python environment');
      // Try to continue anyway - app can work without download features
      return;
    } else {
      pythonCmd = 'python3';
    }
    
    console.log(`Using Python: ${pythonCmd}`);
    
    // Find available port for Python
    const pythonPort = await findPythonPort();
    global.pythonPort = pythonPort; // Store globally
    console.log(`Python backend will use port: ${pythonPort}`);
    
    pythonServer = spawn(pythonCmd, [scriptPath], {
      cwd: backendPath,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PORT: String(pythonPort) }
    });
    
    let pythonReady = false;
    
    pythonServer.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`Python: ${output}`);
      
      // Check if Python server is ready
      if (!pythonReady && (output.includes('Uvicorn running') || output.includes(String(global.pythonPort)))) {
        pythonReady = true;
        global.updateStatus(1, 'success', `Port ${global.pythonPort}`);
      }
    });
    
    pythonServer.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`Python stderr: ${output}`);
      
      // Check for startup success in stderr too (uvicorn logs there)
      if (!pythonReady && output.includes('Application startup complete')) {
        pythonReady = true;
        global.updateStatus(1, 'success', `Port ${global.pythonPort}`);
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
async function startNextServer(callback) {
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
        global.nextPort = port;
        if (callback) {
          console.log('Calling dev callback with port:', port);
          setTimeout(() => callback(port), 2000);
        }
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
    
    // Check what exists with detailed info
    console.log('Checking production paths:');
    const pathChecks = {
      'appPath': appPath,
      '.next': path.join(appPath, '.next'),
      'node_modules': path.join(appPath, 'node_modules'),
      'electron': path.join(appPath, 'electron'),
      'package.json': path.join(appPath, 'package.json'),
      'start-next-prod.js': path.join(appPath, 'electron', 'start-next-prod.js')
    };
    
    for (const [name, checkPath] of Object.entries(pathChecks)) {
      const exists = fs.existsSync(checkPath);
      console.log(`- ${name}: ${exists ? '✓' : '✗'} ${checkPath}`);
      if (exists && name === '.next') {
        // Check .next structure
        const nextBuildId = path.join(checkPath, 'BUILD_ID');
        if (fs.existsSync(nextBuildId)) {
          console.log(`  BUILD_ID: ${fs.readFileSync(nextBuildId, 'utf8').trim()}`);
        }
      }
    }
    
    
    // Find an available port starting from 3000
    let nextPort = 3000;
    let portAvailable = await checkPort(nextPort);
    let attempts = 0;
    while (!portAvailable && attempts < 10) {
      console.log(`Port ${nextPort} is in use, trying ${nextPort + 1}...`);
      nextPort++;
      portAvailable = await checkPort(nextPort);
      attempts++;
    }
    
    if (!portAvailable) {
      console.error('Could not find available port after 10 attempts');
      global.updateStatus(2, 'error', 'No ports available');
      if (callback) callback();
      return;
    }
    
    console.log(`Using port ${nextPort} for Next.js server`);
    
    // Read .env.local if it exists
    // Pass Python backend port through environment
    let envVars = { 
      ...process.env, 
      PORT: String(nextPort), 
      NODE_ENV: 'production',
      PYTHON_PORT: String(global.pythonPort || 8000),
      NEXT_PUBLIC_PYTHON_PORT: String(global.pythonPort || 8000),
      NEXT_PUBLIC_API_URL: `http://localhost:${global.pythonPort || 8000}`
    };
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
        // SECURITY: Credentials should NEVER be hardcoded in source code
        // In production, load from:
        // 1. Environment variables (.env.production.local)
        // 2. OS Keychain (macOS Keychain, Windows Credential Manager)
        // 3. Encrypted secure storage
        console.warn('⚠️ No .env.local found - using development defaults');
        console.warn('For production, configure secure credential storage');
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
    
    // Define serverReady variable in the proper scope
    let serverReady = false;
    
    try {
      // Fork the script using Electron's Node runtime
      nextServer = fork(nextStartScript, [], {
        cwd: appPath,
        env: envVars,
        silent: true // Capture output
      });
      
      console.log('Next.js spawn successful, PID:', nextServer.pid);
      
      // Handle output
      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Next.js:', output);
        if (!serverReady && (output.includes('Ready in') || output.includes('Listening on'))) {
          serverReady = true;
          console.log('Next.js server is ready on port', nextPort);
          global.updateStatus(2, 'success', `Port ${nextPort}`);
          global.nextPort = nextPort; // Store for app loading
          if (callback) {
            console.log('Calling callback with port:', nextPort);
            setTimeout(() => callback(nextPort), 1000);
          }
        }
      });
      
      nextServer.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        console.error('Next.js Error:', errorMsg);
        // Check for common issues
        if (errorMsg.includes('Cannot find module')) {
          console.error('CRITICAL: Missing module detected - installation may be incomplete');
        }
        if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
          console.error('CRITICAL: File not found - check extraction paths');
        }
      });
      
      nextServer.on('exit', (code, signal) => {
        console.error('Next.js process exited with code:', code, 'signal:', signal);
        if (code !== 0) {
          console.error('Next.js failed to start properly. Check the log for errors.');
        }
      });
      
      nextServer.on('error', (err) => {
        console.error('Next.js spawn error:', err);
        console.error('Stack trace:', err.stack);
      });
    } catch (spawnError) {
      console.error('Failed to spawn Next.js:', spawnError);
    }
    
    // Fallback if server doesn't report ready
    setTimeout(() => {
      if (!serverReady) {
        console.log('Next.js timeout - proceeding anyway with port:', nextPort);
        global.updateStatus(2, 'success', `Port ${nextPort}`);
        if (callback) callback(nextPort);
      }
    }, 5000);
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
          (function() {
            const statusItems = document.querySelectorAll('.container > div > div');
            if (statusItems[${index}]) {
              const statusDiv = statusItems[${index}];
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
          })();
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
  
  const tryLoadApp = (specifiedPort) => {
    console.log('\n=== TRYING TO LOAD APP ===');
    const net = require('net');
    // Use the port passed from Next.js startup, or try to detect
    let currentPort = specifiedPort || global.nextPort || 3000;
    console.log(`Parameters: specifiedPort=${specifiedPort}, global.nextPort=${global.nextPort}, defaulting to=${currentPort}`);
    
    // Try the specified port first, then scan if needed
    const tryPort = (port) => {
      const client = new net.Socket();
      
      client.setTimeout(500);
      client.on('connect', () => {
        console.log(`Port ${port} is OPEN - loading app`);
        client.destroy();
        currentPort = port;
        
        // Update status to loading
        global.updateStatus(3, 'running', 'Connecting...');
        
        // Load the root page (doesn't require auth)
        mainWindow.loadURL(`http://localhost:${port}/`)
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
  
  // Don't auto-start - wait for Next.js to report its port
  // The tryLoadApp will be called from the Next.js startup callback

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
        {
          label: 'Reset Gramstr...',
          click: async () => {
            const uninstaller = new UninstallManager();
            await uninstaller.showResetDialog();
          }
        },
        {
          label: 'Uninstall Gramstr Data...',
          click: async () => {
            const uninstaller = new UninstallManager();
            await uninstaller.showUninstallDialog();
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

// IPC Handlers for Installer
// IPC handler to get port configuration
ipcMain.handle('get-ports', async () => {
  return {
    pythonPort: global.pythonPort || 8000,
    nextPort: global.nextPort || 3000
  };
});

ipcMain.handle('check-installation', async () => {
  console.log('\n=== INSTALLATION CHECK ===');
  
  // Check if Python backend exists
  const userDataPath = app.getPath('userData');
  console.log('User data path:', userDataPath);
  
  const componentsToCheck = {
    '.next': path.join(userDataPath, '.next'),
    'node_modules': path.join(userDataPath, 'node_modules'),
    'backend': path.join(userDataPath, 'backend'),
    'venv': path.join(userDataPath, 'venv'),
    'package.json': path.join(userDataPath, 'package.json'),
    'electron': path.join(userDataPath, 'electron')
  };
  
  console.log('Checking components:');
  let allPresent = true;
  for (const [name, componentPath] of Object.entries(componentsToCheck)) {
    const exists = fs.existsSync(componentPath);
    if (!exists && (name === 'backend' || name === 'venv')) {
      allPresent = false;
    }
    console.log(`  ${exists ? '✓' : '✗'} ${name}: ${exists ? 'found' : 'missing'}`);
    
    // Check size if it exists
    if (exists) {
      try {
        const stats = fs.statSync(componentPath);
        if (stats.isDirectory()) {
          const dirSize = getDirSize(componentPath);
          console.log(`    Size: ${(dirSize / 1024 / 1024).toFixed(2)} MB`);
        } else {
          console.log(`    Size: ${(stats.size / 1024).toFixed(2)} KB`);
        }
      } catch (e) {
        console.log(`    Could not get size: ${e.message}`);
      }
    }
  }
  
  console.log('Installation complete:', allPresent);
  return allPresent;
});

// Helper function to get directory size
function getDirSize(dir) {
  let size = 0;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files.slice(0, 100)) { // Sample first 100 files
      const filePath = path.join(dir, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          size += stats.size;
        }
      } catch (e) {}
    }
  } catch (e) {}
  return size;
}

ipcMain.handle('install-components', async (event) => {
  console.log('=== STARTING COMPONENT INSTALLATION ===');
  console.log('User data path:', app.getPath('userData'));
  
  try {
    const userDataPath = app.getPath('userData');
    const pythonBackendPath = path.join(userDataPath, 'backend');
    const venvPath = path.join(userDataPath, 'venv');
    
    console.log('Expected paths:');
    console.log('- Python backend:', pythonBackendPath);
    console.log('- Venv:', venvPath);
    
    // Create directories if they don't exist
    if (!fs.existsSync(pythonBackendPath)) {
      fs.mkdirSync(pythonBackendPath, { recursive: true });
    }
    
    // Download and extract components
    const https = require('https');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const components = [
      { 
        name: 'node-modules', 
        file: 'node-modules-1.1.0.tar.gz',
        targetDir: userDataPath,
        progress: 20,
        message: 'Downloading dependencies (91MB)...'
      },
      { 
        name: 'core-files', 
        file: 'core-files-1.1.0.tar.gz',
        targetDir: userDataPath,
        progress: 40,
        message: 'Downloading application files (76MB)...'
      },
      { 
        name: 'python-backend', 
        file: 'python-backend-1.1.0.tar.gz',
        targetDir: userDataPath,
        progress: 60,
        message: 'Downloading Python backend (1MB)...'
      },
      { 
        name: 'python-venv', 
        file: 'python-venv-1.1.0.tar.gz',
        targetDir: userDataPath,
        progress: 80,
        message: 'Downloading Python environment (10MB)...'
      }
    ];
    
    for (const component of components) {
      console.log(`\n=== Processing ${component.name} ===`);
      
      event.sender.send('install-progress', {
        progress: component.progress,
        message: component.message,
        component: component.name
      });
      
      const url = `https://github.com/gtdrag/gramstr/releases/download/v1.1.0/${component.file}`;
      const downloadPath = path.join(userDataPath, component.file);
      
      console.log(`Downloading from: ${url}`);
      console.log(`Saving to: ${downloadPath}`);
      
      // Download the file
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(downloadPath);
        
        https.get(url, (response) => {
          console.log(`Response status: ${response.statusCode}`);
          console.log(`Response headers:`, response.headers);
          
          if (response.statusCode === 302 || response.statusCode === 301) {
            // Handle redirect
            console.log(`Redirecting to: ${response.headers.location}`);
            https.get(response.headers.location, (redirectResponse) => {
              console.log(`Redirect response status: ${redirectResponse.statusCode}`);
              
              let totalBytes = 0;
              redirectResponse.on('data', (chunk) => {
                totalBytes += chunk.length;
              });
              
              redirectResponse.pipe(file);
              file.on('finish', () => {
                console.log(`Downloaded ${totalBytes} bytes`);
                file.close(resolve);
              });
            }).on('error', reject);
          } else if (response.statusCode === 200) {
            let totalBytes = 0;
            response.on('data', (chunk) => {
              totalBytes += chunk.length;
            });
            
            response.pipe(file);
            file.on('finish', () => {
              console.log(`Downloaded ${totalBytes} bytes`);
              file.close(resolve);
            });
          } else {
            reject(new Error(`Failed to download ${component.file}: ${response.statusCode}`));
          }
        }).on('error', reject);
      });
      
      // Check file size before extraction
      const fileStats = fs.statSync(downloadPath);
      console.log(`Downloaded file size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Verify file is a valid tar.gz
      const fileHeader = Buffer.alloc(3);
      const fd = fs.openSync(downloadPath, 'r');
      fs.readSync(fd, fileHeader, 0, 3, 0);
      fs.closeSync(fd);
      const isGzip = fileHeader[0] === 0x1f && fileHeader[1] === 0x8b;
      console.log(`File header: ${fileHeader.toString('hex')} - Is gzip: ${isGzip}`);
      
      if (!isGzip) {
        console.error(`WARNING: ${component.file} does not appear to be a gzip file!`);
      }
      
      // Extract the tar.gz file using command line tar
      console.log(`Extracting to: ${component.targetDir}`);
      const extractCmd = `tar -xzf "${downloadPath}" -C "${component.targetDir}" 2>&1`;
      console.log(`Running: ${extractCmd}`);
      
      try {
        const { stdout, stderr } = await execAsync(extractCmd);
        if (stdout) console.log('Extract output:', stdout);
        if (stderr) console.log('Extract stderr:', stderr);
        console.log('Extraction completed successfully');
      } catch (extractError) {
        console.error(`Failed to extract ${component.file}:`, extractError);
        console.error('Extract error output:', extractError.stdout);
        console.error('Extract error stderr:', extractError.stderr);
        
        // Try to see what's in the file
        try {
          const listCmd = `tar -tzf "${downloadPath}" | head -20`;
          const { stdout: listOutput } = await execAsync(listCmd);
          console.error('Archive contents (first 20 entries):', listOutput);
        } catch (e) {
          console.error('Could not list archive contents:', e.message);
        }
        
        throw extractError;
      }
      
      // Verify extraction with detailed check
      console.log(`Verifying extraction in ${component.targetDir}:`);
      const contents = fs.readdirSync(component.targetDir);
      console.log(`Total items in directory: ${contents.length}`);
      console.log('First 15 items:', contents.slice(0, 15).join(', '));
      
      // Check for specific expected directories/files
      const expectedPaths = {
        'node-modules': ['node_modules'],
        'core-files': ['.next', 'package.json', 'electron'],
        'python-backend': ['backend'],
        'python-venv': ['venv']
      };
      
      if (expectedPaths[component.name]) {
        console.log(`Checking for expected items from ${component.name}:`);
        for (const expected of expectedPaths[component.name]) {
          const expectedPath = path.join(component.targetDir, expected);
          const exists = fs.existsSync(expectedPath);
          console.log(`  ${exists ? '✓' : '✗'} ${expected}: ${exists ? 'present' : 'MISSING!'}`);
          if (!exists) {
            console.error(`ERROR: Expected ${expected} not found after extracting ${component.name}`);
          }
        }
      }
      
      // Clean up the downloaded archive
      fs.unlinkSync(downloadPath);
      console.log(`Cleaned up ${component.file}`);
    }
    
    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    console.log('Checking what was actually installed:');
    const finalChecks = [
      path.join(userDataPath, '.next'),
      path.join(userDataPath, 'node_modules'),
      path.join(userDataPath, 'backend'),
      path.join(userDataPath, 'venv'),
      path.join(userDataPath, 'electron'),
      path.join(userDataPath, 'package.json')
    ];
    
    for (const checkPath of finalChecks) {
      const exists = fs.existsSync(checkPath);
      const isDir = exists && fs.statSync(checkPath).isDirectory();
      console.log(`${exists ? '✓' : '✗'} ${path.basename(checkPath)} ${isDir ? '(directory)' : exists ? '(file)' : '(missing)'}: ${checkPath}`);
    }
    
    event.sender.send('install-progress', {
      progress: 100,
      message: 'Installation complete!',
      component: 'python-backend'
    });
    
    return { success: true };
  } catch (error) {
    console.error('=== INSTALLATION ERROR ===');
    console.error('Error details:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('launch-app', async () => {
  console.log('Launching main app from installer...');
  
  // Close installer window and proceed with normal startup
  if (installerWindow) {
    installerWindow.close();
    installerWindow = null;
  }
  
  // Start the main app
  createWindow();
  
  // Start Python backend
  console.log('Starting Python backend...');
  await startPythonBackend();
  
  // Start Next.js and load URL when ready
  console.log('Starting Next.js server...');
  await startNextServer((port) => {
    console.log(`Next.js server ready on port ${port}, loading app...`);
    if (port) {
      // Wait a bit for server to stabilize then load
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log(`Loading app from http://localhost:${port}/`);
          global.updateStatus(3, 'running', 'Loading...');
          mainWindow.loadURL(`http://localhost:${port}/`)
            .then(() => {
              console.log('✅ App loaded successfully!');
              global.updateStatus(3, 'success', 'Ready!');
            })
            .catch((err) => {
              console.error('Failed to load app:', err);
              global.updateStatus(3, 'error', err.message);
            });
        }
      }, 1500);
    }
  });
  
  return true;
});

// App events
app.whenReady().then(async () => {
  console.log('=== ELECTRON APP READY ===');
  console.log('Log file location:', logPath);
  console.log('Platform:', process.platform);
  console.log('App path:', app.getPath('exe'));
  console.log('Resources path:', process.resourcesPath);
  console.log('Is packaged:', app.isPackaged);
  console.log('User data path:', app.getPath('userData'));
  
  createMenu();
  
  // Check if components are installed
  const userDataPath = app.getPath('userData');
  
  console.log('\n=== CHECKING INSTALLED COMPONENTS ===');
  console.log('User data path:', userDataPath);
  
  // Check all required components
  const requiredComponents = {
    '.next': path.join(userDataPath, '.next'),
    'node_modules': path.join(userDataPath, 'node_modules'),
    'backend': path.join(userDataPath, 'backend'),
    'electron': path.join(userDataPath, 'electron'),
    'package.json': path.join(userDataPath, 'package.json')
  };
  
  let allComponentsExist = true;
  for (const [name, componentPath] of Object.entries(requiredComponents)) {
    const exists = fs.existsSync(componentPath);
    console.log(`${exists ? '✓' : '✗'} ${name}: ${exists ? 'found' : 'MISSING'}`);
    if (!exists && (name === '.next' || name === 'node_modules')) {
      allComponentsExist = false;
    }
  }
  
  // We need .next and node_modules to run the app
  // These are downloaded, not bundled
  const nextjsInstalled = fs.existsSync(path.join(userDataPath, '.next'));
  const nodeModulesInstalled = fs.existsSync(path.join(userDataPath, 'node_modules'));
  
  const componentsExist = nextjsInstalled && nodeModulesInstalled;
  
  console.log('\nSummary:');
  console.log('- Next.js installed:', nextjsInstalled);
  console.log('- Node modules installed:', nodeModulesInstalled);
  console.log('- Components available:', componentsExist);
  console.log('- Should show installer:', !componentsExist && app.isPackaged);
  
  // FOR TESTING: Force installer to show in dev mode if FORCE_INSTALLER env is set
  const forceInstaller = process.env.FORCE_INSTALLER === 'true';
  if (forceInstaller) {
    console.log('FORCE_INSTALLER is set - showing installer regardless of mode');
  }
  
  if (!componentsExist && (app.isPackaged || forceInstaller)) {
    // Show installer window
    console.log('Showing installer window...');
    installerWindow = new BrowserWindow({
      width: 600,
      height: 500,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      titleBarStyle: 'hiddenInset',
      resizable: false
    });
    
    installerWindow.loadFile(path.join(__dirname, 'installer.html'));
    
    installerWindow.on('closed', () => {
      installerWindow = null;
    });
  } else {
    // Start normally
    console.log('=== CREATING WINDOW ===');
    createWindow();
    
    // Start Python backend
    console.log('Starting Python backend...');
    await startPythonBackend();
    
    // Start Next.js and load URL when ready
    console.log('Starting Next.js server...');
    await startNextServer((port) => {
      console.log(`Next.js server ready on port ${port}, loading app...`);
      if (port && mainWindow) {
        // Load app from the correct port
        mainWindow.loadURL(`http://localhost:${port}/`)
        .then(() => {
          console.log('✅ Successfully loaded app from regular startup!');
        })
        .catch((err) => {
          console.error('Failed to load app:', err);
        });
      }
    });
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