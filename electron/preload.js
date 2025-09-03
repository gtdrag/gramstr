const { contextBridge, shell, ipcRenderer } = require('electron');

// Expose minimal Electron API for privacy-focused functionality
contextBridge.exposeInMainWorld('electron', {
  // Open external links (for opening in browser with Alby)
  openExternal: (url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
  },
  
  // Check if running in Electron
  isElectron: true,
  
  // Version info
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },
  
  // Get port configuration
  getPorts: () => ipcRenderer.invoke('get-ports')
});