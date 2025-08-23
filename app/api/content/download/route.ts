import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Validate Instagram URL (including Stories)
    const instagramUrlRegex = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels|tv|stories)\/[A-Za-z0-9_.-]+/
    if (!instagramUrlRegex.test(url)) {
      return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 })
    }

    // Call Python backend
    const pythonResponse = await fetch("http://localhost:8000/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        user_id: userId,
      }),
    })

    if (!pythonResponse.ok) {
      const error = await pythonResponse.json()
      // Forward the original status code from Python backend (especially 401 for session expiration)
      return NextResponse.json(
        { error: error.detail || "Download failed" }, 
        { status: pythonResponse.status }
      )
    }

    const result = await pythonResponse.json()

    // Save to database
    const contentRecord = await db.insert(downloadedContent).values({
      userId,
      originalUrl: url,
      shortcode: result.metadata.id,
      caption: result.metadata.caption,
      contentType: result.metadata.is_carousel ? "carousel" : (result.metadata.is_video ? "video" : "image"),
      status: "completed",
      filePath: result.metadata.file_path,
      thumbnailPath: result.metadata.thumbnail_path,
      likes: result.metadata.likes,
      isVideo: result.metadata.is_video,
      isCarousel: result.metadata.is_carousel || false,
      carouselFiles: result.metadata.carousel_files || null,
      metadata: result.metadata,
    }).returning()

    return NextResponse.json({
      success: true,
      content: contentRecord[0],
      message: "Content downloaded successfully"
    })

  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}