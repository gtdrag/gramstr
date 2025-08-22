"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Download, Loader2, Shield, ShieldCheck, Info } from "lucide-react"
import { useRouter } from "next/navigation"

interface DownloadFormProps {
  onDownloadComplete?: () => void
}

interface AuthStatus {
  authenticated: boolean
  storiesSupported: boolean
  message: string
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
    // Poll for auth status changes every 10 seconds
    const interval = setInterval(checkAuthStatus, 10000)
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
      const response = await fetch("/api/content/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Download failed")
      }

      toast.success("Content downloaded successfully! Redirecting to gallery...")
      setUrl("")
      onDownloadComplete?.()
      
      // Navigate to gallery after successful download
      setTimeout(() => {
        router.push('/dashboard/gallery')
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
          <div className="flex items-center gap-2 text-sm">
            {authStatus.authenticated ? (
              <>
                <ShieldCheck className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Full access enabled</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400">Public content only</span>
                <Info className="h-3 w-3 text-gray-400" />
              </>
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