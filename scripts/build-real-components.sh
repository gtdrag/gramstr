#!/bin/bash

# Build REAL component packages for the two-stage installer

set -e

echo "🔨 Building Real Gramstr Components for v1.1..."

# Setup directories
DIST_DIR="dist-components"
BUILD_DIR="build-temp"

rm -rf $DIST_DIR $BUILD_DIR
mkdir -p $DIST_DIR $BUILD_DIR

# Component 1: Core files (package.json, electron entry, etc.)
echo "📦 Building core-files..."
mkdir -p $BUILD_DIR/core-files
cp package.json $BUILD_DIR/core-files/
cp -r electron $BUILD_DIR/core-files/
cp -r public $BUILD_DIR/core-files/
tar -czf $DIST_DIR/core-files-1.1.0.tar.gz -C $BUILD_DIR core-files
echo "✅ core-files: $(du -h $DIST_DIR/core-files-1.1.0.tar.gz | cut -f1)"

# Component 2: Next.js Bundle (pre-built production build)
echo "📦 Building nextjs-bundle..."
echo "Building Next.js production build..."
npm run build:next
mkdir -p $BUILD_DIR/nextjs-bundle
cp -r .next $BUILD_DIR/nextjs-bundle/
tar -czf $DIST_DIR/nextjs-bundle-1.1.0.tar.gz -C $BUILD_DIR nextjs-bundle
echo "✅ nextjs-bundle: $(du -h $DIST_DIR/nextjs-bundle-1.1.0.tar.gz | cut -f1)"

# Component 3: Node modules (essential runtime dependencies only)
echo "📦 Building node-modules..."
mkdir -p $BUILD_DIR/node-modules

# Copy only production dependencies
essential_modules=(
  "next"
  "react"
  "react-dom"
  "@clerk/nextjs"
  "@supabase/supabase-js"
  "drizzle-orm"
  "nostr-tools"
  "styled-jsx"
  "@swc/helpers"
  "framer-motion"
  "lucide-react"
)

for module in "${essential_modules[@]}"; do
  if [ -d "node_modules/$module" ]; then
    cp -r "node_modules/$module" "$BUILD_DIR/node-modules/" 2>/dev/null || true
  fi
done

tar -czf $DIST_DIR/node-modules-1.1.0.tar.gz -C $BUILD_DIR node-modules
echo "✅ node-modules: $(du -h $DIST_DIR/node-modules-1.1.0.tar.gz | cut -f1)"

# Component 4: Python Backend
echo "📦 Building python-backend..."
mkdir -p $BUILD_DIR/python-backend
cp -r backend $BUILD_DIR/python-backend/
cp requirements.txt $BUILD_DIR/python-backend/ 2>/dev/null || true
tar -czf $DIST_DIR/python-backend-1.1.0.tar.gz -C $BUILD_DIR python-backend
echo "✅ python-backend: $(du -h $DIST_DIR/python-backend-1.1.0.tar.gz | cut -f1)"

# Component 5: Python venv (if exists, otherwise create minimal)
echo "📦 Building python-venv..."
if [ -d "venv" ]; then
  mkdir -p $BUILD_DIR/python-venv
  # Create a minimal venv with just essentials
  python3 -m venv $BUILD_DIR/python-venv/venv
  $BUILD_DIR/python-venv/venv/bin/pip install --no-cache-dir \
    yt-dlp \
    gallery-dl \
    fastapi \
    uvicorn \
    python-multipart \
    instaloader
  # Clean up cache
  find $BUILD_DIR/python-venv -name "*.pyc" -delete
  find $BUILD_DIR/python-venv -name "__pycache__" -type d -delete
  rm -rf $BUILD_DIR/python-venv/venv/lib/python*/site-packages/pip*
  rm -rf $BUILD_DIR/python-venv/venv/lib/python*/site-packages/setuptools*
else
  echo "No venv found, creating placeholder..."
  mkdir -p $BUILD_DIR/python-venv
  echo "Python venv will be created on first run" > $BUILD_DIR/python-venv/README.txt
fi
tar -czf $DIST_DIR/python-venv-1.1.0.tar.gz -C $BUILD_DIR python-venv
echo "✅ python-venv: $(du -h $DIST_DIR/python-venv-1.1.0.tar.gz | cut -f1)"

# Cleanup
rm -rf $BUILD_DIR

# Generate manifest for installer
cat > $DIST_DIR/manifest.json << EOF
{
  "version": "1.1.0",
  "components": [
    {
      "name": "core-files",
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/core-files-1.1.0.tar.gz | cut -f1)",
      "filename": "core-files-1.1.0.tar.gz",
      "required": true
    },
    {
      "name": "nextjs-bundle",
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/nextjs-bundle-1.1.0.tar.gz | cut -f1)",
      "filename": "nextjs-bundle-1.1.0.tar.gz",
      "required": true
    },
    {
      "name": "node-modules",
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/node-modules-1.1.0.tar.gz | cut -f1)",
      "filename": "node-modules-1.1.0.tar.gz",
      "required": true
    },
    {
      "name": "python-backend",
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/python-backend-1.1.0.tar.gz | cut -f1)",
      "filename": "python-backend-1.1.0.tar.gz",
      "required": true
    },
    {
      "name": "python-venv",
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/python-venv-1.1.0.tar.gz | cut -f1)",
      "filename": "python-venv-1.1.0.tar.gz",
      "required": true
    }
  ],
  "totalSize": "$(du -sh $DIST_DIR | cut -f1)",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

echo ""
echo "✨ Real component build complete!"
echo "📊 Components ready for upload:"
ls -lah $DIST_DIR/*.tar.gz
echo ""
echo "📋 Total size: $(du -sh $DIST_DIR | cut -f1)"
echo ""
echo "Next step: Upload to Supabase Storage!"