#!/bin/bash

# Build script for creating component packages for the two-stage installer

set -e

echo "🔨 Building Gramstr Components for v1.1..."

# Setup directories
DIST_DIR="dist-components"
BUILD_DIR="build-temp"

rm -rf $DIST_DIR $BUILD_DIR
mkdir -p $DIST_DIR $BUILD_DIR

# Component 1: Electron Runtime (minimal Electron shell)
echo "📦 Building electron-runtime..."
mkdir -p $BUILD_DIR/electron-runtime
cp electron/main.js $BUILD_DIR/electron-runtime/
cp -r electron/lib $BUILD_DIR/electron-runtime/ 2>/dev/null || true
cp package.json $BUILD_DIR/electron-runtime/
# Only include essential Electron modules
cd $BUILD_DIR/electron-runtime
npm install --production electron@30.5.1
cd ../..
tar -czf $DIST_DIR/electron-runtime-1.1.0.tar.gz -C $BUILD_DIR electron-runtime
echo "✅ electron-runtime: $(du -h $DIST_DIR/electron-runtime-1.1.0.tar.gz | cut -f1)"

# Component 2: Next.js Bundle (pre-built Next.js app)
echo "📦 Building nextjs-bundle..."
npm run build:next
mkdir -p $BUILD_DIR/nextjs-bundle
cp -r .next $BUILD_DIR/nextjs-bundle/
cp -r public $BUILD_DIR/nextjs-bundle/
# Include only Next.js runtime dependencies
mkdir -p $BUILD_DIR/nextjs-bundle/node_modules
for pkg in next react react-dom styled-jsx @swc/helpers; do
  cp -r node_modules/$pkg $BUILD_DIR/nextjs-bundle/node_modules/ 2>/dev/null || true
done
tar -czf $DIST_DIR/nextjs-bundle-1.1.0.tar.gz -C $BUILD_DIR nextjs-bundle
echo "✅ nextjs-bundle: $(du -h $DIST_DIR/nextjs-bundle-1.1.0.tar.gz | cut -f1)"

# Component 3: Python Environment
echo "📦 Building python-env..."
mkdir -p $BUILD_DIR/python-env
if [ -d "venv" ]; then
  # Create minimal Python environment
  python3 -m venv $BUILD_DIR/python-env/venv
  $BUILD_DIR/python-env/venv/bin/pip install --no-cache-dir \
    yt-dlp \
    gallery-dl \
    fastapi \
    uvicorn \
    python-multipart
  # Remove unnecessary files
  find $BUILD_DIR/python-env -name "*.pyc" -delete
  find $BUILD_DIR/python-env -name "__pycache__" -type d -delete
fi
cp -r backend $BUILD_DIR/python-env/
tar -czf $DIST_DIR/python-env-1.1.0.tar.gz -C $BUILD_DIR python-env
echo "✅ python-env: $(du -h $DIST_DIR/python-env-1.1.0.tar.gz | cut -f1)"

# Component 4: Content Tools (yt-dlp, gallery-dl binaries)
echo "📦 Building content-tools..."
mkdir -p $BUILD_DIR/content-tools/bin
# Download latest yt-dlp binary
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o $BUILD_DIR/content-tools/bin/yt-dlp
chmod +x $BUILD_DIR/content-tools/bin/yt-dlp
# Add gallery-dl
cp venv/bin/gallery-dl $BUILD_DIR/content-tools/bin/ 2>/dev/null || true
tar -czf $DIST_DIR/content-tools-1.1.0.tar.gz -C $BUILD_DIR content-tools
echo "✅ content-tools: $(du -h $DIST_DIR/content-tools-1.1.0.tar.gz | cut -f1)"

# Generate manifest
echo "📝 Generating manifest..."
cat > $DIST_DIR/manifest.json << EOF
{
  "version": "1.1.0",
  "components": {
    "electron-runtime": {
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/electron-runtime-1.1.0.tar.gz | cut -f1)",
      "sha256": "$(shasum -a 256 $DIST_DIR/electron-runtime-1.1.0.tar.gz | cut -d' ' -f1)",
      "url": "electron-runtime-1.1.0.tar.gz"
    },
    "nextjs-bundle": {
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/nextjs-bundle-1.1.0.tar.gz | cut -f1)",
      "sha256": "$(shasum -a 256 $DIST_DIR/nextjs-bundle-1.1.0.tar.gz | cut -d' ' -f1)",
      "url": "nextjs-bundle-1.1.0.tar.gz"
    },
    "python-env": {
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/python-env-1.1.0.tar.gz | cut -f1)",
      "sha256": "$(shasum -a 256 $DIST_DIR/python-env-1.1.0.tar.gz | cut -d' ' -f1)",
      "url": "python-env-1.1.0.tar.gz"
    },
    "content-tools": {
      "version": "1.1.0",
      "size": "$(du -h $DIST_DIR/content-tools-1.1.0.tar.gz | cut -f1)",
      "sha256": "$(shasum -a 256 $DIST_DIR/content-tools-1.1.0.tar.gz | cut -d' ' -f1)",
      "url": "content-tools-1.1.0.tar.gz"
    }
  },
  "totalSize": "$(du -sh $DIST_DIR | cut -f1)",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Cleanup
rm -rf $BUILD_DIR

echo ""
echo "✨ Component build complete!"
echo "📊 Total size: $(du -sh $DIST_DIR | cut -f1)"
echo ""
echo "Components are in: $DIST_DIR/"
echo ""
echo "Next steps:"
echo "1. Upload components to CDN (cdn.gramstr.com)"
echo "2. Build installer: cd installer && npm run build"
echo "3. Installer will be ~10-15MB!"