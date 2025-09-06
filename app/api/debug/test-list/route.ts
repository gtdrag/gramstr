import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { downloadedContent } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { getUserId } from "@/lib/visitor-id"
import { headers, cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const debug: any = {
    step: "start",
    errors: [],
    results: {}
  }

  try {
    // Test 1: Check environment
    debug.step = "environment"
    debug.results.env = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL?.substring(0, 50),
    }

    // Test 2: Try headers
    debug.step = "headers"
    try {
      const h = await headers()
      debug.results.headers = "OK"
    } catch (e: any) {
      debug.errors.push({ step: "headers", error: e.message })
    }

    // Test 3: Try cookies
    debug.step = "cookies"
    try {
      const c = await cookies()
      debug.results.cookies = "OK"
    } catch (e: any) {
      debug.errors.push({ step: "cookies", error: e.message })
    }

    // Test 4: Try getUserId
    debug.step = "getUserId"
    try {
      const userId = await getUserId()
      debug.results.userId = userId
    } catch (e: any) {
      debug.errors.push({ step: "getUserId", error: e.message })
      debug.results.userId = "FAILED"
    }

    // Test 5: Try database connection
    debug.step = "database"
    try {
      // Use a fallback userId if getUserId failed
      const testUserId = debug.results.userId !== "FAILED" 
        ? debug.results.userId 
        : "test_user_123"
      
      const content = await db
        .select()
        .from(downloadedContent)
        .where(eq(downloadedContent.userId, testUserId))
        .limit(1)
      
      debug.results.database = {
        connected: true,
        rowsFound: content.length
      }
    } catch (e: any) {
      debug.errors.push({ 
        step: "database", 
        error: e.message,
        code: e.code,
        detail: e.detail 
      })
      debug.results.database = "FAILED"
    }

    debug.step = "complete"
    return NextResponse.json({
      success: debug.errors.length === 0,
      debug
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      debug,
      finalError: error.message
    }, { status: 500 })
  }
}