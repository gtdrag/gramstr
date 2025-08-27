const { autoUpdater, dialog } = require('electron');
const { app } = require('electron');
const isDev = process.env.NODE_ENV !== 'production' || process.env.ELECTRON_IS_DEV === '1';

// Configure update server URL
// Replace with your actual update server URL
const updateServerUrl = 'https://your-website.com/downloads/';

function initAutoUpdater(mainWindow) {
  if (isDev) {
    console.log('Auto-updater disabled in development mode');
    return;
  }

  // Set the feed URL for auto-updater
  try {
    autoUpdater.setFeedURL({
      url: `${updateServerUrl}${process.platform}/${process.arch}`,
      headers: {
        'User-Agent': `${app.getName()}/${app.getVersion()}`
      }
    });

    // Check for updates every hour
    const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
    
    // Initial check after 30 seconds
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 30000);

    // Regular checks
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, CHECK_INTERVAL);

    // Auto-updater events
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', () => {
      console.log('Update available');
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version is available. It will be downloaded in the background.',
        buttons: ['OK']
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('No updates available');
    });

    autoUpdater.on('error', (error) => {
      console.error('Auto-updater error:', error);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      let message = `Download speed: ${progressObj.bytesPerSecond}`;
      message += ` - Downloaded ${progressObj.percent}%`;
      message += ` (${progressObj.transferred}/${progressObj.total})`;
      console.log(message);
      
      // Optionally send progress to renderer
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  } catch (error) {
    console.error('Failed to initialize auto-updater:', error);
  }
}

// Alternative implementation using electron-updater (more robust)
function initElectronUpdater(mainWindow) {
  if (isDev) {
    console.log('Auto-updater disabled in development mode');
    return;
  }

  const { autoUpdater: electronUpdater } = require('electron-updater');
  
  // Configure electron-updater
  electronUpdater.autoDownload = true;
  electronUpdater.autoInstallOnAppQuit = true;
  
  // Set custom update server if needed
  electronUpdater.setFeedURL({
    provider: 'generic',
    url: updateServerUrl,
    channel: 'latest'
  });

  // Check for updates on startup
  electronUpdater.checkForUpdatesAndNotify();

  // Events
  electronUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  electronUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. It will be downloaded automatically.`,
      buttons: ['OK']
    });
  });

  electronUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
  });

  electronUpdater.on('error', (err) => {
    console.error('Update error:', err);
  });

  electronUpdater.on('download-progress', (progressObj) => {
    const message = `Downloaded ${progressObj.percent.toFixed(2)}%`;
    console.log(message);
    
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  electronUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. Restart the app to apply the update.`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    }).then(result => {
      if (result.response === 0) {
        electronUpdater.quitAndInstall(false, true);
      }
    });
  });
}

module.exports = {
  initAutoUpdater,
  initElectronUpdater
};