/**
 * Secure Bridge for NOSTR Operations
 * Handles secure key storage and signing operations
 */

const { ipcMain } = require('electron');
const SecureKeyManager = require('./secure-key-manager');

class NostrSecureBridge {
  constructor() {
    this.keyManager = new SecureKeyManager();
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    // Handle storing NOSTR key securely
    ipcMain.handle('nostr:store-key', async (event, nsec) => {
      try {
        const result = await this.keyManager.storeNostrKey(nsec);
        return { success: true, ...result };
      } catch (error) {
        console.error('Failed to store NOSTR key:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle retrieving NOSTR key
    ipcMain.handle('nostr:get-key', async (event) => {
      try {
        const nsec = await this.keyManager.getNostrKey();
        if (!nsec) {
          return { success: false, error: 'No key stored' };
        }
        return { success: true, key: nsec };
      } catch (error) {
        console.error('Failed to get NOSTR key:', error);
        return { success: false, error: error.message };
      }
    });

    // Handle signing events securely (key never leaves main process)
    ipcMain.handle('nostr:sign-event', async (event, eventData) => {
      try {
        const nsec = await this.keyManager.getNostrKey();
        if (!nsec) {
          return { success: false, error: 'No key available for signing' };
        }

        // For now, return the key to be signed in renderer
        // This is temporary until we can bundle nostr-tools properly
        // The renderer will handle signing and we'll improve this later
        return { success: false, error: 'Signing in main process not yet implemented - use renderer signing' };
      } catch (error) {
        console.error('Failed to sign event:', error);
        return { success: false, error: error.message };
      }
    });

    // Check if key exists
    ipcMain.handle('nostr:has-key', async (event) => {
      try {
        const nsec = await this.keyManager.getNostrKey();
        return { success: true, hasKey: !!nsec };
      } catch (error) {
        return { success: true, hasKey: false };
      }
    });

    // Migrate from environment variable to secure storage
    ipcMain.handle('nostr:migrate-key', async (event) => {
      try {
        // Check if key already stored securely
        const existingKey = await this.keyManager.getNostrKey();
        if (existingKey) {
          return { success: true, message: 'Key already migrated' };
        }

        // Check for key in environment
        const envKey = process.env.NOSTR_PRIVATE_KEY;
        if (!envKey) {
          return { success: false, error: 'No key found to migrate' };
        }

        // Store securely
        await this.keyManager.storeNostrKey(envKey);
        
        // Clear from environment
        delete process.env.NOSTR_PRIVATE_KEY;
        
        return { success: true, message: 'Key migrated successfully' };
      } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: error.message };
      }
    });
  }

}

module.exports = NostrSecureBridge;