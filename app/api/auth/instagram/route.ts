import { NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import path from "path"

export async function GET() {
  try {
    // Check for valid Instagram authentication
    let hasValidAuth = false
    
    // Check session_cookies.json
    const sessionCookiesPath = path.join(process.cwd(), "backend", "session_cookies.json")
    if (existsSync(sessionCookiesPath)) {
      try {
        const cookieData = JSON.parse(readFileSync(sessionCookiesPath, "utf-8"))
        hasValidAuth = cookieData.some((cookie: any) => 
          cookie.name === "sessionid" && cookie.value && cookie.value.length > 0
        )
      } catch (e) {
        // Invalid JSON, continue checking other files
      }
    }
    
    // Check instagram_cookies.txt if JSON check failed
    if (!hasValidAuth) {
      const txtCookiesPath = path.join(process.cwd(), "backend", "instagram_cookies.txt")
      if (existsSync(txtCookiesPath)) {
        try {
          const cookieContent = readFileSync(txtCookiesPath, "utf-8")
          hasValidAuth = cookieContent.includes("sessionid") && 
                        cookieContent.split("sessionid")[1]?.trim().length > 0
        } catch (e) {
          // File read error
        }
      }
    }
    
    return NextResponse.json({
      authenticated: hasValidAuth,
      storiesSupported: hasValidAuth,
      message: hasValidAuth 
        ? "Instagram authentication available - Stories downloads enabled"
        : "No Instagram authentication found - Stories require login"
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check authentication status" },
      { status: 500 }
    )
  }
}