/**
 * Secure Key Manager for Electron
 * Uses OS native keychain/credential manager for maximum security
 */

const { app, safeStorage } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Try to load keytar, but don't fail if it's not available
let keytar;
try {
  keytar = require('keytar');
  console.log('✅ Keytar module loaded - OS keychain available');
} catch (error) {
  console.log('⚠️ Keytar not available - will use Electron safeStorage instead');
  keytar = null;
}

class SecureKeyManager {
  constructor() {
    this.service = 'com.gramstr.app';
    this.account = 'nostr_keys';
    this.dbAccount = 'database_credentials';
  }

  /**
   * Check if OS keychain is available
   */
  async isKeychainAvailable() {
    if (!keytar) {
      return false;
    }
    try {
      // Test keychain access
      await keytar.setPassword('test-service', 'test-account', 'test');
      await keytar.deletePassword('test-service', 'test-account');
      return true;
    } catch (error) {
      console.error('Keychain not available:', error);
      return false;
    }
  }

  /**
   * Store Nostr private key securely
   */
  async storeNostrKey(nsec) {
    try {
      // Option 1: Use OS Keychain (most secure)
      if (await this.isKeychainAvailable()) {
        await keytar.setPassword(this.service, this.account, nsec);
        console.log('✅ Nostr key stored in OS keychain');
        return { method: 'keychain', success: true };
      }

      // Option 2: Use Electron's safeStorage (encrypted with OS credentials)
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(nsec);
        const keyPath = path.join(app.getPath('userData'), 'nostr.encrypted');
        
        // Save with restricted permissions
        fs.writeFileSync(keyPath, encrypted, { mode: 0o600 });
        console.log('✅ Nostr key encrypted with safeStorage');
        return { method: 'safeStorage', success: true };
      }

      // Option 3: Fallback with strong encryption
      const salt = crypto.randomBytes(32);
      const key = this.deriveKeyFromHardware(salt);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, salt.slice(0, 16));
      
