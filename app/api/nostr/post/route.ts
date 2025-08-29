import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { downloadedContent, crossPostHistory } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NostrService, nostrKeysFromNsec, createNostrKeys } from "@/lib/nostr"
import { getUserId } from "@/lib/visitor-id"

export async function POST(request: NextRequest) {
  try {
    // Get user ID from NOSTR pubkey or visitor cookie
    const userId = await getUserId()

    const { contentId, signedEvent } = await request.json()

    if (!contentId) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    // Check if this is from Electron with a pre-signed event
    if (signedEvent) {
      // Electron client has already signed the event
      console.log("Processing pre-signed event from Electron client")
      
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

      // For pre-signed events, we can publish directly without a NostrService key
      // We'll use the SimplePool directly
      const { SimplePool } = await import('nostr-tools')
      const pool = new SimplePool()
      const relays = [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.snort.social',
        'wss://relay.nostr.info',
        'wss://nostr.wine'
      ]
      
      // Publish the pre-signed event directly
      const promises = pool.publish(relays, signedEvent)
      await Promise.allSettled(promises)
      
      const noteId = signedEvent.id
      
      // Record the cross-post
      await db.insert(crossPostHistory).values({
        contentId: contentItem.id,
        userId,
        platform: "nostr" as const,
        platformPostId: noteId,
        status: "completed",
        postedAt: new Date(),
      })
      
      // Close the pool
      pool.close(relays)
      
      return NextResponse.json({
        success: true,
        noteId,
        nostrPublicKey: signedEvent.pubkey,
        message: "Successfully posted to NOSTR!"
      })
    }

    // Check for NOSTR keys in environment (for browser clients)
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
    let noteContent = contentItem.caption || 'Shared from ⚡gramstr'
    
    console.log('Content item details:', {
      isCarousel: contentItem.isCarousel,
      carouselFiles: contentItem.carouselFiles,
      supabaseCarouselUrls: contentItem.supabaseCarouselUrls,
      filePath: contentItem.filePath,
      supabaseFileUrl: contentItem.supabaseFileUrl,
      contentType: contentItem.contentType
    })
    
    // Log the actual values to debug
    console.log('DEBUG - supabaseCarouselUrls value:', JSON.stringify(contentItem.supabaseCarouselUrls))
    console.log('DEBUG - carouselFiles value:', JSON.stringify(contentItem.carouselFiles))
    
    // Check for carousel content - use Supabase URLs if available, otherwise fall back to carouselFiles
    const carouselUrls = contentItem.supabaseCarouselUrls || contentItem.carouselFiles
    
    console.log('🔍 NOSTR POST DEBUG:')
    console.log('  - Is Carousel:', contentItem.isCarousel)
    console.log('  - Carousel URLs type:', typeof carouselUrls)
    console.log('  - Carousel URLs:', JSON.stringify(carouselUrls, null, 2))
    
    if (contentItem.isCarousel && carouselUrls) {
      // Upload all carousel files to get public URLs
      console.log(`Processing carousel with ${(carouselUrls as string[]).length} files...`)
      const publicUrls: string[] = []
      
      for (const file of carouselUrls as string[]) {
        console.log(`  📁 Processing file: ${file}`)
        console.log(`     Is URL: ${file.startsWith('http://') || file.startsWith('https://')}`)
        try {
          // Check if this is already a Supabase URL or just a filename
          if (file.startsWith('http://') || file.startsWith('https://')) {
            // Already a Supabase URL, use it directly - no need to re-upload!
            console.log(`Using existing Supabase URL: ${file}`)
            publicUrls.push(file)
          } else {
            // Just a filename, need to fetch from backend and upload
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
            const sourceUrl = `${backendUrl}/media/${userId}/${encodeURIComponent(file)}`
            console.log(`Fetching from backend and uploading: ${sourceUrl}`)
            
            // This will download from backend and re-upload to Supabase
            const publicUrl = await nostrService.uploadVideoFromUrl(sourceUrl, file)
            publicUrls.push(publicUrl)
            console.log(`Uploaded ${file} to ${publicUrl}`)
          }
        } catch (error) {
          console.error(`Failed to process ${file}:`, error)
          // Continue with other files even if one fails
        }
      }
      
      // Add all public URLs to the note
      console.log(`Collected ${publicUrls.length} public URLs for NOSTR post`)
      if (publicUrls.length > 0) {
        noteContent = `${noteContent}\n\n${publicUrls.join('\n')}`
        console.log('Final note content with URLs:', noteContent)
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
      // Single media file - get public URL
      let publicUrl: string
      
      // Use supabaseFileUrl if available, otherwise fall back to filePath
      const mediaUrl = contentItem.supabaseFileUrl || contentItem.filePath
      
      // Check if we have a Supabase URL or just a filename
      if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
        // Already a Supabase URL, use it directly - no need to re-upload!
        publicUrl = mediaUrl
        console.log(`Using existing Supabase URL: ${publicUrl}`)
      } else {
        // Just a filename, need to fetch from backend and upload
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const sourceUrl = `${backendUrl}/media/${userId}/${encodeURIComponent(contentItem.filePath || '')}`
        const filename = contentItem.filePath || 'media'
        console.log(`Fetching from backend and uploading: ${sourceUrl}`)
        
        try {
          publicUrl = await nostrService.uploadVideoFromUrl(sourceUrl, filename)
          console.log(`Uploaded to public URL: ${publicUrl}`)
        } catch (error) {
          console.error('Failed to upload media:', error)
          return NextResponse.json({ 
            error: "Failed to upload media to public storage. Make sure Supabase Storage is configured." 
          }, { status: 500 })
        }
      }
      
      // Extract filename for NOSTR post
      const filename = contentItem.filePath?.split('/').pop() || 'media'
      
      // Publish to NOSTR with public URL
      const noteId = await nostrService.publishInstagramVideo(
        publicUrl,
        filename,
        contentItem.caption || 'Shared from ⚡gramstr',
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