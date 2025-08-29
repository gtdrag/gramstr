import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { uploadToSupabase } from "@/lib/supabase-storage"
import { getUserId } from "@/lib/visitor-id"

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 MAIN DOWNLOAD ROUTE CALLED')
    // Get user ID from NOSTR pubkey or visitor cookie
    const userId = await getUserId()

    console.log("DOWNLOAD API - userId:", userId)

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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const pythonResponse = await fetch(`${backendUrl}/download`, {
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
      console.error("Python backend error:", {
        status: pythonResponse.status,
        error: error,
        url: url,
        backendUrl: backendUrl
      })
      // Forward the original status code from Python backend (especially 401 for session expiration)
      return NextResponse.json(
        { 
          error: error.detail || "Download failed",
          debug: process.env.NODE_ENV === 'development' ? {
            backendError: error,
            backendUrl: backendUrl
          } : undefined
        }, 
        { status: pythonResponse.status }
      )
    }

    const result = await pythonResponse.json()
    
    // Debug: Check if carousel files exist in the result
    console.log('🔍 Checking carousel files:', {
      'metadata exists': !!result.metadata,
      'carousel_files exists': !!result.metadata?.carousel_files,
      'carousel_files length': result.metadata?.carousel_files?.length,
      'is_carousel': result.metadata?.is_carousel
    })

    // Upload files to Supabase Storage
    let supabaseFileUrl = null
    let supabaseThumbnailUrl = null
    let supabaseCarouselUrls = null
    
    if (result.metadata.file_path) {
      // Removed delay - was causing issues
      
      // Fetch the actual file from Python backend
      const fileResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(result.metadata.file_path)}`)
      if (fileResponse.ok) {
        const fileBlob = await fileResponse.blob()
        const mimeType = fileResponse.headers.get('content-type') || undefined
        try {
          supabaseFileUrl = await uploadToSupabase(fileBlob, result.metadata.file_path, userId, mimeType)
        } catch (uploadError) {
          supabaseFileUrl = null
        }
      } else {
        console.error(`❌ IMAGE FETCH: Failed to fetch ${result.metadata.file_path} - status: ${fileResponse.status}`)
      }
    }
    
    if (result.metadata.thumbnail_path) {
      // Fetch and upload thumbnail
      const thumbResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(result.metadata.thumbnail_path)}`)
      if (thumbResponse.ok) {
        const thumbBlob = await thumbResponse.blob()
        const mimeType = thumbResponse.headers.get('content-type') || undefined
        supabaseThumbnailUrl = await uploadToSupabase(thumbBlob, result.metadata.thumbnail_path, userId, mimeType)
      }
    }
    
    // Upload carousel files if present - with detailed error logging
    if (result.metadata.carousel_files && result.metadata.carousel_files.length > 0) {
      console.log(`🔄 CAROUSEL DEBUG: Found ${result.metadata.carousel_files.length} carousel files`)
      supabaseCarouselUrls = []
      
      for (let i = 0; i < result.metadata.carousel_files.length; i++) {
        const carouselFile = result.metadata.carousel_files[i]
        console.log(`📁 CAROUSEL DEBUG: Processing file ${i+1}/${result.metadata.carousel_files.length}: ${carouselFile}`)
        
        // Add delay before each carousel file fetch
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay per carousel file
        
        try {
          const fetchUrl = `${backendUrl}/media/${userId}/${encodeURIComponent(carouselFile)}`
          console.log(`🌐 CAROUSEL DEBUG: Attempting fetch from: ${fetchUrl}`)
          
          const carouselResponse = await fetch(fetchUrl)
          console.log(`📡 CAROUSEL DEBUG: Fetch status: ${carouselResponse.status}`)
          
          if (carouselResponse.ok) {
            const carouselBlob = await carouselResponse.blob()
            const mimeType = carouselResponse.headers.get('content-type') || 'image/jpeg'
            console.log(`📦 CAROUSEL DEBUG: Got blob - size: ${carouselBlob.size}, mime: ${mimeType}`)
            
            console.log(`☁️ CAROUSEL DEBUG: Starting Supabase upload for: ${carouselFile}`)
            const carouselUrl = await uploadToSupabase(
              carouselBlob,
              carouselFile,
              userId,
              mimeType
            )
            console.log(`✅ CAROUSEL DEBUG: Supabase result: ${carouselUrl || 'NULL/FAILED'}`)
            
            if (carouselUrl) {
              supabaseCarouselUrls.push(carouselUrl)
              console.log(`💾 CAROUSEL DEBUG: Added URL to array. Total: ${supabaseCarouselUrls.length}`)
            } else {
              console.error(`❌ CAROUSEL DEBUG: Upload returned null for: ${carouselFile}`)
            }
          } else {
            console.error(`❌ CAROUSEL DEBUG: Fetch failed for ${carouselFile} with status ${carouselResponse.status}`)
            const errorText = await carouselResponse.text()
            console.error(`❌ CAROUSEL DEBUG: Error text: ${errorText}`)
          }
        } catch (error) {
          console.error(`💥 CAROUSEL DEBUG: Exception for ${carouselFile}:`, error)
          if (error instanceof Error) {
            console.error(`💥 CAROUSEL DEBUG: Error stack:`, error.stack)
          }
        }
      }
      console.log(`🏁 CAROUSEL DEBUG: Final result - uploaded ${supabaseCarouselUrls?.length || 0}/${result.metadata.carousel_files.length} files`)
      console.log(`🏁 CAROUSEL DEBUG: Supabase URLs array:`, supabaseCarouselUrls)
    } else {
      console.log(`🚫 CAROUSEL DEBUG: No carousel files found in metadata`)
    }

    // Save to database
    let contentRecord
    try {
      contentRecord = await db.insert(downloadedContent).values({
        userId,
        originalUrl: url,
        shortcode: result.metadata.id,
        caption: result.metadata.caption,
        contentType: result.metadata.is_carousel ? "carousel" : (result.metadata.is_video ? "video" : "image"),
        status: "completed",
        filePath: result.metadata.file_path,
        thumbnailPath: result.metadata.thumbnail_path,
        supabaseFileUrl: supabaseFileUrl,
        supabaseThumbnailUrl: supabaseThumbnailUrl,
        supabaseCarouselUrls: supabaseCarouselUrls,
        likes: result.metadata.likes,
        isVideo: result.metadata.is_video,
        isCarousel: result.metadata.is_carousel || false,
        carouselFiles: result.metadata.carousel_files || null,
        metadata: result.metadata,
      }).returning()
    } catch (dbError) {
      console.error("Database insert error:", dbError)
      // Return success without database save for now - just pass through backend result
      return NextResponse.json({
        success: true,
        content: {
          id: result.metadata.id,
          originalUrl: url,
          caption: result.metadata.caption,
          contentType: result.metadata.is_carousel ? "carousel" : (result.metadata.is_video ? "video" : "image"),
          filePath: result.metadata.file_path,
          isVideo: result.metadata.is_video,
          isCarousel: result.metadata.is_carousel || false,
          carouselFiles: (supabaseCarouselUrls && supabaseCarouselUrls.length > 0) 
          ? supabaseCarouselUrls 
          : result.metadata.carousel_files || null,
          metadata: result.metadata,
        },
        message: "Content downloaded successfully (database save skipped due to connection issue)",
        warning: "Database connection issue - content not persisted"
      })
    }

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