"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { nostrProvider } from '@/lib/nostr-provider'

interface NostrContextType {
  isExtensionAvailable: boolean
  isConnected: boolean
  isConnecting: boolean
  publicKey: string | null
  npub: string | null
  connect: () => Promise<void>
  disconnect: () => void
  checkExtension: () => void
}

const NostrContext = createContext<NostrContextType | undefined>(undefined)

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [isExtensionAvailable, setIsExtensionAvailable] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)

  // Check for extension on mount and after window focus
  const checkExtension = useCallback(() => {
    const available = nostrProvider.isExtensionAvailable()
    setIsExtensionAvailable(available)
    
    // If extension is available, check if we're already connected
    if (available) {
      const connected = nostrProvider.isConnected()
      setIsConnected(connected)
      
      if (connected) {
        const pubkey = nostrProvider.getPublicKey()
        setPublicKey(pubkey)
      }
    }
  }, [])

  useEffect(() => {
    // Initial check
    checkExtension()

    // Check again after a short delay (extension might load async)
    const timeout = setTimeout(() => {
      nostrProvider.waitForExtension(1000).then(available => {
        if (available) {
          checkExtension()
        }
      })
    }, 500)

    // Re-check when window gains focus (user might have installed extension)
    const handleFocus = () => checkExtension()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('focus', handleFocus)
    }
  }, [checkExtension])

  const connect = async () => {
    if (!isExtensionAvailable) {
      throw new Error('Alby extension not found')
    }

    setIsConnecting(true)
    try {
      const pubkey = await nostrProvider.connect()
      setPublicKey(pubkey)
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to connect:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    nostrProvider.disconnect()
    setIsConnected(false)
    setPublicKey(null)
  }

  // Convert hex pubkey to npub format
  const npub = publicKey ? nostrProvider.hexToNpub(publicKey) : null

  return (
    <NostrContext.Provider
      value={{
        isExtensionAvailable,
        isConnected,
        isConnecting,
        publicKey,
        npub,
        connect,
        disconnect,
        checkExtension,
      }}
    >
      {children}
    </NostrContext.Provider>
  )
}

export function useNostr() {
  const context = useContext(NostrContext)
  if (context === undefined) {
    throw new Error('useNostr must be used within a NostrProvider')
  }
  return context
}