import { NextResponse } from "next/server"
import { existsSync } from "fs"
import path from "path"

export async function GET() {
  try {
    // Check if Instagram cookies are available
    const cookieFiles = [
      path.join(process.cwd(), "backend", "session_cookies.json"),
      path.join(process.cwd(), "backend", "instagram_cookies.txt")
    ]
    
    const hasAuth = cookieFiles.some(file => existsSync(file))
    
    return NextResponse.json({
      authenticated: hasAuth,
      storiesSupported: hasAuth,
      message: hasAuth 
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