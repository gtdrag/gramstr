// NOSTR Provider for Alby/NIP-07 extensions
// Handles connection, detection, and signing

export interface NostrWindow {
  nostr?: {
    getPublicKey(): Promise<string>
    signEvent(event: NostrEvent): Promise<NostrEvent>
    getRelays?(): Promise<{ [url: string]: { read: boolean; write: boolean } }>
    nip04?: {
      encrypt(pubkey: string, plaintext: string): Promise<string>
      decrypt(pubkey: string, ciphertext: string): Promise<string>
    }
  }
}

export interface NostrEvent {
  id?: string
  kind: number
  created_at: number
  tags: string[][]
  content: string
  pubkey?: string
  sig?: string
}

declare global {
  interface Window extends NostrWindow {}
}

export class NostrProvider {
  private static instance: NostrProvider
  private connected: boolean = false
  private publicKey: string | null = null

  private constructor() {}

  static getInstance(): NostrProvider {
    if (!NostrProvider.instance) {
      NostrProvider.instance = new NostrProvider()
    }
    return NostrProvider.instance
  }

  /**
   * Check if Alby or another NIP-07 extension is installed
   */
  isExtensionAvailable(): boolean {
    return typeof window !== 'undefined' && window.nostr !== undefined
  }

  /**
   * Wait for extension to be available (useful after page load)
   */
  async waitForExtension(timeout: number = 3000): Promise<boolean> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (this.isExtensionAvailable()) {
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    return false
  }

  /**
   * Connect to the NOSTR extension and get public key
   */
  async connect(): Promise<string> {
    if (!this.isExtensionAvailable()) {
      throw new Error('No NOSTR extension found. Please install Alby.')
    }

    try {
      this.publicKey = await window.nostr!.getPublicKey()
      this.connected = true
      
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('nostr_pubkey', this.publicKey)
        localStorage.setItem('nostr_connected', 'true')
      }
      
      return this.publicKey
    } catch (error) {
      console.error('Failed to connect to NOSTR:', error)
      throw new Error('Failed to connect to NOSTR extension. Please try again.')
    }
  }

  /**
   * Disconnect and clear stored data
   */
  disconnect(): void {
    this.connected = false
    this.publicKey = null
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nostr_pubkey')
      localStorage.removeItem('nostr_connected')
    }
  }

  /**
   * Get the current public key (if connected)
   */
  getPublicKey(): string | null {
    if (!this.publicKey && typeof window !== 'undefined') {
      // Try to restore from localStorage
      const stored = localStorage.getItem('nostr_pubkey')
      if (stored && localStorage.getItem('nostr_connected') === 'true') {
        this.publicKey = stored
        this.connected = true
      }
    }
    return this.publicKey
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    if (!this.connected && typeof window !== 'undefined') {
      // Check localStorage for persistent connection
      this.connected = localStorage.getItem('nostr_connected') === 'true'
    }
    return this.connected && this.isExtensionAvailable()
  }

  /**
   * Sign a NOSTR event
   */
  async signEvent(event: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>): Promise<NostrEvent> {
    if (!this.isExtensionAvailable()) {
      throw new Error('No NOSTR extension found')
    }

    if (!this.connected) {
      throw new Error('Not connected to NOSTR')
    }

    try {
      const signedEvent = await window.nostr!.signEvent({
        ...event,
        pubkey: this.publicKey!,
      })
      return signedEvent
    } catch (error) {
      console.error('Failed to sign event:', error)
      throw new Error('Failed to sign event. Please try again.')
    }
  }

  /**
   * Get relays from extension (if supported)
   */
  async getRelays(): Promise<{ [url: string]: { read: boolean; write: boolean } } | null> {
    if (!this.isExtensionAvailable() || !window.nostr?.getRelays) {
      return null
    }

    try {
      return await window.nostr.getRelays()
    } catch (error) {
      console.error('Failed to get relays:', error)
      return null
    }
  }

  /**
   * Convert hex pubkey to npub format
   */
  hexToNpub(hex: string): string {
    // This is a simplified version - in production you'd use nostr-tools
    return `npub1${hex}`
  }

  /**
   * Convert npub to hex format
   */
  npubToHex(npub: string): string {
    // This is a simplified version - in production you'd use nostr-tools
    if (npub.startsWith('npub1')) {
      return npub.slice(5)
    }
    return npub
  }
}

export const nostrProvider = NostrProvider.getInstance()