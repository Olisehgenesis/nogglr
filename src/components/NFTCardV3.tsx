import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
import { useToast } from './Toast';
import { NFTDetailModal } from './NFTDetailModal';
import { sdk } from '@farcaster/miniapp-sdk';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import { useTheme } from '@mui/material/styles';

// Function to extract dominant color from SVG
const extractDominantColor = async (svgUrl: string): Promise<string> => {
  try {
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    
    // Parse SVG to find colors
    const colors = new Set<string>();
    
    // Extract fill colors
    const fillMatches = svgText.match(/fill="([^"]+)"/g);
    if (fillMatches) {
      fillMatches.forEach(match => {
        const color = match.match(/fill="([^"]+)"/)?.[1];
        if (color && color !== 'none' && color !== 'transparent' && !color.startsWith('url(')) {
          colors.add(color);
        }
      });
    }
    
    // Extract stroke colors
    const strokeMatches = svgText.match(/stroke="([^"]+)"/g);
    if (strokeMatches) {
      strokeMatches.forEach(match => {
        const color = match.match(/stroke="([^"]+)"/)?.[1];
        if (color && color !== 'none' && color !== 'transparent' && !color.startsWith('url(')) {
          colors.add(color);
        }
      });
    }
    
    // Convert hex colors to RGB and find the most vibrant one
    const colorArray = Array.from(colors);
    if (colorArray.length === 0) return '#000000';
    
    // Simple heuristic: prefer colors that aren't black, white, or gray
    const vibrantColors = colorArray.filter(color => {
      if (color.startsWith('#')) {
        const hex = color.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Avoid very dark, very light, or gray colors
        const brightness = (r + g + b) / 3;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        
        return brightness > 30 && brightness < 225 && saturation > 20;
      }
      return true;
    });
    
    return vibrantColors.length > 0 ? vibrantColors[0] : colorArray[0];
  } catch (error) {
    console.error('Error extracting color from SVG:', error);
    return '#000000';
  }
};

