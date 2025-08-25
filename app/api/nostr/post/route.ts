import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { downloadedContent, crossPostHistory } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NostrService, nostrKeysFromNsec, createNostrKeys } from "@/lib/nostr"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { contentId } = await request.json()

    if (!contentId) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    // Check for NOSTR keys in environment
    const nostrPrivateKey = process.env.NOSTR_PRIVATE_KEY
    if (!nostrPrivateKey) {
      return NextResponse.json({ 
        error: "NOSTR private key not configured. Please add NOSTR_PRIVATE_KEY to your .env file" 
      }, { status: 500 })
    }

    // Get the content from database
    const content = await db
      .select()
      .from(downloadedContent)
      .where(eq(downloadedContent.id, contentId))
      .limit(1)

    if (content.length === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    const contentItem = content[0]

    // Validate content belongs to user
    if (contentItem.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized access to content" }, { status: 403 })
    }

    // Initialize NOSTR service with environment key
    let nostrService: NostrService
    try {
      const { secretKey } = nostrKeysFromNsec(nostrPrivateKey)
      nostrService = new NostrService(secretKey)
    } catch (error) {
      return NextResponse.json({ error: "Invalid NOSTR private key in environment" }, { status: 500 })
    }

    // Connect to NOSTR network
    await nostrService.connect()

    // Handle carousel posts with multiple files
    let noteContent = contentItem.caption || 'Shared from Dumpstr'
    
    if (contentItem.isCarousel && contentItem.carouselFiles) {
      // Upload all carousel files to get public URLs
      console.log('Uploading carousel files to public storage...')
      const publicUrls: string[] = []
      
      for (const file of contentItem.carouselFiles as string[]) {
        try {
          // Check if this is already a Supabase URL or just a filename
          let sourceUrl: string
          let filename: string
          
          if (file.startsWith('http://') || file.startsWith('https://')) {
            // Already a Supabase URL, use it directly
            sourceUrl = file
            // Extract filename from URL path
            const urlParts = file.split('/')
            filename = urlParts[urlParts.length - 1] || 'media'
            console.log(`Using Supabase URL directly: ${sourceUrl}`)
          } else {
            // Just a filename, construct backend URL
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            sourceUrl = `${backendUrl}/media/${userId}/${encodeURIComponent(file)}`
            filename = file
            console.log(`Constructing backend URL: ${sourceUrl}`)
          }
          
          const publicUrl = await nostrService.uploadVideoFromUrl(sourceUrl, filename)
          publicUrls.push(publicUrl)
          console.log(`Uploaded ${filename} to ${publicUrl}`)
        } catch (error) {
          console.error(`Failed to upload ${file}:`, error)
          // Continue with other files even if one fails
        }
      }
      
      // Add all public URLs to the note
      if (publicUrls.length > 0) {
        noteContent = `${noteContent}\n\n${publicUrls.join('\n')}`
      }
      
      // Add original Instagram URL
      if (contentItem.originalUrl) {
        noteContent = `${noteContent}\n\nOriginal: ${contentItem.originalUrl}`
      }
      
      // Simple text note with all media URLs
      const noteId = await nostrService.publishNote(noteContent)
      
      // Record the cross-post
      await db.insert(crossPostHistory).values({
        contentId: contentItem.id,
        userId,
        platform: "nostr" as const,
        platformPostId: noteId,
        status: "completed",
        postedAt: new Date(),
      })
      
      nostrService.disconnect()
      
      return NextResponse.json({
        success: true,
        noteId,
        nostrPublicKey: nostrService.getPublicKey(),
        message: `Successfully posted carousel with ${publicUrls.length} items to NOSTR!`
      })
    } else {
      // Single media file - upload to get public URL
      let sourceUrl: string
      let filename: string
      
      // Check if filePath is already a Supabase URL or just a filename
      if (contentItem.filePath && (contentItem.filePath.startsWith('http://') || contentItem.filePath.startsWith('https://'))) {
        // Already a Supabase URL, use it directly
        sourceUrl = contentItem.filePath
        // Extract filename from URL path
        const urlParts = contentItem.filePath.split('/')
        filename = urlParts[urlParts.length - 1] || 'media'
        console.log(`Using Supabase URL directly: ${sourceUrl}`)
      } else {
        // Just a filename, construct backend URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        sourceUrl = `${backendUrl}/media/${userId}/${encodeURIComponent(contentItem.filePath || '')}`
        filename = contentItem.filePath || 'media'
        console.log(`Constructing backend URL: ${sourceUrl}`)
      }
      
      console.log('Uploading media to public storage...')
      let publicUrl: string
      try {
        publicUrl = await nostrService.uploadVideoFromUrl(sourceUrl, filename)
        console.log(`Uploaded to public URL: ${publicUrl}`)
      } catch (error) {
        console.error('Failed to upload media:', error)
        return NextResponse.json({ 
          error: "Failed to upload media to public storage. Make sure Supabase Storage is configured." 
        }, { status: 500 })
      }
      
      // Publish to NOSTR with public URL
      const noteId = await nostrService.publishInstagramVideo(
        publicUrl,
        filename,
        contentItem.caption || 'Shared from Dumpstr',
        contentItem.originalUrl
      )

      // Record the cross-post
      await db.insert(crossPostHistory).values({
        contentId: contentItem.id,
        userId,
        platform: "nostr" as const, // NOSTR platform type
        platformPostId: noteId,
        status: "completed",
        postedAt: new Date(),
      })

      // Cleanup
      nostrService.disconnect()

      return NextResponse.json({
        success: true,
        noteId,
        nostrPublicKey: nostrService.getPublicKey(),
        message: "Successfully posted to NOSTR!"
      })
    }

  } catch (error) {
    console.error("NOSTR post error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post to NOSTR" },
      { status: 500 }
    )
  }
}