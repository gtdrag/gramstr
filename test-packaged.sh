#!/bin/bash
# Copy test script to app and run it
cp test-electron.js dist/mac-arm64/Gramstr.app/Contents/Resources/app.asar.unpacked/
dist/mac-arm64/Gramstr.app/Contents/MacOS/Gramstr test-electron.js

# Wait a bit then show the log
sleep 3
echo "=== LOG FILE CONTENTS ==="
cat ~/Library/Application\ Support/Gramstr/startup-log.txt
