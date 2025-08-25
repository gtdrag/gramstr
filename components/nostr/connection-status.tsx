"use client"

import { useNostr } from "@/context/nostr-context"
import { Button } from "@/components/ui/button"
import { Zap, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface ConnectionStatusProps {
  onConnectClick: () => void
}

export function ConnectionStatus({ onConnectClick }: ConnectionStatusProps) {
  const { isExtensionAvailable, isConnected, npub, disconnect } = useNostr()

  if (!isConnected) {
    return null // Don't show anything if not connected
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600/10 to-purple-500/10 backdrop-blur-sm border-b border-purple-500/20"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">Connected to NOSTR</span>
            </div>
            {npub && (
              <span className="text-xs text-gray-500">
                {npub.slice(0, 12)}...{npub.slice(-4)}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="text-gray-400 hover:text-white text-xs"
          >
            Disconnect
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function FloatingConnectButton({ onClick }: { onClick: () => void }) {
  const { isExtensionAvailable, isConnected } = useNostr()

  if (isConnected) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-4 right-4 z-40"
      >
        <Button
          onClick={onClick}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          size="sm"
        >
          <Zap className="w-4 h-4 mr-2" />
          {isExtensionAvailable ? 'Connect to NOSTR' : 'Get Alby'}
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}