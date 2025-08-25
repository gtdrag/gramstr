"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Instagram, Key, HelpCircle, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface InstagramAuthSimpleProps {
  onAuthSuccess?: () => void
}

export function InstagramAuthSimple({ onAuthSuccess }: InstagramAuthSimpleProps) {
  const [cookies, setCookies] = useState({
    csrftoken: "",
    ds_user_id: "",
    sessionid: "",
    ig_did: "",
    mid: "",
    ig_nrcb: "",
    rur: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  const handleInputChange = (field: keyof typeof cookies) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCookies(prev => ({
      ...prev,
      [field]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if ALL required fields are filled (as per original working system)
    const requiredFields = ['csrftoken', 'ds_user_id', 'sessionid', 'ig_did', 'mid', 'ig_nrcb', 'rur']
    const missingFields = requiredFields.filter(field => !cookies[field as keyof typeof cookies])
    
    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(', ')}`)
      return
    }

    setIsSubmitting(true)

    try {
      // Convert form data to cookie format that backend expects
      const cookieData = Object.entries(cookies)
        .filter(([_, value]) => value) // Only include non-empty values
        .map(([name, value]) => ({
          name,
          value,
          domain: ".instagram.com"
        }))

      // Create a JSON file blob to send to upload endpoint
      const jsonBlob = new Blob([JSON.stringify(cookieData)], { type: 'application/json' })
      const formData = new FormData()
      formData.append('cookies', jsonBlob, 'cookies.json')

      const response = await fetch("/api/auth/instagram/upload", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed")
      }

      toast.success("Instagram authentication enabled!")
      setCookies({
        sessionid: "",
        ds_user_id: "",
        csrftoken: "",
        mid: "",
        ig_did: ""
      })
      onAuthSuccess?.()
    } catch (error) {
      console.error("Auth error:", error)
      toast.error(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Cookie Input Fields - ALL REQUIRED as per working system */}
        <div className="space-y-2">
          {Object.entries(cookies).map(([key, value]) => (
            <div key={key}>
              <Label htmlFor={key} className="text-xs text-gray-300">
                {key} <span className="text-red-400">*</span>
              </Label>
              <Input
                id={key}
                type="text"
                value={value}
                onChange={handleInputChange(key as keyof typeof cookies)}
                placeholder={`Enter ${key}`}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1 text-sm h-9"
                required
              />
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || Object.values(cookies).some(v => !v)}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Key className="w-4 h-4 mr-2" />
              Enable Instagram Access
            </>
          )}
        </Button>

      </form>

      {/* Help Button */}
      <div className="flex justify-center mt-2">
        <Button
          onClick={() => setShowGuide(true)}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          How to get Instagram cookies
        </Button>
      </div>

      {/* Guide Modal */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">How to Get Instagram Cookies</DialogTitle>
            <DialogDescription className="text-gray-400">
              Follow these simple steps to export your Instagram session
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">1</span>
                <div>
                  <p className="text-sm text-gray-300">Open Instagram.com and log in</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">2</span>
                <div>
                  <p className="text-sm text-gray-300">Open Developer Tools (F12 or right-click → Inspect)</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">3</span>
                <div>
                  <p className="text-sm text-gray-300">Go to Application tab → Cookies → instagram.com</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">4</span>
                <div>
                  <p className="text-sm text-gray-300">Find and copy ALL these cookie values:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">csrftoken</code></li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">ds_user_id</code></li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">sessionid</code></li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">ig_did</code></li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">mid</code></li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">ig_nrcb</code></li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">rur</code></li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">5</span>
                <div>
                  <p className="text-sm text-gray-300">Paste the values into the form fields above</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-400">
                ⚠️ Keep your cookies file private - it contains your Instagram session
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}