// Icon component for Material Symbols
const Icon = ({ children, className }: { children: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{children}</span>
);

interface NFTCardV3Props {
  tokenId: number;
  onCardClick?: () => void;
  onNFTClick?: (tokenId: string) => void;
}

export function NFTCardV3({ tokenId, onCardClick, onNFTClick }: NFTCardV3Props) {
  const { address } = useAccount();
  const { useNFTData, useTokenURI, useHasLiked, likeNFT, formatEtherValue } = useNogglrv3BETA();
  const { showToast, ToastComponent } = useToast();
  const theme = useTheme();
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  
  const nftData = useNFTData(BigInt(tokenId));
  const tokenURI = useTokenURI(BigInt(tokenId));
  const hasLiked = useHasLiked(BigInt(tokenId), address);
  
  // Calculate rarity based on NFT data
  const calculateRarity = (data: any): string => {
    if (!data) return 'common';
    
    // Calculate rarity based on likes, earnings, and other factors
    const likes = Number(data.likes || 0);
    const earnings = Number(data.totalEarnings || 0);
    
    // Simple rarity calculation based on engagement
    const engagementScore = likes + (earnings * 10); // Earnings weighted more
    
    if (engagementScore >= 1000) return 'divine';
    if (engagementScore >= 500) return 'mythic';
    if (engagementScore >= 200) return 'legendary';
    if (engagementScore >= 100) return 'epic';
    if (engagementScore >= 50) return 'rare';
    if (engagementScore >= 10) return 'uncommon';
    return 'common';
  };
  
  const rarity = calculateRarity(nftData?.data);
  
  // State for image URL from tokenURI
  const [imageUrl, setImageUrl] = useState<string>('');
  const [dominantColor, setDominantColor] = useState<string>('#000000');
  
  // Check Mini App context
  useEffect(() => {
    const checkMiniAppContext = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
        
        if (inMiniApp) {
          const context = await sdk.context;
          setUserContext(context);
        }
      } catch (error) {
        console.error('Error checking mini app context:', error);
      }
    };
    
    checkMiniAppContext();
  }, []);

  // Decode tokenURI to get image URL
  useEffect(() => {
    if (tokenURI?.data && typeof tokenURI.data === 'string') {
      try {
        // Beta contract returns data:application/json;base64, format
        if (tokenURI.data.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.data.replace('data:application/json;base64,', '');
          const jsonString = atob(base64Data);
          const data = JSON.parse(jsonString);
          
          console.log(`NFTCardV3 Metadata loaded for Token ${tokenId}:`, data);
          
          if (data.image) {
            // Image is already base64 encoded in the format: data:image/svg+xml;base64,...
            setImageUrl(data.image);
            
            // Extract dominant color from SVG
            if (data.image.includes('svg')) {
              extractDominantColor(data.image).then(color => {
                setDominantColor(color);
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error decoding base64 metadata for Token ${tokenId}:`, error);
      }
    }
  }, [tokenURI?.data, tokenId]);
  
  // Handle like functionality
  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!address) {
      showToast('Please connect your wallet', 'error');
      return;
    }
    
    if (hasLiked?.data) {
      showToast('Already liked this NFT', 'info');
      return;
    }
    
    if ((nftData?.data as any)?.creator === address) {
      showToast('Cannot like your own NFT', 'info');
      return;
    }
    
    try {
      await likeNFT.mutateAsync({ tokenId: BigInt(tokenId) });
      showToast('NFT liked! 🎉', 'success');
    } catch (error: any) {
      console.error('Failed to like NFT:', error);
      showToast(error.message || 'Failed to like NFT', 'error');
    }
  };

  // Handle card click
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    } else if (onNFTClick) {
      onNFTClick(tokenId.toString());
    } else {
      // Open modal by default
      setIsModalOpen(true);
    }
  };

  // Get price to display
  const nftDataTyped = nftData?.data as any;
  const displayPrice = nftDataTyped?.isListed && nftDataTyped.listPrice > 0n
    ? formatEtherValue(nftDataTyped.listPrice)
    : nftDataTyped?.mintPrice > 0n
      ? formatEtherValue(nftDataTyped.mintPrice)
      : formatEtherValue(nftDataTyped?.totalEarnings || 0n);

  // Get display name for creator
  const getCreatorDisplayName = (creatorAddress: string) => {
    if (!creatorAddress) return 'Unknown';
    
    // If it's the current user and we're in Mini App, use Farcaster data
    if (isMiniApp && userContext && address && creatorAddress.toLowerCase() === address.toLowerCase()) {
      return userContext.user.displayName || userContext.user.username || `FID ${userContext.user.fid}`;
    }
    
    // For other users, show trimmed address
    return `${creatorAddress.slice(0, 8)}...${creatorAddress.slice(-6)}`;
  };

  return (
    <>
      <div 
        className={`nft-card ${rarity}`}
        onClick={handleCardClick}
        style={{
          '--shadow-color': dominantColor,
          width: '100%',
          height: 'auto',
          minHeight: '400px',
          aspectRatio: '1 / 1.4'
        } as React.CSSProperties}
      >
        {/* Image Container with Overlays */}
        <div className="nft-image-container">
          {imageUrl ? (
            <>
              <img 
                src={imageUrl} 
                alt={`Nogglr #${tokenId}`}
                className="nft-image"
                onError={(e) => {
                  console.error(`Image load error for Token ${tokenId}:`, e);
                }}
              />
              
              {/* Like Overlay - Top Left */}
              <div 
                className={`nft-likes-overlay ${hasLiked?.data ? 'liked' : ''}`}
                onClick={handleLike}
                style={{ color: '#ffffff' }}
              >
                <ThumbUpIcon fontSize="small" />
                <span>{(nftDataTyped?.likes || 0).toString()}</span>
              </div>
              
              {/* Price Overlay - Top Right */}
              {displayPrice && displayPrice !== '0' && (
                <div className="nft-price-overlay">
                  <span>{displayPrice}</span>
                  <img src={"/celo-celo-logo.svg"} alt="CELO" className="celo-icon-small" />
                </div>
              )}
            </>
          ) : (
            <div className="nft-image-placeholder">
              <div className="placeholder-icon">🥽</div>
              <span>Loading...</span>
            </div>
          )}
        </div>
        
        {/* Minimal Info Bar */}
        <div className="nft-info">
          <h3 className="nft-title">
            Nogglr #{tokenId}
          </h3>
          <div className="nft-creator">
            <span className="creator-label">by</span>
            <span className="creator-name">
              {getCreatorDisplayName(nftDataTyped?.creator || '')}
            </span>
          </div>
          <span className={`nft-rarity-badge ${rarity}`}>
            {rarity}
          </span>
        </div>
      </div>
      
      {/* NFT Detail Modal */}
      <NFTDetailModal
        tokenId={tokenId.toString()}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
      
      <ToastComponent />
    </>
  );
}
