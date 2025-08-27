const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
  const win = new BrowserWindow({ 
    width: 800, 
    height: 600,
    webPreferences: {
      // Minimal settings
    }
  });
  
  win.loadURL('https://www.google.com');
  
  // Log every second
  setInterval(() => {
    console.log(new Date().toISOString(), '- Window exists:', !!win, '- Destroyed:', win.isDestroyed());
  }, 1000);
});

app.on('window-all-closed', () => {
  console.log('WINDOW CLOSED BY USER OR CRASH');
  app.quit();
});