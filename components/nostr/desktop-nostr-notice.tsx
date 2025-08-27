'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ExternalLink, Info } from 'lucide-react'

export function DesktopNostrNotice() {
  const [isElectron, setIsElectron] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electron)
  }, [])

  if (!isElectron) return null

  const openInBrowser = () => {
    if ((window as any).electron?.openExternal) {
      (window as any).electron.openExternal('http://localhost:3000')
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm">
              <strong>Nostr Signing:</strong> Desktop app opens your browser for signing with Alby.
            </p>
            
            {!showDetails && (
              <button
                onClick={() => setShowDetails(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Why?
              </button>
            )}
            
            {showDetails && (
              <p className="text-xs text-muted-foreground">
                Browser extensions like Alby don't work in Electron desktop apps. 
                This is a technical limitation of how Electron works.
              </p>
            )}
          </div>
        </div>

        <Button 
          onClick={openInBrowser}
          variant="outline"
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in Browser
        </Button>
      </div>
    </Card>
  )
}