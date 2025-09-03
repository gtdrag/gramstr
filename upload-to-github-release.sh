#!/bin/bash

# GitHub Release Upload Script for Gramstr v1.0.0
# 
# Prerequisites:
# 1. Create a GitHub personal access token with 'repo' scope
#    Go to: https://github.com/settings/tokens/new
# 2. Export it: export GITHUB_TOKEN=your_token_here
# 3. Run this script: ./upload-to-github-release.sh

set -e

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN not set"
    echo ""
    echo "To fix this:"
    echo "1. Go to https://github.com/settings/tokens/new"
    echo "2. Create a token with 'repo' scope"
    echo "3. Run: export GITHUB_TOKEN=your_token_here"
    echo "4. Run this script again"
    exit 1
fi

echo "🔍 Finding latest release..."

# Get the latest release
RELEASE_JSON=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/gtdrag/gramstr/releases/latest)

# Check if we got a valid response
if echo "$RELEASE_JSON" | grep -q '"message"'; then
    echo "❌ Error getting release. Response:"
    echo "$RELEASE_JSON" | python3 -m json.tool
    exit 1
fi

# Extract release ID and upload URL
RELEASE_ID=$(echo "$RELEASE_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")
UPLOAD_URL=$(echo "$RELEASE_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin).get('upload_url', '').split('{')[0])")

if [ -z "$RELEASE_ID" ] || [ -z "$UPLOAD_URL" ]; then
    echo "❌ Could not find release. You may need to create it first."
    echo "   Go to: https://github.com/gtdrag/gramstr/releases/new"
    exit 1
fi

echo "✅ Found release ID: $RELEASE_ID"
echo "📦 Upload URL: $UPLOAD_URL"

# Upload DMG file
DMG_FILE="dist/Gramstr-1.0.0-arm64.dmg"
if [ -f "$DMG_FILE" ]; then
    echo ""
    echo "📤 Uploading DMG file (288MB)..."
    echo "   This may take a few minutes..."
    
    curl -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/octet-stream" \
        --data-binary @"$DMG_FILE" \
        --progress-bar \
        "${UPLOAD_URL}?name=Gramstr-1.0.0-arm64.dmg" \
        -o /tmp/upload_response.json
    
    if grep -q '"browser_download_url"' /tmp/upload_response.json; then
        echo "✅ DMG uploaded successfully!"
    else
        echo "❌ DMG upload may have failed. Response:"
        cat /tmp/upload_response.json
    fi
else
    echo "⚠️  DMG file not found: $DMG_FILE"
fi

# Upload ZIP file
ZIP_FILE="dist/Gramstr-1.0.0-arm64-mac.zip"
if [ -f "$ZIP_FILE" ]; then
    echo ""
    echo "📤 Uploading ZIP file (288MB)..."
    echo "   This may take a few minutes..."
    
    curl -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Content-Type: application/octet-stream" \
        --data-binary @"$ZIP_FILE" \
        --progress-bar \
        "${UPLOAD_URL}?name=Gramstr-1.0.0-arm64-mac.zip" \
        -o /tmp/upload_response.json
    
    if grep -q '"browser_download_url"' /tmp/upload_response.json; then
        echo "✅ ZIP uploaded successfully!"
    else
        echo "❌ ZIP upload may have failed. Response:"
        cat /tmp/upload_response.json
    fi
else
    echo "⚠️  ZIP file not found: $ZIP_FILE"
fi

echo ""
echo "🎉 Upload complete!"
echo "📎 View release: https://github.com/gtdrag/gramstr/releases/latest"
echo ""
echo "Your website download button will now work automatically!"