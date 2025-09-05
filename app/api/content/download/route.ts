import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { uploadToSupabase } from "@/lib/supabase-storage"
import { getUserId } from "@/lib/visitor-id"
import { getBackendUrlSync } from "@/lib/get-backend-url"
import { cleanUrl } from "@/lib/url-privacy"
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

function logToFile(message: string) {
  try {
    // Match the actual app name: gramstr-app
    const logPath = path.join(os.homedir(), 'Library', 'Application Support', 'gramstr-app', 'installer.log')
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [DOWNLOAD-API] ${message}\n`
    fs.appendFileSync(logPath, logMessage)
  } catch (e) {
    console.error('Failed to write to log file:', e)
  }
}

export async function POST(request: NextRequest) {
  logToFile('=== DOWNLOAD API START ===')
  logToFile(`Environment: ${process.env.NODE_ENV}`)
  logToFile(`PYTHON_PORT: ${process.env.PYTHON_PORT}`)
  logToFile(`NEXT_PUBLIC_PYTHON_PORT: ${process.env.NEXT_PUBLIC_PYTHON_PORT}`)
  logToFile(`NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`)
  
  console.log('=== DOWNLOAD API START ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Environment:', process.env.NODE_ENV)
  console.log('PYTHON_PORT env:', process.env.PYTHON_PORT)
  console.log('NEXT_PUBLIC_PYTHON_PORT env:', process.env.NEXT_PUBLIC_PYTHON_PORT)
  console.log('NEXT_PUBLIC_API_URL env:', process.env.NEXT_PUBLIC_API_URL)
  
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

    // Call Python backend with dynamic URL
    const backendUrl = getBackendUrlSync()
    const fullUrl = `${backendUrl}/download`
    
    logToFile(`Backend URL resolved to: ${backendUrl}`)
    logToFile(`Full download URL: ${fullUrl}`)
    logToFile(`Request payload: ${JSON.stringify({ url, user_id: userId })}`)
    
    console.log("Backend URL resolved to:", backendUrl)
    console.log("Full download URL:", fullUrl)
    console.log("Request payload:", { url, user_id: userId })
    
    const pythonResponse = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        user_id: userId,
      }),
    })

    logToFile(`Python response status: ${pythonResponse.status}`)
    logToFile(`Python response ok: ${pythonResponse.ok}`)
    
    console.log("Python response status:", pythonResponse.status)
    console.log("Python response ok:", pythonResponse.ok)
    
    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { detail: errorText }
      }
      
      logToFile(`=== PYTHON BACKEND ERROR ===`)
      logToFile(`Status: ${pythonResponse.status}`)
      logToFile(`Error response: ${JSON.stringify(error)}`)
      logToFile(`Request URL: ${url}`)
      logToFile(`Backend URL: ${backendUrl}`)
      logToFile(`User ID: ${userId}`)
      
      console.error("=== PYTHON BACKEND ERROR ===")
      console.error("Status:", pythonResponse.status)
      console.error("Error response:", error)
      console.error("Request URL:", url)
      console.error("Backend URL:", backendUrl)
      console.error("User ID:", userId)
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
      // Add small delay to prevent race conditions in bulk downloads
      if (result.metadata.is_video) {
        console.log('⏳ VIDEO: Adding 2s delay before processing video to prevent race conditions')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      // Fetch the actual file from Python backend
      console.log(`📥 Fetching ${result.metadata.is_video ? 'VIDEO' : 'IMAGE'}: ${result.metadata.file_path}`)
      const fileResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(result.metadata.file_path)}`)
      if (fileResponse.ok) {
        const fileBlob = await fileResponse.blob()
        const mimeType = fileResponse.headers.get('content-type') || undefined
        const fileSizeMB = fileBlob.size / (1024 * 1024)
        
        console.log(`📊 File details:`)
        console.log(`  - Type: ${result.metadata.is_video ? 'VIDEO' : 'IMAGE'}`)
        console.log(`  - Size: ${fileSizeMB.toFixed(2)} MB`)
        console.log(`  - MIME: ${mimeType}`)
        
        // Warn if video is large
        if (result.metadata.is_video && fileSizeMB > 50) {
          console.warn(`⚠️ VIDEO: Large video file (${fileSizeMB.toFixed(2)} MB) may fail to upload to Supabase`)
        }
        
        try {
          console.log(`☁️ Starting Supabase upload for: ${result.metadata.file_path}`)
          supabaseFileUrl = await uploadToSupabase(fileBlob, result.metadata.file_path, userId, mimeType)
          
          if (supabaseFileUrl) {
            console.log(`✅ Upload successful: ${supabaseFileUrl}`)
          } else {
            console.error(`❌ Upload failed: uploadToSupabase returned null`)
            if (result.metadata.is_video) {
              console.error(`❌ VIDEO UPLOAD FAILED - Video will not be available for Nostr posting`)
              console.error(`  - Consider checking Supabase storage limits or increasing timeout`)
            }
          }
        } catch (uploadError) {
          console.error(`💥 Upload exception:`, uploadError)
          if (uploadError instanceof Error) {
            console.error(`  - Error message: ${uploadError.message}`)
            console.error(`  - Error stack: ${uploadError.stack}`)
          }
          supabaseFileUrl = null
        }
      } else {
        console.error(`❌ FETCH FAILED: ${result.metadata.file_path} - status: ${fileResponse.status}`)
      }
    }
    
    if (result.metadata.thumbnail_path) {
      // Fetch and upload thumbnail
      console.log(`📸 Fetching thumbnail: ${result.metadata.thumbnail_path}`)
      const thumbResponse = await fetch(`${backendUrl}/media/${userId}/${encodeURIComponent(result.metadata.thumbnail_path)}`)
      if (thumbResponse.ok) {
        const thumbBlob = await thumbResponse.blob()
        const mimeType = thumbResponse.headers.get('content-type') || undefined
        try {
          supabaseThumbnailUrl = await uploadToSupabase(thumbBlob, result.metadata.thumbnail_path, userId, mimeType)
          if (!supabaseThumbnailUrl) {
            console.warn(`⚠️ Thumbnail upload returned null`)
          }
        } catch (error) {
          console.error(`❌ Thumbnail upload failed:`, error)
        }
      } else {
        console.error(`❌ Thumbnail fetch failed: status ${thumbResponse.status}`)
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
    // Clean the URL to remove tracking parameters before saving
    const cleanedUrl = cleanUrl(url)
    console.log(`🔒 Privacy: Cleaned URL from ${url} to ${cleanedUrl}`)
    
    let contentRecord
    try {
      
      contentRecord = await db.insert(downloadedContent).values({
        userId,
        originalUrl: cleanedUrl,
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
          originalUrl: cleanedUrl,  // Return the CLEANED URL, not the original!
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
    logToFile("=== DOWNLOAD API EXCEPTION ===")
    logToFile(`Error type: ${typeof error}`)
    logToFile(`Error: ${String(error)}`)
    if (error instanceof Error) {
      logToFile(`Error message: ${error.message}`)
      logToFile(`Error stack: ${error.stack}`)
    }
    
    console.error("=== DOWNLOAD API EXCEPTION ===")
    console.error("Error type:", typeof error)
    console.error("Error:", error)
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}