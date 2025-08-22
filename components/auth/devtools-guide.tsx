"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, ExternalLink, Copy } from "lucide-react"
import { toast } from "sonner"

interface GuideStep {
  id: number
  title: string
  description: string
  action: string
  tip?: string
  image?: string
  highlight?: string
}

const guideSteps: GuideStep[] = [
  {
    id: 1,
    title: "Open Instagram",
    description: "Navigate to instagram.com and make sure you're logged in",
    action: "Visit instagram.com in your browser",
    tip: "Make sure you can see your feed and stories"
  },
  {
    id: 2,
    title: "Open Developer Tools",
    description: "Access your browser's developer tools",
    action: "Press F12 (or right-click → Inspect Element)",
    tip: "On Mac: Cmd+Option+I | On Windows/Linux: F12 or Ctrl+Shift+I"
  },
  {
    id: 3,
    title: "Navigate to Application Tab",
    description: "Find the Application tab in the developer tools",
    action: "Click on 'Application' tab at the top",
    tip: "If you don't see it, try clicking the >> arrow to show more tabs"
  },
  {
    id: 4,
    title: "Expand Storage Section",
    description: "Look for the Storage section in the left sidebar",
    action: "Expand 'Storage' → 'Cookies' in the left panel",
    tip: "You should see a tree structure with expandable items"
  },
  {
    id: 5,
    title: "Select Instagram Cookies",
    description: "Click on the Instagram domain to view its cookies",
    action: "Click on 'https://www.instagram.com'",
    tip: "This will show all cookies for Instagram in the main panel"
  },
  {
    id: 6,
    title: "Copy Cookie Values",
    description: "Find and copy the required cookie values one by one",
    action: "Look for sessionid, csrftoken, ds_user_id, mid, ig_nrcb",
    tip: "Click on each cookie name, then copy the entire 'Value' field",
    highlight: "sessionid is the most important - make sure to get this one!"
  }
]

export function DevToolsGuide() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const currentGuideStep = guideSteps[currentStep]

  const nextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const openInstagram = () => {
    window.open('https://www.instagram.com', '_blank')
    toast.success("Instagram opened in new tab!")
  }

  const copyKeyboardShortcut = () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const shortcut = isMac ? 'Cmd+Option+I' : 'F12'
    navigator.clipboard.writeText(shortcut)
    toast.success(`Copied shortcut: ${shortcut}`)
  }

  if (!isOpen) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Need help finding cookies?</h3>
              <p className="text-gray-400 text-sm">Follow our interactive step-by-step guide</p>
            </div>
            <Button 
              onClick={() => setIsOpen(true)}
              variant="outline"
              className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
            >
              Show Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">DevTools Guide</CardTitle>
            <CardDescription className="text-gray-300">
              Step-by-step instructions to extract Instagram cookies
            </CardDescription>
          </div>
          <Button 
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">
            Step {currentStep + 1} of {guideSteps.length}
          </span>
          <div className="flex gap-1">
            {guideSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-600 text-white">
              {currentGuideStep.id}
            </Badge>
            <h3 className="text-xl font-semibold text-white">
              {currentGuideStep.title}
            </h3>
          </div>
          
          <p className="text-gray-300 leading-relaxed">
            {currentGuideStep.description}
          </p>
          
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
            <p className="text-purple-200 font-medium">
              📋 Action: {currentGuideStep.action}
            </p>
          </div>

          {currentGuideStep.tip && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-200">
                💡 <strong>Tip:</strong> {currentGuideStep.tip}
              </p>
            </div>
          )}

          {currentGuideStep.highlight && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-200">
                ⚠️ <strong>Important:</strong> {currentGuideStep.highlight}
              </p>
            </div>
          )}

          {/* Step-specific Actions */}
          {currentStep === 0 && (
            <Button
              onClick={openInstagram}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Instagram
            </Button>
          )}

          {currentStep === 1 && (
            <Button
              onClick={copyKeyboardShortcut}
              variant="outline"
              className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Keyboard Shortcut
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <span className="text-gray-400 text-sm">
            {currentStep + 1} / {guideSteps.length}
          </span>
          
          <Button
            onClick={nextStep}
            disabled={currentStep === guideSteps.length - 1}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Quick Tips */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">🚀 Quick Tips</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• Keep Instagram logged in during the entire process</li>
            <li>• Copy the complete value, including all special characters</li>
            <li>• sessionid is usually very long (100+ characters)</li>
            <li>• If you don't see a cookie, try refreshing Instagram first</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}