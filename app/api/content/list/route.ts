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
    console.log("Database URL exists:", !!process.env.DATABASE_URL)
    console.log("Environment:", process.env.NODE_ENV)

    let content
    try {
      content = await db
        .select()
        .from(downloadedContent)
        .where(eq(downloadedContent.userId, userId))
        .orderBy(desc(downloadedContent.downloadedAt))
    } catch (dbError) {
      console.error("Database query error:", dbError)
      // Return the actual error for debugging
      return NextResponse.json({
        success: false,
        content: [],
        error: dbError instanceof Error ? dbError.message : "Database connection failed",
        message: "Database query failed - check logs for details"
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