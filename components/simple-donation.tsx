"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { 
  Zap, 
  Bitcoin, 
  Copy,
  Check,
  QrCode,
  X
} from "lucide-react"
import QRCode from "qrcode"

// Your donation addresses
const LIGHTNING_ADDRESS = "drag@primal.net"
const BITCOIN_ADDRESS = "bc1qp3fdxyy92du6p760ucp5m6u783luhdr48ajxgu"

export function SimpleDonationSection() {
  const [lightningQR, setLightningQR] = useState<string>("")
  const [bitcoinQR, setBitcoinQR] = useState<string>("")
  const [copiedLightning, setCopiedLightning] = useState(false)
  const [copiedBitcoin, setCopiedBitcoin] = useState(false)
  const [showAmountModal, setShowAmountModal] = useState(false)
  const [selectedAmount, setSelectedAmount] = useState<{sats: number, label: string} | null>(null)
  const [amountQR, setAmountQR] = useState<string>("")

  useEffect(() => {
    // Generate QR codes
    QRCode.toDataURL(`lightning:${LIGHTNING_ADDRESS}`, {
      width: 256,
      margin: 2,
      color: {
        dark: '#8B5CF6',
        light: '#1F2937'
      }
    }).then(setLightningQR)

    QRCode.toDataURL(`bitcoin:${BITCOIN_ADDRESS}`, {
      width: 256,
      margin: 2,
      color: {
        dark: '#F97316',
        light: '#1F2937'
      }
    }).then(setBitcoinQR)
  }, [])

  const copyToClipboard = (text: string, type: 'lightning' | 'bitcoin') => {
    navigator.clipboard.writeText(text)
    if (type === 'lightning') {
      setCopiedLightning(true)
      setTimeout(() => setCopiedLightning(false), 2000)
    } else {
      setCopiedBitcoin(true)
      setTimeout(() => setCopiedBitcoin(false), 2000)
    }
  }

  const handleAmountClick = async (sats: number, label: string) => {
    setSelectedAmount({ sats, label })
    // Generate QR with amount for Lightning
    const lightningUri = `lightning:${LIGHTNING_ADDRESS}?amount=${sats}&message=Gramstr%20Donation%20${label}`
    const qr = await QRCode.toDataURL(lightningUri, {
      width: 300,
      margin: 2,
      color: {
        dark: '#8B5CF6',
        light: '#1F2937'
      }
    })
    setAmountQR(qr)
    setShowAmountModal(true)
  }

  return (
    <div className="container mx-auto px-4 py-20 relative">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">
            Support Development
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            If you find Gramstr useful, consider sending some sats. 
            Every bit helps me dedicate more time to building tools for Nostr.
          </p>
          <p className="text-purple-400 text-sm mt-2">
            My goal: Stack enough sats to become a wholecoiner
          </p>
        </div>

        {/* Donation Options */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Lightning */}
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-500/30 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Zap className="h-6 w-6 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">Lightning (Instant)</h3>
              </div>
              
              {lightningQR && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <img src={lightningQR} alt="Lightning QR" className="w-48 h-48 mx-auto" />
                </div>
              )}
              
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Lightning Address</p>
                <p className="text-sm text-purple-300 font-mono break-all">{LIGHTNING_ADDRESS}</p>
              </div>
              
              <Button
                onClick={() => copyToClipboard(LIGHTNING_ADDRESS, 'lightning')}
                variant="outline"
                className="w-full border-purple-500/50 hover:bg-purple-900/20"
              >
                {copiedLightning ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Lightning Address
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 mt-3">
                Works with Alby, WoS, Strike, Phoenix, etc.
              </p>
            </div>
          </Card>

          {/* Bitcoin */}
          <Card className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 border-orange-500/30 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Bitcoin className="h-6 w-6 text-orange-400" />
                <h3 className="text-xl font-semibold text-white">Bitcoin (On-chain)</h3>
              </div>
              
              {bitcoinQR && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <img src={bitcoinQR} alt="Bitcoin QR" className="w-48 h-48 mx-auto" />
                </div>
              )}
              
              <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Bitcoin Address</p>
                <p className="text-sm text-orange-300 font-mono break-all text-xs">{BITCOIN_ADDRESS}</p>
              </div>
              
              <Button
                onClick={() => copyToClipboard(BITCOIN_ADDRESS, 'bitcoin')}
                variant="outline"
                className="w-full border-orange-500/50 hover:bg-orange-900/20"
              >
                {copiedBitcoin ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Bitcoin Address
                  </>
                )}
              </Button>
              
              <p className="text-xs text-gray-500 mt-3">
                For larger donations or cold storage
              </p>
            </div>
          </Card>
        </div>

        {/* Suggested Amounts - Clickable */}
        <Card className="mt-8 bg-gray-800/30 border-gray-700 p-6">
          <p className="text-center text-gray-400 mb-6">Choose an amount to donate:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleAmountClick(1000, 'Coffee')}
              className="group bg-gradient-to-br from-purple-900/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">☕</p>
              <p className="text-lg font-semibold text-purple-300">1,000</p>
              <p className="text-xs text-gray-500">Coffee</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(2100, 'Beer')}
              className="group bg-gradient-to-br from-purple-900/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">🍺</p>
              <p className="text-lg font-semibold text-purple-300">2,100</p>
              <p className="text-xs text-gray-500">Beer</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(5000, 'Pizza')}
              className="group bg-gradient-to-br from-purple-900/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">🍕</p>
              <p className="text-lg font-semibold text-purple-300">5,000</p>
              <p className="text-xs text-gray-500">Pizza</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(10000, 'Lunch')}
              className="group bg-gradient-to-br from-purple-900/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">🍔</p>
              <p className="text-lg font-semibold text-purple-300">10,000</p>
              <p className="text-xs text-gray-500">Lunch</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(21000, 'Nice')}
              className="group bg-gradient-to-br from-orange-900/20 to-orange-800/20 border border-orange-500/30 rounded-lg p-4 hover:border-orange-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">⚡</p>
              <p className="text-lg font-semibold text-orange-300">21,000</p>
              <p className="text-xs text-gray-500">Nice</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(50000, 'Generous')}
              className="group bg-gradient-to-br from-orange-900/20 to-orange-800/20 border border-orange-500/30 rounded-lg p-4 hover:border-orange-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">💜</p>
              <p className="text-lg font-semibold text-orange-300">50,000</p>
              <p className="text-xs text-gray-500">Generous</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(100000, 'Amazing')}
              className="group bg-gradient-to-br from-orange-900/20 to-orange-800/20 border border-orange-500/30 rounded-lg p-4 hover:border-orange-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">🙏</p>
              <p className="text-lg font-semibold text-orange-300">100,000</p>
              <p className="text-xs text-gray-500">Amazing</p>
            </button>
            
            <button
              onClick={() => handleAmountClick(210000, 'Moon')}
              className="group bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border border-yellow-500/30 rounded-lg p-4 hover:border-yellow-400 hover:scale-105 transition-all"
            >
              <p className="text-2xl mb-2">🚀</p>
              <p className="text-lg font-semibold text-yellow-300">210,000</p>
              <p className="text-xs text-gray-500">Moon</p>
            </button>
          </div>
          
          <p className="text-center text-gray-500 text-xs mt-4">
            Click to show QR code with the exact amount
          </p>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm">
            Thank you for considering a donation. Every sat helps.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            100% peer-to-peer • No middlemen • Pure Bitcoin
          </p>
        </div>
      </div>

      {/* Amount QR Modal */}
      {showAmountModal && selectedAmount && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAmountModal(false)}>
          <Card className="bg-gray-900 border-purple-500/50 p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Send {selectedAmount.sats.toLocaleString()} sats</h3>
                <p className="text-gray-400 text-sm">{selectedAmount.label} donation</p>
              </div>
              <button
                onClick={() => setShowAmountModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {amountQR && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <img src={amountQR} alt="Lightning QR with amount" className="w-full max-w-[300px] mx-auto" />
              </div>
            )}
            
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">Lightning Address</p>
              <p className="text-sm text-purple-300 font-mono">{LIGHTNING_ADDRESS}</p>
              <p className="text-xs text-gray-500 mt-2">Amount: {selectedAmount.sats} sats</p>
            </div>
            
            <Button
              onClick={() => {
                navigator.clipboard.writeText(LIGHTNING_ADDRESS)
                // Also copy the amount to make it easier
                alert(`Address copied! Send ${selectedAmount.sats} sats`)
              }}
              variant="outline"
              className="w-full border-purple-500/50 hover:bg-purple-900/20"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Address
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Scan with any Lightning wallet • Send exact amount shown
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}