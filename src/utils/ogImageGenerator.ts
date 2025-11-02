/**
 * Dynamic OG Image Generator
 * Creates random NFT samples using Nouns library for social media previews
 */

import { ImageData, getNounData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';
// import { getCustomAssets } from './customAssetLoader';

export interface OGImageConfig {
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  showTraits?: boolean;
  seed?: NounSeed;
}

export interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

/**
 * Generate a random Noun seed using available traits
 */
export function generateRandomNounSeed(): NounSeed {
  const { bgcolors, images } = ImageData;
  const { bodies, accessories, heads, glasses } = images;
  
  return {
    background: Math.floor(Math.random() * bgcolors.length),
    body: Math.floor(Math.random() * bodies.length),
    accessory: Math.floor(Math.random() * accessories.length),
    head: Math.floor(Math.random() * heads.length),
    glasses: Math.floor(Math.random() * glasses.length)
  };
}

/**
 * Generate a random Noun SVG using the Nouns library
 */
export function generateRandomNounSVG(seed?: NounSeed): string {
  const nounSeed = seed || generateRandomNounSeed();
  
  try {
    // Generate the Noun using the official Nouns SDK
    const { parts, background } = getNounData(nounSeed);
    const svg = buildSVG(parts, ImageData.palette, background);
    
    return svg;
  } catch (error) {
    console.error('Error generating Noun SVG:', error);
    // Fallback to a simple SVG if generation fails
    return generateFallbackSVG();
  }
}

/**
 * Generate a fallback SVG if Noun generation fails
 */
function generateFallbackSVG(): string {
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#8b5cf6"/>
    <circle cx="16" cy="16" r="12" fill="#ffffff"/>
    <circle cx="16" cy="16" r="8" fill="#8b5cf6"/>
    <text x="16" y="20" text-anchor="middle" fill="white" font-size="8" font-family="Urbanist, sans-serif">N</text>
  </svg>`;
}

/**
 * Generate a complete OG image with Noun sample and branding
 */
export function generateOGImage(config: OGImageConfig = {}): string {
  const {
    width = 1200,
    height = 630,
    title = 'Nogglr',
    subtitle = 'Create Unique NFT Avatars',
    seed
  } = config;

  // Generate random Noun
  const nounSVG = generateRandomNounSVG(seed);
  
  // Extract the Noun content (remove outer SVG tags)
  const nounContent = nounSVG.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  
  // Scale the Noun to be larger in the OG image
  const scaledNounContent = nounContent.replace(
    /width="32" height="32"/g, 
    'width="400" height="400"'
  ).replace(
    /viewBox="0 0 32 32"/g,
    'viewBox="0 0 32 32"'
  );

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#2d2d2d;stop-opacity:1" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    
    <!-- Decorative elements -->
    <circle cx="100" cy="100" r="50" fill="#8b5cf6" opacity="0.1"/>
    <circle cx="${width - 100}" cy="${height - 100}" r="80" fill="#ec4899" opacity="0.1"/>
    <circle cx="${width - 200}" cy="150" r="60" fill="#84cc16" opacity="0.1"/>
    
    <!-- Noun NFT Sample -->
    <g transform="translate(50, 115)">
      <rect x="0" y="0" width="400" height="400" fill="#ffffff" rx="20" stroke="#8b5cf6" stroke-width="4"/>
      <g transform="translate(0, 0)">
        ${scaledNounContent}
      </g>
    </g>
    
    <!-- Title -->
    <text x="${width - 400}" y="200" font-family="Urbanist, sans-serif" font-size="72" font-weight="bold" fill="white" filter="url(#glow)">
      ${title}
    </text>
    
    <!-- Subtitle -->
    <text x="${width - 400}" y="280" font-family="Urbanist, sans-serif" font-size="36" fill="#e5e7eb">
      ${subtitle}
    </text>
    
    <!-- Features -->
    <text x="${width - 400}" y="350" font-family="Urbanist, sans-serif" font-size="24" fill="#9ca3af">
      • Random Traits
    </text>
    <text x="${width - 400}" y="390" font-family="Urbanist, sans-serif" font-size="24" fill="#9ca3af">
      • Custom Backgrounds
    </text>
    <text x="${width - 400}" y="430" font-family="Urbanist, sans-serif" font-size="24" fill="#9ca3af">
      • Blockchain Ready
    </text>
    
    <!-- CTA Button -->
    <rect x="${width - 400}" y="480" width="300" height="60" fill="#8b5cf6" rx="30"/>
    <text x="${width - 250}" y="520" font-family="Urbanist, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
      Mint Nogglr on Farcaster
    </text>
    
    <!-- Branding -->
    <text x="50" y="${height - 30}" font-family="Urbanist, sans-serif" font-size="18" fill="#6b7280">
      https://nogglr.vercel.app
    </text>
  </svg>`;
}

/**
 * Generate multiple OG image variations
 */
export function generateOGImageVariations(count: number = 5): string[] {
  const variations: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const seed = generateRandomNounSeed();
    variations.push(generateOGImage({ seed }));
  }
  
  return variations;
}

/**
 * Generate OG image for specific NFT
 */
export function generateNFTOGImage(tokenId: number, nounSeed: NounSeed, nftName?: string): string {
  return generateOGImage({
    title: nftName || `Nogglr #${tokenId}`,
    subtitle: 'Unique NFT Avatar',
    seed: nounSeed
  });
}

/**
 * Generate OG image for minting page
 */
export function generateMintOGImage(): string {
  return generateOGImage({
    title: 'Nogglr',
    subtitle: 'Create & Mint Unique NFT Avatars'
  });
}

/**
 * Convert SVG to data URL for use in meta tags
 */
export function svgToDataURL(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get OG image data URL for minting page
 */
export function getMintOGImageDataURL(): string {
  return svgToDataURL(generateMintOGImage());
}

/**
 * Get OG image data URL for specific NFT
 */
export function getNFTOGImageDataURL(tokenId: number, nounSeed?: NounSeed): string {
  const seed = nounSeed || generateRandomNounSeed();
  return svgToDataURL(generateNFTOGImage(tokenId, seed));
}

/**
 * Generate OG image for specific NFT (alias for compatibility)
 */
export function generateNFTOG(tokenId: number, nounSeed?: NounSeed, nftName?: string): string {
  const seed = nounSeed || generateRandomNounSeed();
  return generateNFTOGImage(tokenId, seed, nftName);
}