"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Images } from "lucide-react"

interface CarouselPreviewProps {
  carouselFiles: string[]
  userId: string
  caption?: string
}

export function CarouselPreview({ carouselFiles, userId, caption }: CarouselPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Debug log
  console.log("CarouselPreview received:", {
    carouselFiles,
    userId,
    currentIndex
  })

  if (!carouselFiles || carouselFiles.length === 0) {
    return (
      <div className="w-full aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No carousel files</span>
      </div>
    )
  }

  const currentFile = carouselFiles[currentIndex]
  const isVideo = currentFile?.toLowerCase().includes('.mp4') || 
                 currentFile?.toLowerCase().includes('.webm') ||
                 currentFile?.toLowerCase().includes('.mov')

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % carouselFiles.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + carouselFiles.length) % carouselFiles.length)
  }

  return (
    <div className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden">
      {/* Carousel indicator badge */}
      <div className="absolute top-3 left-3 z-20">
        <Badge variant="secondary" className="bg-black/60 text-white border-0 text-xs font-medium">
          <Images className="h-3 w-3 mr-1" />
          {currentIndex + 1}/{carouselFiles.length}
        </Badge>
      </div>

      {/* Navigation buttons */}
      {carouselFiles.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Media content */}
      <div className="w-full h-full">
        {isVideo ? (
          <video
            src={`http://localhost:8000/media/${userId}/${encodeURIComponent(currentFile)}`}
            className="w-full h-full object-cover"
            controls
            muted
            preload="metadata"
            onError={(e) => {
              const target = e.currentTarget as HTMLVideoElement
              console.error("Video load error:", {
                src: target.querySelector('source')?.src,
                currentFile,
                userId,
                error: e
              })
            }}
          >
            <source src={`http://localhost:8000/media/${userId}/${encodeURIComponent(currentFile)}`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={`http://localhost:8000/media/${userId}/${encodeURIComponent(currentFile)}`}
            alt={caption || `Carousel item ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              console.error("Image load error:", {
                src: target.src,
                currentFile,
                userId,
                error: e
              })
              e.currentTarget.style.display = 'none'
            }}
            loading="lazy"
          />
        )}
      </div>

      {/* Slide indicators */}
      {carouselFiles.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {carouselFiles.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white scale-110'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}