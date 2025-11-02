/**
 * Nogglr Logo Component
 * Reusable logo component for the app
 */

import { generateNogglrLogo, svgToDataURL } from '../utils/logoGenerator';

interface LogoProps {
  variant?: 'main' | 'favicon' | 'icon' | 'banner';
  style?: 'tech' | 'geometric' | 'space' | 'cyber';
  size?: number;
  className?: string;
  onClick?: () => void;
  asDataURL?: boolean;
}

export function Logo({ 
  variant = 'main', 
  style = 'tech', 
  size, 
  className = '', 
  onClick,
  asDataURL = false 
}: LogoProps) {
  const logo = generateNogglrLogo({ variant, style });
  
  // If size is specified, scale the SVG
  const scaledSvg = size ? logo.svg.replace(
    /width="[^"]*"/, 
    `width="${size}"`
  ).replace(
    /height="[^"]*"/, 
    `height="${size}"`
  ) : logo.svg;
  
  if (asDataURL) {
    return (
      <img 
        src={svgToDataURL(scaledSvg)} 
        alt="Nogglr Logo" 
        className={`nogglr-logo ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />
    );
  }
  
  return (
    <div 
      className={`nogglr-logo ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      dangerouslySetInnerHTML={{ __html: scaledSvg }}
    />
  );
}

/**
 * Header Logo Component
 * Logo specifically designed for the app header
 */
export function HeaderLogo({ className = '' }: { className?: string }) {
  return (
    <Logo 
      variant="main" 
      style="tech" 
      className={`header-logo ${className}`}
      size={48}
    />
  );
}

/**
 * Favicon Logo Component
 * Small logo for favicon usage
 */
export function FaviconLogo({ className = '' }: { className?: string }) {
  return (
    <Logo 
      variant="favicon" 
      style="tech" 
      className={`favicon-logo ${className}`}
    />
  );
}

/**
 * Icon Logo Component
 * Medium-sized logo for buttons and small spaces
 */
export function IconLogo({ className = '' }: { className?: string }) {
  return (
    <Logo 
      variant="icon" 
      style="tech" 
      className={`icon-logo ${className}`}
    />
  );
}

/**
 * Banner Logo Component
 * Wide logo for banners and headers
 */
export function BannerLogo({ className = '' }: { className?: string }) {
  return (
    <Logo 
      variant="banner" 
      style="tech" 
      className={`banner-logo ${className}`}
    />
  );
}

/**
 * Logo with Text Component
 * Logo combined with "Nogglr" text
 */
export function LogoWithText({ 
  className = '', 
  textColor = '#333',
  showText = true 
}: { 
  className?: string;
  textColor?: string;
  showText?: boolean;
}) {
  return (
    <div className={`logo-with-text ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <HeaderLogo />
      {showText && (
        <span 
          style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: textColor,
            fontFamily: 'Caveat Brush, cursive'
          }}
        >
          Nogglr
        </span>
      )}
    </div>
  );
}
