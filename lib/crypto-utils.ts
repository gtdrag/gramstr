// Simple encryption for Nostr keys using Web Crypto API
// In production, consider using a more robust solution

export class KeyEncryption {
  private static readonly SALT = 'gramstr-nostr-key-v1'
  private static readonly ITERATIONS = 100000

  // Derive encryption key from a user's passphrase
  private static async deriveKey(passphrase: string): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(this.SALT),
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Encrypt the nsec
  static async encrypt(nsec: string, passphrase: string): Promise<string> {
    try {
      const key = await this.deriveKey(passphrase)
      const encoder = new TextEncoder()
      const data = encoder.encode(nsec)
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv, 0)
      combined.set(new Uint8Array(encrypted), iv.length)

      // Return as base64
      return btoa(String.fromCharCode(...combined))
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('Failed to encrypt key')
    }
  }

  // Decrypt the nsec
  static async decrypt(encryptedData: string, passphrase: string): Promise<string> {
    try {
      const key = await this.deriveKey(passphrase)
      
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      )

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('Failed to decrypt key - incorrect passphrase?')
    }
  }

  // Generate a device-specific key (better than nothing, but not user-controlled)
  static getDeviceKey(): string {
    // Use some device-specific data as a basic key
    // This is NOT highly secure but better than plaintext
    const deviceData = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset()
    ].join('-')
    
    return btoa(deviceData).slice(0, 32)
  }
}