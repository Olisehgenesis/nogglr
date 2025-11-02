#!/usr/bin/env node

/**
 * Generate Nogglr Logo Files
 * Script to generate and save logo SVG files
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// Import the logo generator functions
const { generateNogglrLogo, getNogglrLogoSVG, getNogglrFaviconSVG, getNogglrIconSVG, getNogglrBannerSVG } = require('./src/utils/logoGenerator');

const outputDir = './public/logos';

// Ensure output directory exists
try {
  require('fs').mkdirSync(outputDir, { recursive: true });
} catch (error) {
  console.log('Output directory already exists or created');
}

// Generate different logo variations
const logos = [
  { name: 'logo-main', variant: 'main', style: 'tech' },
  { name: 'logo-favicon', variant: 'favicon', style: 'tech' },
  { name: 'logo-icon', variant: 'icon', style: 'tech' },
  { name: 'logo-banner', variant: 'banner', style: 'tech' },
  { name: 'logo-geometric', variant: 'main', style: 'geometric' },
  { name: 'logo-space', variant: 'main', style: 'space' },
  { name: 'logo-cyber', variant: 'main', style: 'cyber' }
];

console.log('🎨 Generating Nogglr logos...\n');

logos.forEach(({ name, variant, style }) => {
  try {
    const logo = generateNogglrLogo({ variant, style });
    const filename = `${name}.svg`;
    const filepath = join(outputDir, filename);
    
    writeFileSync(filepath, logo.svg);
    console.log(`✅ Generated ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to generate ${name}:`, error.message);
  }
});

// Generate favicon.ico equivalent (SVG)
try {
  const favicon = getNogglrFaviconSVG();
  writeFileSync(join(outputDir, 'favicon.svg'), favicon);
  console.log('✅ Generated favicon.svg');
} catch (error) {
  console.error('❌ Failed to generate favicon:', error.message);
}

console.log('\n🎉 All logos generated successfully!');
console.log(`📁 Files saved to: ${outputDir}`);
console.log('\n📋 Usage:');
console.log('  - Use logo-main.svg for the main app logo');
console.log('  - Use favicon.svg for the browser favicon');
console.log('  - Use logo-icon.svg for small spaces');
console.log('  - Use logo-banner.svg for wide headers');
console.log('  - Try different styles: geometric, space, cyber');
