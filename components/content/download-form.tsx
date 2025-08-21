"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DownloadFormProps {
  onDownloadComplete?: () => void
}

export function DownloadForm({ onDownloadComplete }: DownloadFormProps) {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      toast.error("Please enter an Instagram URL")
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
          placeholder="https://www.instagram.com/p/..."
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
    </form>
  )
}