import { useState, useEffect } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from 'wagmi';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConnectMenu } from './components/ConnectMenu';
import { MarketplaceTab } from './components/MarketplaceTab';
import { ProfileTab } from './components/ProfileTab';
import LeaderboardTab from './components/LeaderboardTab';
import { MintTab } from './components/MintTab';
import { LogoWithText } from './components/Logo';
import { NFTPage } from './components/NFTPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { BottomNav } from './components/BottomNav';
import { 
  Home as HomeIcon, 
  AutoAwesome as AutoAwesomeIcon,
  Leaderboard as LeaderboardIcon,
  Person as PersonIcon
} from '@mui/icons-material';

function App() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  if (!isClient) return null;
  return (
    <Router>
      <Routes>
        <Route path="/nft/:tokenId" element={<NFTPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/" element={<MainApp />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </Router>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'mint' | 'profile' | 'leaderboard'>('home');
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  
  const handleTabChange = (newTab: 'home' | 'mint' | 'profile' | 'leaderboard') => {
    setActiveTab(newTab);
  };
  
  // Wagmi hooks for wallet connection
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  
  useEffect(() => {
    // Check if we're in a mini app context
    const checkMiniAppContext = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
        
        if (inMiniApp) {
          // Get user context from Farcaster
          const context = await sdk.context;
          setUserContext(context);
          console.log('Mini app context:', context);
          
          // Auto-connect wallet in mini app context
          if (!isConnected && connectors.length > 0) {
            console.log('Auto-connecting wallet in mini app context...');
            try {
              await connect({ connector: connectors[0] });
            } catch (error) {
              console.error('Failed to auto-connect wallet:', error);
            }
          }
        }
        
        // SDK ready is handled in main.tsx
      } catch (error) {
        console.error('Error checking mini app context:', error);
      }
    };
    
    checkMiniAppContext();
  }, [isConnected, connect, connectors]);

  return (
    <div className={`app ${isMiniApp ? 'mini-app' : ''}`}>
      <div className="container">
        {/* {!isMiniApp && <Header isMiniApp={isMiniApp} userContext={userContext} />} */}
        
        {/* Desktop Navigation with Logo - Hidden */}
        <div className="desktop-nav" style={{ display: 'none' }}>
          <div className="desktop-logo">
            <div className="logo-icon">🥽</div>
            <div className="logo-text">Nogglr</div>
          </div>
          <div className="desktop-nav-items">
            <div 
              className={`desktop-nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => handleTabChange('home')}
            >
              <HomeIcon className="nav-icon" />
              <span>Home</span>
            </div>
            <div 
              className={`desktop-nav-item ${activeTab === 'mint' ? 'active' : ''}`}
              onClick={() => handleTabChange('mint')}
            >
              <AutoAwesomeIcon className="nav-icon" />
              <span>Mint</span>
            </div>
            <div 
              className={`desktop-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => handleTabChange('leaderboard')}
            >
              <LeaderboardIcon className="nav-icon" />
              <span>Ranks</span>
            </div>
            <div 
              className={`desktop-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
            >
              <PersonIcon className="nav-icon" />
              <span>Profile</span>
            </div>
          </div>
          <div className="desktop-connect-section">
            {isConnected ? (
              <div className="connected-info-header">
                <div className="connected-label">Connected</div>
                <div className="address">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
              </div>
            ) : (
              <ConnectMenu />
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'home' && (
          <MarketplaceTab 
            onMintClick={() => handleTabChange('mint')}
            isConnected={isConnected}
            address={address}
            connect={connect}
            connectors={connectors}
            isMiniApp={isMiniApp}
            userPfpUrl={userContext?.user?.pfpUrl}
            userName={userContext?.user?.displayName || userContext?.user?.username}
          />
        )}
        {activeTab === 'mint' && <MintTab onMintSuccess={() => handleTabChange('profile')} isMiniApp={isMiniApp} />}
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'leaderboard' && <LeaderboardTab />}
        
        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  );
}

function Header({ isMiniApp, userContext }: { isMiniApp: boolean; userContext: any }) {
  return (
    <header className="header">
      <div className="logo">
        <LogoWithText textColor="#333" showText={false} />
      </div>
      {isMiniApp && userContext ? (
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
      ) : (
        <ConnectMenu />
      )}
    </header>
  );
}

export default App;
