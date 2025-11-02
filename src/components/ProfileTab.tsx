
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
import { NFTCardV3 } from './NFTCardV3';
import { sdk } from "@farcaster/miniapp-sdk";
import { IconLogo } from './Logo';
const celoLogo = '/celo-celo-logo.svg';

// Icon component for Material Symbols
const Icon = ({ children, className }: { children: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className || ''}`}>{children}</span>
);

interface ProfileTabProps {
  onNFTClick?: (tokenId: string) => void;
}

export function ProfileTab({ onNFTClick }: ProfileTabProps) {
  const { address } = useAccount();
  const { useUserNFTs, useUserStats, formatEtherValue } = useNogglrv3BETA();
  
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  
  const userNFTs = useUserNFTs(address);
  const userStats = useUserStats(address);
  
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

  // Format wallet address for display
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (isMiniApp && userContext && userContext.user) {
      return {
        name: userContext.user.displayName || userContext.user.username || `FID ${userContext.user.fid}`,
        username: userContext.user.username,
        pfpUrl: userContext.user.pfpUrl
      };
    }
    return {
      name: formatAddress(address || ''),
      username: undefined,
      pfpUrl: undefined
    };
  };

  const userInfo = getUserDisplayInfo();
  
  if (!address) {
    return (
      <div className="profile-tab">
        <div className="profile-empty">
          <Icon className="empty-icon">account_circle</Icon>
          <h2>Connect Wallet</h2>
          <p>Connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="profile-tab">
      {/* Profile Header - 4 Column Layout */}
      <div className="profile-header-card">
        {/* Column 1: Wallet and Icon */}
        <div className="profile-column-1">
          <div className="profile-avatar-small">
            {userInfo.pfpUrl ? (
              <img src={userInfo.pfpUrl} alt="Profile" className="profile-pfp" />
            ) : (
              <Icon>person</Icon>
            )}
          </div>
          <div className="profile-wallet-info">
            <h3 className="profile-name">{userInfo.name}</h3>
            {userInfo.username && (
              <span className="profile-username">@{userInfo.username}</span>
            )}
            <span className="profile-address">{formatAddress(address)}</span>
          </div>
        </div>

        {/* Column 2: Created Stats */}
        <div className="profile-column-2">
          <div className="profile-stat-item">
            <div className="stat-icon">
              <IconLogo />
            </div>
            <div className="stat-content">
              <span className="stat-number">{(userStats?.data as any)?.totalMinted?.toString() || '0'}</span>
              <span className="stat-label">Created</span>
            </div>
          </div>
        </div>

        {/* Column 3: Likes Stats */}
        <div className="profile-column-3">
          <div className="profile-stat-item">
            <Icon className="stat-icon">thumb_up</Icon>
            <div className="stat-content">
              <span className="stat-number">{(userStats?.data as any)?.totalLikes?.toString() || '0'}</span>
              <span className="stat-label">Likes</span>
            </div>
          </div>
        </div>

        {/* Column 4: Earnings Stats */}
        <div className="profile-column-4">
          <div className="profile-stat-item">
            <div className="stat-icon">
              <img src={celoLogo} alt="CELO" className="celo-icon-small" />
            </div>
            <div className="stat-content">
              <span className="stat-number">{formatEtherValue((userStats?.data as any)?.totalEarnings || 0n)}</span>
              <span className="stat-label">CELO Earned</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* NFTs Grid */}
      <div className="profile-nfts">
        <div className="profile-nfts-header">
          <h3>Your Nogglrs</h3>
          <span className="nft-count-badge">{(userNFTs?.data as any)?.length || 0}</span>
        </div>
        
        {userNFTs?.isLoading ? (
          <div className="profile-loading">
            <div className="loader"></div>
            <p>Loading your NFTs...</p>
          </div>
        ) : userNFTs?.data && (userNFTs.data as any).length > 0 ? (
          <div className="nft-grid">
            {(userNFTs.data as any).map((tokenId: bigint) => (
              <NFTCardV3 
                key={tokenId.toString()} 
                tokenId={Number(tokenId)} 
                onNFTClick={onNFTClick}
              />
            ))}
          </div>
        ) : (
          <div className="profile-empty-nfts">
            <Icon className="empty-icon">add_photo_alternate</Icon>
            <h3>No NFTs Yet</h3>
            <p>Create your first Nogglr to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}