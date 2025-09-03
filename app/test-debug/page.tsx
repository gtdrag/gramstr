"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function TestDebugPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [downloadTest, setDownloadTest] = useState<any>(null)

  const checkConfig = async () => {
    setLoading(true)
    try {
      // Check Electron ports if available
      if (typeof window !== 'undefined' && (window as any).electron?.isElectron) {
        console.log('Running in Electron')
        try {
          const ports = await (window as any).electron.getPorts()
          console.log('Electron ports:', ports)
        } catch (e) {
          console.error('Failed to get Electron ports:', e)
        }
      }
      
      const response = await fetch('/api/debug/config')
      const data = await response.json()
      setConfig(data)
      console.log('Debug config:', data)
    } catch (error) {
      console.error('Config check failed:', error)
      setConfig({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testDownload = async () => {
    setLoading(true)
    try {
      console.log('Testing download API...')
      const response = await fetch('/api/content/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.instagram.com/p/C2YE3eQhpR0/' })
      })
      
      console.log('Download test response status:', response.status)
      const data = await response.json()
      console.log('Download test response:', data)
      
      setDownloadTest({
        status: response.status,
        data: data
      })
    } catch (error) {
      console.error('Download test failed:', error)
      setDownloadTest({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConfig()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Configuration Test</h1>
      
      <div className="space-y-4">
        <div>
          <Button onClick={checkConfig} disabled={loading}>
            Refresh Config
          </Button>
          <Button onClick={testDownload} disabled={loading} className="ml-2">
            Test Download
          </Button>
        </div>
        
        <div className="bg-black p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Configuration:</h2>
          <pre className="text-xs overflow-auto">
            {config ? JSON.stringify(config, null, 2) : 'Loading...'}
          </pre>
        </div>
        
        {downloadTest && (
          <div className="bg-black p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">Download Test Result:</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(downloadTest, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}