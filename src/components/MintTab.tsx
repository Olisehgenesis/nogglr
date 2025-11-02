import { useState, useEffect } from 'react';
import { sdk } from "@farcaster/miniapp-sdk";
import { 
  ImageData, 
  getNounData
} from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';
import { parseEther, formatEther } from 'viem';
import { useNogglrv3BETA } from '../hooks/useNogglrBeta';
import { Button } from '@/components/ui/button';

// Types for Nouns traits using real assets
interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

interface NounTraitCategory {
  name: keyof NounSeed;
  traits: Array<{
    id: number;
    filename: string;
    data: string;
    rarity?: string;
  }>;
  count: number;
}

// Minimal fallbacks to avoid missing custom asset loader
const getCustomAssets = () => ({
  backgrounds: [] as Array<{ id?: number; filename?: string; data?: string; rarity?: string }>
});

const convertCustomAssetToTrait = (
  asset: { id?: number; filename?: string; data?: string; rarity?: string },
  _defaultId: number
) => ({
  id: _defaultId,
  filename: asset?.filename || 'custom-background.svg',
  data: `custom:${asset?.filename || 'custom-background.svg'}`,
  rarity: asset?.rarity || 'rare'
});

// Calculate dynamic mint price based on trait rarity levels
const calculateMintPrice = (selectedTraits: Record<string, number>, traitCategories: NounTraitCategory[], basePrice: bigint): bigint => {
  let rarityIncrement = 0;
  
  // Define rarity levels and their price increments
  const rarityLevels = {
    'common': 0,
    'uncommon': 1,
    'rare': 2,
    'epic': 3,
    'legendary': 4,
    'mythic': 5,
    'divine': 6
  };
  
  // Count rarity levels for each trait
  traitCategories.forEach(category => {
    const selectedTraitIndex = selectedTraits[category.name];
    if (selectedTraitIndex !== undefined && category.traits[selectedTraitIndex]) {
      const trait = category.traits[selectedTraitIndex];
      
      // Check both rarity field and filename for rarity indicators
      let rarityLevel = 'common';
      
      if (trait.rarity) {
        rarityLevel = trait.rarity.toLowerCase();
      } else if (trait.filename) {
        const filename = trait.filename.toLowerCase();
        if (filename.includes('epic') || filename.includes('legendary') || filename.includes('mythic') || filename.includes('divine')) {
          rarityLevel = 'epic';
        } else if (filename.includes('rare') || filename.includes('txt-lmao') || filename.includes('steak') || filename.includes('arbitrum')) {
          rarityLevel = 'rare';
        } else if (filename.includes('uncommon') || filename.includes('square-frog')) {
          rarityLevel = 'uncommon';
        }
      }
      
      if (trait.rarity) {
        const explicitRarity = trait.rarity.toLowerCase();
        if (explicitRarity === 'epic' || explicitRarity === 'legendary' || explicitRarity === 'mythic' || explicitRarity === 'divine') {
          rarityLevel = 'epic';
        } else if (explicitRarity === 'rare') {
          rarityLevel = 'rare';
        } else if (explicitRarity === 'uncommon') {
          rarityLevel = 'uncommon';
        }
      }
      
      const increment = rarityLevels[rarityLevel as keyof typeof rarityLevels] || 0;
      rarityIncrement += increment;
    }
  });
  
  // Base price + 0.1 CELO per rarity level
  const totalIncrement = BigInt(rarityIncrement) * parseEther('0.1');
  const finalPrice = basePrice + totalIncrement;
  
  return finalPrice >= basePrice ? finalPrice : basePrice;
};

interface MintTabProps {
  onMintSuccess?: () => void;
  isMiniApp?: boolean;
}

