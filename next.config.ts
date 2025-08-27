import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  output: process.env.ELECTRON_BUILD === 'true' ? 'export' : undefined,
  images: {
    unoptimized: process.env.ELECTRON_BUILD === 'true'
  },
  // For Electron, we need to handle routing differently
  trailingSlash: process.env.ELECTRON_BUILD === 'true',
  // Disable server-side features for Electron build
  experimental: {
    ...(process.env.ELECTRON_BUILD === 'true' && {
      isrMemoryCacheSize: 0
    })
  }
}

export default nextConfig
