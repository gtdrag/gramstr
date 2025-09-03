import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/visitor-id"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema/content"
import { eq } from "drizzle-orm"
import { uploadToSupabase } from "@/lib/supabase-storage"
import { getBackendUrlSync } from "@/lib/get-backend-url"

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const { url } = await request.json()
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate Instagram URL
    const instagramUrlRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[A-Za-z0-9_.-]+/
    if (!instagramUrlRegex.test(url)) {
      return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 })
    }

    // Extract shortcode from URL
    const shortcodeMatch = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
    const shortcode = shortcodeMatch ? shortcodeMatch[1] : url.split('/').filter(Boolean).pop() || 'unknown'

    // Create a placeholder record immediately
    const [record] = await db.insert(downloadedContent).values({
      userId,
      originalUrl: url,
      shortcode,
      status: "processing",
      downloadedAt: new Date(),
      contentType: "image", // Will be updated
      isVideo: false,
      isCarousel: false,
      caption: "",
      filePath: "",
      likes: 0,
      views: 0,
    }).returning()

    // Start the download in the background (fire and forget)
    const backendUrl = getBackendUrlSync()
    fetch(`${backendUrl}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, user_id: userId }),
    }).then(async (response) => {
      if (response.ok) {
        const result = await response.json()
        
        // Upload files to Supabase Storage
        let supabaseFileUrl = null
        let supabaseThumbnailUrl = null
        let supabaseCarouselUrls = null
        
        // Upload main file
        if (result.metadata.file_path) {
          try {
            const fileResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(result.metadata.file_path)}`)
            if (fileResponse.ok) {
              const fileBlob = await fileResponse.blob()
              const mimeType = fileResponse.headers.get('content-type') || undefined
              supabaseFileUrl = await uploadToSupabase(fileBlob, result.metadata.file_path, userId, mimeType)
            }
          } catch (error) {
            console.error(`Error uploading main file:`, error)
          }
        }
        
        // Upload thumbnail
        if (result.metadata.thumbnail_path) {
          try {
            const thumbResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(result.metadata.thumbnail_path)}`)
            if (thumbResponse.ok) {
              const thumbBlob = await thumbResponse.blob()
              const mimeType = thumbResponse.headers.get('content-type') || undefined
              supabaseThumbnailUrl = await uploadToSupabase(thumbBlob, result.metadata.thumbnail_path, userId, mimeType)
            }
          } catch (error) {
            console.error(`Error uploading thumbnail:`, error)
          }
        }
        
        // Upload carousel files
        if (result.metadata.carousel_files && result.metadata.carousel_files.length > 0) {
          supabaseCarouselUrls = []
          for (const carouselFile of result.metadata.carousel_files) {
            try {
              const carouselResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(carouselFile)}`)
              if (carouselResponse.ok) {
                const carouselBlob = await carouselResponse.blob()
                const mimeType = carouselResponse.headers.get('content-type') || undefined
                const carouselUrl = await uploadToSupabase(carouselBlob, carouselFile, userId, mimeType)
                if (carouselUrl) {
                  supabaseCarouselUrls.push(carouselUrl)
                }
              }
            } catch (error) {
              console.error(`Error uploading carousel file ${carouselFile}:`, error)
            }
          }
        }
        
        // Update the record with the actual data and Supabase URLs
        await db.update(downloadedContent)
          .set({
            status: "completed",
            caption: result.metadata.caption,
            filePath: result.metadata.file_path,
            thumbnailPath: result.metadata.thumbnail_path,
            supabaseFileUrl: supabaseFileUrl,
            supabaseThumbnailUrl: supabaseThumbnailUrl,
            supabaseCarouselUrls: supabaseCarouselUrls,
            likes: result.metadata.likes,
            views: result.metadata.views,
            isVideo: result.metadata.is_video || false,
            isCarousel: result.metadata.is_carousel || false,
            carouselFiles: result.metadata.carousel_files,
            contentType: result.metadata.is_video ? "video" : 
                        result.metadata.is_carousel ? "carousel" : "image",
          })
          .where(eq(downloadedContent.id, record.id))
      } else {
        // Mark as failed
        await db.update(downloadedContent)
          .set({ status: "failed" })
          .where(eq(downloadedContent.id, record.id))
      }
    }).catch(async (error) => {
      console.error("Background download error:", error)
      await db.update(downloadedContent)
        .set({ status: "failed" })
        .where(eq(downloadedContent.id, record.id))
    })

    // Return immediately with the record ID
    return NextResponse.json({
      success: true,
      message: "Download started",
      id: record.id,
      status: "processing"
    })
  } catch (error) {
    console.error("Download initiation error:", error)
    return NextResponse.json(
      { error: "Failed to start download" },
      { status: 500 }
    )
  }
}

// Add a GET endpoint to check status
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const url = request.nextUrl.searchParams.get("id")
    if (!url) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const record = await db.query.downloadedContent.findFirst({
      where: (content, { and, eq }) => and(
        eq(content.id, url),
        eq(content.userId, userId)
      )
    })

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: record.id,
      status: record.status,
      caption: record.caption,
      filePath: record.filePath,
      thumbnailPath: record.thumbnailPath
    })
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    )
  }
}