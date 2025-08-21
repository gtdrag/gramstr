"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Share2, Calendar, Heart, Eye } from "lucide-react"
import { format } from "date-fns"
import { MediaPreview } from "./media-preview"
import { useUser } from "@clerk/nextjs"

interface ContentItem {
  id: string
  originalUrl: string
  caption: string | null
  contentType: "image" | "video" | "carousel"
  status: "downloading" | "completed" | "failed" | "processing"
  likes: number | null
  views: number | null
  downloadedAt: string
  filePath: string | null
  thumbnailPath: string | null
  isVideo: boolean
}

interface ContentListProps {
  refreshTrigger?: number
}

export function ContentList({ refreshTrigger }: ContentListProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()

  const fetchContent = async () => {
    try {
      const response = await fetch("/api/content/list")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch content")
      }

      setContent(data.content)
    } catch (error) {
      console.error("Fetch error:", error)
      toast.error("Failed to load content")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [refreshTrigger])

  const handleCrossPost = async (contentId: string) => {
    try {
      const response = await fetch("/api/content/cross-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId,
          platforms: ["tiktok", "youtube"] // Example platforms
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Cross-posting failed")
      }

      toast.success("Cross-posting initiated!")
    } catch (error) {
      console.error("Cross-post error:", error)
      toast.error(error instanceof Error ? error.message : "Cross-posting failed")
    }
  }

  const handleNostrPost = async (contentId: string) => {
    try {
      const response = await fetch("/api/nostr/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "NOSTR posting failed")
      }

      toast.success(`Posted to NOSTR! Note ID: ${data.noteId.substring(0, 16)}...`)
      console.log("NOSTR Public Key:", data.nostrPublicKey)
    } catch (error) {
      console.error("NOSTR post error:", error)
      toast.error(error instanceof Error ? error.message : "NOSTR posting failed")
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading content...</div>
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No content downloaded yet. Add an Instagram URL above to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Downloaded Content</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {content.map((item) => (
          <div
            key={item.id}
            className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-300"
          >
            {/* Media Preview */}
            <div className="relative">
              <MediaPreview
                filePath={item.filePath}
                thumbnailPath={item.thumbnailPath}
                isVideo={item.isVideo}
                userId={user?.id || ""}
                caption={item.caption || ""}
              />
            </div>
            
            {/* Content Info */}
            <div className="p-6">
              {/* Post Content */}
              {item.caption && (
                <p className="text-base text-gray-900 mb-4 leading-relaxed font-medium">
                  {item.caption}
                </p>
              )}
              
              {/* Engagement Stats */}
              <div className="flex items-center gap-6 mb-4 text-sm text-gray-600">
                {item.likes !== null && (
                  <span className="flex items-center gap-2 font-medium">
                    <Heart className="h-4 w-4 text-red-500" />
                    {item.likes.toLocaleString()}
                  </span>
                )}
                {item.views !== null && (
                  <span className="flex items-center gap-2 font-medium">
                    <Eye className="h-4 w-4 text-blue-500" />
                    {item.views.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {format(new Date(item.downloadedAt), "MMM d, yyyy")}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => window.open(item.originalUrl, '_blank')}
                  className="text-gray-500 hover:text-gray-700 p-0 h-auto"
                >
                  View Original →
                </Button>
                
                {item.status === "completed" && (
                  <Button
                    onClick={() => handleNostrPost(item.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 font-semibold"
                  >
                    ⚡ Post to NOSTR
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}