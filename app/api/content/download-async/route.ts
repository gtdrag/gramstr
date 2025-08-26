import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/visitor-id"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema/content"

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

    // Create a placeholder record immediately
    const [record] = await db.insert(downloadedContent).values({
      userId,
      originalUrl: url,
      status: "processing",
      downloadedAt: new Date(),
      contentType: "image", // Will be updated
      isVideo: false,
      isCarousel: false,
    }).returning()

    // Start the download in the background (fire and forget)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    fetch(`${backendUrl}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, user_id: userId }),
    }).then(async (response) => {
      if (response.ok) {
        const result = await response.json()
        // Update the record with the actual data
        await db.update(downloadedContent)
          .set({
            status: "completed",
            caption: result.metadata.caption,
            filePath: result.metadata.file_path,
            thumbnailPath: result.metadata.thumbnail_path,
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