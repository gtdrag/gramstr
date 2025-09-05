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

// Expose secure NOSTR API to the renderer
contextBridge.exposeInMainWorld('nostrSecure', {
  // Store NOSTR key securely
  storeKey: async (nsec) => {
    return await ipcRenderer.invoke('nostr:store-key', nsec);
  },
  
  // Get NOSTR key (for migration/backup only)
  getKey: async () => {
    return await ipcRenderer.invoke('nostr:get-key');
  },
  
  // Sign an event (key never leaves main process)
  signEvent: async (eventData) => {
    return await ipcRenderer.invoke('nostr:sign-event', eventData);
  },
  
  // Check if key exists
  hasKey: async () => {
    return await ipcRenderer.invoke('nostr:has-key');
  },
  
  // Migrate key from environment to secure storage
  migrateKey: async () => {
    return await ipcRenderer.invoke('nostr:migrate-key');
  }
});