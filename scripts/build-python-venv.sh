#!/bin/bash

# Build Python venv component for the installer

set -e

echo "🐍 Building Python Virtual Environment..."

DIST_DIR="dist-components"
BUILD_DIR="build-temp"

# Clean and create directories
rm -rf $BUILD_DIR/python-venv
mkdir -p $BUILD_DIR $DIST_DIR

# Create a fresh virtual environment
echo "Creating virtual environment..."
python3 -m venv $BUILD_DIR/venv

# Activate and install dependencies
echo "Installing Python dependencies..."
$BUILD_DIR/venv/bin/pip install --upgrade pip --quiet
$BUILD_DIR/venv/bin/pip install --no-cache-dir \
    yt-dlp==2023.12.30 \
    gallery-dl==1.26.5 \
    fastapi==0.109.0 \
    uvicorn==0.25.0 \
    python-multipart==0.0.6 \
    instaloader==4.10.1 \
    aiofiles==23.2.1 \
    python-dotenv==1.0.0

# Clean up unnecessary files to reduce size
echo "Cleaning up venv..."
find $BUILD_DIR/venv -name "*.pyc" -delete
find $BUILD_DIR/venv -name "__pycache__" -type d -delete
rm -rf $BUILD_DIR/venv/lib/python*/site-packages/pip*
rm -rf $BUILD_DIR/venv/lib/python*/site-packages/setuptools*
rm -rf $BUILD_DIR/venv/lib/python*/site-packages/wheel*
rm -rf $BUILD_DIR/venv/share

# Create the archive
echo "Creating archive..."
tar -czf $DIST_DIR/python-venv-1.1.0.tar.gz -C $BUILD_DIR venv

# Clean up
rm -rf $BUILD_DIR

# Report size
SIZE=$(du -h $DIST_DIR/python-venv-1.1.0.tar.gz | cut -f1)
echo "✅ python-venv-1.1.0.tar.gz created: $SIZE"
echo ""
echo "Next steps:"
echo "1. Upload to GitHub: gh release upload v1.1.0 $DIST_DIR/python-venv-1.1.0.tar.gz"
echo "2. Update installer to download this component"