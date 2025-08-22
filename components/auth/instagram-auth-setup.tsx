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

  const cookieScript = `// Instagram Cookie Extractor
// Run this script in your browser's developer console while logged into Instagram

(function() {
    console.log('🍪 Instagram Cookie Extractor');
    console.log('Make sure you are logged into Instagram in this tab!');
    
    // Get all cookies for Instagram
    const cookies = document.cookie.split(';').map(cookie => {
        const [name, value] = cookie.trim().split('=');
        return {
            name: name,
            value: value,
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: false
        };
    });
    
    // Filter for important Instagram cookies
    const importantCookies = cookies.filter(cookie => 
        ['sessionid', 'csrftoken', 'mid', 'ig_did', 'ds_user_id', 'ig_nrcb'].includes(cookie.name)
    );
    
    if (importantCookies.length === 0) {
        console.error('❌ No Instagram cookies found. Make sure you are logged in!');
        return;
    }
    
    const cookieData = JSON.stringify(importantCookies, null, 2);
    
    console.log('✅ Found Instagram session cookies:');
    console.log(cookieData);
    
    // Create downloadable file
    const blob = new Blob([cookieData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session_cookies.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('💾 Cookies saved as "session_cookies.json"');
    console.log('📋 Copy the JSON above and save it as backend/session_cookies.json in your project');
    
    return importantCookies;
})();`

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(cookieScript)
      setCopied(true)
      toast.success("Cookie extraction script copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("Failed to copy script")
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
            <span className="text-gray-200">Copy the cookie extraction script below</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Step 3
            </Badge>
            <span className="text-gray-200">Run it in your browser's developer console (F12)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Step 4
            </Badge>
            <span className="text-gray-200">Download the cookie file to your computer</span>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Cookie Extraction Script</span>
            <Button
              onClick={copyScript}
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
                  Copy Script
                </>
              )}
            </Button>
          </div>
          <pre className="text-xs text-gray-400 overflow-x-auto max-h-32">
            {cookieScript}
          </pre>
        </div>

        <div className="text-sm text-gray-400 space-y-1">
          <p>⚠️ <strong>Security Note:</strong> Only run this script on instagram.com</p>
          <p>🔄 Cookies may expire - re-run this process if Stories downloads stop working</p>
        </div>

        {/* Upload Widget */}
        <div className="mt-6">
          <CookieUpload onUploadSuccess={() => onAuthSuccess?.()} />
        </div>
      </CardContent>
    </Card>
  )
}