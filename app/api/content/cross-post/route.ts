import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { crossPostHistory, downloadedContent } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { contentId, platforms } = await request.json()

    if (!contentId || !platforms || !Array.isArray(platforms)) {
      return NextResponse.json({ 
        error: "Content ID and platforms array are required" 
      }, { status: 400 })
    }

    // Verify content belongs to user
    const content = await db
      .select()
      .from(downloadedContent)
      .where(eq(downloadedContent.id, contentId))
      .limit(1)

    if (!content.length || content[0].userId !== userId) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 })
    }

    // Create cross-post records for each platform
    const crossPosts = []
    for (const platform of platforms) {
      const crossPost = await db.insert(crossPostHistory).values({
        contentId,
        userId,
        platform,
        status: "processing",
      }).returning()

      crossPosts.push(crossPost[0])

      // Here you would integrate with each platform's API
      // For now, we'll just mark as completed
      // TODO: Implement actual cross-posting logic
      setTimeout(async () => {
        await db
          .update(crossPostHistory)
          .set({ 
            status: "completed",
            postedAt: new Date(),
            platformPostId: `mock_${platform}_${Date.now()}`
          })
          .where(eq(crossPostHistory.id, crossPost[0].id))
      }, 2000)
    }

    return NextResponse.json({
      success: true,
      crossPosts,
      message: `Cross-posting to ${platforms.length} platform(s) initiated`
    })

  } catch (error) {
    console.error("Cross-post error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}