"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, Zap, Shield, Globe, ArrowRight, Check, X } from "lucide-react"
import { useNostr } from "@/context/nostr-context"
import { motion, AnimatePresence } from "framer-motion"

interface AlbyConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AlbyConnectModal({ open, onOpenChange, onSuccess }: AlbyConnectModalProps) {
  const { isExtensionAvailable, isConnecting, connect, checkExtension } = useNostr()
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    try {
      setError(null)
      await connect()
      setShowSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
        setShowSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }

  const handleInstallClick = () => {
    // Detect browser and open appropriate extension store
    const userAgent = navigator.userAgent.toLowerCase()
    let extensionUrl = ''
    
    if (userAgent.includes('firefox')) {
      // Firefox Add-ons
      extensionUrl = 'https://addons.mozilla.org/en-US/firefox/addon/alby/'
    } else if (userAgent.includes('edg')) {
      // Microsoft Edge
      extensionUrl = 'https://microsoftedge.microsoft.com/addons/detail/alby-bitcoin-wallet-for-/iokeahhehimjnekafflcihljlcjccdbe'
    } else {
      // Chrome, Brave, Opera, and other Chromium browsers
      extensionUrl = 'https://chrome.google.com/webstore/detail/alby-bitcoin-lightning-wa/iokeahhehimjnekafflcihljlcjccdbe'
    }
    
    window.open(extensionUrl, '_blank')
    // Check for extension after a delay
    setTimeout(() => {
      checkExtension()
    }, 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-800">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4"
              >
                <Check className="w-8 h-8 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Connected!</h3>
              <p className="text-gray-400">Your NOSTR account is ready</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-400" />
                  Connect to NOSTR
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-2">
                  Post your content to the decentralized web
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-4">
                {!isExtensionAvailable ? (
                  <>
                    {/* Benefits Section */}
                    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                          <p className="text-white font-medium">Own Your Content</p>
                          <p className="text-gray-400 text-sm">No platform can delete or censor your posts</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Globe className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                          <p className="text-white font-medium">Cross-Platform Posting</p>
                          <p className="text-gray-400 text-sm">Share to multiple NOSTR apps at once</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-purple-400 mt-0.5" />
                        <div>
                          <p className="text-white font-medium">Lightning Tips</p>
                          <p className="text-gray-400 text-sm">Receive Bitcoin tips directly from fans</p>
                        </div>
                      </div>
                    </div>

                    {/* Install CTA */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">Get Started with Alby</h4>
                      <p className="text-gray-400 text-sm mb-4">
                        Install the Alby browser extension to connect your NOSTR account securely.
                      </p>
                      <Button
                        onClick={handleInstallClick}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Install Alby Extension
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                      <p className="text-gray-500 text-xs mt-2 text-center">
                        Free • Takes 30 seconds • Works with Chrome, Firefox, Edge
                      </p>
                    </div>

                    {/* Refresh button */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Force a re-check
                          console.log('Manual extension check triggered')
                          checkExtension()
                          
                          // Also try after a delay in case extension is still loading
                          setTimeout(() => {
                            console.log('Delayed extension check')
                            checkExtension()
                          }, 1000)
                        }}
                        className="w-full border-gray-700 text-gray-400 hover:text-white"
                      >
                        I've installed Alby - Check again
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        Extension not detected? Try refreshing the page (Cmd+R or Ctrl+R)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Extension detected - ready to connect */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Alby Extension Detected!</span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Click below to connect your NOSTR account. You'll be asked to approve the connection in Alby.
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-400">
                          <X className="w-5 h-5" />
                          <span className="text-sm">{error}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isConnecting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          Connect with Alby
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </>
                )}

                {/* What is NOSTR? */}
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-gray-500 text-xs text-center">
                    NOSTR is a decentralized social protocol that gives you control over your digital identity
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}