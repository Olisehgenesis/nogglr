import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
// Use public path for CELO logo
const celoLogo = '/celo-celo-logo.svg';
import { Button } from '@/components/ui/button';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  ThumbUp as ThumbUpIcon,
  Visibility as VisibilityIcon,
  Share as ShareIcon,
  Description as DescriptionIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';

export function NFTPage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { useNFTData, useTokenURI, formatEtherValue } = useNogglrv3BETA();
  
  const resolvedTokenIdNumber = (() => {
    const raw = tokenId || '';
    if (raw.toLowerCase() === 'random') {
      const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      return (day % 10) + 1; // 1..10
    }
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  
  const nftData = useNFTData(BigInt(resolvedTokenIdNumber));
  const tokenURI = useTokenURI(BigInt(resolvedTokenIdNumber));

  const [metadata, setMetadata] = useState<any>(null);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Decode tokenURI to get metadata
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

  // Calculate rarity
  const calculateRarity = (data: any): string => {
    if (!data) return 'common';
    const likes = Number(data.likes || 0);
    const earnings = Number(data.totalEarnings || 0);
    const engagementScore = likes + earnings * 10;

    if (engagementScore >= 1000) return 'divine';
    if (engagementScore >= 500) return 'mythic';
    if (engagementScore >= 200) return 'legendary';
    if (engagementScore >= 100) return 'epic';
    if (engagementScore >= 50) return 'rare';
    if (engagementScore >= 10) return 'uncommon';
    return 'common';
  };

  const rarity = calculateRarity(nftData?.data);
  const nft = nftData?.data as any;

  // Update document title and meta tags for OG
  useEffect(() => {
    if (metadata && tokenId) {
      document.title = `${metadata.name || `Nogglr #${tokenId}`} - Nogglr NFT`;

      // Update meta tags for OG
      const updateMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      updateMetaTag('og:title', metadata.name || `Nogglr #${tokenId}`);
      updateMetaTag(
        'og:description',
        `A ${rarity} rarity Nogglr NFT on Celo. ${metadata.description || 'Unique digital collectible.'}`
      );
      // Prefer server-rendered OG image endpoint and pass the NFT image for accurate previews
      const base = window.location.origin || 'https://nogglr.vercel.app';
      const ogUrl = `${base}/api/og/nft/${tokenId}?image=${encodeURIComponent(imageUrl || '')}`;
      updateMetaTag('og:image', ogUrl);
      updateMetaTag('og:image:width', '1200');
      updateMetaTag('og:image:height', '630');
      updateMetaTag('og:url', `https://nogglr.vercel.app/nft/${tokenId}`);
      updateMetaTag('og:type', 'website');

      // Twitter Card meta tags
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', metadata.name || `Nogglr #${tokenId}`);
      updateMetaTag(
        'twitter:description',
        `A ${rarity} rarity Nogglr NFT on Celo. ${metadata.description || 'Unique digital collectible.'}`
      );
      updateMetaTag('twitter:image', ogUrl);
    }
  }, [metadata, tokenId, imageUrl, rarity]);

  if (!tokenId) {
    return (
      <div className="nft-detail-page">
        <div className="nft-detail-error">
          <div className="error-icon">⚠️</div>
          <h2>Invalid NFT ID</h2>
          <p>Please provide a valid NFT token ID.</p>
          <Link to="/" className="nft-back-btn">
            <ArrowBackIcon />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    );
  }

  if (nftData.isLoading || !metadata) {
    return (
      <div className="nft-detail-page">
        <div className="nft-detail-loading">
          <div className="loader"></div>
          <p>Loading NFT details...</p>
        </div>
      </div>
    );
  }

  if (nftData.error || !nftData.data) {
    return (
      <div className="nft-detail-page">
        <div className="nft-detail-error">
          <div className="error-icon">🥽</div>
          <h2>Not Yet Minted</h2>
          <p>This NFT hasn't been minted yet, but you could be the first to create it!</p>
          <div className="nft-error-actions">
            <Link to="/" className="nft-back-btn primary">
              <HomeIcon />
              <span>Go to Home</span>
            </Link>
            <Link to="/marketplace" className="nft-back-btn secondary">
              <StoreIcon />
              <span>Browse NFTs</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nft-detail-page">
      <div className="nft-detail-wrapper">
        {/* Back Button */}
        <Link to="/" className="nft-back-btn">
          <ArrowBackIcon />
          <span>Back to Home</span>
        </Link>

        {/* Main Content */}
        <div className="nft-detail-content">
          {/* Large NFT Image */}
          <div className="nft-detail-image-section">
            <div className="nft-detail-image-wrapper">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={metadata?.name || `Nogglr #${tokenId}`}
                  className="nft-detail-img"
                />
              ) : (
                <div className="nft-detail-placeholder">
                  <span>🥽</span>
                </div>
              )}
            </div>
          </div>

          {/* NFT Information */}
          <div className="nft-detail-info-section">
            {/* Header */}
            <div className="nft-detail-header">
              <h1 className="nft-detail-name">
                {metadata?.name || `Nogglr #${tokenId}`}
              </h1>
              <div className="nft-detail-rarity">
                <span className={`rarity-badge rarity-${rarity}`}>{rarity}</span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="nft-detail-stats-row">
              <div className="nft-stat-item">
                <ThumbUpIcon />
                <span>{nft.likes?.toString() || '0'}</span>
              </div>
              <div className="nft-stat-item">
                <VisibilityIcon />
                <span>{nft.views?.toString() || '0'}</span>
              </div>
              <div className="nft-stat-item">
                <ShareIcon />
                <span>{nft.shares?.toString() || '0'}</span>
              </div>
            </div>

            {/* Price Section */}
            <div className="nft-detail-price">
              <span className="price-label">Current Price:</span>
              <span className="price-amount">
                <img src={celoLogo} alt="CELO" className="celo-icon-large" />
                <span>
                  {nft.isListed && nft.listPrice > 0n
                    ? formatEtherValue(nft.listPrice)
                    : nft.mintPrice > 0n
                    ? formatEtherValue(nft.mintPrice)
                    : 'Not for sale'}
                </span>
              </span>
            </div>

            {/* Owner Information */}
            <div className="nft-detail-owners">
              <div className="owner-row">
                <span className="owner-label">Creator:</span>
                <span className="owner-value">{formatAddress(nft.creator || '')}</span>
              </div>
              <div className="owner-row">
                <span className="owner-label">Owner:</span>
                <span className="owner-value">{formatAddress(nft.owner || '')}</span>
              </div>
            </div>

            {/* Description */}
            {metadata?.description && (
              <div className="nft-detail-description">
                <h3 className="section-title">
                  <DescriptionIcon />
                  Description
                </h3>
                <p>{metadata.description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="nft-detail-actions">
              <Button className="action-btn buy-btn">
                <ShoppingCartIcon />
                <span>Buy Now</span>
              </Button>
              <Button className="action-btn like-btn">
                <ThumbUpIcon />
                <span>Like</span>
              </Button>
              <Button className="action-btn share-btn">
                <ShareIcon />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NFTPage;


