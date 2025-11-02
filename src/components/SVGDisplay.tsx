import { useState, useEffect } from 'react';

interface SVGDisplayProps {
  svgData: string;
  className?: string;
  width?: number;
  height?: number;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function SVGDisplay({ 
  svgData, 
  className = '', 
  width = 400, 
  height = 400,
  onLoad,
  onError 
}: SVGDisplayProps) {
  const [processedSVG, setProcessedSVG] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!svgData) {
      setError('No SVG data provided');
      setIsLoading(false);
      return;
    }

    try {
      // Process the SVG data for display
      let processed = svgData;
      
      // If it's base64 encoded, decode it
      if (svgData.startsWith('data:image/svg+xml;base64,')) {
        const base64Data = svgData.split(',')[1];
        processed = atob(base64Data);
      }
      
      // Ensure the SVG has proper dimensions
      if (!processed.includes('viewBox') && !processed.includes('width')) {
        processed = processed.replace(
          '<svg',
          `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`
        );
      }
      
      setProcessedSVG(processed);
      setError(null);
      setIsLoading(false);
      onLoad?.();
    } catch (err) {
      const errorMessage = 'Failed to process SVG data';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
      console.error('SVG processing error:', err);
    }
  }, [svgData, width, height, onLoad, onError]);

  if (isLoading) {
    return (
      <div className={`svg-display loading ${className}`} style={{ width, height }}>
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`svg-display error ${className}`} style={{ width, height }}>
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`svg-display ${className}`}
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: processedSVG }}
    />
  );
}

// CSS for the component (you can move this to your CSS file)
const styles = `
.svg-display {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 8px;
  overflow: hidden;
}

.svg-display.loading {
  background: #FFFFFF;
}

.svg-display.error {
  background: rgba(255, 0, 0, 0.1);
  color: #000000;
  font-size: 14px;
  text-align: center;
}


.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #1E73ED;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.error-icon {
  font-size: 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('svg-display-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'svg-display-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
