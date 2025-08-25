import { NextResponse } from "next/server"

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ""
  
  // Parse the URL safely
  let urlInfo: any = {}
  try {
    if (dbUrl) {
      const url = new URL(dbUrl)
      urlInfo = {
        protocol: url.protocol,
        port: url.port || "(default)",
        hostname: url.hostname,
        fullHost: url.host,
        pathname: url.pathname,
        hasPassword: !!url.password,
        searchParams: Object.fromEntries(url.searchParams)
      }
    }
  } catch (e) {
    urlInfo = { parseError: (e as any).message }
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
    },
    database: {
      DATABASE_URL_exists: !!process.env.DATABASE_URL,
      DATABASE_URL_length: dbUrl.length,
      DATABASE_URL_prefix: dbUrl.substring(0, 50),
      urlInfo,
      connectionType: dbUrl.includes(":6543") ? "pooled" : dbUrl.includes(":5432") ? "direct" : "unknown"
    },
    supabase: {
      NEXT_PUBLIC_SUPABASE_URL_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY_exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  })
}