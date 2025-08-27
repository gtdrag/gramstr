"use client"

import { useState } from "react"
import { ContentList } from "@/components/content/content-list"
import { AppLayout } from "@/components/layout/app-layout"
import { useNostr } from "@/context/nostr-context"

export default function GalleryPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { isConnected } = useNostr()

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Gallery Header */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Content Gallery
            </h1>
            <p className="text-gray-400 text-lg">
              Manage your downloaded Instagram content and cross-post to NOSTR.
            </p>
          </div>

          {/* Content Grid */}
          <ContentList refreshTrigger={refreshTrigger} isNostrConnected={isConnected} />
        </div>
      </div>
    </AppLayout>
  )
}