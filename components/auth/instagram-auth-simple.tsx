"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Instagram, Upload, HelpCircle, Check, X } from "lucide-react"
import { toast } from "sonner"

interface InstagramAuthSimpleProps {
  onAuthSuccess?: () => void
}

export function InstagramAuthSimple({ onAuthSuccess }: InstagramAuthSimpleProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type !== "application/json") {
      toast.error("Please upload a JSON file")
      return
    }
    setFile(file)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/auth/instagram/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Upload failed")
      }

      toast.success("Instagram authentication enabled!")
      setFile(null)
      onAuthSuccess?.()
    } catch (error) {
      console.error("Upload error:", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? "border-purple-500 bg-purple-500/10" 
              : file 
                ? "border-green-500 bg-green-500/10"
                : "border-gray-600 bg-gray-700/50"
          }`}
        >
          <input
            type="file"
            id="cookie-upload"
            accept=".json"
            onChange={handleChange}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-3">
              <Check className="w-8 h-8 mx-auto text-green-500" />
              <p className="text-sm text-gray-300">
                {file.name}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isUploading ? "Uploading..." : "Upload Cookies"}
                </Button>
                <Button
                  onClick={() => setFile(null)}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-3" />
              <label
                htmlFor="cookie-upload"
                className="cursor-pointer"
              >
                <p className="text-sm text-gray-300 mb-1">
                  Drag and drop your Instagram cookies file here
                </p>
                <p className="text-xs text-gray-500">
                  or <span className="text-purple-400 underline">browse</span> to upload
                </p>
              </label>
            </>
          )}
        </div>

        {/* Help Button */}
        <div className="flex justify-center">
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
                  <p className="text-sm text-gray-300">Go to Console tab and paste this code:</p>
                  <pre className="bg-gray-800 p-2 rounded mt-2 text-xs overflow-x-auto">
{`copy(JSON.stringify(document.cookie.split('; ').map(c => {
  const [name, value] = c.split('=');
  return {name, value, domain: '.instagram.com'};
})))`}
                  </pre>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">4</span>
                <div>
                  <p className="text-sm text-gray-300">Press Enter and paste the result into a new file</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">5</span>
                <div>
                  <p className="text-sm text-gray-300">Save as <code className="bg-gray-800 px-1 rounded">cookies.json</code> and upload here</p>
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