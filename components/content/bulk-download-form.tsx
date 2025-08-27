"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Download, Loader2, AlertCircle, CheckCircle, XCircle, Link } from "lucide-react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api-client"
import { Card } from "@/components/ui/card"

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

interface DownloadStatus {
  url: string
  status: 'pending' | 'downloading' | 'success' | 'error'
  error?: string
}

export function BulkDownloadForm({ onDownloadComplete }: DownloadFormProps) {
  const [urls, setUrls] = useState("")
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null)
  const [downloadStatuses, setDownloadStatuses] = useState<DownloadStatus[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()

  const checkAuthStatus = () => {
    fetch("/api/auth/instagram")
      .then(res => res.json())
      .then(data => setAuthStatus(data))
      .catch(err => console.error("Failed to check auth status:", err))
  }

  useEffect(() => {
    checkAuthStatus()
    const interval = setInterval(checkAuthStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const isStoriesUrl = (url: string) => {
    return /instagram\.com\/stories\/[A-Za-z0-9_.-]+/.test(url)
  }

  const parseUrls = (text: string): string[] => {
    // Split by newlines and filter valid Instagram URLs
    return text
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.includes('instagram.com') && url.startsWith('http'))
  }

  const downloadSingleUrl = async (url: string, index: number) => {
    // Update status to downloading
    setDownloadStatuses(prev => prev.map((s, i) => 
      i === index ? { ...s, status: 'downloading' } : s
    ))
    setCurrentIndex(index)

    try {
      const response = await api.post("/api/content/download", { url })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Session expired - please refresh Instagram cookies")
        }
        throw new Error(data.error || "Download failed")
      }

      // Update status to success
      setDownloadStatuses(prev => prev.map((s, i) => 
        i === index ? { ...s, status: 'success' } : s
      ))
      
      return true
    } catch (error) {
      // Update status to error
      setDownloadStatuses(prev => prev.map((s, i) => 
        i === index ? { 
          ...s, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Failed' 
        } : s
      ))
      
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const urlList = parseUrls(urls)
    
    if (urlList.length === 0) {
      toast.error("Please enter at least one valid Instagram URL")
      return
    }

    // Check for stories URLs requiring auth
    const storiesUrls = urlList.filter(isStoriesUrl)
    if (storiesUrls.length > 0 && !authStatus?.storiesSupported) {
      toast.error(`${storiesUrls.length} Stories URL(s) require authentication. Please set up login first.`)
      return
    }

    setIsLoading(true)
    setIsBulkMode(urlList.length > 1)

    // Initialize download statuses
    const statuses: DownloadStatus[] = urlList.map(url => ({
      url,
      status: 'pending'
    }))
    setDownloadStatuses(statuses)

    // Download URLs sequentially with a small delay
    let successCount = 0
    for (let i = 0; i < urlList.length; i++) {
      const success = await downloadSingleUrl(urlList[i], i)
      if (success) successCount++
      
      // Small delay between downloads to avoid rate limiting
      if (i < urlList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    setIsLoading(false)
    
    if (successCount > 0) {
      toast.success(`Downloaded ${successCount} of ${urlList.length} items successfully!`)
      setUrls("")
      setDownloadStatuses([])
      setIsBulkMode(false)
      onDownloadComplete?.()
      
      // Navigate to gallery after bulk download
      setTimeout(() => {
        router.push('/gallery')
      }, 2000)
    } else {
      toast.error("All downloads failed. Please check the URLs and try again.")
    }
  }

  const progress = downloadStatuses.length > 0 
    ? (downloadStatuses.filter(s => s.status === 'success').length / downloadStatuses.length) * 100
    : 0

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="urls" className="text-gray-200 font-medium">
              Instagram URLs
            </Label>
            <span className="text-xs text-gray-400">
              Tip: Paste multiple URLs separated by line breaks (Enter key)
            </span>
          </div>
          <Textarea
            id="urls"
            placeholder={`https://www.instagram.com/p/ABC123...
https://www.instagram.com/reel/XYZ789...
https://www.instagram.com/stories/username/...

Paste multiple URLs, each on a new line`}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            disabled={isLoading}
            rows={6}
            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500/20 font-mono text-sm"
          />
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link className="h-3 w-3" />
            <span>
              {urls ? `${parseUrls(urls).length} valid URL(s) detected` : 'Supports posts, reels, and stories'}
            </span>
          </div>
        </div>
        
        <Button 
          type="submit" 
          disabled={isLoading || !urls.trim()}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 shadow-lg disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Downloading {currentIndex + 1} of {downloadStatuses.length}...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              Download {parseUrls(urls).length || 0} Item{parseUrls(urls).length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </form>

      {/* Progress indicator for bulk downloads */}
      {isBulkMode && downloadStatuses.length > 0 && (
        <Card className="p-4 bg-gray-800 border-gray-700">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Download Progress</span>
              <span className="text-gray-400">
                {downloadStatuses.filter(s => s.status === 'success').length} / {downloadStatuses.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Status list */}
            <div className="max-h-40 overflow-y-auto space-y-1">
              {downloadStatuses.map((status, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {status.status === 'pending' && (
                    <AlertCircle className="h-3 w-3 text-gray-500" />
                  )}
                  {status.status === 'downloading' && (
                    <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                  )}
                  {status.status === 'success' && (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  )}
                  {status.status === 'error' && (
                    <XCircle className="h-3 w-3 text-red-400" />
                  )}
                  <span className={`truncate flex-1 ${
                    status.status === 'success' ? 'text-gray-400' :
                    status.status === 'error' ? 'text-red-400' :
                    status.status === 'downloading' ? 'text-white' :
                    'text-gray-500'
                  }`}>
                    {status.url.split('/').pop()}
                  </span>
                  {status.error && (
                    <span className="text-red-400 text-xs">{status.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}