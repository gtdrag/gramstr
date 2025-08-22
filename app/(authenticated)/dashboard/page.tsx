"use client"

import { useState, useEffect } from "react"
import { DownloadForm } from "@/components/content/download-form"
import { ContentList } from "@/components/content/content-list"
import { InstagramAuthSetup } from "@/components/auth/instagram-auth-setup"
import { Button } from "@/components/ui/button"
import { Grid3x3, Images, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showAuthSetup, setShowAuthSetup] = useState(false)
  const [authStatus, setAuthStatus] = useState<{authenticated: boolean, sessionStatus?: string, warningMessage?: string} | null>(null)
  const router = useRouter()

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-4xl space-y-12">
        {/* Gallery Link - Top Right */}
        <div className="absolute top-8 right-8">
          <Button
            onClick={() => router.push('/dashboard/gallery')}
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
            InstaScrape Dashboard
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Download Instagram content and cross-post to decentralized platforms.
          </p>
        </div>

        {/* Download Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 shadow-2xl">
          <h2 className="text-3xl font-semibold mb-8 text-white text-center">Download Content</h2>
          <DownloadForm onDownloadComplete={handleDownloadComplete} />
          
          {/* Stories Setup Section */}
          {authStatus && (!authStatus.authenticated || authStatus.sessionStatus === "expired") && (
            <div className="mt-8">
              <Button
                onClick={() => setShowAuthSetup(!showAuthSetup)}
                variant="ghost"
                className="text-yellow-400 hover:text-yellow-300 text-sm mb-4"
              >
                {showAuthSetup ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Authentication Setup
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Enable Full Instagram Access
                  </>
                )}
              </Button>
              
              {showAuthSetup && <InstagramAuthSetup onAuthSuccess={checkAuthStatus} />}
            </div>
          )}
          
          {/* Or link to gallery */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => router.push('/dashboard/gallery')}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              Or view your existing content gallery →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
