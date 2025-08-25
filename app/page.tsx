"use client"

import { useState, useEffect } from "react"
import { DownloadForm } from "@/components/content/download-form"
import { UnifiedAuthSection } from "@/components/auth/unified-auth-section"
import { ConnectionStatus, FloatingConnectButton } from "@/components/nostr/connection-status"
import { AlbyConnectModal } from "@/components/nostr/alby-connect-modal"
import { useNostr } from "@/context/nostr-context"
import { Button } from "@/components/ui/button"
import { Grid3x3, Zap } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAlbyModal, setShowAlbyModal] = useState(false)
  const [authStatus, setAuthStatus] = useState<{authenticated: boolean, sessionStatus?: string, warningMessage?: string} | null>(null)
  const router = useRouter()
  const { isConnected } = useNostr()
  
  // Show Alby modal on first visit if not connected
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('has_seen_welcome')
    if (!hasSeenWelcome && !isConnected) {
      setTimeout(() => {
        setShowAlbyModal(true)
        localStorage.setItem('has_seen_welcome', 'true')
      }, 1000)
    }
  }, [isConnected])

  const checkAuthStatus = () => {
    fetch("/api/auth/instagram")
      .then(res => res.json())
      .then(data => setAuthStatus(data))
      .catch(err => console.error("Failed to check auth status:", err))
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const handleDownloadComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <>
      {/* Connection Status Bar */}
      <ConnectionStatus onConnectClick={() => setShowAlbyModal(true)} />
      
      {/* Floating Connect Button */}
      <FloatingConnectButton onClick={() => setShowAlbyModal(true)} />
      
      {/* Alby Modal */}
      <AlbyConnectModal 
        open={showAlbyModal} 
        onOpenChange={setShowAlbyModal}
        onSuccess={() => setShowAlbyModal(false)}
      />
      
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-4xl space-y-12">
        {/* Gallery Link - Top Right */}
        <div className="absolute top-8 right-8">
          <Button
            onClick={() => router.push('/gallery')}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            View Gallery
          </Button>
        </div>

        {/* Hero Section */}

        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            ⚡gramstr
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Download Instagram content and cross-post to NOSTR
          </p>
        </div>

        {/* Download Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 shadow-2xl">
          <h2 className="text-3xl font-semibold mb-8 text-white text-center">Download Content</h2>
          <DownloadForm onDownloadComplete={handleDownloadComplete} />
          
          {/* Unified Auth Section */}
          <div className="mt-8">
            <UnifiedAuthSection
              instagramAuthStatus={authStatus}
              onInstagramAuthSuccess={checkAuthStatus}
            />
          </div>
          
          {/* Or link to gallery */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => router.push('/gallery')}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              Or view your existing content gallery →
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}