'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Key, AlertCircle, CheckCircle } from 'lucide-react'
import { NostrClient } from '@/lib/nostr-client'
import { generateSecretKey, getPublicKey } from 'nostr-tools'
import { bytesToHex } from '@noble/curves/abstract/utils'
import * as nip19 from 'nostr-tools/nip19'

export function NostrSetup() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [nsec, setNsec] = useState('')
  const [npub, setNpub] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    checkForKey()
  }, [])

  const checkForKey = async () => {
    if (NostrClient.isElectron()) {
      const hasStoredKey = await NostrClient.hasStoredKey()
      setHasKey(hasStoredKey)
    } else {
      setHasKey(false)
    }
  }

  const generateNewKey = () => {
    try {
      const secretKey = generateSecretKey()
      const publicKey = getPublicKey(secretKey)
      
      const nsecKey = nip19.nsecEncode(secretKey)
      const npubKey = nip19.npubEncode(publicKey)
      
      setNsec(nsecKey)
      setNpub(npubKey)
      setMessage({ type: 'success', text: 'New key pair generated! Save your private key (nsec) securely.' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate keys' })
    }
  }

  const saveKey = async () => {
    if (!nsec) {
      setMessage({ type: 'error', text: 'Please enter a private key' })
      return
    }

    if (!nsec.startsWith('nsec1')) {
      setMessage({ type: 'error', text: 'Invalid key format. Key must start with nsec1' })
      return
    }

    setIsLoading(true)
    try {
      const success = await NostrClient.storeKey(nsec)
      if (success) {
        setMessage({ type: 'success', text: 'Key stored securely in OS keychain!' })
        setNsec('') // Clear from memory
        await checkForKey()
      } else {
        setMessage({ type: 'error', text: 'Failed to store key securely' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error storing key: ' + (error as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  const migrateKey = async () => {
    setIsLoading(true)
    try {
      const success = await NostrClient.migrateFromEnvironment()
      if (success) {
        setMessage({ type: 'success', text: 'Key migrated from environment to secure storage!' })
        await checkForKey()
      } else {
        setMessage({ type: 'error', text: 'No key found to migrate or migration failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Migration error: ' + (error as Error).message })
    } finally {
      setIsLoading(false)
    }
  }

  if (!NostrClient.isElectron()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>NOSTR Configuration</CardTitle>
          <CardDescription>
            Secure NOSTR key storage is only available in the desktop app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              Please use the desktop application for secure NOSTR key management
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          NOSTR Secure Setup
        </CardTitle>
        <CardDescription>
          Your private key is stored securely in your OS keychain, never in files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasKey === true ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>NOSTR key is securely stored</span>
          </div>
        ) : hasKey === false ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span>No NOSTR key configured</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Private Key (nsec)</label>
              <Input
                type="password"
                placeholder="nsec1..."
                value={nsec}
                onChange={(e) => setNsec(e.target.value)}
              />
              {npub && (
                <div className="text-sm text-muted-foreground">
                  Public key: {npub}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={generateNewKey} variant="outline">
                <Key className="h-4 w-4 mr-2" />
                Generate New
              </Button>
              <Button onClick={saveKey} disabled={!nsec || isLoading}>
                Save Securely
              </Button>
              <Button onClick={migrateKey} variant="secondary" disabled={isLoading}>
                Migrate from .env
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-pulse">Checking for stored key...</div>
        )}

        {message && (
          <div className={`p-3 rounded-md text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}