export function MintTab({ onMintSuccess, isMiniApp = false }: MintTabProps) {
  const [traitCategories, setTraitCategories] = useState<NounTraitCategory[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<NounSeed>({
    background: 0,
    body: 0,
    accessory: 0,
    head: 0,
    glasses: 0,
  });
  const [generatedSVG, setGeneratedSVG] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [mintStatus, setMintStatus] = useState<string>('');
  
  // Hooks for minting - using beta with on-chain SVG storage
  const { mintNFT, useMintPrice, formatEtherValue, isLoading: contractLoading, calculateMintPrice: calculatePrice } = useNogglrv3BETA();
  
  // Get mint price
  const mintPrice = useMintPrice();
  
  // Calculate dynamic price based on current traits
  const currentMintPrice = mintPrice?.data && typeof mintPrice.data === 'bigint' && mintPrice.data > 0n 
    ? calculateMintPrice(selectedTraits as any, traitCategories, mintPrice.data) 
    : parseEther('1.0');

  // Load real Nouns assets on component mount
  useEffect(() => {
    loadNounsAssets();
  }, []);

  const loadNounsAssets = async () => {
    try {
      setIsLoading(true);
      
      // Get real Nouns image data
      const { bgcolors, images } = ImageData;
      const { bodies, accessories, heads, glasses } = images;

      // Load custom assets
      const customAssetsData = getCustomAssets();
      const customBackgrounds = customAssetsData.backgrounds.map(asset => 
        convertCustomAssetToTrait(asset, 1000)
      );

      // Create trait categories from real Nouns assets + custom assets
      const categories: NounTraitCategory[] = [
        {
          name: 'head',
          traits: heads.map((head, index) => ({
            id: index,
            filename: head.filename,
            data: head.data,
            rarity: index < 5 ? 'common' : index < 15 ? 'uncommon' : index < 30 ? 'rare' : 'epic'
          })),
          count: heads.length
        },
        {
          name: 'glasses',
          traits: glasses.map((glass, index) => ({
            id: index,
            filename: glass.filename,
            data: glass.data,
            rarity: index < 3 ? 'common' : index < 8 ? 'uncommon' : index < 15 ? 'rare' : 'epic'
          })),
          count: glasses.length
        },
        {
          name: 'body',
          traits: bodies.map((body, index) => ({
            id: index,
            filename: body.filename,
            data: body.data,
            rarity: index < 5 ? 'common' : index < 15 ? 'uncommon' : index < 30 ? 'rare' : 'epic'
          })),
          count: bodies.length
        },
        {
          name: 'accessory',
          traits: accessories.map((accessory, index) => ({
            id: index,
            filename: accessory.filename,
            data: accessory.data,
            rarity: index < 3 ? 'common' : index < 8 ? 'uncommon' : index < 15 ? 'rare' : 'epic'
          })),
          count: accessories.length
        },
        {
          name: 'background',
          traits: [
            ...bgcolors.map((color, index) => ({
              id: index,
              filename: `background-${color}`,
              data: color,
              rarity: 'common'
            })),
            ...customBackgrounds
          ],
          count: bgcolors.length + customBackgrounds.length
        }
      ];

      setTraitCategories(categories);
      
      // Generate random initial traits for variety
      const randomTraits: NounSeed = {
        background: Math.floor(Math.random() * (categories.find(c => c.name === 'background')?.count || 1)),
        body: Math.floor(Math.random() * (categories.find(c => c.name === 'body')?.count || 1)),
        accessory: Math.floor(Math.random() * (categories.find(c => c.name === 'accessory')?.count || 1)),
        head: Math.floor(Math.random() * (categories.find(c => c.name === 'head')?.count || 1)),
        glasses: Math.floor(Math.random() * (categories.find(c => c.name === 'glasses')?.count || 1))
      };
      
      setSelectedTraits(randomTraits);
      
      // Generate initial Noun using random traits
      await generateNounFromAssets(randomTraits);
      
    } catch (error) {
      console.error('Error loading Nouns assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNounFromAssets = async (seed: NounSeed) => {
    try {
      // Check if any custom assets are selected
      const hasCustomAssets = traitCategories.some(category => {
        const currentTrait = category.traits[seed[category.name]];
        return currentTrait?.data?.startsWith('custom:');
      });

      if (hasCustomAssets) {
        await generateCustomSVG(seed);
      } else {
        const { parts, background } = getNounData(seed);
        const svgString = buildSVG(parts, ImageData.palette, background);
        const svgBase64 = btoa(svgString);
        setGeneratedSVG(svgBase64);
      }
    } catch (error) {
      console.error('Error generating Noun SVG:', error);
    }
  };

  const generateCustomSVG = async (seed: NounSeed) => {
    try {
      const backgroundCategory = traitCategories.find(c => c.name === 'background');
      const backgroundTrait = backgroundCategory?.traits[seed.background];
      const hasCustomBackground = backgroundTrait?.data?.startsWith('custom:');
      
      const nounsSeed = {
        background: hasCustomBackground ? 0 : Math.min(Math.max(seed.background, 0), ImageData.bgcolors.length - 1),
        body: Math.min(Math.max(seed.body, 0), ImageData.images.bodies.length - 1),
        accessory: Math.min(Math.max(seed.accessory, 0), ImageData.images.accessories.length - 1),
        head: Math.min(Math.max(seed.head, 0), ImageData.images.heads.length - 1),
        glasses: Math.min(Math.max(seed.glasses, 0), ImageData.images.glasses.length - 1),
      };
      
      const { parts, background } = getNounData(nounsSeed);
      const baseNounSVG = buildSVG(parts, ImageData.palette, background);
      
      if (!baseNounSVG || typeof baseNounSVG !== 'string') {
        throw new Error('Invalid SVG data');
      }
      
      let modifiedSVG = baseNounSVG;
      
      if (hasCustomBackground && backgroundTrait) {
        const svgPath = backgroundTrait.data.replace('custom:', '');
        try {
          const response = await fetch(`/src/assets/custom/${svgPath}`);
          if (response.ok) {
            const customSvg = await response.text();
            const bgMatch = customSvg.match(/<svg[^>]*>(.*)<\/svg>/s);
            if (bgMatch) {
              const backgroundRectRegex = /<rect[^>]*fill="#[^"]*"[^>]*\/>/;
              const customBackground = `<g transform="scale(10)">${bgMatch[1]}</g>`;
              modifiedSVG = modifiedSVG.replace(backgroundRectRegex, customBackground);
            }
          }
        } catch (error) {
          console.error('Error loading custom background:', error);
        }
      }
      
      const svgBase64 = btoa(modifiedSVG);
      setGeneratedSVG(svgBase64);
      
    } catch (error) {
      console.error('Error generating custom SVG:', error);
      try {
        const safeSeed = {
          background: 0,
          body: 0,
          accessory: 0,
          head: 0,
          glasses: 0,
        };
        const { parts, background } = getNounData(safeSeed);
        const svgString = buildSVG(parts, ImageData.palette, background);
        const svgBase64 = btoa(svgString);
        setGeneratedSVG(svgBase64);
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
      }
    }
  };

  const handleTraitChangeForCategory = (categoryName: keyof NounSeed, direction: 'left' | 'right') => {
    const categoryTraits = traitCategories.find(cat => cat.name === categoryName);
    if (!categoryTraits) return;

    const currentIndex = selectedTraits[categoryName] || 0;
    const newIndex = direction === 'left' 
      ? (currentIndex - 1 + categoryTraits.traits.length) % categoryTraits.traits.length
      : (currentIndex + 1) % categoryTraits.traits.length;
    
    const newSelectedTraits = {
      ...selectedTraits,
      [categoryName]: newIndex
    };
    
    setSelectedTraits(newSelectedTraits);
    generateNounFromAssets(newSelectedTraits);
  };

  const handleRegenerate = () => {
    if (!traitCategories.length) return;
    
    const newSeed: NounSeed = {
      background: getRandomTraitIndex('background'),
      body: getRandomTraitIndex('body'),
      accessory: getRandomTraitIndex('accessory'),
      head: getRandomTraitIndex('head'),
      glasses: getRandomTraitIndex('glasses')
    };
    
    setSelectedTraits(newSeed);
    generateNounFromAssets(newSeed);
  };

  const getRandomTraitIndex = (categoryName: keyof NounSeed): number => {
    const category = traitCategories.find(c => c.name === categoryName);
    if (!category) return 0;
    
    const random = Math.random();
    
    if (random < 0.6) {
      const commonCount = Math.floor(category.traits.length * 0.2);
      return Math.floor(Math.random() * Math.max(commonCount, 1));
    } else if (random < 0.85) {
      const commonCount = Math.floor(category.traits.length * 0.2);
      const uncommonCount = Math.floor(category.traits.length * 0.3);
      return commonCount + Math.floor(Math.random() * uncommonCount);
    } else if (random < 0.95) {
      const commonCount = Math.floor(category.traits.length * 0.2);
      const uncommonCount = Math.floor(category.traits.length * 0.3);
      const rareCount = Math.floor(category.traits.length * 0.3);
      return commonCount + uncommonCount + Math.floor(Math.random() * rareCount);
    } else {
      const commonCount = Math.floor(category.traits.length * 0.2);
      const uncommonCount = Math.floor(category.traits.length * 0.3);
      const rareCount = Math.floor(category.traits.length * 0.3);
      const epicStart = commonCount + uncommonCount + rareCount;
      return epicStart + Math.floor(Math.random() * (category.traits.length - epicStart));
    }
  };

  const handleMint = async () => {
    if (!generatedSVG) {
      setMintStatus('No NFT generated to mint');
      return;
    }

    try {
      setMintStatus('Preparing SVG data...');
      
      const svgString = atob(generatedSVG);
      
      setMintStatus('Minting NFT...');
      
      const rarityScores = traitCategories.map(category => {
        const currentTrait = category.traits[selectedTraits[category.name]];
        if (currentTrait?.rarity) {
          switch (currentTrait.rarity.toLowerCase()) {
            case 'common': return BigInt(20);
            case 'uncommon': return BigInt(40);
            case 'rare': return BigInt(60);
            case 'epic': return BigInt(80);
            case 'legendary': return BigInt(90);
            case 'mythic': return BigInt(95);
            case 'divine': return BigInt(100);
            default: return BigInt(20);
          }
        }
        const rarity = currentTrait?.id || 0;
        if (rarity < 20) return BigInt(20);
        if (rarity < 50) return BigInt(40);
        if (rarity < 80) return BigInt(60);
        return BigInt(80);
      });

      const basePrice = (typeof mintPrice?.data === 'bigint' ? mintPrice.data : parseEther('1.0'));
      const rarityIncrement = parseEther('0.1');
      const calculatedPrice = calculatePrice(rarityScores, basePrice, rarityIncrement);
      
      const result = await mintNFT.mutateAsync({ 
        svgData: svgString,
        name: `Nogglr #${Date.now()}`,
        description: 'A unique Nogglr NFT with custom traits',
        traitTypes: traitCategories.map(category => category.name),
        traitValues: traitCategories.map(category => {
          const currentTrait = category.traits[selectedTraits[category.name]];
          return currentTrait?.filename || 'None';
        }),
        rarityScores: rarityScores,
        calculatedPrice: calculatedPrice
      });
      
      setMintStatus('NFT minted successfully! 🎉');
      
      if (isMiniApp) {
        try {
          const calculateRarity = (scores: number[]): string => {
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avgScore >= 95) return 'divine';
            if (avgScore >= 85) return 'mythic';
            if (avgScore >= 70) return 'legendary';
            if (avgScore >= 50) return 'epic';
            if (avgScore >= 30) return 'rare';
            if (avgScore >= 15) return 'uncommon';
            return 'common';
          };
          
          const rarity = calculateRarity(rarityScores.map(score => Number(score)));
          const mintPriceFormatted = formatEtherValue(calculatedPrice);
          const tokenId = result?.tokenId ? String(result.tokenId) : undefined;
          const embedUrl = tokenId ? `https://nogglr.vercel.app/nft/${tokenId}` : `https://nogglr.vercel.app`;
          
          await sdk.actions.composeCast({
            text: `I just minted a Nogglr! 🥽\n\nScratch that, a Noun on Celo 😂\n\nWell, I can now own a ${rarity} rarity noun for just ${mintPriceFormatted} CELO\n\nMint yours! 👇\n\nPowered by @oliseh`,
            embeds: [embedUrl]
          });
        } catch (shareError) {
          console.error('Failed to auto-share after mint:', shareError);
        }
      }
      
      setTimeout(() => {
        onMintSuccess?.();
      }, 2000);
      
    } catch (error) {
      console.error('Mint error:', error);
      setMintStatus(`Mint failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getRarityColor = (trait: any) => {
    if (trait.rarity) {
      switch (trait.rarity.toLowerCase()) {
        case 'common': return '#000000';
        case 'uncommon': return '#1E73ED';
        case 'rare': return '#FFB700';
        case 'epic': return '#FFB700';
        case 'legendary': return '#FFB700';
        default: return '#000000';
      }
    }
    const rarity = trait.id / 100;
    if (rarity < 0.3) return '#000000';
    if (rarity < 0.6) return '#1E73ED';
    if (rarity < 0.9) return '#FFB700';
    return '#FFB700';
  };

  const getRarityLabel = (trait: any) => {
    if (trait.rarity) {
      return trait.rarity.toUpperCase();
    }
    const rarity = trait.id / 100;
    if (rarity < 0.3) return 'COMMON';
    if (rarity < 0.6) return 'UNCOMMON';
    if (rarity < 0.9) return 'RARE';
    return 'LEGENDARY';
  };

  if (isLoading) {
    return (
      <div className="mint-tab">
        <div className="mint-layout">
          <div className="mint-loading">
            <div className="loader"></div>
            <p>Loading Nouns assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mint-tab">
      <div className="mint-layout">
        {/* Preview Section */}
        <div className="mint-preview-section">
          <div className="mint-preview-container">
            {generatedSVG ? (
              <div className="mint-preview-image-wrapper">
                <img 
                  src={`data:image/svg+xml;base64,${generatedSVG}`}
                  alt="Generated Noun"
                  className="mint-preview-image"
                />
                <div className="mint-price-badge">
                  <span className="mint-price-number">{formatEtherValue(currentMintPrice)}</span>
                  <img src={"/celo-celo-logo.svg"} alt="CELO" className="mint-celo-icon" />
                </div>
              </div>
            ) : (
              <div className="mint-preview-placeholder">🥽</div>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className="mint-controls-section">
          <div className="mint-trait-controls">
            {traitCategories.map(category => {
              const categoryTraits = category.traits;
              const currentIndex = selectedTraits[category.name] || 0;
              const currentTrait = categoryTraits[currentIndex];
              
              return (
                <div key={category.name} className="mint-trait-row">
                  <Button 
                    className="mint-trait-nav-button"
                    onClick={() => handleTraitChangeForCategory(category.name, 'left')}
                    variant="outline"
                    size="icon"
                  >
                    ←
                  </Button>
                  
                  <div className="mint-trait-info">
                    <div className="mint-trait-name">{currentTrait?.filename || 'None'}</div>
                    <div 
                      className="mint-trait-rarity"
                      style={{ 
                        color: getRarityColor(currentTrait) 
                      }}
                    >
                      {getRarityLabel(currentTrait)}
                    </div>
                  </div>
                  
                  <Button 
                    className="mint-trait-nav-button"
                    onClick={() => handleTraitChangeForCategory(category.name, 'right')}
                    variant="outline"
                    size="icon"
                  >
                    →
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="mint-action-buttons">
            <Button 
              className="mint-randomize-button"
              onClick={handleRegenerate}
              disabled={contractLoading || mintNFT.isPending}
              variant="secondary"
            >
              🎲 Randomize All
            </Button>
            <Button 
              className="mint-button"
              onClick={handleMint}
              disabled={contractLoading || mintNFT.isPending || !generatedSVG}
            >
              {contractLoading || mintNFT.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>
                    {mintNFT.isPending ? 'Minting...' : 'Processing...'}
                  </span>
                </div>
              ) : (
                `Mint (${formatEtherValue(currentMintPrice)} CELO)`
              )}
            </Button>
          </div>
          
          {/* Status Messages */}
          {mintStatus && (
            <div className={`mint-status-message ${
              mintStatus.includes('successfully') ? 'mint-status-success' :
              mintStatus.includes('Failed') || mintStatus.includes('failed') ? 'mint-status-error' :
              'mint-status-info'
            }`}>
              <p className="mint-status-text">{mintStatus}</p>
            </div>
          )}

          {/* Contract Errors */}
          {mintNFT.error && (
            <div className="mint-error-message">
              <p className="mint-error-title">Contract Error:</p>
              <p className="mint-error-details">{mintNFT.error.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

