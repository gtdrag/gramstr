import { Event, nip19, getPublicKey, getEventHash, finalizeEvent } from 'nostr-tools'
import { KeyEncryption } from './crypto-utils'

export class ElectronNostrService {
  private privateKey: Uint8Array | null = null
  private publicKey: string | null = null
  private initialized: boolean = false

  constructor() {
    // Don't load in constructor since it's async
    // Will load on first use
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.loadKey()
      this.initialized = true
    }
  }

  private async loadKey(): Promise<boolean> {
    try {
      // Try to get decrypted key from session storage first (already in memory)
      const sessionNsec = sessionStorage.getItem('temp_nsec')
      if (sessionNsec) {
        console.log('Loading key from session storage')
        const decoded = nip19.decode(sessionNsec)
        if (decoded.type === 'nsec') {
          this.privateKey = decoded.data as Uint8Array
          // Validate the private key is not all zeros
          const isValid = this.privateKey.some(byte => byte !== 0)
          if (!isValid) {
            console.error('Invalid private key - all zeros')
            this.privateKey = null
            return false
          }
          this.publicKey = getPublicKey(this.privateKey)
          console.log('Key loaded successfully from session')
          return true
        }
      }

      // Try new encrypted format
      const storedV2 = localStorage.getItem('nostr_key_v2')
      if (storedV2) {
        try {
          console.log('Found encrypted key in localStorage')
          const keyData = JSON.parse(storedV2)
          const decryptedNsec = await KeyEncryption.decrypt(
            keyData.encryptedNsec,
            KeyEncryption.getDeviceKey()
          )
          
          console.log('Decrypted nsec:', decryptedNsec.substring(0, 10) + '...')
          
          // Store in session for this session
          sessionStorage.setItem('temp_nsec', decryptedNsec)
          
          const decoded = nip19.decode(decryptedNsec)
          if (decoded.type === 'nsec') {
            this.privateKey = decoded.data as Uint8Array
            
            // Validate the private key
            const isValid = this.privateKey.some(byte => byte !== 0) && this.privateKey.length === 32
            if (!isValid) {
              console.error('Invalid private key after decryption - length:', this.privateKey.length)
              this.privateKey = null
              return false
            }
            
            this.publicKey = getPublicKey(this.privateKey)
            console.log('Key loaded and decrypted successfully')
            return true
          }
        } catch (e) {
          console.error('Failed to decrypt key:', e)
        }
      }

      // Try old unencrypted format (for backwards compatibility)
      const stored = localStorage.getItem('nostr_key')
      if (stored) {
        const keyData = JSON.parse(stored)
        if (keyData.nsec) {
          const decoded = nip19.decode(keyData.nsec)
          if (decoded.type === 'nsec') {
            this.privateKey = decoded.data as Uint8Array
            this.publicKey = getPublicKey(this.privateKey)
            
            // Migrate to encrypted format
            const encryptedNsec = await KeyEncryption.encrypt(
              keyData.nsec,
              KeyEncryption.getDeviceKey()
            )
            const newKeyData = {
              npub: keyData.npub,
              encryptedNsec,
              addedAt: keyData.addedAt || new Date().toISOString()
            }
            localStorage.setItem('nostr_key_v2', JSON.stringify(newKeyData))
            localStorage.removeItem('nostr_key') // Remove old format
            sessionStorage.setItem('temp_nsec', keyData.nsec)
            
            return true
          }
        }
      }

      return false
    } catch (error) {
      console.error('Failed to load Nostr key:', error)
      return false
    }
  }

  hasKey(): boolean {
    // This is synchronous, check localStorage directly
    const storedV2 = localStorage.getItem('nostr_key_v2')
    const storedOld = localStorage.getItem('nostr_key')
    return !!(storedV2 || storedOld)
  }

  getPublicKey(): string | null {
    // For synchronous access, try to get from storage if not loaded
    if (!this.publicKey && !this.initialized) {
      const storedV2 = localStorage.getItem('nostr_key_v2')
      if (storedV2) {
        try {
          const keyData = JSON.parse(storedV2)
          // Extract pubkey from npub if stored
          if (keyData.npub) {
            const decoded = nip19.decode(keyData.npub)
            if (decoded.type === 'npub') {
              this.publicKey = decoded.data as string
            }
          }
        } catch (e) {
          console.error('Failed to extract public key:', e)
        }
      }
    }
    return this.publicKey
  }

  getNpub(): string | null {
    const pubkey = this.getPublicKey()
    if (!pubkey) return null
    return nip19.npubEncode(pubkey)
  }

  async signEvent(event: Partial<Event>): Promise<Event | null> {
    await this.ensureInitialized()
    
    if (!this.privateKey) {
      throw new Error('No Nostr key configured')
    }

    try {
      // Ensure we have public key
      if (!this.publicKey) {
        console.error('Public key not loaded even after initialization')
        return null
      }

      // Create unsigned event
      const unsignedEvent = {
        kind: event.kind || 1,
        created_at: event.created_at || Math.floor(Date.now() / 1000),
        tags: event.tags || [],
        content: event.content || '',
        pubkey: this.publicKey,
      }

      console.log('Signing event with privateKey length:', this.privateKey.length)
      console.log('Public key:', this.publicKey)

      // Sign and finalize the event
      const signedEvent = finalizeEvent(unsignedEvent, this.privateKey)

      return signedEvent
    } catch (error) {
      console.error('Failed to sign event:', error)
      console.error('Private key available:', !!this.privateKey)
      console.error('Public key:', this.publicKey)
      return null
    }
  }

  // Check if we're in Electron and have a key
  static isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    if (!(window as any).electron) return false
    
    // Check for either encrypted or old format
    const storedV2 = localStorage.getItem('nostr_key_v2')
    const storedOld = localStorage.getItem('nostr_key')
    return storedV2 !== null || storedOld !== null
  }
}

// Singleton instance
let electronNostrInstance: ElectronNostrService | null = null

export function getElectronNostr(): ElectronNostrService | null {
  if (typeof window === 'undefined') return null
  if (!(window as any).electron) return null
  
  if (!electronNostrInstance) {
    electronNostrInstance = new ElectronNostrService()
  }
  
  return electronNostrInstance
}

// Function to reset the singleton (useful after importing a new key)
export function resetElectronNostr(): void {
  electronNostrInstance = null
}