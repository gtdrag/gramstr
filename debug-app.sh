#!/bin/bash
# Launch the built app with console output
if [ -d "/Applications/Gramstr.app" ]; then
    /Applications/Gramstr.app/Contents/MacOS/Gramstr
elif [ -d "$HOME/Applications/Gramstr.app" ]; then
    $HOME/Applications/Gramstr.app/Contents/MacOS/Gramstr
else
    echo "Gramstr.app not found in /Applications or ~/Applications"
    echo "Looking in dist folder..."
    if [ -d "dist/mac/Gramstr.app" ]; then
        dist/mac/Gramstr.app/Contents/MacOS/Gramstr
    elif [ -d "dist/mac-arm64/Gramstr.app" ]; then
        dist/mac-arm64/Gramstr.app/Contents/MacOS/Gramstr
    else
        echo "No Gramstr.app found"
    fi
fi
