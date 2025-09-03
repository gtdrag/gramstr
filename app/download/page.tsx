"use client"

import { useState, useEffect } from "react"
import { BulkDownloadForm } from "@/components/content/bulk-download-form"
import { UnifiedAuthSection } from "@/components/auth/unified-auth-section"
import { AppLayout } from "@/components/layout/app-layout"
import { useNostr } from "@/context/nostr-context"
import { useElectron } from "@/hooks/use-electron"
import { getElectronNostr } from "@/lib/nostr-electron"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [authStatus, setAuthStatus] = useState<{authenticated: boolean, sessionStatus?: string, warningMessage?: string} | null>(null)
  const router = useRouter()
  const { isConnected } = useNostr()
  const { isElectron } = useElectron()
  
  // Check if Electron has a key imported
  const hasElectronKey = isElectron && getElectronNostr()?.hasKey()
  // Consider authorized if either web Nostr or Electron key exists
  const hasNostrAccess = isConnected || hasElectronKey
  
  // Alby modal disabled - not using Alby
  useEffect(() => {
    // Disabled auto-show of Alby modal
    localStorage.setItem('has_seen_welcome', 'true')
  }, [])

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
    <AppLayout>
      
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <h1 className="text-6xl font-bold tracking-tight py-6">
              <span className="inline-flex items-center">
                <span className="text-purple-500 leading-none translate-y-2">⚡</span>
                <span className="h-16 bg-gradient-to-r from-purple-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">gramstr</span>
              </span>
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto">
              Download Instagram content and cross-post to NOSTR
            </p>
          </div>

        {/* Main Content Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 shadow-2xl space-y-8">
          
          {/* Step 1: Connect */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                hasNostrAccess ? 'bg-green-500' : 'bg-gray-600'
              }`}>
                {hasNostrAccess ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-white text-sm font-semibold">1</span>
                )}
              </div>
              <h2 className="text-2xl font-semibold text-white">Connect Your Accounts</h2>
            </div>
            <UnifiedAuthSection
              instagramAuthStatus={authStatus}
              onInstagramAuthSuccess={checkAuthStatus}
            />
          </div>

          {/* Step 2: Download */}
          <div className={hasNostrAccess ? '' : 'opacity-50 pointer-events-none'}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-600">
                <span className="text-white text-sm font-semibold">2</span>
              </div>
              <h2 className="text-2xl font-semibold text-white">Download Content</h2>
            </div>
            {!hasNostrAccess && (
              <div className="mb-4 text-sm text-gray-400 italic">
                {isElectron ? 'Import your Nostr key to enable downloads' : 'Connect with Alby to enable downloads'}
              </div>
            )}
            <BulkDownloadForm onDownloadComplete={handleDownloadComplete} />
          </div>
          
        </div>
      </div>
    </div>
    </AppLayout>
  )
}