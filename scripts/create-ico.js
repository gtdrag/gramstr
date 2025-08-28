#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildResourcesDir = path.join(__dirname, '..', 'build-resources');

// Check if ImageMagick is available
try {
  execSync('convert -version', { stdio: 'ignore' });
  
  // Use ImageMagick to create .ico
  const pngFiles = [16, 24, 32, 48, 64, 128, 256]
    .map(size => path.join(buildResourcesDir, `icon_${size}.png`))
    .join(' ');
  
  const icoPath = path.join(buildResourcesDir, 'icon.ico');
  const cmd = `convert ${pngFiles} ${icoPath}`;
  
  console.log('Creating Windows .ico file with ImageMagick...');
  execSync(cmd);
  console.log(`✅ Created ${icoPath}`);
} catch (error) {
  console.log('ImageMagick not found. Installing png-to-ico package...');
  
  // Install png-to-ico package
  execSync('npm install --save-dev png-to-ico', { stdio: 'inherit' });
  
  // Use png-to-ico
  const { default: pngToIco } = require('png-to-ico');
  
  const pngFiles = [256, 128, 64, 48, 32, 24, 16].map(size => 
    path.join(buildResourcesDir, `icon_${size}.png`)
  );
  
  (async () => {
    try {
      const buffers = await Promise.all(pngFiles.map(file => fs.promises.readFile(file)));
      const icoBuffer = await pngToIco(buffers);
      const icoPath = path.join(buildResourcesDir, 'icon.ico');
      fs.writeFileSync(icoPath, icoBuffer);
      console.log(`✅ Created ${icoPath}`);
    } catch (err) {
      console.error('Error creating ICO:', err);
    }
  })();
}