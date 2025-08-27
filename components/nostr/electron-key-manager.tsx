'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Key, Lock, Eye, EyeOff, Trash2, AlertCircle, Check } from 'lucide-react'
import { nip19, getPublicKey } from 'nostr-tools'
import { toast } from 'sonner'
import { KeyEncryption } from '@/lib/crypto-utils'
import { resetElectronNostr } from '@/lib/nostr-electron'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface StoredKey {
  npub: string
  encryptedNsec: string // Actually encrypted now
  addedAt: string
}

export function ElectronKeyManager() {
  const [showImport, setShowImport] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [storedKey, setStoredKey] = useState<StoredKey | null>(null)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electron)
    loadStoredKey()
  }, [])

  const loadStoredKey = async () => {
    // Try new encrypted format first
    const storedV2 = localStorage.getItem('nostr_key_v2')
    if (storedV2) {
      try {
        const key = JSON.parse(storedV2)
        // Try to decrypt to verify it's valid
        const decrypted = await KeyEncryption.decrypt(key.encryptedNsec, KeyEncryption.getDeviceKey())
        sessionStorage.setItem('temp_nsec', decrypted)
        setStoredKey(key)
        return
      } catch (e) {
        console.error('Failed to load encrypted key:', e)
        // Key might be corrupted or device changed
        localStorage.removeItem('nostr_key_v2')
      }
    }
    
    // Fallback to old format and migrate
    const oldStored = localStorage.getItem('nostr_key')
    if (oldStored) {
      try {
        const oldKey = JSON.parse(oldStored)
        // Migrate to encrypted format
        const encryptedNsec = await KeyEncryption.encrypt(oldKey.nsec, KeyEncryption.getDeviceKey())
        const newKey: StoredKey = {
          npub: oldKey.npub,
          encryptedNsec,
          addedAt: oldKey.addedAt
        }
        localStorage.setItem('nostr_key_v2', JSON.stringify(newKey))
        localStorage.removeItem('nostr_key') // Remove old unencrypted version
        sessionStorage.setItem('temp_nsec', oldKey.nsec)
        setStoredKey(newKey)
      } catch (e) {
        console.error('Failed to migrate old key:', e)
      }
    }
  }

  const validateAndStoreKey = async (input: string) => {
    try {
      let privateKey: Uint8Array
      let nsec: string

      // Handle different input formats
      if (input.startsWith('nsec1')) {
        // Bech32 format
        const decoded = nip19.decode(input)
        if (decoded.type !== 'nsec') {
          throw new Error('Invalid key type. Please provide an nsec private key.')
        }
        privateKey = decoded.data as Uint8Array
        nsec = input
      } else if (input.length === 64 && /^[0-9a-fA-F]+$/.test(input)) {
        // Hex format
        privateKey = new Uint8Array(Buffer.from(input, 'hex'))
        nsec = nip19.nsecEncode(privateKey)
      } else {
        throw new Error('Invalid key format. Please provide an nsec or hex private key.')
      }

      // Get public key
      const publicKey = getPublicKey(privateKey)
      const npub = nip19.npubEncode(publicKey)

      // Encrypt the nsec with device-specific key
      const encryptedNsec = await KeyEncryption.encrypt(nsec, KeyEncryption.getDeviceKey())

      // Store the encrypted key
      const keyData: StoredKey = {
        npub,
        encryptedNsec,
        addedAt: new Date().toISOString()
      }

      localStorage.setItem('nostr_key_v2', JSON.stringify(keyData))
      sessionStorage.setItem('temp_nsec', nsec) // Keep decrypted in memory for this session
      setStoredKey(keyData)
      setKeyInput('')
      setShowImport(false)
      
      // Reset the singleton so it reloads with the new key
      resetElectronNostr()
      
      // Trigger a page reload to ensure everything reinitializes
      window.location.reload()
      
      toast.success('Nostr key imported and encrypted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid key format')
    }
  }

  const deleteKey = () => {
    localStorage.removeItem('nostr_key_v2')
    localStorage.removeItem('nostr_key') // Clean up old format too
    sessionStorage.removeItem('temp_nsec')
    setStoredKey(null)
    
    // Reset the singleton
    resetElectronNostr()
    
    toast.success('Nostr key removed')
  }

  if (!isElectron) {
    return null
  }

  if (storedKey) {
    return (
      <Card className="p-4 border-green-500/30 bg-green-500/5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-500" />
              <span className="font-medium">Nostr Key Configured</span>
            </div>
            <Check className="h-4 w-4 text-green-500" />
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Public key: </span>
              <code className="text-xs bg-gray-800 px-1 py-0.5 rounded">
                {storedKey.npub.slice(0, 20)}...{storedKey.npub.slice(-4)}
              </code>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Private key: </span>
              {showKey ? (
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-gray-800 px-1 py-0.5 rounded flex-1 break-all">
                    {sessionStorage.getItem('temp_nsec') || '••••••••'}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowKey(false)}
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowKey(true)}
                  className="ml-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Show
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Added {new Date(storedKey.addedAt).toLocaleDateString()}
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="w-full">
                <Trash2 className="h-3 w-3 mr-2" />
                Remove Key
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Nostr Key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete your stored Nostr key from this app. 
                  You'll need to import it again to post to Nostr.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteKey}>
                  Remove Key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-yellow-500" />
          <span className="font-medium">Import Nostr Key</span>
        </div>

        {!showImport ? (
          <>
            <p className="text-sm text-muted-foreground">
              Import your Nostr private key to post directly from the desktop app.
            </p>
            
            <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded text-xs">
              <AlertCircle className="h-3 w-3 text-blue-400 mt-0.5" />
              <div>
                <strong>Privacy Note:</strong> Your key is encrypted and stored locally on this device only, 
                never sent to any server.
              </div>
            </div>

            <Button 
              onClick={() => setShowImport(true)}
              className="w-full"
              variant="outline"
            >
              <Key className="h-4 w-4 mr-2" />
              Import Private Key
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="key-input">Private Key (nsec or hex)</Label>
              <Input
                id="key-input"
                type={showKey ? "text" : "password"}
                placeholder="nsec1... or hex format"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your private key starting with nsec1... or 64-character hex
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => validateAndStoreKey(keyInput)}
                disabled={!keyInput.trim()}
                className="flex-1"
              >
                Import Key
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImport(false)
                  setKeyInput('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}