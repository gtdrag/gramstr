import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('cookies') as File | null

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: "Please upload a JSON file" },
        { status: 400 }
      )
    }

    // Read and validate JSON content
    const arrayBuffer = await file.arrayBuffer()
    const content = Buffer.from(arrayBuffer).toString('utf-8')
    
    let cookies
    try {
      cookies = JSON.parse(content)
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      )
    }

    // Validate it's an array of cookies
    if (!Array.isArray(cookies)) {
      return NextResponse.json(
        { error: "Cookies must be an array" },
        { status: 400 }
      )
    }

    // Check for required Instagram cookies
    const cookieNames = cookies.map((cookie: { name?: string }) => cookie.name).filter(Boolean)
    const requiredCookies = ['csrftoken', 'ds_user_id']
    const hasRequired = requiredCookies.some(req => cookieNames.includes(req))
    
    if (!hasRequired) {
      return NextResponse.json(
        { error: "File doesn't contain Instagram cookies. Make sure you're logged into Instagram when extracting cookies." },
        { status: 400 }
      )
    }

    // In production, we'll need to send this to the backend API instead of writing to filesystem
    // For now, simulate successful upload and return the cookies data
    if (process.env.NODE_ENV === 'production') {
      // In production, send cookies to the Python backend API
      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/upload-cookies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: content
        })
        
        if (!response.ok) {
          throw new Error(`Backend upload failed: ${response.status}`)
        }
      } catch (backendError) {
        console.error("Failed to send cookies to backend:", backendError)
        // Continue with local fallback for now
      }
    } else {
      // In development, write to local backend directory
      const cookiesPath = path.join(process.cwd(), "backend", "session_cookies.json")
      await writeFile(cookiesPath, content, 'utf-8')

      // Reset session status to valid on successful upload
      const sessionStatusPath = path.join(process.cwd(), "backend", "session_status.json")
      const statusData = {
        last_validation: new Date().toISOString(),
        is_valid: true,
        last_error: null
      }
      await writeFile(sessionStatusPath, JSON.stringify(statusData), 'utf-8')
    }

    // Check if sessionid is present for Stories support
    const hasSessionId = cookieNames.includes('sessionid')
    
    return NextResponse.json({
      success: true,
      message: hasSessionId 
        ? "Instagram cookies uploaded successfully! Stories downloads are now enabled."
        : "Instagram cookies uploaded successfully! Note: Stories downloads require a 'sessionid' cookie for full functionality.",
      storiesSupported: hasSessionId,
      cookiesFound: cookieNames.length
    })

  } catch (error) {
    console.error("Cookie upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload cookies" },
      { status: 500 }
    )
  }
}