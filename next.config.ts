import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  // Normal build, no special config
  output: undefined,
  images: {
    unoptimized: false
  },
  trailingSlash: false
}

export default nextConfig
