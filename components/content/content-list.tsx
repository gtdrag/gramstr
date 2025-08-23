"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Share2, Calendar, Heart, Eye, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { MediaPreview } from "./media-preview"
import { CarouselPreview } from "./carousel-preview"
import { useUser } from "@clerk/nextjs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ContentItem {
  id: string
  userId: string  // Added this - it's returned from the API
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
  isCarousel: boolean
  carouselFiles: string[] | null
}

interface ContentListProps {
  refreshTrigger?: number
}

export function ContentList({ refreshTrigger }: ContentListProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [nostrPostingIds, setNostrPostingIds] = useState<Set<string>>(new Set())
  const { user } = useUser()

  const fetchContent = async () => {
    try {
      const response = await fetch("/api/content/list")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch content")
      }

      // Debug: Log carousel items
      const carouselItems = (data.content || []).filter((item: ContentItem) => item.isCarousel)
      if (carouselItems.length > 0) {
        console.log('Found carousel items:', carouselItems)
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
    setNostrPostingIds(prev => new Set(prev).add(contentId))
    
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
    } finally {
      setNostrPostingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(contentId)
        return newSet
      })
    }
  }

  const handleDelete = async (contentId: string) => {
    setDeletingIds(prev => new Set(prev).add(contentId))
    
    try {
      const response = await fetch("/api/content/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Delete failed")
      }

      toast.success("Content deleted successfully")
      
      // Remove from local state immediately
      setContent(prev => prev.filter(item => item.id !== contentId))
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Note: ${data.errors.join(', ')}`)
      }
      
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error instanceof Error ? error.message : "Delete failed")
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(contentId)
        return newSet
      })
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
    <div className="space-y-6">
      <h3 className="text-2xl font-semibold text-white">Downloaded Content</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {content.map((item) => (
          <div
            key={item.id}
            className="group bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 hover:border-gray-600"
          >
            {/* Media Preview */}
            <div className="relative">
              {item.isCarousel && item.carouselFiles ? (
                <CarouselPreview
                  carouselFiles={item.carouselFiles}
                  userId={item.userId}
                  caption={item.caption || ""}
                />
              ) : (
                <MediaPreview
                  filePath={item.filePath}
                  thumbnailPath={item.thumbnailPath}
                  isVideo={item.isVideo}
                  userId={item.userId}
                  caption={item.caption || ""}
                />
              )}
              
              {/* Delete Button - Top Right Corner */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0 bg-red-600/90 hover:bg-red-700 backdrop-blur-sm"
                      disabled={deletingIds.has(item.id)}
                    >
                      {deletingIds.has(item.id) ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Content</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this content? This action cannot be undone and will permanently remove the files from your library.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(item.id)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            
            {/* Content Info */}
            <div className="p-4">
              {/* Post Content */}
              {item.caption && (
                <p className="text-sm text-gray-100 mb-3 leading-relaxed font-medium line-clamp-2">
                  {item.caption}
                </p>
              )}
              
              {/* Engagement Stats */}
              <div className="flex items-center gap-3 mb-3 text-xs text-gray-300">
                {item.likes !== null && (
                  <span className="flex items-center gap-1 font-medium">
                    <Heart className="h-3 w-3 text-red-400" />
                    {item.likes.toLocaleString()}
                  </span>
                )}
                {item.views !== null && item.views > 0 && (
                  <span className="flex items-center gap-1 font-medium">
                    <Eye className="h-3 w-3 text-blue-400" />
                    {item.views.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  {format(new Date(item.downloadedAt), "MMM d")}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  onClick={() => window.open(item.originalUrl, '_blank')}
                  className="text-gray-400 hover:text-gray-200 p-0 h-auto text-xs justify-start"
                >
                  View Original →
                </Button>
                
                {item.status === "completed" && (
                  <Button
                    onClick={() => handleNostrPost(item.id)}
                    disabled={nostrPostingIds.has(item.id)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-purple-400 disabled:to-purple-400 text-white px-3 py-1.5 text-xs font-semibold shadow-lg w-full transition-all duration-200"
                  >
                    {nostrPostingIds.has(item.id) ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                        Posting...
                      </div>
                    ) : (
                      "⚡ Post to NOSTR"
                    )}
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