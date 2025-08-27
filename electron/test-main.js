const { app, BrowserWindow } = require('electron');

let mainWindow = null;

// Catch all errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

function createWindow() {
  try {
    console.log('Creating window...');
    
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Add error handlers
    mainWindow.webContents.on('crashed', () => {
      console.error('Window webContents crashed!');
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Render process gone:', details);
    });

    mainWindow.on('unresponsive', () => {
      console.error('Window became unresponsive!');
    });

    console.log('Loading URL...');
    mainWindow.loadURL('data:text/html,<h1>Test Window - Should Stay Open!</h1><p>If you see this, Electron is working.</p>');
    
    mainWindow.on('closed', () => {
      console.log('Window was closed');
      mainWindow = null;
    });
    
    console.log('Window created successfully');
    
    // Keep window open for debugging
    mainWindow.webContents.openDevTools();
    
  } catch (error) {
    console.error('Error creating window:', error);
  }
}

app.on('ready', () => {
  console.log('App ready event fired');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('All windows closed - app will quit');
  app.quit();
});

app.on('before-quit', () => {
  console.log('App is about to quit');
});

app.on('will-quit', () => {
  console.log('App will quit');
});

app.on('quit', () => {
  console.log('App has quit');
});

// Keep the app alive
setInterval(() => {
  if (mainWindow) {
    console.log('Window is still alive');
  }
}, 5000);