"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Copy, CheckCircle, AlertCircle, Download, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface CookieField {
  name: string
  value: string
  required: boolean
  description: string
}

interface EnhancedCookieExtractorProps {
  onSuccess?: () => void
}

export function EnhancedCookieExtractor({ onSuccess }: EnhancedCookieExtractorProps) {
  const [cookies, setCookies] = useState<CookieField[]>([
    { name: "csrftoken", value: "", required: true, description: "Security token for requests" },
    { name: "ds_user_id", value: "", required: true, description: "Your Instagram user ID" },
    { name: "ig_nrcb", value: "", required: false, description: "Instagram callback setting" },
    { name: "mid", value: "", required: false, description: "Machine identifier" },
    { name: "sessionid", value: "", required: true, description: "Required for Stories and private content" }
  ])
  
  const [showValues, setShowValues] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{valid: boolean, message: string, details?: string[]} | null>(null)

  const validateCookies = () => {
    const requiredCookies = cookies.filter(c => c.required)
    const missingRequired = requiredCookies.filter(c => !c.value.trim())
    const validCookies = cookies.filter(c => c.value.trim().length > 0)
    
    if (missingRequired.length > 0) {
      return {
        valid: false,
        message: `Missing required cookies: ${missingRequired.map(c => c.name).join(', ')}`,
        details: missingRequired.map(c => `${c.name}: ${c.description}`)
      }
    }
    
    // Validate sessionid format (should be long and contain specific characters)
    const sessionid = cookies.find(c => c.name === "sessionid")?.value || ""
    if (sessionid && !sessionid.includes("%3A")) {
      return {
        valid: false,
        message: "sessionid appears to be in wrong format - should contain encoded characters like %3A",
        details: ["Make sure to copy the exact value from DevTools, including all special characters"]
      }
    }
    
    return {
      valid: true,
      message: `All required cookies present! Found ${validCookies.length} cookies total.`,
      details: validCookies.map(c => `✓ ${c.name}`)
    }
  }

  useEffect(() => {
    const result = validateCookies()
    setValidationResult(result)
  }, [cookies])

  const updateCookie = (name: string, value: string) => {
    setCookies(prev => prev.map(cookie => 
      cookie.name === name ? { ...cookie, value } : cookie
    ))
  }

  const generateCookieJson = () => {
    const validCookies = cookies.filter(c => c.value.trim().length > 0)
    return validCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value.trim(),
      domain: ".instagram.com",
      path: "/",
      secure: true,
      httpOnly: cookie.name === "sessionid" // sessionid is HttpOnly
    }))
  }

  const [isUploading, setIsUploading] = useState(false)

  const uploadCookiesDirectly = async () => {
    if (!validationResult?.valid) {
      toast.error("Please fix validation errors before proceeding")
      return
    }

    setIsUploading(true)
    toast.info("🔄 Processing cookies...")
    
    try {
      const cookieData = generateCookieJson()
      const jsonString = JSON.stringify(cookieData, null, 2)
      
      // Create FormData to mimic file upload
      const blob = new Blob([jsonString], { type: 'application/json' })
      const file = new File([blob], 'session_cookies.json', { type: 'application/json' })
      const formData = new FormData()
      formData.append('cookies', file)

      const response = await fetch('/api/auth/instagram/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      toast.success("🎉 " + data.message)
      
      // Clear the form
      setCookies(prev => prev.map(cookie => ({ ...cookie, value: "" })))
      
      // Call success callback
      onSuccess?.()
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const copyTemplate = () => {
    const template = `Instagram Cookie Values Template:

sessionid: [PASTE YOUR SESSIONID HERE]
csrftoken: [PASTE YOUR CSRFTOKEN HERE]  
ds_user_id: [PASTE YOUR DS_USER_ID HERE]
mid: [PASTE YOUR MID HERE] (optional)
ig_nrcb: [PASTE YOUR IG_NRCB HERE] (optional)

Instructions:
1. Open Instagram in your browser
2. Press F12 to open DevTools
3. Go to Application tab → Storage → Cookies → https://www.instagram.com
4. Find each cookie name in the list and copy its Value
5. Paste each value after the colon above
6. Come back here and paste the values into the form`

    navigator.clipboard.writeText(template)
    toast.success("Template copied to clipboard!")
  }

  const requiredCount = cookies.filter(c => c.required).length
  const completedRequired = cookies.filter(c => c.required && c.value.trim()).length
  const progressPercentage = (completedRequired / requiredCount) * 100

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5 text-purple-400" />
          Enhanced Cookie Extractor
        </CardTitle>
        <CardDescription className="text-gray-300">
          Extract your Instagram cookies with real-time validation and guided assistance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Progress: {completedRequired}/{requiredCount} required cookies</span>
            <span className="text-gray-400">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            onClick={copyTemplate}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Template
          </Button>
          <Button
            onClick={() => setShowValues(!showValues)}
            variant="outline"
            size="sm"
            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
          >
            {showValues ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showValues ? "Hide" : "Show"} Values
          </Button>
        </div>

        <Separator className="bg-gray-600" />

        {/* Cookie Input Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Enter Cookie Values</h3>
          {cookies.map((cookie) => (
            <div key={cookie.name} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={cookie.name} className="text-gray-200 font-medium min-w-[100px]">
                  {cookie.name}
                </Label>
                {cookie.required && (
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                )}
                {cookie.value.trim() && (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                )}
              </div>
              <Input
                id={cookie.name}
                type={showValues ? "text" : "password"}
                placeholder={`Paste your ${cookie.name} value here...`}
                value={cookie.value}
                onChange={(e) => updateCookie(cookie.name, e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500"
              />
              <p className="text-xs text-gray-400">{cookie.description}</p>
            </div>
          ))}
        </div>

        <Separator className="bg-gray-600" />

        {/* Validation Results */}
        {validationResult && (
          <div className={`p-4 rounded-lg border ${
            validationResult.valid 
              ? 'bg-green-500/10 border-green-500/20' 
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {validationResult.valid ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={`font-medium ${
                validationResult.valid ? 'text-green-300' : 'text-red-300'
              }`}>
                {validationResult.message}
              </span>
            </div>
            {validationResult.details && validationResult.details.length > 0 && (
              <ul className={`text-sm mt-2 space-y-1 ${
                validationResult.valid ? 'text-green-200' : 'text-red-200'
              }`}>
                {validationResult.details.map((detail, index) => (
                  <li key={index}>• {detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Upload Button */}
        <Button 
          onClick={uploadCookiesDirectly}
          disabled={!validationResult?.valid || isUploading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing Cookies...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save & Enable Authentication
            </>
          )}
        </Button>

        <div className="text-sm text-gray-400 space-y-1">
          <p>🔒 <strong>Privacy:</strong> All data stays in your browser - nothing is sent to servers</p>
          <p>📋 <strong>How to find cookies:</strong> DevTools → Application → Cookies → instagram.com</p>
          <p>🔄 <strong>Refresh needed:</strong> Re-extract when sessions expire (every 2-4 weeks)</p>
        </div>
      </CardContent>
    </Card>
  )
}