import { NextRequest, NextResponse } from "next/server"
import { getUserId } from "@/lib/visitor-id"
import { cookies, headers } from "next/headers"

export async function GET(request: NextRequest) {
  const userId = await getUserId()
  const headerStore = await headers()
  const cookieStore = await cookies()
  
  return NextResponse.json({
    userId,
    nostrHeader: headerStore.get("x-nostr-pubkey"),
    visitorCookie: cookieStore.get("visitor_id")?.value,
    allHeaders: Object.fromEntries(headerStore.entries()),
  })
}