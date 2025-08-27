'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Shield, ExternalLink, Key, AlertCircle, Lock } from 'lucide-react'

export function ElectronNostrSetup() {
  const [isElectron, setIsElectron] = useState(false)
  const [choice, setChoice] = useState<'browser' | 'import' | null>(null)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electron)
  }, [])

  if (!isElectron) return null

  const openInBrowser = () => {
    if ((window as any).electron?.openExternal) {
      (window as any).electron.openExternal('http://localhost:3000')
    }
    setChoice('browser')
  }

  return (
    <Card className="p-6 border-orange-500/50 bg-orange-500/5">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold">Nostr Signing Required</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Browser extensions like Alby don't work in desktop apps. 
              Your Nostr identity (public/private key pair) is required to post.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Option 1: Use Browser */}
          <Card className="p-4 border-green-500/30 bg-green-500/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="font-medium">Use Alby in Browser (Most Secure)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Open this app in your web browser where Alby works. 
                Your private key never leaves Alby.
              </p>
              <Button 
                onClick={openInBrowser}
                className="w-full"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Browser with Alby
              </Button>
            </div>
          </Card>

          {/* Option 2: Import Key */}
          <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Import Your Nostr Key</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Import your nsec/private key. It will be encrypted and stored locally on your device only.
                <strong className="block mt-1 text-yellow-600">
                  ⚠️ Only do this if you trust this application
                </strong>
              </p>
              <Button 
                onClick={() => alert('Import functionality would go here')}
                className="w-full"
                variant="outline"
                disabled
              >
                <Lock className="h-4 w-4 mr-2" />
                Import Private Key (Coming Soon)
              </Button>
            </div>
          </Card>

          {/* Trust Notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="block">About Nostr Identity:</strong>
              <p className="text-muted-foreground">
                Your Nostr identity is your public/private key pair. Posts must be signed 
                with YOUR private key to appear as coming from YOU. There's no way around this.
              </p>
              <p className="text-muted-foreground">
                Using Alby in your browser is the most secure option as your private key 
                never leaves the extension.
              </p>
            </div>
          </div>
        </div>

        {choice === 'browser' && (
          <Card className="p-3 border-green-500/50 bg-green-500/10">
            <p className="text-sm text-green-600">
              ✓ Opening in browser... You can close this desktop app and use the web version.
            </p>
          </Card>
        )}
      </div>
    </Card>
  )
}