      let encrypted = cipher.update(nsec, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();

      const keyData = {
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        encrypted: encrypted
      };

      const keyPath = path.join(app.getPath('userData'), 'nostr.secure');
      fs.writeFileSync(keyPath, JSON.stringify(keyData), { mode: 0o600 });
      console.log('✅ Nostr key encrypted with hardware-derived key');
      return { method: 'encrypted', success: true };

    } catch (error) {
      console.error('Failed to store key securely:', error);
      throw error;
    }
  }

  /**
   * Retrieve Nostr private key
   */
  async retrieveNostrKey() {
    try {
      // Try keychain first
      if (await this.isKeychainAvailable()) {
        const nsec = await keytar.getPassword(this.service, this.account);
        if (nsec) return nsec;
      }

      // Try safeStorage
      const encryptedPath = path.join(app.getPath('userData'), 'nostr.encrypted');
      if (fs.existsSync(encryptedPath) && safeStorage.isEncryptionAvailable()) {
        const encrypted = fs.readFileSync(encryptedPath);
        return safeStorage.decryptString(encrypted);
      }

      // Try encrypted fallback
      const securePath = path.join(app.getPath('userData'), 'nostr.secure');
      if (fs.existsSync(securePath)) {
        const keyData = JSON.parse(fs.readFileSync(securePath, 'utf8'));
        const salt = Buffer.from(keyData.salt, 'hex');
        const key = this.deriveKeyFromHardware(salt);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, salt.slice(0, 16));
        decipher.setAuthTag(Buffer.from(keyData.authTag, 'hex'));
        
        let decrypted = decipher.update(keyData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve key:', error);
      return null;
    }
  }

  /**
   * Delete stored keys
   */
  async deleteNostrKey() {
    try {
      // Delete from keychain
      if (await this.isKeychainAvailable()) {
        await keytar.deletePassword(this.service, this.account);
      }

      // Delete encrypted files
      const paths = [
        path.join(app.getPath('userData'), 'nostr.key'),
        path.join(app.getPath('userData'), 'nostr.encrypted'),
        path.join(app.getPath('userData'), 'nostr.secure')
      ];

      for (const filePath of paths) {
        if (fs.existsSync(filePath)) {
          // Overwrite with random data before deletion
          const size = fs.statSync(filePath).size;
          const randomData = crypto.randomBytes(size);
          fs.writeFileSync(filePath, randomData);
          fs.unlinkSync(filePath);
        }
      }

      console.log('✅ Nostr keys securely deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete keys:', error);
      return false;
    }
  }

  /**
   * Store database credentials securely (never hardcode!)
   */
  async storeDatabaseCredentials(credentials) {
    try {
      const credString = JSON.stringify(credentials);
      
      if (await this.isKeychainAvailable()) {
        await keytar.setPassword(this.service, this.dbAccount, credString);
        return true;
      }

      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(credString);
        const dbPath = path.join(app.getPath('userData'), 'db.encrypted');
        fs.writeFileSync(dbPath, encrypted, { mode: 0o600 });
        return true;
      }

      throw new Error('No secure storage available for database credentials');
    } catch (error) {
      console.error('Failed to store database credentials:', error);
      return false;
    }
  }

  /**
   * Retrieve database credentials
   */
  async retrieveDatabaseCredentials() {
    try {
      // Try keychain
      if (await this.isKeychainAvailable()) {
        const creds = await keytar.getPassword(this.service, this.dbAccount);
        if (creds) return JSON.parse(creds);
      }

      // Try safeStorage
      const dbPath = path.join(app.getPath('userData'), 'db.encrypted');
      if (fs.existsSync(dbPath) && safeStorage.isEncryptionAvailable()) {
        const encrypted = fs.readFileSync(dbPath);
        const decrypted = safeStorage.decryptString(encrypted);
        return JSON.parse(decrypted);
      }

      // Fallback to environment variables (for development)
      if (process.env.NODE_ENV === 'development') {
        return {
          DATABASE_URL: process.env.DATABASE_URL,
          SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve database credentials:', error);
      return null;
    }
  }

  /**
   * Derive encryption key from hardware characteristics
   * This makes the encryption device-specific
   */
  deriveKeyFromHardware(salt) {
    const os = require('os');
    
    // Combine multiple hardware characteristics
    const hardwareId = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0].model,
      os.totalmem(),
      app.getPath('userData')
    ].join('|');

    // Derive a key using PBKDF2
    return crypto.pbkdf2Sync(hardwareId, salt, 100000, 32, 'sha256');
  }

  /**
   * Migrate from insecure storage
   */
  async migrateInsecureKeys() {
    const migrations = [];
    
    // Check for old plain text nostr.key
    const oldKeyPath = path.join(app.getPath('userData'), 'nostr.key');
    if (fs.existsSync(oldKeyPath)) {
      try {
        const nsec = fs.readFileSync(oldKeyPath, 'utf8').trim();
        await this.storeNostrKey(nsec);
        
        // Securely delete old file
        const size = fs.statSync(oldKeyPath).size;
        const randomData = crypto.randomBytes(size);
        fs.writeFileSync(oldKeyPath, randomData);
        fs.unlinkSync(oldKeyPath);
        
        migrations.push('Migrated nostr.key to secure storage');
      } catch (error) {
        console.error('Failed to migrate nostr.key:', error);
      }
    }

    return migrations;
  }

  /**
   * Security audit function
   */
  async auditSecurity() {
    const issues = [];
    const recommendations = [];

    // Check for insecure key storage
    const insecurePaths = [
      path.join(app.getPath('userData'), 'nostr.key'),
      path.join(app.getPath('userData'), 'instagram_cookies.txt'),
      path.join(app.getPath('userData'), 'session_cookies.json')
    ];

    for (const filePath of insecurePaths) {
      if (fs.existsSync(filePath)) {
        issues.push(`Insecure file found: ${path.basename(filePath)}`);
      }
    }

    // Check keychain availability
    if (!await this.isKeychainAvailable()) {
      recommendations.push('OS keychain not available - using fallback encryption');
    }

    // Check safeStorage
    if (!safeStorage.isEncryptionAvailable()) {
      recommendations.push('Electron safeStorage not available - using custom encryption');
    }

    return { issues, recommendations };
  }
}

module.exports = SecureKeyManager;