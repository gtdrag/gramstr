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
    console.log("Database URL prefix:", process.env.DATABASE_URL?.substring(0, 30))
    console.log("Environment:", process.env.NODE_ENV)
    console.log("Vercel Region:", process.env.VERCEL_REGION)

    let content
    try {
      content = await db
        .select()
        .from(downloadedContent)
        .where(eq(downloadedContent.userId, userId))
        .orderBy(desc(downloadedContent.downloadedAt))
    } catch (dbError) {
      console.error("Database query error:", dbError)
      console.error("Error type:", typeof dbError)
      console.error("Error constructor:", (dbError as any)?.constructor?.name)
      console.error("Error keys:", Object.keys(dbError as any))
      
      // Return more detailed error for debugging
      const error = dbError as any
      const errorDetails = {
        message: error?.message || "Unknown error",
        code: error?.code,
        severity: error?.severity,
        detail: error?.detail,
        hint: error?.hint,
        cause: error?.cause?.message || error?.cause,
        originalError: JSON.stringify(error?.originalError || error),
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
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