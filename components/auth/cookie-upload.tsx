"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, CheckCircle, AlertCircle, FileJson, X } from "lucide-react"
import { toast } from "sonner"

interface CookieUploadProps {
  onUploadSuccess: () => void
}

export function CookieUpload({ onUploadSuccess }: CookieUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error("Please select a JSON file")
      return
    }
    
    setUploadedFile(file)
  }

  const uploadFile = async () => {
    if (!uploadedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('cookies', uploadedFile)

      const response = await fetch('/api/auth/instagram/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      toast.success(data.message)
      setUploadedFile(null)
      onUploadSuccess()
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-white font-medium">Step 5: Upload Cookie File</div>
          
          {!uploadedFile ? (
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer
                ${isDragging 
                  ? 'border-purple-400 bg-purple-500/10' 
                  : 'border-gray-600 bg-gray-900 hover:border-gray-500 hover:bg-gray-800'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="flex flex-col items-center gap-3">
                <Upload className={`h-8 w-8 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
                <div className="text-gray-300">
                  <p className="font-medium">Drop your cookie file here</p>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                </div>
                <div className="text-xs text-gray-500">
                  Accepts: session_cookies.json
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileJson className="h-5 w-5 text-blue-400" />
                  <div className="text-left">
                    <p className="text-white font-medium">{uploadedFile.name}</p>
                    <p className="text-xs text-gray-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button
                  onClick={clearFile}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={uploadFile}
                  disabled={isUploading}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Cookies
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-400 space-y-1">
            <p>🔒 Files are processed locally and stored securely</p>
            <p>📁 Cookies will be saved to enable Stories downloads</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}