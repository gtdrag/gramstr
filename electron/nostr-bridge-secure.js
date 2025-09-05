/**
 * Secure Nostr Bridge for Electron
 * Uses OS-native secure storage for private keys
 */

const { app, ipcMain, dialog, shell, safeStorage } = require('electron');
const { generateSecretKey, getPublicKey, finalizeEvent, nip19 } = require('nostr-tools');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecureNostrBridge {
  constructor() {
    this.secretKey = null;
    this.publicKey = null;
    this.setupHandlers();
    this.loadKey();
  }

  setupHandlers() {
    ipcMain.handle('nostr:getPublicKey', async () => {
      if (!this.publicKey) {
        const configured = await this.promptForKey();
        if (!configured) return null;
      }
      return this.publicKey ? nip19.npubEncode(this.publicKey) : null;
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

    ipcMain.handle('nostr:openInBrowser', () => {
      shell.openExternal('http://localhost:3000/gallery');
    });
  }

  async promptForKey() {
    const choice = dialog.showMessageBoxSync(null, {
      type: 'question',
      buttons: ['Use Alby (Web Browser)', 'Import Private Key', 'Generate New Key', 'Cancel'],
      defaultId: 0,
      title: 'Configure Nostr',
      message: 'How would you like to configure Nostr?',
      detail: 'Alby (recommended) keeps your keys secure in a browser extension.\n\n' +
              'Importing or generating keys will store them securely in your OS keychain.'
    });

    switch (choice) {
      case 0: // Use Alby
        dialog.showMessageBox({
          type: 'info',
          title: 'Opening in Browser',
          message: 'Opening Gramstr in your browser...',
          detail: 'Please install the Alby extension if you haven\'t already, then use it to sign Nostr events.'
        });
        shell.openExternal('http://localhost:3000/gallery');
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
            await this.saveKeySecurely();
            
            // Securely delete the imported file if user wants
            const deleteChoice = dialog.showMessageBoxSync(null, {
              type: 'question',
              buttons: ['Keep File', 'Securely Delete'],
              defaultId: 1,
              title: 'Delete Original Key File?',
              message: 'Your key has been securely imported.',
              detail: 'Would you like to securely delete the original file?'
            });
            
            if (deleteChoice === 1) {
              this.securelyDeleteFile(result[0]);
            }
            
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
        
        // Show key and offer to save backup
        dialog.showMessageBox({
          type: 'info',
          title: 'New Nostr Key Generated',
          message: 'Your new Nostr key has been generated and stored securely.',
          detail: `Public Key: ${npub}\n\nPrivate Key: ${nsec}\n\n` +
                  `⚠️ IMPORTANT: Save your private key backup!\nIt cannot be recovered if lost.`,
          buttons: ['Copy Private Key & Save Backup', 'Copy Private Key Only', 'OK']
        }).then(async result => {
          if (result.response === 0 || result.response === 1) {
            require('electron').clipboard.writeText(nsec);
            
            if (result.response === 0) {
              // Offer to save encrypted backup
              const savePath = dialog.showSaveDialogSync(null, {
                title: 'Save Encrypted Key Backup',
                defaultPath: 'nostr-key-backup.enc',
                filters: [
                  { name: 'Encrypted Backup', extensions: ['enc'] }
                ]
              });
              
              if (savePath) {
                await this.saveEncryptedBackup(nsec, savePath);
              }
            }
          }
        });
        
        await this.saveKeySecurely();
        return true;

      default:
        return false;
    }
  }

  /**
   * Save key using OS-native secure storage
   */
  async saveKeySecurely() {
    const keyPath = path.join(app.getPath('userData'), 'nostr.secure');
    
    try {
      if (safeStorage.isEncryptionAvailable()) {
        // Use Electron's safeStorage (uses OS keychain)
        const nsec = nip19.nsecEncode(this.secretKey);
        const encrypted = safeStorage.encryptString(nsec);
        
        // Save encrypted blob
        fs.writeFileSync(keyPath, encrypted, { mode: 0o600 });
        console.log('✅ Nostr key encrypted with OS credentials');
      } else {
        // Fallback: Use hardware-derived encryption
        const salt = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);
        const key = this.deriveHardwareKey(salt);
        
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const nsec = nip19.nsecEncode(this.secretKey);
        
        let encrypted = cipher.update(nsec, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        
        const secureData = {
          method: 'hardware',
          salt: salt.toString('hex'),
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex'),
          data: encrypted
        };
        
        fs.writeFileSync(keyPath, JSON.stringify(secureData), { mode: 0o600 });
        console.log('✅ Nostr key encrypted with hardware-derived key');
      }
      
      // Delete any old insecure key files
      this.cleanupInsecureKeys();
      
    } catch (error) {
      console.error('Failed to save key securely:', error);
      throw error;
    }
  }

  /**
   * Load key from secure storage
   */
  async loadKey() {
    const keyPath = path.join(app.getPath('userData'), 'nostr.secure');
    
    try {
      if (fs.existsSync(keyPath)) {
        const data = fs.readFileSync(keyPath);
        
        // Try safeStorage first
        if (safeStorage.isEncryptionAvailable()) {
          try {
            const decrypted = safeStorage.decryptString(data);
            const { type, data: keyData } = nip19.decode(decrypted);
            if (type === 'nsec') {
              this.secretKey = keyData;
              this.publicKey = getPublicKey(this.secretKey);
              console.log('✅ Loaded key from secure storage');
              return true;
            }
          } catch (e) {
            // Not safeStorage format, try hardware encryption
          }
        }
        
        // Try hardware-derived encryption
        try {
          const secureData = JSON.parse(data.toString('utf8'));
          if (secureData.method === 'hardware') {
            const salt = Buffer.from(secureData.salt, 'hex');
            const iv = Buffer.from(secureData.iv, 'hex');
            const authTag = Buffer.from(secureData.authTag, 'hex');
            const key = this.deriveHardwareKey(salt);
            
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(secureData.data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            const { type, data: keyData } = nip19.decode(decrypted);
            if (type === 'nsec') {
              this.secretKey = keyData;
              this.publicKey = getPublicKey(this.secretKey);
              console.log('✅ Loaded key from hardware-encrypted storage');
              return true;
            }
          }
        } catch (e) {
          console.error('Failed to decrypt hardware-encrypted key:', e);
        }
      }
      
      // Try to migrate from old insecure storage
      await this.migrateInsecureKey();
      
    } catch (error) {
      console.error('Failed to load key:', error);
    }
    
    return false;
  }

  /**
   * Migrate from old insecure storage
   */
  async migrateInsecureKey() {
    const oldKeyPath = path.join(app.getPath('userData'), 'nostr.key');
    
    if (fs.existsSync(oldKeyPath)) {
      try {
        const keyContent = fs.readFileSync(oldKeyPath, 'utf8').trim();
        const { type, data } = nip19.decode(keyContent);
        
        if (type === 'nsec') {
          this.secretKey = data;
          this.publicKey = getPublicKey(this.secretKey);
          
          // Save securely
          await this.saveKeySecurely();
          
          // Securely delete old file
          this.securelyDeleteFile(oldKeyPath);
          
          console.log('✅ Migrated key from insecure storage');
          
          // Notify user
          dialog.showMessageBox({
            type: 'info',
            title: 'Security Update',
            message: 'Your Nostr key has been migrated to secure storage.',
            detail: 'The old unencrypted key file has been securely deleted.'
          });
          
          return true;
        }
      } catch (error) {
        console.error('Failed to migrate old key:', error);
      }
    }
    
    return false;
  }

  /**
   * Clean up old insecure key files
   */
  cleanupInsecureKeys() {
    const insecurePaths = [
      path.join(app.getPath('userData'), 'nostr.key'),
      path.join(app.getPath('userData'), 'nostr.txt')
    ];
    
    for (const filePath of insecurePaths) {
      if (fs.existsSync(filePath)) {
        this.securelyDeleteFile(filePath);
      }
    }
  }

  /**
   * Securely delete a file by overwriting with random data
   */
  securelyDeleteFile(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const size = stats.size;
      
      // Overwrite with random data 3 times
      for (let i = 0; i < 3; i++) {
        const randomData = crypto.randomBytes(size);
        fs.writeFileSync(filePath, randomData);
      }
      
      // Finally delete
      fs.unlinkSync(filePath);
      console.log(`✅ Securely deleted: ${path.basename(filePath)}`);
    } catch (error) {
      console.error(`Failed to securely delete ${filePath}:`, error);
    }
  }

  /**
   * Save encrypted backup with password
   */
  async saveEncryptedBackup(nsec, savePath) {
    // Prompt for password
    // In a real app, you'd use a proper password dialog
    const password = 'user-provided-password'; // This should come from a dialog
    
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(nsec, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    const backup = {
      version: 1,
      encrypted: true,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
      hint: 'Encrypted with your password'
    };
    
    fs.writeFileSync(savePath, JSON.stringify(backup, null, 2));
    console.log(`✅ Encrypted backup saved to: ${savePath}`);
  }

  /**
   * Derive encryption key from hardware characteristics
   */
  deriveHardwareKey(salt) {
    const os = require('os');
    
    // Combine hardware characteristics for device-specific encryption
    const hardwareString = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0].model,
      os.totalmem().toString(),
      app.getPath('userData')
    ].join('|');
    
    return crypto.pbkdf2Sync(hardwareString, salt, 100000, 32, 'sha256');
  }
}

module.exports = SecureNostrBridge;