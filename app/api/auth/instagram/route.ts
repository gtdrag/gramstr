import { NextResponse } from "next/server"
import { existsSync, readFileSync } from "fs"
import path from "path"

export async function GET() {
  try {
    // Check for valid Instagram authentication
    let hasValidAuth = false
    let sessionAge = null
    let cookieUploadTime = null
    let serverValidationFailed = false
    
    // Check session_cookies.json
    const sessionCookiesPath = path.join(process.cwd(), "backend", "session_cookies.json")
    if (existsSync(sessionCookiesPath)) {
      try {
        const cookieData = JSON.parse(readFileSync(sessionCookiesPath, "utf-8"))
        const sessionCookie = cookieData.find((cookie: any) => cookie.name === "sessionid")
        
        if (sessionCookie && sessionCookie.value && sessionCookie.value.length > 0) {
          hasValidAuth = true
          
          // Get file modification time as proxy for upload time
          const stats = require('fs').statSync(sessionCookiesPath)
          cookieUploadTime = stats.mtime
          sessionAge = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) // days
        }
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
          if (cookieContent.includes("sessionid") && 
              cookieContent.split("sessionid")[1]?.trim().length > 0) {
            hasValidAuth = true
            
            // Get file modification time
            const stats = require('fs').statSync(txtCookiesPath)
            cookieUploadTime = stats.mtime
            sessionAge = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) // days
          }
        } catch (e) {
          // File read error
        }
      }
    }
    
    // Check server-side validation status
    const sessionStatusPath = path.join(process.cwd(), "backend", "session_status.json")
    if (existsSync(sessionStatusPath)) {
      try {
        const statusData = JSON.parse(readFileSync(sessionStatusPath, "utf-8"))
        if (statusData.is_valid === false) {
          serverValidationFailed = true
          hasValidAuth = false
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    }
    
    // Determine session status
    let sessionStatus = "unknown"
    let warningMessage = null
    
    if (serverValidationFailed) {
      sessionStatus = "expired"
      warningMessage = "Session expired during use - please refresh your Instagram cookies"
    } else if (hasValidAuth && sessionAge !== null) {
      if (sessionAge < 14) {
        sessionStatus = "fresh"
      } else if (sessionAge < 21) {
        sessionStatus = "aging"
        warningMessage = "Session is getting older - consider refreshing cookies soon"
      } else if (sessionAge < 30) {
        sessionStatus = "old"
        warningMessage = "Session may expire soon - recommend refreshing cookies"
      } else {
        sessionStatus = "expired"
        warningMessage = "Session is very old and likely expired - please refresh cookies"
      }
    }
    
    return NextResponse.json({
      authenticated: hasValidAuth,
      storiesSupported: hasValidAuth,
      sessionAge,
      sessionStatus,
      cookieUploadTime,
      warningMessage,
      message: hasValidAuth 
        ? `Instagram authentication available - Stories downloads enabled (${sessionAge} days old)`
        : "No Instagram authentication found - Stories require login"
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check authentication status" },
      { status: 500 }
    )
  }
}