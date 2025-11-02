import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { resolveFarcasterSelf } from '../utils/farcaster';
import { useAccount } from 'wagmi';

interface LeaderboardUser {
  address: string;
  mintCount: bigint;
  likeCount: bigint;
  earnings: bigint;
  receivedLikes: bigint;
  ownedNFTs: bigint;
  createdNFTs: bigint;
  likedNFTs: bigint;
  level: bigint;
  experience: bigint;
  rank: number;
  totalPoints: number;
  pfpUrl?: string;
  displayName?: string;
  username?: string;
}

function LeaderboardTab() {
  const { address } = useAccount();
  const { 
    useLeaderboard, 
    useUserLeaderboardPosition, 
    useUserRank,
    useUserStats,
    formatEtherValue
  } = useNogglrv3BETA();
  
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('mints');
  const [userNames, setUserNames] = useState<{ [key: string]: { name: string; username?: string; pfpUrl?: string } }>({});
  
  
  // Get leaderboard data using beta hooks
  const leaderboardQuery = useLeaderboard(selectedMetric);
  const userPositionQuery = useUserLeaderboardPosition(selectedMetric, address);
  const userRankQuery = useUserRank(selectedMetric, address);
  const userStatsQuery = useUserStats(address);
  
  const isLoading = leaderboardQuery.isLoading || userPositionQuery.isLoading || userRankQuery.isLoading || userStatsQuery.isLoading;
  const error = leaderboardQuery.error || userPositionQuery.error || userRankQuery.error || userStatsQuery.error;

  // Check Mini App context
  useEffect(() => {
    const checkMiniAppContext = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
        
        if (inMiniApp) {
          const context = await sdk.context;
          setUserContext(context);
          
          // Store current user's name info
          if (context.user && address) {
            setUserNames(prev => ({
              ...prev,
              [address.toLowerCase()]: {
                name: context.user.displayName || context.user.username || `FID ${context.user.fid}`,
                username: context.user.username,
                pfpUrl: context.user.pfpUrl
              }
            }));
          }
        } else if (address) {
          // Try best-effort resolve from SDK self if available
          const self = await resolveFarcasterSelf();
          if (self) {
            setUserNames(prev => ({
              ...prev,
              [address.toLowerCase()]: {
                name: self.name || formatAddress(address),
                username: self.username,
                pfpUrl: self.pfpUrl,
              },
            }));
          }
        }
      } catch (error) {
        console.error('Error checking mini app context:', error);
      }
    };
    
    checkMiniAppContext();
  }, [address]);

  if (isLoading) {
    return (
      <div className="leaderboard-tab">
        <div className="loading">
          <div className="loader"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-tab">
        <div className="error">
          <p>Error loading leaderboard: {error.message}</p>
          <p>This might be because there aren't enough users yet or the contract is still initializing.</p>
          <p>Try refreshing the page or check back later.</p>
        </div>
      </div>
    );
  }


  // Get data with fallbacks
  const leaderboardData = leaderboardQuery.data;
  
  // Transform data for display with better error handling
  const leaderboardUsers: LeaderboardUser[] = [];
  
  if (leaderboardData && Array.isArray(leaderboardData) && leaderboardData.length === 3) {
    try {
      // Contract returns three parallel arrays: [users[], values[], ranks[]]
      const [users, values, ranks] = leaderboardData;
      
      // Ensure all arrays have the same length
      const length = Math.min(users.length, values.length, ranks.length);
      
      for (let i = 0; i < length; i++) {
        const userAddress = users[i];
        const value = BigInt(values[i] || 0);
        const rank = Number(ranks[i] || (i + 1));
        
        // Use placeholder for invalid addresses
        let displayAddress = userAddress;
        if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('0x')) {
          displayAddress = `Unknown User ${i + 1}`;
        }
        
        // Map the value based on the selected metric
        let mintCount = BigInt(0);
        let likeCount = BigInt(0);
        let earnings = BigInt(0);
        
        switch (selectedMetric) {
          case 'mints':
            mintCount = value;
            break;
          case 'earnings':
            earnings = value;
            break;
          case 'points':
            // Points are already calculated
            break;
          default:
            mintCount = value;
        }
        
        // Calculate total points (simplified for now)
        const totalPoints = Number(value);
        
        leaderboardUsers.push({
          address: displayAddress,
          mintCount: mintCount,
          likeCount: likeCount,
          earnings: earnings,
          receivedLikes: BigInt(0),
          ownedNFTs: BigInt(0),
          createdNFTs: mintCount,
          likedNFTs: likeCount,
          level: BigInt(1),
          experience: BigInt(0),
          rank: rank,
          totalPoints: totalPoints
        });
      }
    } catch (err) {
      console.error('Error processing leaderboard data:', err);
    }
  } else {
    // Fallback: Show current user stats if available
    if (userStatsQuery.data && address) {
      const userStats = userStatsQuery.data as any; // Type assertion for now
      const totalPoints = Number(userStats.points || BigInt(0));
      
      leaderboardUsers.push({
        address: address,
        mintCount: userStats.totalMinted || BigInt(0),
        likeCount: userStats.totalLikes || BigInt(0),
        earnings: userStats.totalEarnings || BigInt(0),
        receivedLikes: BigInt(0),
        ownedNFTs: BigInt(0),
        createdNFTs: userStats.totalMinted || BigInt(0),
        likedNFTs: userStats.totalLikes || BigInt(0),
        level: userStats.level || BigInt(1),
        experience: userStats.experience || BigInt(0),
        rank: Number(userRankQuery.data || BigInt(0)) || 1,
        totalPoints: totalPoints
      });
    }
  }

  // Sort by total points
  leaderboardUsers.sort((a, b) => b.totalPoints - a.totalPoints);

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    if (address.startsWith('Unknown User')) return address;
    if (!address.startsWith('0x')) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get user display info (PFP and name)
  const getUserDisplayInfo = (userAddress: string) => {
    if (!userAddress) {
      return {
        pfpUrl: undefined,
        displayName: 'Unknown',
        username: undefined
      };
    }
    
    const lowerAddress = userAddress.toLowerCase();
    
    // Check if we have stored name info for this user
    if (userNames[lowerAddress]) {
      return {
        pfpUrl: userNames[lowerAddress].pfpUrl,
        displayName: userNames[lowerAddress].name,
        username: userNames[lowerAddress].username
      };
    }
    
    // If it's the current user and we're in Mini App, use Farcaster data
    if (isMiniApp && userContext && address && userAddress.startsWith('0x') && lowerAddress === address.toLowerCase()) {
      return {
        pfpUrl: userContext.user.pfpUrl,
        displayName: userContext.user.displayName || userContext.user.username || `FID ${userContext.user.fid}`,
        username: userContext.user.username
      };
    }
    
    // For other users, try to use a more user-friendly display
    // Check if it's a known address with a name
    const knownUsers: { [key: string]: { name: string; username?: string } } = {
      '0x0000000000000000000000000000000000000000': { name: 'Null Address', username: 'null' },
      // Add more known users here if needed
    };
    
    if (knownUsers[lowerAddress]) {
      return {
        pfpUrl: undefined,
        displayName: knownUsers[lowerAddress].name,
        username: knownUsers[lowerAddress].username
      };
    }
    
    // For now, use formatted address but make it more readable
    return {
      pfpUrl: undefined,
      displayName: formatAddress(userAddress),
      username: undefined
    };
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return '#FFB700'; // Yellow
    if (rank <= 10) return '#1E73ED'; // Blue
    return '#000000'; // Black
  };

  return (
    <div className="leaderboard-tab">
      {/* Farcaster User Header */}
      {isMiniApp && userContext && (
        <div className="leaderboard-user-header">
          <div className="user-profile">
            {userContext.user.pfpUrl && (
              <img 
                src={userContext.user.pfpUrl} 
                alt="Profile" 
                className="user-avatar"
              />
            )}
            <div className="user-info">
              <div className="user-name">
                {userContext.user.displayName || userContext.user.username || `FID ${userContext.user.fid}`}
              </div>
              {userContext.user.username && (
                <div className="user-handle">@{userContext.user.username}</div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="leaderboard-header" style={{ paddingTop: isMiniApp && userContext ? '5%' : '10%' }}>
        <h2 className="pixel-font">Leaderboard</h2>
        <div className="metric-selector">
          <label className="pixel-font">Sort by:</label>
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="metric-select pixel-font"
          >
            <option value="mints">NFTs Minted</option>
            <option value="earnings">Total Earnings</option>
            <option value="points">Points</option>
            <option value="sales">Total Sales</option>
            <option value="volume">Sales Volume</option>
          </select>
        </div>
      </div>

      {/* Top Users Leaderboard */}
      <div className="leaderboard-list">
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="col-rank pixel-font">Rank</div>
            <div className="col-user pixel-font">User</div>
            <div className="col-mints pixel-font">Minted</div>
            <div className="col-likes pixel-font">Likes</div>
            <div className="col-earnings pixel-font">Earnings</div>
            <div className="col-points pixel-font">Points</div>
          </div>
          
          {leaderboardUsers.map((user, index) => (
            <div 
              key={user.address || `user-${index}`} 
              className={`table-row ${user.address && address && user.address.startsWith('0x') && user.address.toLowerCase() === address.toLowerCase() ? 'current-user' : ''}`}
            >
              <div className="col-rank">
                <span className="rank-icon" style={{ color: getRankColor(index + 1) }}>
                  {getRankIcon(index + 1)}
                </span>
              </div>
              <div className="col-user">
                <div className="user-info">
                  {(() => {
                    const userInfo = getUserDisplayInfo(user.address);
                    return (
                      <>
                        {userInfo.pfpUrl && (
                          <img 
                            src={userInfo.pfpUrl} 
                            alt="Profile" 
                            className="user-avatar"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              marginRight: '8px'
                            }}
                          />
                        )}
                        <span className="user-address" style={{ fontWeight: userInfo.username ? '600' : '500' }}>
                          {userInfo.displayName}
                        </span>
                        {userInfo.username && (
                          <span className="user-handle" style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                            @{userInfo.username}
                          </span>
                        )}
                        {!userInfo.username && user.address && user.address.startsWith('0x') && (
                          <span className="user-handle" style={{ fontSize: '11px', color: '#999', marginLeft: '4px' }}>
                            {user.address.slice(0, 6)}...{user.address.slice(-4)}
                          </span>
                        )}
                        {user.address && address && user.address.startsWith('0x') && user.address.toLowerCase() === address.toLowerCase() && (
                          <span className="you-badge">You</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="col-mints">
                <span className="stat-number pixel-font">{Number(user.mintCount)}</span>
                <span className="stat-label pixel-font">NFTs</span>
              </div>
              <div className="col-likes">
                <span className="stat-number pixel-font">{Number(user.likeCount)}</span>
                <span className="stat-label pixel-font">likes</span>
              </div>
              <div className="col-earnings">
                <span className="stat-number pixel-font">{formatEtherValue(user.earnings)}</span>
                <span className="stat-label pixel-font">CELO</span>
              </div>
              <div className="col-points">
                <span className="points-value pixel-font">{user.totalPoints.toFixed(0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default LeaderboardTab;
