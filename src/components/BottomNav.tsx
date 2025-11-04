import { useState, useRef, useEffect } from 'react';

interface BottomNavProps {
  activeTab: 'home' | 'mint' | 'profile' | 'leaderboard';
  onTabChange: (tab: 'home' | 'mint' | 'profile' | 'leaderboard') => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const activeTabRef = useRef<HTMLDivElement>(null);
  const navGroupRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  // Calculate divider position and width
  useEffect(() => {
    const updateDivider = () => {
      if (activeTabRef.current && navGroupRef.current && dividerRef.current) {
        const navBar = activeTabRef.current.closest('.bottom-nav') as HTMLElement;
        if (navBar) {
          const activeRect = activeTabRef.current.getBoundingClientRect();
          const groupRect = navGroupRef.current.getBoundingClientRect();
          const navRect = navBar.getBoundingClientRect();
          
          const startX = activeRect.right - navRect.left;
          const endX = groupRect.left - navRect.left;
          const width = Math.max(0, endX - startX);
          
          dividerRef.current.style.left = `${startX}px`;
          dividerRef.current.style.width = `${width}px`;
        }
      }
    };
    
    // Delay to ensure elements are rendered
    const timeoutId = setTimeout(updateDivider, 0);
    window.addEventListener('resize', updateDivider);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateDivider);
    };
  }, [activeTab, isAnimating]);

  const handleTabChange = (newTab: 'home' | 'mint' | 'profile' | 'leaderboard', event?: React.MouseEvent) => {
    if (newTab !== activeTab && !isAnimating) {
      // Get click position for ripple effect
      if (event) {
        const clickedItem = event.currentTarget as HTMLElement;
        const navBar = clickedItem.closest('.bottom-nav') as HTMLElement;
        if (navBar && clickedItem) {
          const navRect = navBar.getBoundingClientRect();
          const itemRect = clickedItem.getBoundingClientRect();
          // Center of the clicked tab
          const x = itemRect.left - navRect.left + itemRect.width / 2;
          const y = itemRect.top - navRect.top + itemRect.height / 2;
          setRipplePosition({ x, y });
        }
      }

      setIsAnimating(true);
      onTabChange(newTab);
      
      // Reset animation state
      setTimeout(() => {
        setIsAnimating(false);
        setRipplePosition({ x: 0, y: 0 });
      }, 400);
    }
  };

  const tabs = [
    { id: 'home' as const, icon: 'home_app_logo', label: 'Home' },
    { id: 'mint' as const, icon: 'deployed_code_history', label: 'Mint' },
    { id: 'leaderboard' as const, icon: 'crown', label: 'Ranks' },
    { id: 'profile' as const, icon: 'cognition', label: 'Profile' },
  ];

  // Get active tab index
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  
  // Get all inactive tabs (everything except active)
  const inactiveTabs = tabs.filter(tab => tab.id !== activeTab);
  const activeTabData = tabs[activeIndex];

  return (
    <div 
      className={`bottom-nav ${isAnimating ? 'animating' : ''}`} 
      data-active-tab={activeTab}
    >
      {/* Active bubble indicator at bottom */}
      <div 
        className="nav-active-bubble"
        style={{ left: '0%' }}
      ></div>
      
      {/* Ripple effect */}
      <div 
        className="nav-ripple-effect"
        style={{
          left: ripplePosition.x > 0 ? `${ripplePosition.x}px` : '50%',
          top: ripplePosition.y > 0 ? `${ripplePosition.y}px` : '50%',
        }}
      ></div>
      
      {/* Active tab on the left */}
      {activeTabData && (
        <div
          ref={activeTabRef}
          key={activeTabData.id}
          className={`nav-item active`}
          onClick={(e) => handleTabChange(activeTabData.id, e)}
        >
          <span className="material-symbols-outlined nav-icon">{activeTabData.icon}</span>
          <span className="nav-label">{activeTabData.label}</span>
        </div>
      )}
      
      {/* Horizontal connecting line between selected and unselected */}
      {inactiveTabs.length > 0 && (
        <div ref={dividerRef} className="nav-divider nav-divider-right"></div>
      )}
      
      {/* Grouped inactive tabs on the right */}
      {inactiveTabs.length > 0 && (
        <div ref={navGroupRef} className="nav-group">
          {inactiveTabs.map((tab) => (
            <div
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={(e) => handleTabChange(tab.id, e)}
            >
              <span className="material-symbols-outlined nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

