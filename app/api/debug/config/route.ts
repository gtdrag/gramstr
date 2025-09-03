import { NextResponse } from "next/server"
import { getBackendUrlSync } from "@/lib/get-backend-url"

export async function GET() {
  const backendUrl = getBackendUrlSync()
  
  // Test connection to Python backend
  let pythonStatus = "unknown"
  let pythonAuthStatus = null
  
  try {
    const response = await fetch(`${backendUrl}/`)
    if (response.ok) {
      pythonStatus = "connected"
    } else {
      pythonStatus = `error: ${response.status}`
    }
    
    // Check auth status
    const authResponse = await fetch(`${backendUrl}/auth/status`)
    if (authResponse.ok) {
      pythonAuthStatus = await authResponse.json()
    }
  } catch (error) {
    pythonStatus = `error: ${error instanceof Error ? error.message : String(error)}`
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PYTHON_PORT: process.env.PYTHON_PORT,
      NEXT_PUBLIC_PYTHON_PORT: process.env.NEXT_PUBLIC_PYTHON_PORT,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    },
    resolved: {
      backendUrl: backendUrl,
    },
    pythonBackend: {
      url: backendUrl,
      status: pythonStatus,
      authStatus: pythonAuthStatus
    },
    nextServer: {
      port: process.env.PORT || "unknown"
    }
  })
}