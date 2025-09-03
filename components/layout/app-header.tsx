"use client"

import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Grid3x3, Download, Zap, Heart } from "lucide-react"
import { useNostr } from "@/context/nostr-context"
import { motion } from "framer-motion"

export function AppHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const { isConnected, npub, isElectron, disconnect } = useNostr()
  
  const isGalleryPage = pathname === '/gallery'
  const isDownloadPage = pathname === '/download' || pathname === '/'
  const isDonatePage = pathname === '/donate'

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600/10 to-purple-500/10 backdrop-blur-sm border-b border-purple-500/20"
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left Side - Brand + Connection Status */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <span className="text-purple-400 text-xl leading-none">⚡</span>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                gramstr
              </span>
            </button>
            
            {isConnected && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-300">
                    {isElectron ? 'Nostr Key Active' : 'Connected to NOSTR'}
                  </span>
                </div>
                {npub && (
                  <span className="text-xs text-gray-500">
                    {npub.slice(0, 12)}...{npub.slice(-4)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Navigation + Disconnect */}
          <div className="flex items-center gap-2">
            {!isDownloadPage && (
              <Button
                onClick={() => router.push('/download')}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
            )}
            
            {!isGalleryPage && (
              <Button
                onClick={() => router.push('/gallery')}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Gallery
              </Button>
            )}
            
            {!isDonatePage && (
              <Button
                onClick={() => router.push('/donate')}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Heart className="h-4 w-4 mr-1.5" />
                Donate
              </Button>
            )}
            
            {isConnected && !isElectron && (
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="text-gray-400 hover:text-white text-xs ml-2"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}