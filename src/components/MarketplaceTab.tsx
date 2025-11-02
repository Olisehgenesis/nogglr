import { useState, useEffect } from 'react';
import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
import { NFTCardV3 } from './NFTCardV3';
import { Button } from '@/components/ui/button';
import { Close as CloseIcon } from '@mui/icons-material';

interface MarketplaceTabProps {
  onMintClick?: () => void;
  onNFTClick?: (tokenId: string) => void;
}

export function MarketplaceTab({ onMintClick, onNFTClick }: MarketplaceTabProps) {
  const { useTotalSupply } = useNogglrv3BETA();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    traits: [] as string[],
    sortBy: 'newest'
  });

  // Get total supply to know how many NFTs exist
  const totalSupplyQuery = useTotalSupply();
  const totalSupply = totalSupplyQuery.data ? Number(totalSupplyQuery.data) : 0;

  // Set loading state based on total supply query
  useEffect(() => {
    if (totalSupplyQuery.isLoading) {
      setLoading(true);
    } else if (totalSupplyQuery.error) {
      setError('Failed to load NFT count');
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [totalSupplyQuery.isLoading, totalSupplyQuery.error]);

  if (loading) {
    return (
      <div className="marketplace-tab">
        <div className="loading">
          <div className="loader"></div>
          <p>Loading marketplace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-tab">
        <div className="error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-tab">
      <div className="marketplace-header">
      </div>

      <div className="nft-grid">
        {totalSupply === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🥽</div>
            <h3>No NFTs yet</h3>
            <p>Be the first to mint a Nogglr NFT!</p>
            {onMintClick && (
              <Button type="button" className="mint-first-button" onClick={onMintClick}>
                Mint Your First NFT
              </Button>
            )}
          </div>
        ) : (
          Array.from({ length: totalSupply }, (_, i) => i + 1).map((tokenId) => (
            <NFTCardV3 key={tokenId} tokenId={tokenId} onNFTClick={onNFTClick} />
          ))
        )}
      </div>
      
      {/* Floating Mint Button */}
      {onMintClick && (
        <Button 
          type="button"
          className="floating-mint-button"
          onClick={onMintClick}
          title="Mint Your Own NFT"
        >
          <span className="mint-icon">🥽</span>
          <span className="mint-text">Mint</span>
        </Button>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Filter NFTs</h3>
              <Button 
                className="close-modal-button"
                onClick={() => setShowFilterModal(false)}
                variant="ghost"
                size="icon"
              >
                <CloseIcon />
              </Button>
            </div>
            
            <div className="filter-sections">
              {/* Price Filter */}
              <div className="filter-section">
                <h4>Price Range</h4>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filters.minPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                    className="price-input"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                    className="price-input"
                  />
                </div>
              </div>

              {/* Traits Filter */}
              <div className="filter-section">
                <h4>Traits</h4>
                <div className="trait-checkboxes">
                  {['Background', 'Body', 'Accessory', 'Head', 'Glasses'].map(trait => (
                    <label key={trait} className="trait-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.traits.includes(trait)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, traits: [...prev.traits, trait] }));
                          } else {
                            setFilters(prev => ({ ...prev, traits: prev.traits.filter(t => t !== trait) }));
                          }
                        }}
                      />
                      <span>{trait}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort Filter */}
              <div className="filter-section">
                <h4>Sort By</h4>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="sort-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            <div className="filter-modal-actions">
              <Button 
                className="clear-filters-button"
                onClick={() => setFilters({ minPrice: '', maxPrice: '', traits: [], sortBy: 'newest' })}
                variant="outline"
              >
                Clear All
              </Button>
              <Button 
                className="apply-filters-button"
                onClick={() => setShowFilterModal(false)}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}