"use client"

import { useState } from "react"
import { DownloadForm } from "@/components/content/download-form"
import { ContentList } from "@/components/content/content-list"

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleDownloadComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">InstaScrape Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Download Instagram content and cross-post to other platforms.
          </p>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Download Content</h2>
            <DownloadForm onDownloadComplete={handleDownloadComplete} />
          </div>

          <ContentList refreshTrigger={refreshTrigger} />
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Download Instagram content for archival and cross-posting purposes.</p>
            <p>Manage your content library and distribute across platforms.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
