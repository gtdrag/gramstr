import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Always check with backend API - it's the single source of truth
    // In Electron, always use localhost:8000 where Python backend runs
    const backendUrl = 'http://localhost:8000'
    
    try {
      const response = await fetch(`${backendUrl}/auth/status`)
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      }
      
      // Backend returned an error
      console.error("Backend auth status check failed:", response.status)
    } catch (error) {
      console.error("Failed to check backend auth status:", error)
    }
    
    // If backend check fails, return unauthenticated state
    return NextResponse.json({
      authenticated: false,
      storiesSupported: false,
      sessionAge: null,
      sessionStatus: "unknown",
      warningMessage: null,
      message: "No Instagram authentication found - Stories require login"
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check authentication status" },
      { status: 500 }
    )
  }
}