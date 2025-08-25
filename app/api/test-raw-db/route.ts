import { NextResponse } from "next/server"
import postgres from "postgres"

export async function GET() {
  try {
    console.log("TEST-RAW-DB: Starting raw database test")
    console.log("TEST-RAW-DB: NODE_ENV:", process.env.NODE_ENV)
    console.log("TEST-RAW-DB: DATABASE_URL exists:", !!process.env.DATABASE_URL)
    console.log("TEST-RAW-DB: DATABASE_URL prefix:", process.env.DATABASE_URL?.substring(0, 50))
    
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      return NextResponse.json({
        success: false,
        error: "DATABASE_URL is not set in environment"
      })
    }

    // Check if it's a pooled connection
    const isPooled = databaseUrl.includes('pooler') || databaseUrl.includes('-pooler') || databaseUrl.includes('pgbouncer')
    const isSupabase = databaseUrl.includes('supabase')
    
    console.log("TEST-RAW-DB: Is Pooled:", isPooled)
    console.log("TEST-RAW-DB: Is Supabase:", isSupabase)
    console.log("TEST-RAW-DB: Full URL structure:", {
      hasPort6543: databaseUrl.includes(':6543'),
      hasPort5432: databaseUrl.includes(':5432'),
      hasSslmode: databaseUrl.includes('sslmode=')
    })

    // Test 1: Try with default settings
    let result1
    try {
      const sql1 = postgres(databaseUrl, {
        ssl: 'require',
        prepare: false,
        connect_timeout: 10
      })
      result1 = await sql1`SELECT 1 as test, NOW() as time`
      await sql1.end()
      console.log("TEST-RAW-DB: Default connection SUCCESS")
    } catch (e: any) {
      console.error("TEST-RAW-DB: Default connection failed:", e)
      result1 = { error: e.message || String(e) }
    }

    // Test 2: Try with pooler-specific settings if pooled
    let result2
    if (isPooled) {
      try {
        // For pooled connections, we might need to use transaction mode
        const urlWithParams = databaseUrl.includes('?') 
          ? `${databaseUrl}&pgbouncer=true&connection_limit=1`
          : `${databaseUrl}?pgbouncer=true&connection_limit=1`
          
        const sql2 = postgres(urlWithParams, {
          ssl: 'require',
          prepare: false,
          max: 1,
          idle_timeout: 0,
          connect_timeout: 10
        })
        result2 = await sql2`SELECT 2 as test, NOW() as time`
        await sql2.end()
        console.log("TEST-RAW-DB: Pooled connection SUCCESS")
      } catch (e: any) {
        console.error("TEST-RAW-DB: Pooled connection failed:", e)
        result2 = { error: e.message || String(e) }
      }
    }

    // Test 3: Try with no SSL (in case it's misconfigured)
    let result3
    try {
      const sql3 = postgres(databaseUrl, {
        ssl: false,
        prepare: false,
        connect_timeout: 10
      })
      result3 = await sql3`SELECT 3 as test, NOW() as time`
      await sql3.end()
      console.log("TEST-RAW-DB: No-SSL connection SUCCESS")
    } catch (e: any) {
      console.error("TEST-RAW-DB: No-SSL connection failed:", e)
      result3 = { error: e.message || String(e) }
    }

    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      databaseInfo: {
        urlExists: !!databaseUrl,
        urlPrefix: databaseUrl?.substring(0, 50),
        isPooled,
        isSupabase
      },
      tests: {
        defaultConnection: result1,
        pooledConnection: result2,
        noSslConnection: result3
      }
    })

  } catch (error: any) {
    console.error("TEST-RAW-DB: Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: {
        message: error?.message || "Unknown error",
        name: error?.name,
        code: error?.code,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }
    }, { status: 500 })
  }
}