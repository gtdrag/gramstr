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

    // Build video URL for our backend
    const videoUrl = `http://localhost:8000/media/${userId}/${encodeURIComponent(contentItem.filePath || '')}`
    
    // TODO: For production, replace localhost with a publicly accessible domain
    // For now, we'll use localhost but this needs to be publicly accessible for NOSTR users
    
    // Publish to NOSTR
    const noteId = await nostrService.publishInstagramVideo(
      videoUrl,
      contentItem.filePath || 'video.mp4',
      contentItem.caption || 'Shared from InstaScrape',
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

  } catch (error) {
    console.error("NOSTR post error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post to NOSTR" },
      { status: 500 }
    )
  }
}