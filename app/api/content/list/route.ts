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
    } catch (dbError: any) {
      console.error("Database query error:", dbError)
      // Return more detailed error for debugging
      const errorDetails = {
        message: dbError?.message || "Unknown error",
        code: dbError?.code,
        severity: dbError?.severity,
        detail: dbError?.detail,
        hint: dbError?.hint,
        stack: process.env.NODE_ENV === 'development' ? dbError?.stack : undefined
      }
      
      return NextResponse.json({
        success: false,
        content: [],
        error: errorDetails,
        message: "Database query failed - check error details"
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