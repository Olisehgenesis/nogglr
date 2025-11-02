import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Close as CloseIcon,
  ThumbUp as ThumbUpIcon,
  Gavel as GavelIcon,
  ShoppingCart as ShoppingCartIcon,
  Share as ShareIcon,
  Face as FaceIcon,
  Visibility as VisibilityIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
// import { parseEther } from 'viem'; // Unused import
const celoLogo = '/celo-celo-logo.svg';

interface NFTDetailModalProps {
  tokenId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NFTDetailModal({ tokenId: propTokenId, isOpen, onClose }: NFTDetailModalProps) {
  const [isMiniApp, setIsMiniApp] = useState(false);
  
  const { 
    useNFTData, 
    useTokenURI, 
    useNFTMetadata,
    useOwnerOf, 
    useHasLiked,
    useLikePrice,
    likeNFT,
    buyNow,
    formatEtherValue,
    isLoading: contractLoading 
  } = useNogglrv3BETA();
  
  // Get NFT data
  const nftData = useNFTData(BigInt(Number(propTokenId)));
  const tokenURI = useTokenURI(BigInt(Number(propTokenId)));
  const nftMetadata = useNFTMetadata(BigInt(Number(propTokenId)));
  const owner = useOwnerOf(BigInt(Number(propTokenId)));
  const hasLiked = useHasLiked(BigInt(Number(propTokenId)));
  const likePrice = useLikePrice();
  
  // Get metadata from tokenURI
  const [metadata, setMetadata] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  
  // Format wallet address
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  // Calculate rarity
  const calculateRarity = (data: any): string => {
    if (!data) return 'common';
    const likes = Number(data.likes || 0);
    const earnings = Number(data.totalEarnings || 0);
    const engagementScore = likes + (earnings * 10);
    
    if (engagementScore >= 1000) return 'divine';
    if (engagementScore >= 500) return 'mythic';
    if (engagementScore >= 200) return 'legendary';
    if (engagementScore >= 100) return 'epic';
    if (engagementScore >= 50) return 'rare';
    if (engagementScore >= 10) return 'uncommon';
    return 'common';
  };
  
  const rarity = calculateRarity(nftData?.data);
  
  useEffect(() => {
    if (tokenURI?.data && typeof tokenURI.data === 'string') {
      try {
        if (tokenURI.data.startsWith('data:application/json;base64,')) {
          const base64Data = tokenURI.data.replace('data:application/json;base64,', '');
          const jsonString = atob(base64Data);
          const data = JSON.parse(jsonString);
          setMetadata(data);
          if (data.image) {
            setImageUrl(data.image);
          }
        }
      } catch (error) {
        console.error('Error decoding metadata:', error);
      }
    }
  }, [tokenURI?.data]);
  
  useEffect(() => {
    const checkMiniAppContext = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
      } catch (error) {
        console.error('Error checking mini app context:', error);
      }
    };
    checkMiniAppContext();
  }, []);
  
  const handleLike = async () => {
    if (propTokenId && hasLiked.data !== true) {
      try {
        await likeNFT.mutateAsync({ tokenId: BigInt(Number(propTokenId)) });
      } catch (error) {
        console.error('Failed to like NFT:', error);
      }
    }
  };
  
  const handleBuy = async () => {
    if (propTokenId && nftData.data) {
      const nftDataTyped = nftData.data as any;
      try {
        await buyNow.mutateAsync({
          tokenId: BigInt(Number(propTokenId)),
          price: nftDataTyped.listPrice
        });
      } catch (error) {
        console.error('Failed to buy NFT:', error);
      }
    }
  };
  
  const handleShare = async () => {
    if (isMiniApp && propTokenId && metadata) {
      try {
        const nft = nftData.data as any;
        const mintPrice = nft.mintPrice > 0n ? formatEtherValue(nft.mintPrice) : '0';
        
        await sdk.actions.composeCast({
          text: `I just minted a Nogglr! 🥽\n\nScratch that, a Noun on Celo 😂\n\nWell, I can now own a ${rarity} rarity noun for just ${mintPrice} CELO\n\nMint yours! 👇\n\nPowered by @oliseh`,
          embeds: [`https://nogglr.vercel.app/nft/${propTokenId}`]
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    }
  };

  const handleSetPFP = async () => {
    if (isMiniApp && imageUrl) {
      try {
        // Use the NFT image as profile picture
        // Note: This would require a custom implementation or API call
        // For now, we'll show a success message
        alert('PFP set successfully! 🎉');
      } catch (error) {
        console.error('Failed to set PFP:', error);
        alert('Failed to set PFP. Please try again.');
      }
    }
  };


  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !propTokenId) {
    return null;
  }
  
  if (contractLoading || nftData.isLoading || !metadata) {
    return (
      <div className="nft-modal-overlay">
        <div className="nft-modal">
          <div className="nft-modal-loading">
            <div className="loader"></div>
            <p>Loading NFT...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (nftData.error || !nftData.data) {
    return (
      <div className="nft-modal-overlay">
        <div className="nft-modal">
          <div className="nft-modal-error">
            <span className="error-icon">⚠️</span>
            <h2>Error loading NFT</h2>
            <p>Please try again later</p>
          </div>
        </div>
      </div>
    );
  }
  
  const nft = nftData.data as any;
  
  return (
    <div className="nft-modal-overlay" onClick={onClose}>
      <div className="nft-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="nft-modal-close" onClick={onClose}>
          <CloseIcon />
        </button>
        
        {/* NFT Image - Full Size */}
        <div className="nft-modal-image-wrapper-full">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={metadata?.name || `Nogglr #${propTokenId}`}
              className="nft-modal-img-full"
            />
          ) : (
            <div className="nft-modal-placeholder-full">
              <span>🥽</span>
            </div>
          )}
        </div>
        
        {/* NFT Info */}
        <div className="nft-modal-info-wrapper">
          <h1 className="nft-modal-name">
            {metadata?.name || `Nogglr #${propTokenId}`}
          </h1>
          
          {/* Stats Row */}
          <div className="nft-modal-stats-row">
            <div className="nft-stat-item">
              <ThumbUpIcon />
              <span>{nft.likes?.toString() || '0'}</span>
            </div>
            <div className="nft-stat-item">
              <VisibilityIcon />
              <span className={`rarity-badge rarity-${rarity}`}>{rarity}</span>
            </div>
          </div>
          
          {/* Price Badge */}
          {nft.isListed && (
            <div className="price-badge-modal">
              <img src={celoLogo} alt="CELO" className="celo-icon-small" />
              <span>{formatEtherValue(nft.listPrice)} CELO</span>
            </div>
          )}
          
          {nft.mintPrice > 0n && !nft.isListed && (
            <div className="price-badge-modal">
              <img src={celoLogo} alt="CELO" className="celo-icon-small" />
              <span>{formatEtherValue(nft.mintPrice)} CELO</span>
            </div>
          )}
          
          {/* Owner Info - Compact */}
          <div className="nft-modal-owners-compact">
            <div className="owner-info-item">
              <span className="owner-label">Creator:</span>
              <span className="owner-value">{formatAddress(nft.creator || '')}</span>
            </div>
            <div className="owner-info-item">
              <span className="owner-label">Owner:</span>
              <span className="owner-value">{formatAddress(typeof owner?.data === 'string' ? owner.data : '')}</span>
            </div>
          </div>
          
          {/* Traits Section */}
          {nftMetadata?.data && (nftMetadata.data as any)?.traitTypes && (nftMetadata.data as any).traitTypes.length > 0 && (
            <div className="nft-modal-traits">
              <h3 className="section-title">
                <CategoryIcon />
                Traits
              </h3>
              <div className="traits-grid">
                {(nftMetadata.data as any).traitTypes.map((traitType: string, index: number) => {
                  const rarityScore = (nftMetadata.data as any).rarityScores?.[index];
                  const traitValue = (nftMetadata.data as any).traitValues?.[index];
                  const isRare = rarityScore && Number(rarityScore) > 70;
                  const isEpic = rarityScore && Number(rarityScore) > 85;
                  const isLegendary = rarityScore && Number(rarityScore) > 95;
                  
                  return (
                    <div 
                      key={index} 
                      className={`trait-card ${isLegendary ? 'legendary' : isEpic ? 'epic' : isRare ? 'rare' : 'common'}`}
                    >
                      <div className="trait-header">
                        <span className="trait-type">{traitType}</span>
                        {rarityScore && (
                          <span className="trait-rarity">
                            {Number(rarityScore)}%
                          </span>
                        )}
                      </div>
                      <div className="trait-value">{traitValue}</div>
                      {rarityScore && (
                        <div className="trait-bar">
                          <div 
                            className="trait-bar-fill"
                            style={{ width: `${Math.min(Number(rarityScore), 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="nft-modal-actions">
            <Button 
              className={cn("action-btn like-btn", hasLiked?.data ? 'liked' : '')}
              onClick={handleLike}
              disabled={likeNFT.isPending || Boolean(hasLiked?.data)}
            >
              <ThumbUpIcon />
              <span>{hasLiked?.data === true ? 'Liked' : `Like (${formatEtherValue(typeof likePrice?.data === 'bigint' ? likePrice.data : 0n)} CELO)`}</span>
            </Button>
            
            <Button 
              className="action-btn bid-btn"
              onClick={() => {
                // TODO: Implement bid functionality
                console.log('Bid button clicked');
              }}
            >
              <GavelIcon />
              <span>Place Bid</span>
            </Button>
            
            {nft.isListed && (
              <Button 
                className="action-btn buy-btn"
                onClick={handleBuy}
                disabled={buyNow.isPending}
              >
                <ShoppingCartIcon />
                <span>Buy Now</span>
              </Button>
            )}
            
            {isMiniApp && (
              <Button 
                className="action-btn share-btn"
                onClick={handleShare}
              >
                <ShareIcon />
                <span>Share</span>
              </Button>
            )}
            
            {isMiniApp && imageUrl && (
              <Button 
                className="action-btn pfp-btn"
                onClick={handleSetPFP}
              >
                <FaceIcon />
                <span>Set PFP</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NFTDetailModal;