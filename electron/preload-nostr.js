const { contextBridge } = require('electron');
const { generateSecretKey, getPublicKey, finalizeEvent } = require('nostr-tools');

// Expose Nostr functionality directly to the renderer
contextBridge.exposeInMainWorld('nostr', {
  // Generate a new key pair
  generateKeys: () => {
    const sk = generateSecretKey();
    const pk = getPublicKey(sk);
    return { secretKey: sk, publicKey: pk };
  },
  
  // Sign an event with a private key
  signEvent: async (event, secretKey) => {
    try {
      const signedEvent = finalizeEvent(event, secretKey);
      return signedEvent;
    } catch (error) {
      console.error('Failed to sign event:', error);
      throw error;
    }
  },
  
  // Get public key from private key
  getPublicKey: (secretKey) => {
    return getPublicKey(secretKey);
  }
});