"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Copy, CheckCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { CookieUpload } from "./cookie-upload"

interface InstagramAuthSetupProps {
  onAuthSuccess?: () => void
}

export function InstagramAuthSetup({ onAuthSuccess }: InstagramAuthSetupProps) {
  const [copied, setCopied] = useState(false)

  const manualInstructions = `MANUAL COOKIE EXTRACTION (Required for sessionid)

Since Instagram's sessionid cookie is HttpOnly, follow these steps:

1. Open DevTools (F12) and go to the "Application" tab
2. In the left sidebar, expand "Storage" → "Cookies" 
3. Click on "https://www.instagram.com"
4. Look for these cookies and copy their values:
   - sessionid (most important!)
   - csrftoken
   - ds_user_id
   - mid
   - ig_nrcb

5. Create a file with this format:
[
  {
    "name": "sessionid",
    "value": "YOUR_SESSIONID_VALUE_HERE",
    "domain": ".instagram.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  },
  {
    "name": "csrftoken", 
    "value": "YOUR_CSRFTOKEN_VALUE_HERE",
    "domain": ".instagram.com",
    "path": "/",
    "secure": true,
    "httpOnly": false
  },
  {
    "name": "ds_user_id",
    "value": "YOUR_DS_USER_ID_VALUE_HERE", 
    "domain": ".instagram.com",
    "path": "/",
    "secure": true,
    "httpOnly": false
  },
  {
    "name": "mid",
    "value": "YOUR_MID_VALUE_HERE",
    "domain": ".instagram.com", 
    "path": "/",
    "secure": true,
    "httpOnly": false
  },
  {
    "name": "ig_nrcb",
    "value": "1",
    "domain": ".instagram.com",
    "path": "/", 
    "secure": true,
    "httpOnly": false
  }
]

Save as session_cookies.json and upload below.`

  const copyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(manualInstructions)
      setCopied(true)
      toast.success("Cookie extraction instructions copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy instructions")
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5 text-yellow-400" />
          Enable Full Instagram Access
        </CardTitle>
        <CardDescription className="text-gray-300">
          Access private content, Stories, and more by authenticating with your Instagram account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Step 1
            </Badge>
            <span className="text-gray-200">Log into Instagram in your browser</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Step 2
            </Badge>
            <span className="text-gray-200">Open DevTools (F12) → Application tab → Cookies → instagram.com</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Step 3
            </Badge>
            <span className="text-gray-200">Copy sessionid, csrftoken, ds_user_id, mid, ig_nrcb values</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Step 4
            </Badge>
            <span className="text-gray-200">Create JSON file using template below and upload</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Cookie Template & Instructions</span>
            <Button
              onClick={copyInstructions}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Template
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs text-gray-400 overflow-x-auto max-h-48">
            {manualInstructions}
          </pre>
        </div>

        <div className="text-sm text-gray-400 space-y-1">
          <p>⚠️ <strong>Security Note:</strong> Only extract cookies from instagram.com - never share your sessionid</p>
          <p>🔄 Cookies may expire - re-extract if Stories downloads stop working</p>
          <p>🔑 The sessionid cookie is the most important for authentication</p>
        </div>

        {/* Upload Widget */}
        <div className="mt-6">
          <CookieUpload onUploadSuccess={() => onAuthSuccess?.()} />
        </div>
      </CardContent>
    </Card>
  )
}