# Electron Build & Distribution Guide

## Overview
This application has been converted to an Electron desktop app that can be distributed on your website.

## Development
```bash
# Run in development mode with hot reload
npm run electron:dev

# Or run Next.js and Electron separately
npm run dev         # In one terminal
npm run electron    # In another terminal
```

## Building for Distribution

### Prerequisites
1. Add icon files to `build-resources/`:
   - `icon.icns` for macOS (1024x1024px)
   - `icon.ico` for Windows (256x256px)
   - `icon.png` for Linux (512x512px)

2. Update `electron-builder.yml`:
   - Change `appId` to your company identifier
   - Update `publish.url` to your website download URL

### Build Commands
```bash
# Build for current platform
npm run build:electron

# Build for specific platforms
npm run build:mac     # macOS (.dmg, .zip)
npm run build:win     # Windows (.exe installer, portable)
npm run build:linux   # Linux (AppImage, .deb, .rpm)

# Build for all platforms (requires macOS)
npm run dist:all
```

## Distribution Setup

### 1. Simple File Hosting
Upload the built files to your website:
```
your-website.com/downloads/
├── latest-mac.yml
├── Gramstr-2.0.0-arm64.dmg
├── Gramstr-2.0.0-x64.dmg
├── latest.yml
├── Gramstr-Setup-2.0.0.exe
└── Gramstr-2.0.0.AppImage
```

### 2. Auto-Update Configuration
The app includes auto-updater that checks for updates from your server.

Update `electron/updater.js`:
```javascript
const updateServerUrl = 'https://your-website.com/downloads/';
```

### 3. Code Signing (Recommended)
- **macOS**: Requires Apple Developer certificate ($99/year)
- **Windows**: Requires code signing certificate ($200-500/year)

Without signing, users will see security warnings when installing.

## Python Backend Integration
The Electron app automatically bundles and starts the Python backend:
- Development: Uses local Python installation
- Production: Can bundle Python or require user to have Python installed

### Bundling Python (Advanced)
For complete standalone distribution:
1. Use PyInstaller to create Python executable
2. Include in `extraResources` in electron-builder.yml
3. Update `electron/main.js` to use bundled Python

## Platform-Specific Notes

### macOS
- Notarization required for distribution outside Mac App Store
- Users may need to right-click → Open on first launch

### Windows
- Windows Defender may flag unsigned apps
- Include Visual C++ Redistributables if bundling Python

### Linux
- AppImage works on most distributions
- .deb for Ubuntu/Debian, .rpm for Fedora/RHEL

## Testing Distribution
1. Build the app: `npm run build:electron`
2. Find installer in `dist/` directory
3. Test installation on clean system
4. Verify auto-updater by incrementing version

## Website Integration
Add download buttons to your website:
```html
<a href="/downloads/Gramstr-Setup-2.0.0.exe">Download for Windows</a>
<a href="/downloads/Gramstr-2.0.0.dmg">Download for macOS</a>
<a href="/downloads/Gramstr-2.0.0.AppImage">Download for Linux</a>
```

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Clear cache: `rm -rf dist/ out/`
- Check Node.js version compatibility

### Python Backend Issues
- Verify Python 3.8+ is installed
- Check `backend/requirements.txt` dependencies
- Ensure cookies file permissions are correct

### Auto-Update Not Working
- Verify update server URL is accessible
- Check latest.yml file is properly generated
- Ensure version number is incremented in package.json