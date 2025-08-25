import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

// Type for database errors
interface DbError {
  message?: string
  code?: string
  detail?: string
  severity?: string
  hint?: string
  stack?: string
}

function getErrorDetails(e: unknown): DbError {
  const error = e as DbError
  return {
    message: error?.message,
    code: error?.code,
    detail: error?.detail,
    severity: error?.severity,
    hint: error?.hint
  }
}

export async function GET() {
  try {
    console.log("TEST-DB: Starting database test")
    console.log("TEST-DB: NODE_ENV:", process.env.NODE_ENV)
    console.log("TEST-DB: DATABASE_URL exists:", !!process.env.DATABASE_URL)
    console.log("TEST-DB: DATABASE_URL starts with:", process.env.DATABASE_URL?.substring(0, 30))

    // Test 1: Basic connection
    let basicTest
    try {
      basicTest = await db.execute(sql`SELECT 1 as test`)
      console.log("TEST-DB: Basic connection successful")
    } catch (e) {
      console.error("TEST-DB: Basic connection failed:", e)
      return NextResponse.json({
        test: "basic_connection",
        success: false,
        error: getErrorDetails(e)
      })
    }

    // Test 2: Check table exists
    let tableCheck
    try {
      tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'downloaded_content'
        )
      `)
      console.log("TEST-DB: Table check successful")
    } catch (e) {
      console.error("TEST-DB: Table check failed:", e)
      return NextResponse.json({
        test: "table_exists",
        success: false,
        error: getErrorDetails(e)
      })
    }

    // Test 3: Count rows
    let rowCount
    try {
      rowCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM downloaded_content
      `)
      console.log("TEST-DB: Row count successful")
    } catch (e) {
      console.error("TEST-DB: Row count failed:", e)
      return NextResponse.json({
        test: "row_count",
        success: false,
        error: getErrorDetails(e)
      })
    }

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      tests: {
        basic_connection: "passed",
        table_exists: tableCheck,
        row_count: rowCount
      }
    })

  } catch (error) {
    const err = getErrorDetails(error)
    console.error("TEST-DB: Unexpected error:", err)
    return NextResponse.json({
      success: false,
      error: {
        message: err?.message || "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      }
    }, { status: 500 })
  }
}