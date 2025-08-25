import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For production testing - fetch directly from backend filesystem
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    
    try {
      // Call a backend endpoint to list user files
      const response = await fetch(`${backendUrl}/list-files/${userId}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch files from backend")
      }
      
      const files = await response.json()
      
      // Transform to match frontend format
      const content = files.map((file: any) => ({
        id: file.name,
        userId: userId,
        originalUrl: "",
        caption: file.name.replace(/\.(mp4|jpg|jpeg|png|webp)$/i, ""),
        contentType: file.isVideo ? "video" : "image",
        status: "completed",
        likes: 0,
        views: 0,
        downloadedAt: new Date().toISOString(),
        filePath: file.name,
        thumbnailPath: null,
        isVideo: file.isVideo,
        isCarousel: false,
        carouselFiles: null
      }))
      
      return NextResponse.json({
        success: true,
        content,
        source: "filesystem"
      })
      
    } catch (error) {
      console.error("Backend fetch error:", error)
      // Fallback to empty
      return NextResponse.json({
        success: true,
        content: [],
        message: "Could not fetch files from backend"
      })
    }

  } catch (error) {
    console.error("List files error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}