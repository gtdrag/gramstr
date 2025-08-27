// This creates a bridge to handle Nostr signing in Electron
// It can either use a built-in key or connect to an external signer

const { ipcMain, dialog, shell } = require('electron');
const { generateSecretKey, getPublicKey, finalizeEvent, nip19 } = require('nostr-tools');
const fs = require('fs');
const path = require('path');

class NostrBridge {
  constructor() {
    this.secretKey = null;
    this.publicKey = null;
    this.setupHandlers();
  }

  setupHandlers() {
    // Handle Nostr requests from renderer
    ipcMain.handle('nostr:getPublicKey', async () => {
      if (!this.publicKey) {
        const configured = await this.promptForKey();
        if (!configured) return null;
      }
      return this.publicKey;
    });

    ipcMain.handle('nostr:signEvent', async (event, eventToSign) => {
      if (!this.secretKey) {
        const configured = await this.promptForKey();
        if (!configured) throw new Error('No key configured');
      }
      
      try {
        const signedEvent = finalizeEvent(eventToSign, this.secretKey);
        return signedEvent;
      } catch (error) {
        console.error('Failed to sign event:', error);
        throw error;
      }
    });

    ipcMain.handle('nostr:isEnabled', async () => {
      return this.secretKey !== null;
    });

    ipcMain.handle('nostr:configure', async () => {
      return this.promptForKey();
    });
  }

  async promptForKey() {
    const choice = dialog.showMessageBoxSync(null, {
      type: 'question',
      buttons: ['Use Alby (Web Browser)', 'Import Private Key', 'Generate New Key', 'Cancel'],
      defaultId: 0,
      title: 'Configure Nostr',
      message: 'How would you like to sign Nostr events?',
      detail: 'Alby extension is not available in Electron. Choose an alternative method.'
    });

    switch (choice) {
      case 0: // Use Alby in browser
        shell.openExternal('http://localhost:3000');
        dialog.showMessageBox(null, {
          type: 'info',
          title: 'Opening in Browser',
          message: 'The app will open in your browser where Alby is available.',
          detail: 'Use the web version for full Alby integration.'
        });
        return false;

      case 1: // Import key
        const result = dialog.showOpenDialogSync(null, {
          title: 'Select Private Key File',
          filters: [
            { name: 'Key Files', extensions: ['txt', 'key', 'nsec'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });
        
        if (result && result[0]) {
          try {
            const keyContent = fs.readFileSync(result[0], 'utf8').trim();
            
            // Try to decode if it's nsec format
            if (keyContent.startsWith('nsec1')) {
              const { type, data } = nip19.decode(keyContent);
              if (type === 'nsec') {
                this.secretKey = data;
              }
            } else {
              // Assume hex format
              this.secretKey = Buffer.from(keyContent, 'hex');
            }
            
            this.publicKey = getPublicKey(this.secretKey);
            this.saveKey();
            return true;
          } catch (error) {
            dialog.showErrorBox('Invalid Key', 'Could not read the private key file.');
            return false;
          }
        }
        return false;

      case 2: // Generate new
        this.secretKey = generateSecretKey();
        this.publicKey = getPublicKey(this.secretKey);
        
        const nsec = nip19.nsecEncode(this.secretKey);
        const npub = nip19.npubEncode(this.publicKey);
        
        dialog.showMessageBox(null, {
          type: 'info',
          title: 'New Nostr Key Generated',
          message: 'Your new Nostr key has been generated.',
          detail: `Public Key: ${npub}\n\nPrivate Key: ${nsec}\n\nSAVE YOUR PRIVATE KEY! It cannot be recovered if lost.`,
          buttons: ['Copy Private Key', 'OK']
        }).then(result => {
          if (result.response === 0) {
            require('electron').clipboard.writeText(nsec);
          }
        });
        
        this.saveKey();
        return true;

      default:
        return false;
    }
  }

  saveKey() {
    // Save key securely (this is basic - in production use keychain/credential manager)
    const keyPath = path.join(app.getPath('userData'), 'nostr.key');
    try {
      const nsec = nip19.nsecEncode(this.secretKey);
      fs.writeFileSync(keyPath, nsec, { mode: 0o600 });
    } catch (error) {
      console.error('Failed to save key:', error);
    }
  }

  loadKey() {
    const keyPath = path.join(app.getPath('userData'), 'nostr.key');
    try {
      if (fs.existsSync(keyPath)) {
        const keyContent = fs.readFileSync(keyPath, 'utf8').trim();
        const { type, data } = nip19.decode(keyContent);
        if (type === 'nsec') {
          this.secretKey = data;
          this.publicKey = getPublicKey(this.secretKey);
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to load key:', error);
    }
    return false;
  }
}

module.exports = NostrBridge;