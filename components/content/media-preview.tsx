"use client"

import { useState } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaPreviewProps {
  filePath: string | null
  thumbnailPath: string | null
  isVideo: boolean
  userId: string
  caption: string
}

export function MediaPreview({ filePath, thumbnailPath, isVideo, userId, caption }: MediaPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)

  if (!filePath) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No media file found</p>
      </div>
    )
  }

  // filePath and thumbnailPath are now just filenames, not full paths
  const filename = filePath || ''
  const thumbnailFilename = thumbnailPath || ''
  
  // Build media URLs
  const mediaUrl = `http://localhost:8000/media/${userId}/${encodeURIComponent(filename)}`
  const thumbnailUrl = thumbnailPath ? `http://localhost:8000/media/${userId}/${encodeURIComponent(thumbnailFilename)}` : null

  if (isVideo) {
    return (
      <div 
        className="relative bg-black rounded-lg overflow-hidden group cursor-pointer w-full max-w-md mx-auto"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          src={mediaUrl}
          poster={thumbnailUrl || undefined}
          className="w-full h-auto"
          muted={isMuted}
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={(e) => {
            const video = e.currentTarget
            if (video.paused) {
              video.play()
            } else {
              video.pause()
            }
          }}
        />
        
        {/* Video Controls Overlay */}
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute inset-0 bg-black/20" />
          <Button
            variant="secondary"
            size="icon"
            className="relative z-10 bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation()
              const video = e.currentTarget.closest('.group')?.querySelector('video')
              if (video) {
                if (video.paused) {
                  video.play()
                } else {
                  video.pause()
                }
              }
            }}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        {/* Mute Button */}
        <div className={`absolute bottom-4 right-4 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <Button
            variant="secondary"
            size="icon"
            className="bg-black/50 hover:bg-black/70 text-white border-0"
            onClick={(e) => {
              e.stopPropagation()
              const video = e.currentTarget.closest('.group')?.querySelector('video') as HTMLVideoElement
              if (video) {
                video.muted = !video.muted
                setIsMuted(video.muted)
              }
            }}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Video duration overlay */}
        <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
          VIDEO
        </div>
      </div>
    )
  } else {
    return (
      <div className="bg-gray-100 rounded-lg overflow-hidden w-full max-w-md mx-auto">
        <img
          src={mediaUrl}
          alt={caption}
          className="w-full h-auto hover:scale-105 transition-transform duration-200"
          onError={(e) => {
            // Fallback to thumbnail if main image fails
            if (thumbnailUrl && e.currentTarget.src !== thumbnailUrl) {
              e.currentTarget.src = thumbnailUrl
            }
          }}
        />
        <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
          IMAGE
        </div>
      </div>
    )
  }
}