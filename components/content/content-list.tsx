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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {content.map((item) => (
          <div
            key={item.id}
            className="border rounded-lg overflow-hidden"
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
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={item.contentType === "video" ? "default" : "secondary"}>
                      {item.contentType}
                    </Badge>
                    <Badge variant={
                      item.status === "completed" ? "default" :
                      item.status === "failed" ? "destructive" : "secondary"
                    }>
                      {item.status}
                    </Badge>
                  </div>
                  {item.caption && (
                    <p className="text-sm text-muted-foreground">
                      {item.caption}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(item.downloadedAt), "MMM d, yyyy")}
                    </span>
                    {item.likes !== null && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {item.likes.toLocaleString()}
                      </span>
                    )}
                    {item.views !== null && (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.views.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(item.originalUrl, '_blank')}
                  >
                    View Original
                  </Button>
                  {item.status === "completed" && (
                    <Button
                      size="sm"
                      onClick={() => handleCrossPost(item.id)}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Cross Post
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}