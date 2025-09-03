import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getInstagramCookies } from "@/actions/instagram-cookies"
import { getBackendUrlSync } from "@/lib/get-backend-url"

export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Get cookies from database
    const cookieData = await getInstagramCookies(userId)
    
    if (!cookieData || !cookieData.cookies) {
      return NextResponse.json(
        { error: "No cookies found in database" },
        { status: 404 }
      )
    }
    
    // Send cookies to backend
    const backendUrl = getBackendUrlSync()
    
    try {
      const response = await fetch(`${backendUrl}/upload-cookies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cookieData.cookies)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Backend restore failed:", errorText)
        return NextResponse.json(
          { error: `Failed to restore cookies: ${response.status}` },
          { status: response.status }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: "Cookies restored from database",
        sessionAge: Math.floor((Date.now() - new Date(cookieData.uploadedAt).getTime()) / (1000 * 60 * 60 * 24))
      })
      
    } catch (backendError) {
      console.error("Failed to restore cookies to backend:", backendError)
      return NextResponse.json(
        { error: "Failed to connect to backend service" },
        { status: 503 }
      )
    }
    
  } catch (error) {
    console.error("Restore cookies error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}