"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Download, Loader2, Shield, ShieldCheck, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"

interface DownloadFormProps {
  onDownloadComplete?: () => void
}

interface AuthStatus {
  authenticated: boolean
  storiesSupported: boolean
  message: string
  sessionAge?: number
  sessionStatus?: "fresh" | "aging" | "old" | "expired" | "unknown"
  warningMessage?: string
  cookieUploadTime?: string
}

export function DownloadForm({ onDownloadComplete }: DownloadFormProps) {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const router = useRouter()

  const checkAuthStatus = () => {
    fetch("/api/auth/instagram")
      .then(res => res.json())
      .then(data => setAuthStatus(data))
      .catch(err => console.error("Failed to check auth status:", err))
  }

  useEffect(() => {
    checkAuthStatus()
    // Poll for auth status changes every 30 seconds (less frequent to avoid spam)
    const interval = setInterval(checkAuthStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const isStoriesUrl = (url: string) => {
    return /instagram\.com\/stories\/[A-Za-z0-9_.-]+/.test(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      toast.error("Please enter an Instagram URL")
      return
    }

    // Check if protected content requires authentication
    if (isStoriesUrl(url) && !authStatus?.storiesSupported) {
      toast.error("This content requires Instagram authentication. Please set up login first.")
      return
    }

    setIsLoading(true)

    try {
      console.log('[DownloadForm] Starting download for URL:', url)
      console.log('[DownloadForm] Making request to /api/content/download')
      
      const response = await api.post("/api/content/download", { url })
      
      console.log('[DownloadForm] Response status:', response.status)
      console.log('[DownloadForm] Response headers:', response.headers)

      const data = await response.json()
      console.log('[DownloadForm] Response data:', data)

      if (!response.ok) {
        // Handle session expiration specifically
        if (response.status === 401) {
          toast.error("🔒 Session expired! Please refresh your Instagram cookies.", {
            duration: 6000,
          })
          // Refresh auth status to show expired state
          checkAuthStatus()
        } else {
          throw new Error(data.error || "Download failed")
        }
        return
      }

      toast.success("Content downloaded successfully! Redirecting to gallery...")
      setUrl("")
      onDownloadComplete?.()
      
      // Navigate to gallery after successful download
      setTimeout(() => {
        router.push('/gallery')
      }, 1500)
    } catch (error) {
      console.error("Download error:", error)
      toast.error(error instanceof Error ? error.message : "Download failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="url" className="text-gray-200 font-medium">Instagram URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://www.instagram.com/p/... or /stories/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20"
        />
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !url.trim()}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 shadow-lg disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="h-5 w-5 mr-2" />
            Download Content
          </>
        )}
      </Button>
      
      {/* Cookie age warning */}
      {authStatus && authStatus.warningMessage && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-yellow-200">
                {authStatus.warningMessage}
              </p>
              {authStatus.sessionAge !== null && (
                <p className="text-xs text-gray-400">
                  Cookies are {authStatus.sessionAge} days old
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Session expired warning */}
      {authStatus && authStatus.sessionStatus === 'expired' && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-start space-x-2">
            <Shield className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm text-red-200 font-medium">
                Instagram session expired - downloads may fail
              </p>
              <p className="text-xs text-gray-400">
                Please upload fresh Instagram cookies to restore full access
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}