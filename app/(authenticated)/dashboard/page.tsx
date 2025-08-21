"use client"

import { useState } from "react"
import { DownloadForm } from "@/components/content/download-form"
import { ContentList } from "@/components/content/content-list"
import { Button } from "@/components/ui/button"
import { Grid3x3, Images } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const router = useRouter()

  const handleDownloadComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-4xl space-y-12">
        {/* Gallery Link - Top Right */}
        <div className="absolute top-8 right-8">
          <Button
            onClick={() => router.push('/dashboard/gallery')}
            variant="outline"
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            View Gallery
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            InstaScrape Dashboard
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Download Instagram content and cross-post to decentralized platforms.
          </p>
        </div>

        {/* Download Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 shadow-2xl">
          <h2 className="text-3xl font-semibold mb-8 text-white text-center">Download Content</h2>
          <DownloadForm onDownloadComplete={handleDownloadComplete} />
          
          {/* Or link to gallery */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => router.push('/dashboard/gallery')}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              Or view your existing content gallery →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
