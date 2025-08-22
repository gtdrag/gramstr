"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Sparkles, BookOpen, Upload } from "lucide-react"
import { useState } from "react"
import { CookieUpload } from "./cookie-upload"
import { EnhancedCookieExtractor } from "./enhanced-cookie-extractor"
import { DevToolsGuide } from "./devtools-guide"

interface InstagramAuthSetupProps {
  onAuthSuccess?: () => void
}

export function InstagramAuthSetup({ onAuthSuccess }: InstagramAuthSetupProps) {
  const [activeTab, setActiveTab] = useState("enhanced")

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5 text-purple-400" />
          Enable Full Instagram Access
        </CardTitle>
        <CardDescription className="text-gray-300">
          Access private content, Stories, and more by authenticating with your Instagram account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700">
            <TabsTrigger 
              value="enhanced" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Enhanced Extractor
            </TabsTrigger>
            <TabsTrigger 
              value="guide" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Step-by-Step Guide
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="enhanced" className="mt-6">
            <div className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <h3 className="text-purple-200 font-medium mb-2">🚀 Enhanced Cookie Extractor</h3>
                <p className="text-purple-100 text-sm">
                  The easiest way to extract Instagram cookies with real-time validation, 
                  progress tracking, and automatic file generation.
                </p>
              </div>
              <EnhancedCookieExtractor onSuccess={onAuthSuccess} />
            </div>
          </TabsContent>
          
          <TabsContent value="guide" className="mt-6">
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h3 className="text-blue-200 font-medium mb-2">📖 Interactive Guide</h3>
                <p className="text-blue-100 text-sm">
                  Follow our step-by-step visual guide to find and extract Instagram cookies 
                  from your browser's developer tools.
                </p>
              </div>
              <DevToolsGuide />
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-6">
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-green-200 font-medium mb-2">📁 Upload Cookie File</h3>
                <p className="text-green-100 text-sm">
                  If you already have a session_cookies.json file, upload it directly here.
                  The file should contain your Instagram authentication cookies.
                </p>
              </div>
              <CookieUpload onUploadSuccess={() => onAuthSuccess?.()} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}