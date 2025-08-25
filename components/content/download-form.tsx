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
      const response = await api.post("/api/content/download", { url })

      const data = await response.json()

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
        
        {/* Authentication Status */}
        {authStatus && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {authStatus.authenticated ? (
                <>
                  <ShieldCheck className={`h-4 w-4 ${
                    authStatus.sessionStatus === "fresh" ? "text-green-400" :
                    authStatus.sessionStatus === "aging" ? "text-yellow-400" :
                    authStatus.sessionStatus === "old" ? "text-orange-400" :
                    authStatus.sessionStatus === "expired" ? "text-red-400" : "text-green-400"
                  }`} />
                  <span className={`${
                    authStatus.sessionStatus === "fresh" ? "text-green-400" :
                    authStatus.sessionStatus === "aging" ? "text-yellow-400" :
                    authStatus.sessionStatus === "old" ? "text-orange-400" :
                    authStatus.sessionStatus === "expired" ? "text-red-400" : "text-green-400"
                  }`}>
                    Full access enabled
                    {authStatus.sessionAge !== null && authStatus.sessionAge !== undefined && (
                      <span className="text-gray-400 ml-1">
                        ({authStatus.sessionAge} day{authStatus.sessionAge !== 1 ? 's' : ''} old)
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400">Public content only</span>
                  <Info className="h-3 w-3 text-gray-400" />
                </>
              )}
            </div>
            
            {/* Session Warning */}
            {authStatus.warningMessage && (
              <div className={`flex items-center gap-2 text-xs p-2 rounded-md ${
                authStatus.sessionStatus === "aging" ? "bg-yellow-500/10 border border-yellow-500/20" :
                authStatus.sessionStatus === "old" ? "bg-orange-500/10 border border-orange-500/20" :
                authStatus.sessionStatus === "expired" ? "bg-red-500/10 border border-red-500/20" : ""
              }`}>
                <Info className={`h-3 w-3 ${
                  authStatus.sessionStatus === "aging" ? "text-yellow-400" :
                  authStatus.sessionStatus === "old" ? "text-orange-400" :
                  authStatus.sessionStatus === "expired" ? "text-red-400" : "text-yellow-400"
                }`} />
                <span className={`${
                  authStatus.sessionStatus === "aging" ? "text-yellow-300" :
                  authStatus.sessionStatus === "old" ? "text-orange-300" :
                  authStatus.sessionStatus === "expired" ? "text-red-300" : "text-yellow-300"
                }`}>
                  {authStatus.warningMessage}
                </span>
              </div>
            )}
          </div>
        )}
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
    </form>
  )
}