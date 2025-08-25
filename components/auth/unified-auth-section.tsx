"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { InstagramAuthSetup } from "@/components/auth/instagram-auth-setup"
import { AlbyConnectModal } from "@/components/nostr/alby-connect-modal"
import { useNostr } from "@/context/nostr-context"
import { ChevronDown, ChevronUp, Unlock, Zap, Instagram, Check, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

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
  const [showAuthSection, setShowAuthSection] = useState(false)
  const [showAlbyModal, setShowAlbyModal] = useState(false)
  
  const hasInstagramAuth = instagramAuthStatus?.authenticated && instagramAuthStatus?.sessionStatus !== 'expired'
  const hasFullAccess = isConnected && hasInstagramAuth

  // Auto-expand if missing critical auth (NOSTR)
  useState(() => {
    if (!isConnected) {
      setShowAuthSection(true)
    }
  })

  return (
    <>
      <Collapsible open={showAuthSection} onOpenChange={setShowAuthSection}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className={`w-full justify-between ${
              hasFullAccess 
                ? 'text-green-400 hover:text-green-300' 
                : !isConnected
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {hasFullAccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Full Access Enabled</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>
                    {!isConnected 
                      ? 'Connect Alby to Start' 
                      : 'Enable Full Access'}
                  </span>
                </>
              )}
            </div>
            {showAuthSection ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
          >
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
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Active</span>
                  </div>
                ) : null}
              </div>

              {hasInstagramAuth ? (
                <p className="text-sm text-gray-400">
                  Full Instagram access enabled - Stories and private content available
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-400">
                    Enable to download Stories and private content
                  </p>
                  <InstagramAuthSetup onAuthSuccess={onInstagramAuthSuccess} />
                </>
              )}
            </div>

            {/* Status Summary */}
            {isConnected && (
              <div className="pt-4 border-t border-gray-700">
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-3 h-3" />
                    <span>Download public posts</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-3 h-3" />
                    <span>Post to NOSTR</span>
                  </div>
                  <div className={`flex items-center gap-2 ${hasInstagramAuth ? 'text-green-400' : 'text-gray-500'}`}>
                    {hasInstagramAuth ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>Download Stories & private content</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      <AlbyConnectModal 
        open={showAlbyModal} 
        onOpenChange={setShowAlbyModal}
        onSuccess={() => {
          setShowAlbyModal(false)
          // Optionally collapse the auth section after successful connection
          if (hasInstagramAuth) {
            setShowAuthSection(false)
          }
        }}
      />
    </>
  )
}