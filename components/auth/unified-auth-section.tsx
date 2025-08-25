"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { InstagramAuthSimple } from "@/components/auth/instagram-auth-simple"
import { AlbyConnectModal } from "@/components/nostr/alby-connect-modal"
import { useNostr } from "@/context/nostr-context"
import { Zap, Instagram, Check, AlertCircle } from "lucide-react"

interface UnifiedAuthSectionProps {
  instagramAuthStatus: {
    authenticated: boolean
    sessionStatus?: string
    warningMessage?: string
  } | null
  onInstagramAuthSuccess: () => void
}

export function UnifiedAuthSection({ 
  instagramAuthStatus, 
  onInstagramAuthSuccess 
}: UnifiedAuthSectionProps) {
  const { isConnected, npub } = useNostr()
  const [showAlbyModal, setShowAlbyModal] = useState(false)
  const [showInstagramForm, setShowInstagramForm] = useState(false)
  
  const hasInstagramAuth = instagramAuthStatus?.authenticated && instagramAuthStatus?.sessionStatus !== 'expired'

  return (
    <>
      <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            {/* NOSTR Connection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">NOSTR Connection</span>
                  {!isConnected && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                      Required
                    </span>
                  )}
                </div>
                {isConnected ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Connected</span>
                  </div>
                ) : null}
              </div>
              
              {isConnected ? (
                <div className="text-sm text-gray-400">
                  Connected as {npub?.slice(0, 12)}...{npub?.slice(-4)}
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    Connect with Alby to save your gallery and post to NOSTR
                  </p>
                  <Button
                    onClick={() => setShowAlbyModal(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Connect Alby
                  </Button>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700" />

            {/* Instagram Authentication */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-400" />
                  <span className="font-medium text-white">Instagram Access</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                    Optional
                  </span>
                </div>
                {hasInstagramAuth ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-green-400">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">Enabled</span>
                    </div>
                    <Button
                      onClick={() => setShowInstagramForm(!showInstagramForm)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1"
                    >
                      Update
                    </Button>
                  </div>
                ) : null}
              </div>

              {(!hasInstagramAuth || showInstagramForm) && (
                <>
                  <p className="text-sm text-gray-400 mb-3">
                    {hasInstagramAuth ? 'Update your Instagram cookies' : 'Enable to download Stories and private content'}
                  </p>
                  <InstagramAuthSimple onAuthSuccess={() => {
                    onInstagramAuthSuccess()
                    setShowInstagramForm(false)
                  }} />
                </>
              )}
            </div>

      </div>

      <AlbyConnectModal 
        open={showAlbyModal} 
        onOpenChange={setShowAlbyModal}
        onSuccess={() => {
          setShowAlbyModal(false)
        }}
      />
    </>
  )
}