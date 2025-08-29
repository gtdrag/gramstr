import { SimpleDonationSection } from "@/components/simple-donation"
import { Heart } from "lucide-react"

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-8 w-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-white">Support Gramstr</h1>
        </div>
        <p className="text-gray-400">
          Your support helps me continue developing and improving Gramstr
        </p>
      </div>

      {/* Personal Message */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
          <p className="text-gray-300 leading-relaxed mb-3">
            Hi! Thanks for using Gramstr. As a solo developer and Class of '21 Bitcoiner, 
            I'm committed to building tools that help people own their content and embrace 
            the decentralized future of social media.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            This app is completely free and open source. If you find it useful and want to 
            support continued development, consider sending some sats. Every bit helps me 
            dedicate more time to adding features and improvements.
          </p>
          <p className="text-purple-400 text-sm">
            My goal: Stack enough sats to become a wholecoiner while building tools for the Nostr ecosystem.
          </p>
        </div>
      </div>

      {/* Donation Section */}
      <SimpleDonationSection />
    </div>
  )
}