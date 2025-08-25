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
    sessionid: "",
    ds_user_id: "",
    csrftoken: "",
    mid: "",
    ig_did: ""
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
    
    // Check if required fields are filled
    if (!cookies.sessionid || !cookies.ds_user_id) {
      toast.error("Please fill in at least sessionid and ds_user_id")
      return
    }

    setIsSubmitting(true)

    try {
      // Convert form data to cookie format
      const cookieData = Object.entries(cookies)
        .filter(([_, value]) => value) // Only include non-empty values
        .map(([name, value]) => ({
          name,
          value,
          domain: ".instagram.com"
        }))

      const response = await fetch("/api/auth/instagram/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ cookies: cookieData })
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
        {/* Cookie Input Fields */}
        <div className="space-y-3">
          {/* Required fields */}
          <div>
            <Label htmlFor="sessionid" className="text-sm text-gray-300">
              Session ID <span className="text-red-400">*</span>
            </Label>
            <Input
              id="sessionid"
              type="text"
              value={cookies.sessionid}
              onChange={handleInputChange("sessionid")}
              placeholder="Enter your sessionid cookie"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="ds_user_id" className="text-sm text-gray-300">
              User ID <span className="text-red-400">*</span>
            </Label>
            <Input
              id="ds_user_id"
              type="text"
              value={cookies.ds_user_id}
              onChange={handleInputChange("ds_user_id")}
              placeholder="Enter your ds_user_id cookie"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
              required
            />
          </div>

          {/* Optional fields */}
          <div>
            <Label htmlFor="csrftoken" className="text-sm text-gray-300">
              CSRF Token <span className="text-gray-500">(optional)</span>
            </Label>
            <Input
              id="csrftoken"
              type="text"
              value={cookies.csrftoken}
              onChange={handleInputChange("csrftoken")}
              placeholder="Enter your csrftoken cookie"
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 mt-1"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !cookies.sessionid || !cookies.ds_user_id}
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
                  <p className="text-sm text-gray-300">Find and copy these cookie values:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">sessionid</code> (required)</li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">ds_user_id</code> (required)</li>
                    <li className="text-gray-400">• <code className="bg-gray-800 px-1 rounded">csrftoken</code> (optional)</li>
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