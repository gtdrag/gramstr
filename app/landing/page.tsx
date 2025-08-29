import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Download, Zap, Key, Image, ArrowRight, Shield, Github, Heart } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            gramstr
          </h1>
          <p className="text-2xl text-gray-300 mb-8">
            Bridge Your Instagram to Nostr
          </p>
          <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
            Download your Instagram content and share it with the decentralized world. 
            Own your content, own your audience.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="https://github.com/gtdrag/gramstr/releases/latest">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg">
                <Download className="mr-2 h-5 w-5" />
                Download for Mac
              </Button>
            </a>
            <a href="https://github.com/gtdrag/gramstr/releases/latest">
              <Button size="lg" variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10 px-8 py-6 text-lg">
                <Download className="mr-2 h-5 w-5" />
                Download for Windows
              </Button>
            </a>
          </div>
          
          <p className="text-sm text-gray-500">
            Coming soon to Linux • View on{" "}
            <a href="https://github.com/gtdrag/gramstr" className="text-purple-400 hover:text-purple-300">
              GitHub
            </a>
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-12">
          Everything You Need to Own Your Content
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Bulk Import</h3>
            <p className="text-gray-400 text-sm">
              Download your entire Instagram history. Multiple URLs at once. Stories, Posts, Reels.
            </p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">One-Click to Nostr</h3>
            <p className="text-gray-400 text-sm">
              Post directly from your library. Keep your captions and metadata. Reach the decentralized web.
            </p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Your Keys, Your Content</h3>
            <p className="text-gray-400 text-sm">
              Encrypted local storage. Never shared with servers. Full ownership.
            </p>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700 p-6">
            <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <Image className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Beautiful Gallery</h3>
            <p className="text-gray-400 text-sm">
              Manage all your content. Search and filter. Dark mode default.
            </p>
          </Card>
        </div>
      </div>

      {/* Trust Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-12">
            Forever Free. No Limits. No Tracking.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div>
              <Shield className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Your keys never leave your device</h3>
              <p className="text-gray-400 text-sm">
                AES-256 encryption keeps your Nostr keys secure locally
              </p>
            </div>
            <div>
              <Github className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Open source on GitHub</h3>
              <p className="text-gray-400 text-sm">
                Audit the code, contribute, or fork it yourself
              </p>
            </div>
            <div>
              <Heart className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white mb-2">Built for the community</h3>
              <p className="text-gray-400 text-sm">
                We believe in open protocols and user ownership
              </p>
            </div>
          </div>

          <Card className="bg-purple-500/10 border-purple-500/30 p-8">
            <h3 className="text-xl font-semibold text-white mb-3">
              Why free?
            </h3>
            <p className="text-gray-300 mb-6">
              We believe in open protocols and user ownership. This is our contribution to a 
              decentralized future where you control your content and your audience.
            </p>
            <p className="text-sm text-gray-400">
              Support development with Bitcoin Lightning tips (optional)
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Ready to own your content?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <a href="https://github.com/gtdrag/gramstr/releases/latest">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg">
                <Download className="mr-2 h-5 w-5" />
                Download Now
              </Button>
            </a>
            <a href="https://github.com/gtdrag/gramstr">
              <Button size="lg" variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10 px-8 py-6 text-lg">
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </Button>
            </a>
          </div>
          <p className="text-gray-400">
            Built with 💜 for the Nostr community
          </p>
        </div>
      </div>
    </div>
  )
}