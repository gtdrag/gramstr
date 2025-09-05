const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Uninstall handler for Gramstr
 * Removes all user data and downloaded components
 */
class UninstallManager {
  constructor() {
    this.userDataPath = app.getPath('userData');
  }

  /**
   * Get size of a directory recursively
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            // Recursively get size of subdirectories
            totalSize += await this.getDirectorySize(filePath);
          } else {
            totalSize += stats.size;
          }
        } catch (e) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (e) {
      console.error(`Error calculating size of ${dirPath}:`, e);
    }
    
    return totalSize;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get list of items that will be removed
   */
  async getItemsToRemove() {
    const items = [];
    
    // Main directories to check
    const directories = [
      { name: 'Downloaded Instagram Content', path: path.join(this.userDataPath, 'downloads') },
      { name: 'Application Components', path: path.join(this.userDataPath, '.next') },
      { name: 'Node Modules', path: path.join(this.userDataPath, 'node_modules') },
      { name: 'Python Backend', path: path.join(this.userDataPath, 'backend') },
      { name: 'Python Environment', path: path.join(this.userDataPath, 'venv') },
      { name: 'Electron Files', path: path.join(this.userDataPath, 'electron') },
      { name: 'Application Cache', path: path.join(this.userDataPath, 'Cache') },
      { name: 'GPU Cache', path: path.join(this.userDataPath, 'GPUCache') },
      { name: 'Session Storage', path: path.join(this.userDataPath, 'Session Storage') },
      { name: 'Local Storage', path: path.join(this.userDataPath, 'Local Storage') },
    ];
    
    // Configuration files
    const files = [
      { name: 'Environment Config', path: path.join(this.userDataPath, '.env.production') },
      { name: 'Environment Config', path: path.join(this.userDataPath, '.env.local') },
      { name: 'Package Config', path: path.join(this.userDataPath, 'package.json') },
      { name: 'Installer Log', path: path.join(this.userDataPath, 'installer.log') },
      { name: 'Cookies', path: path.join(this.userDataPath, 'Cookies') },
      { name: 'Preferences', path: path.join(this.userDataPath, 'Preferences') },
    ];
    
    // Check directories
    for (const dir of directories) {
      if (fs.existsSync(dir.path)) {
        const size = await this.getDirectorySize(dir.path);
        items.push({
          name: dir.name,
          path: dir.path,
          type: 'directory',
          size: size,
          sizeFormatted: this.formatBytes(size)
        });
      }
    }
    
    // Check files
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        const stats = fs.statSync(file.path);
        items.push({
          name: file.name,
          path: file.path,
          type: 'file',
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size)
        });
      }
    }
    
    return items;
  }

  /**
   * Remove a directory recursively
   */
  removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const curPath = path.join(dirPath, file);
        if (fs.lstatSync(curPath).isDirectory()) {
          this.removeDirectory(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }

  /**
   * Perform the uninstall
   */
  async performUninstall(itemsToRemove) {
    const errors = [];
    
    for (const item of itemsToRemove) {
      try {
        if (item.type === 'directory') {
          this.removeDirectory(item.path);
        } else {
          fs.unlinkSync(item.path);
        }
      } catch (error) {
        errors.push({
          item: item.name,
          error: error.message
        });
        console.error(`Failed to remove ${item.name}:`, error);
      }
    }
    
    return errors;
  }

  /**
   * Show uninstall dialog and handle the process
   */
  async showUninstallDialog() {
    // Get items to remove
    const items = await this.getItemsToRemove();
    
    if (items.length === 0) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Nothing to Clean',
        message: 'No Gramstr data found to remove.',
        buttons: ['OK']
      });
      return;
    }
    
    // Calculate total size
    const totalSize = items.reduce((sum, item) => sum + item.size, 0);
    const totalSizeFormatted = this.formatBytes(totalSize);
    
    // Build details message
    const itemsList = items
      .sort((a, b) => b.size - a.size) // Sort by size, largest first
      .slice(0, 10) // Show top 10 items
      .map(item => `• ${item.name}: ${item.sizeFormatted}`)
      .join('\n');
    
    const detailMessage = `This will remove all Gramstr data from your computer.

Total space to be freed: ${totalSizeFormatted}

Items to be removed:
${itemsList}
${items.length > 10 ? `\n...and ${items.length - 10} more items` : ''}

The Gramstr app itself will remain and can be manually moved to trash.

Are you sure you want to continue?`;
    
    // Show confirmation dialog
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Uninstall Gramstr Data',
      message: 'Uninstall Gramstr Data?',
      detail: detailMessage,
      buttons: ['Cancel', 'Uninstall'],
      defaultId: 0,
      cancelId: 0
    });
    
    if (result.response === 1) {
      // User clicked Uninstall
      await this.executeUninstall(items, totalSizeFormatted);
    }
  }

  /**
   * Execute the uninstall with progress
   */
  async executeUninstall(items, totalSizeFormatted) {
    // Show progress dialog (non-blocking)
    dialog.showMessageBox({
      type: 'info',
      title: 'Uninstalling',
      message: 'Removing Gramstr data...',
      detail: 'Please wait while we clean up all files and folders.',
      buttons: []
    });
    
    // Perform uninstall
    const errors = await this.performUninstall(items);
    
    if (errors.length === 0) {
      // Success
      const result = await dialog.showMessageBox({
        type: 'info',
        title: 'Uninstall Complete',
        message: 'Gramstr data has been removed successfully!',
        detail: `Freed up ${totalSizeFormatted} of disk space.\n\nYou can now safely move the Gramstr app to trash.`,
        buttons: ['Show in Finder', 'Quit Gramstr'],
        defaultId: 1
      });
      
      if (result.response === 0) {
        // Show app in Finder
        shell.showItemInFolder(app.getPath('exe'));
      }
      
      // Quit the app
      app.quit();
    } else {
      // Some errors occurred
      const errorDetails = errors
        .slice(0, 5)
        .map(e => `• ${e.item}: ${e.error}`)
        .join('\n');
      
      dialog.showMessageBox({
        type: 'warning',
        title: 'Uninstall Partially Complete',
        message: 'Some items could not be removed.',
        detail: `The following items could not be removed:\n\n${errorDetails}${errors.length > 5 ? `\n...and ${errors.length - 5} more items` : ''}\n\nYou may need to manually remove these items.`,
        buttons: ['OK']
      });
    }
  }

  /**
   * Reset the app (remove data but keep the app functional)
   */
  async showResetDialog() {
    // Only remove user data, not app components
    const items = await this.getItemsToRemove();
    const userDataItems = items.filter(item => 
      item.name.includes('Downloaded') || 
      item.name.includes('Cache') ||
      item.name.includes('Storage') ||
      item.name === 'Cookies' ||
      item.name === 'Preferences'
    );
    
    if (userDataItems.length === 0) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Nothing to Reset',
        message: 'No user data found to reset.',
        buttons: ['OK']
      });
      return;
    }
    
    const totalSize = userDataItems.reduce((sum, item) => sum + item.size, 0);
    const totalSizeFormatted = this.formatBytes(totalSize);
    
    const result = await dialog.showMessageBox({
      type: 'warning',
      title: 'Reset Gramstr',
      message: 'Reset Gramstr to factory settings?',
      detail: `This will remove all downloaded content and user data (${totalSizeFormatted}), but keep the app functional.\n\nYou will need to restart the app after reset.`,
      buttons: ['Cancel', 'Reset'],
      defaultId: 0,
      cancelId: 0
    });
    
    if (result.response === 1) {
      const errors = await this.performUninstall(userDataItems);
      
      if (errors.length === 0) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Reset Complete',
          message: 'Gramstr has been reset successfully!',
          detail: 'The app will now quit. Please restart it to continue.',
          buttons: ['Quit']
        });
        
        app.quit();
      } else {
        dialog.showMessageBox({
          type: 'warning',
          title: 'Reset Partially Complete',
          message: 'Some items could not be removed.',
          detail: 'The app may not function correctly. Please restart and try again.',
          buttons: ['OK']
        });
      }
    }
  }
}

module.exports = UninstallManager;