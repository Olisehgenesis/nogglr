/**
 * Nogglr Logo Generator
 * Generates and manages the app logo and favicon
 */

import { generateLogoSVG, generateFaviconSVG, generateNFTSVG, GeneratedSVG } from './svgGenerator';

// Fixed seed for consistent logo across the app
const LOGO_SEED = 'nogglr-logo-2025';

export interface LogoConfig {
  variant?: 'main' | 'favicon' | 'icon' | 'banner';
  style?: 'tech' | 'geometric' | 'space' | 'cyber';
  size?: number;
}

/**
 * Generate the main Nogglr logo
 */
export function generateNogglrLogo(config: LogoConfig = {}): GeneratedSVG {
  const { variant = 'main', style = 'tech' } = config;
  
  switch (variant) {
    case 'favicon':
      return generateFaviconSVG(LOGO_SEED);
    case 'icon':
      return generateNFTSVG({
        width: 32,
        height: 32,
        viewBox: '0 0 32 32',
        style,
        complexity: 'simple'
      }, LOGO_SEED);
    case 'banner':
      return generateNFTSVG({
        width: 128,
        height: 64,
        viewBox: '0 0 128 64',
        style,
        complexity: 'medium'
      }, LOGO_SEED);
    default:
      return generateLogoSVG(LOGO_SEED);
  }
}

/**
 * Get the main logo SVG as a string
 */
export function getNogglrLogoSVG(): string {
  return generateNogglrLogo().svg;
}

/**
 * Get the favicon SVG as a string
 */
export function getNogglrFaviconSVG(): string {
  return generateNogglrLogo({ variant: 'favicon' }).svg;
}

/**
 * Get the icon SVG as a string
 */
export function getNogglrIconSVG(): string {
  return generateNogglrLogo({ variant: 'icon' }).svg;
}

/**
 * Get the banner SVG as a string
 */
export function getNogglrBannerSVG(): string {
  return generateNogglrLogo({ variant: 'banner' }).svg;
}

/**
 * Convert SVG to data URL for use in img src
 */
export function svgToDataURL(svg: string): string {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get logo as data URL
 */
export function getNogglrLogoDataURL(): string {
  return svgToDataURL(getNogglrLogoSVG());
}

/**
 * Get favicon as data URL
 */
export function getNogglrFaviconDataURL(): string {
  return svgToDataURL(getNogglrFaviconSVG());
}

/**
 * Get icon as data URL
 */
export function getNogglrIconDataURL(): string {
  return svgToDataURL(getNogglrIconSVG());
}

/**
 * Get banner as data URL
 */
export function getNogglrBannerDataURL(): string {
  return svgToDataURL(getNogglrBannerSVG());
}

/**
 * Generate multiple logo variations for testing
 */
export function generateLogoVariations(): GeneratedSVG[] {
  const styles: Array<LogoConfig['style']> = ['tech', 'geometric', 'space', 'cyber'];
  return styles.map(style => generateNogglrLogo({ style }));
}
