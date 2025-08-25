"use client"

import { useState } from "react"
import { ContentList } from "@/components/content/content-list"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function GalleryPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Download
        </Button>
      </div>

      {/* Gallery Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
          Content Gallery
        </h1>
        <p className="text-gray-400 text-lg">
          Manage your downloaded Instagram content and cross-post to platforms.
        </p>
      </div>

      {/* Content Grid */}
      <ContentList refreshTrigger={refreshTrigger} />
    </div>
  )
}