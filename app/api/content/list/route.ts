import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("LIST API - userId:", userId)

    let content
    try {
      content = await db
        .select()
        .from(downloadedContent)
        .where(eq(downloadedContent.userId, userId))
        .orderBy(desc(downloadedContent.downloadedAt))
    } catch (dbError) {
      console.error("Database query error:", dbError)
      // Return empty array when database is unavailable
      return NextResponse.json({
        success: true,
        content: [],
        message: "No content available - database connection issue"
      })
    }

    return NextResponse.json({
      success: true,
      content,
    })

  } catch (error) {
    console.error("List content error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}