'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Shield, ExternalLink, Key, AlertCircle } from 'lucide-react'
import { Event, getPublicKey, getEventHash, getSignature } from 'nostr-tools'

type SignerMethod = 'alby-web' | 'nos2x' | 'local-temp' | null

export function NostrSigner() {
  const [signerMethod, setSignerMethod] = useState<SignerMethod>(null)
  const [isElectron, setIsElectron] = useState(false)
  const [hasExtension, setHasExtension] = useState(false)
  const [tempKey, setTempKey] = useState<string | null>(null)

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electron)
    
    // Check for browser extensions
    if (typeof window !== 'undefined') {
      setHasExtension(!!(window as any).nostr)
    }
  }, [])

  const openInBrowser = () => {
    if ((window as any).electron?.openExternal) {
      (window as any).electron.openExternal('http://localhost:3000')
    } else {
      window.open('http://localhost:3000', '_blank')
    }
  }

  const generateTempKey = () => {
    // Generate a temporary key for this session only
    // This is stored in memory, never saved to disk
    const privateKey = crypto.getRandomValues(new Uint8Array(32))
    const publicKey = getPublicKey(privateKey)
    
    // Store in sessionStorage (cleared when app closes)
    sessionStorage.setItem('tempNostrKey', Buffer.from(privateKey).toString('hex'))
    setTempKey(Buffer.from(publicKey).toString('hex'))
    setSignerMethod('local-temp')
    
    return publicKey
  }

  const signEvent = async (event: Event): Promise<Event> => {
    switch (signerMethod) {
      case 'alby-web':
      case 'nos2x':
        // Use browser extension (when in web browser)
        if ((window as any).nostr) {
          return await (window as any).nostr.signEvent(event)
        }
        throw new Error('Extension not available')

      case 'local-temp':
        // Use temporary key from session storage
        const keyHex = sessionStorage.getItem('tempNostrKey')
        if (!keyHex) throw new Error('No temporary key found')
        
        const privateKey = Buffer.from(keyHex, 'hex')
        event.pubkey = getPublicKey(privateKey)
        event.id = getEventHash(event)
        event.sig = getSignature(event, privateKey)
        return event

      default:
        throw new Error('No signer method selected')
    }
  }

  if (isElectron && !hasExtension) {
    return (
      <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold">Nostr Signing Options</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Browser extensions like Alby don't work in desktop apps. Choose how you'd like to sign Nostr events:
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Option 1: Maximum Security */}
            <Card className="p-4 border-green-500/30 bg-green-500/5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Maximum Security (Recommended)</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use Alby in your web browser. Your private key never touches this app.
                </p>
                <Button 
                  onClick={openInBrowser}
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Browser with Alby
                </Button>
              </div>
            </Card>

            {/* Option 2: Temporary Key */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className="font-medium">Temporary Test Key</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Generate a disposable key for testing. Deleted when you close the app.
                </p>
                <Button 
                  onClick={generateTempKey}
                  className="w-full"
                  variant="outline"
                >
                  Generate Temporary Key
                </Button>
                {tempKey && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs font-mono truncate">
                    Temp pubkey: {tempKey.slice(0, 16)}...
                  </div>
                )}
              </div>
            </Card>

            {/* Privacy Notice */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <strong>Your Privacy Matters:</strong> This app never stores or transmits private keys. 
                Temporary keys exist only in memory and are deleted when the app closes.
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Regular web browser view
  if (hasExtension) {
    return (
      <Card className="p-4 border-green-500/50 bg-green-500/5">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-medium">Nostr Extension Detected</p>
            <p className="text-sm text-muted-foreground">
              Ready to sign with {(window as any).nostr?.alby ? 'Alby' : 'NOS2X'}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return null
}

// Utility function to check signer availability
export async function getNostrSigner() {
  // In browser with extension
  if (typeof window !== 'undefined' && (window as any).nostr) {
    return {
      type: 'extension',
      getPublicKey: async () => await (window as any).nostr.getPublicKey(),
      signEvent: async (event: Event) => await (window as any).nostr.signEvent(event),
    }
  }

  // In Electron with temp key
  const tempKey = sessionStorage.getItem('tempNostrKey')
  if (tempKey) {
    const privateKey = Buffer.from(tempKey, 'hex')
    return {
      type: 'temp',
      getPublicKey: async () => getPublicKey(privateKey),
      signEvent: async (event: Event) => {
        event.pubkey = getPublicKey(privateKey)
        event.id = getEventHash(event)
        event.sig = getSignature(event, privateKey)
        return event
      },
    }
  }

  return null
}