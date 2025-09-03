import { NextResponse } from "next/server"
import { getBackendUrlSync } from "@/lib/get-backend-url"

export async function POST() {
  try {
    // Make a test request to Instagram using the Python backend
    // This will attempt a lightweight operation to validate the session
    const backendUrl = getBackendUrlSync()
    const response = await fetch(`${backendUrl}/validate-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        test_url: "https://www.instagram.com/p/C2YE3eQhpR0/" // Known working public post
      })
    })

    const data = await response.json()
    
    if (response.ok) {
      return NextResponse.json({
        valid: true,
        message: "Session is active and working"
      })
    } else {
      // Check if it's a session-related error
      if (response.status === 401 || data.detail?.includes("log in")) {
        return NextResponse.json({
          valid: false,
          message: "Session expired or invalid",
          reason: "authentication_failed"
        })
      } else {
        return NextResponse.json({
          valid: false,
          message: "Session validation failed",
          reason: "unknown_error"
        })
      }
    }
  } catch (error) {
    console.error("Session validation error:", error)
    return NextResponse.json(
      { 
        valid: false, 
        message: "Could not validate session - backend unavailable",
        reason: "backend_error"
      },
      { status: 503 }
    )
  }
}