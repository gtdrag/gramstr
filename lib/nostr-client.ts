/**
 * Client-side NOSTR utilities for secure operations
 */

import { EventTemplate, validateEvent, verifyEvent } from 'nostr-tools'

declare global {
  interface Window {
    nostrSecure?: {
      storeKey: (nsec: string) => Promise<{ success: boolean; error?: string }>
      getKey: () => Promise<{ success: boolean; key?: string; error?: string }>
      signEvent: (event: EventTemplate) => Promise<{ success: boolean; event?: any; error?: string }>
      hasKey: () => Promise<{ success: boolean; hasKey?: boolean }>
      migrateKey: () => Promise<{ success: boolean; message?: string; error?: string }>
    }
    electron?: {
      isElectron: boolean
    }
  }
}

export class NostrClient {
  static isElectron(): boolean {
    return typeof window !== 'undefined' && 
           window.electron?.isElectron === true &&
           window.nostrSecure !== undefined
  }

  static async hasStoredKey(): Promise<boolean> {
    if (!this.isElectron()) return false
    
    try {
      const result = await window.nostrSecure!.hasKey()
      return result.success && result.hasKey === true
    } catch (error) {
      console.error('Failed to check for stored key:', error)
      return false
    }
  }

  static async storeKey(nsec: string): Promise<boolean> {
    if (!this.isElectron()) {
      console.warn('Cannot store key: not running in Electron')
      return false
    }

    try {
      const result = await window.nostrSecure!.storeKey(nsec)
      if (result.success) {
        console.log('✅ NOSTR key stored securely')
        return true
      } else {
        console.error('Failed to store key:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error storing key:', error)
      return false
    }
  }

  static async signEvent(eventTemplate: EventTemplate): Promise<any | null> {
    if (!this.isElectron()) {
      console.warn('Cannot sign event: not running in Electron')
      return null
    }

    try {
      const result = await window.nostrSecure!.signEvent(eventTemplate)
      if (result.success && result.event) {
        // Validate the signed event
        if (validateEvent(result.event) && verifyEvent(result.event)) {
          return result.event
        } else {
          console.error('Invalid signed event received')
          return null
        }
      } else {
        console.error('Failed to sign event:', result.error)
        return null
      }
    } catch (error) {
      console.error('Error signing event:', error)
      return null
    }
  }

  static async migrateFromEnvironment(): Promise<boolean> {
    if (!this.isElectron()) return false

    try {
      const result = await window.nostrSecure!.migrateKey()
      if (result.success) {
        console.log('✅', result.message || 'Key migrated successfully')
        return true
      } else {
        console.error('Migration failed:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error during migration:', error)
      return false
    }
  }

  static async postToNostr(contentId: string, includeSource = false): Promise<any> {
    // Check if we're in Electron and can sign locally
    if (this.isElectron() && await this.hasStoredKey()) {
      try {
        // Fetch content details first
        const response = await fetch(`/api/content/${contentId}`)
        if (!response.ok) throw new Error('Failed to fetch content')
        const content = await response.json()

        // Create the event template
        const eventTemplate: EventTemplate = {
          kind: 1,
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: content.caption || ''
        }

        // Add media if present
        if (content.supabaseFileUrl) {
          eventTemplate.content += `\n\n${content.supabaseFileUrl}`
        }

        // Sign the event locally
        const signedEvent = await this.signEvent(eventTemplate)
        if (!signedEvent) {
          throw new Error('Failed to sign event locally')
        }

        // Send the pre-signed event to the API
        const postResponse = await fetch('/api/nostr/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            signedEvent,
            includeSource
          })
        })

        if (!postResponse.ok) {
          const error = await postResponse.json()
          throw new Error(error.error || 'Failed to post to NOSTR')
        }

        return await postResponse.json()
      } catch (error) {
        console.error('Error posting with local signing:', error)
        throw error
      }
    } else {
      // Fallback to server-side signing (requires env key)
      const response = await fetch('/api/nostr/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, includeSource })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to post to NOSTR')
      }

      return await response.json()
    }
  }
}

// Auto-migrate on load if in Electron
if (typeof window !== 'undefined' && NostrClient.isElectron()) {
  NostrClient.migrateFromEnvironment().then(success => {
    if (success) {
      console.log('NOSTR key migration completed')
    }
  })
}