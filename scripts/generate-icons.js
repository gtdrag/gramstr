#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvg = path.join(__dirname, '..', 'build-resources', 'icon.svg');
const buildResourcesDir = path.join(__dirname, '..', 'build-resources');

// Ensure build-resources directory exists
if (!fs.existsSync(buildResourcesDir)) {
  fs.mkdirSync(buildResourcesDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating app icons...');
  
  // Read the SVG
  const svgBuffer = fs.readFileSync(iconSvg);
  
  // macOS icon sizes for .icns (will be converted using iconutil)
  const macSizes = [16, 32, 64, 128, 256, 512, 1024];
  const iconsetDir = path.join(buildResourcesDir, 'icon.iconset');
  
  // Create iconset directory
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true });
  }
  
  // Generate PNG files for macOS iconset
  for (const size of macSizes) {
    const scale1x = path.join(iconsetDir, `icon_${size}x${size}.png`);
    const scale2x = path.join(iconsetDir, `icon_${size/2}x${size/2}@2x.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(scale1x);
    console.log(`Created ${scale1x}`);
    
    if (size >= 32 && size <= 1024) {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(scale2x);
      console.log(`Created ${scale2x}`);
    }
  }
  
  // Windows icon sizes for .ico
  const winSizes = [16, 24, 32, 48, 64, 128, 256];
  const winIcons = [];
  
  for (const size of winSizes) {
    const iconPath = path.join(buildResourcesDir, `icon_${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(iconPath);
    winIcons.push(iconPath);
    console.log(`Created ${iconPath}`);
  }
  
  // Linux icon
  const linuxIcon = path.join(buildResourcesDir, 'icon.png');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(linuxIcon);
  console.log(`Created ${linuxIcon}`);
  
  // Create 1024x1024 PNG for general use
  const icon1024 = path.join(buildResourcesDir, 'icon_1024.png');
  await sharp(svgBuffer)
    .resize(1024, 1024)
    .png()
    .toFile(icon1024);
  console.log(`Created ${icon1024}`);
  
  console.log('\n✅ Icon generation complete!');
  console.log('\nNext steps:');
  console.log('1. On macOS, run: iconutil -c icns build-resources/icon.iconset -o build-resources/icon.icns');
  console.log('2. For Windows .ico, use an online converter with the generated PNGs');
  console.log('3. The Linux icon.png is ready to use');
}

generateIcons().catch(console.error);