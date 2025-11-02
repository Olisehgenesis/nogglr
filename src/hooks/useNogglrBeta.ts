import { useAccount, useReadContract } from 'wagmi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nogglrBetaABI } from '../abi/nogglrBetaABI';
import { useState, useCallback } from 'react';
import { parseEther, formatEther, decodeEventLog } from 'viem';
import { waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { writeContract as writeContractAction } from 'wagmi/actions';
import { config as wagmiConfig } from '../walletkit';

// Contract address (Nogglrv3BETA deployed address on Celo mainnet with bidding)
const CONTRACT_ADDRESS = "0x5785f84FBD8cd657Ad3dc9C78BEC4028F7BfD88C" as const;
const CHAIN_ID = 42220; // Celo Mainnet

// ==================== TYPES ====================

export interface OnChainNFTData {
  svgData: string;
  name: string;
  description: string;
  traitTypes: string[];
  traitValues: string[];
  rarityScores: bigint[];
  overallRarity: bigint;
  createdAt: bigint;
}

export interface NFTData {
  likes: bigint;
  totalEarnings: bigint;
  creator: string;
  createdAt: bigint;
  isListed: boolean;
  listPrice: bigint;
  currentBid: bigint;
  currentBidder: string;
  bidEndTime: bigint;
  mintPrice: bigint;
}

export interface UserStats {
  totalMinted: bigint;
  totalLikes: bigint;
  totalEarnings: bigint;
  totalSales: bigint;
  totalPurchases: bigint;
  salesVolume: bigint;
  purchaseVolume: bigint;
  highestSale: bigint;
  level: bigint;
  experience: bigint;
  points: bigint;
}

export interface Bid {
  bidder: string;
  amount: bigint;
  timestamp: bigint;
  accepted: boolean;
  cancelled: boolean;
}

export interface GlobalStats {
  totalNFTs: bigint;
  totalUsers: bigint;
  totalTransactions: bigint;
  totalVolume: bigint;
  totalLikes: bigint;
}

export interface Transaction {
  tokenId: bigint;
  from: string;
  to: string;
  amount: bigint;
  timestamp: bigint;
  txType: string;
}

export interface ContractInfo {
  version: string;
  totalSupply: bigint;
  currentMintPrice: bigint;
  currentLikePrice: bigint;
  currentSaleFeeBps: bigint;
  currentFeeRecipient: string;
}

export interface LeaderboardEntry {
  user: string;
  value: bigint;
  rank: bigint;
}

export interface UserPosition {
  users: string[];
  values: bigint[];
  ranks: bigint[];
  totalUsers: bigint;
}

// ==================== MAIN HOOK ====================

export const useNogglrv3BETA = () => {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper for contract calls
  const handleContractCall = useCallback(async (
    fn: () => Promise<any>,
    successMessage?: string
  ): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fn();
      if (successMessage) console.log(successMessage);
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || 'Contract call failed';
      setError(errorMessage);
      console.error('Contract error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper to write and wait for confirmation
  const writeAndConfirm = useCallback(async (writer: () => Promise<`0x${string}`>) => {
    const hash = await writer();
    await waitForTransactionReceipt(wagmiConfig, { hash });
    return hash;
  }, []);

  // ==================== READ HOOKS ====================

  // Contract info
  const useContractInfo = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getContractInfo',
  });

  const useMintPrice = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'baseMintPrice',
  });

  const useLikePrice = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'likePrice',
  });

  const useTotalSupply = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'totalSupply',
  });

  // NFT data
  const useNFTData = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getNFTData',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  const useNFTMetadata = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getNFTMetadata',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  const useTokenURI = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'tokenURI',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  const useSVGData = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getSVGData',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  const useOwnerOf = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'ownerOf',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  // Bids
  const useBids = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getBids',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  const useActiveBids = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getActiveBids',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  // User data
  const useUserStats = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserStats',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  const useUserMarketplaceStats = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserMarketplaceStats',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  const useUserNFTs = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserNFTs',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  const useUserCreatedNFTs = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserCreatedNFTs',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  const useUserLikedNFTs = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserLikedNFTs',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  const useUserTransactionHistory = (userAddress?: string, limit: bigint = 20n) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserTransactionHistory',
    args: [(userAddress || address) as `0x${string}`, limit],
    query: { enabled: !!(userAddress || address) }
  });

  // Check if user has liked an NFT
  const useHasLiked = (tokenId: bigint, userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'hasLiked',
    args: [tokenId, (userAddress || address) as `0x${string}`],
    query: { enabled: tokenId > 0n && !!(userAddress || address) }
  });

  // Claimable earnings
  const useClaimableEarnings = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getClaimableEarnings',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  // Global stats
  const useGlobalStats = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getGlobalStats',
  });

  // ==================== LEADERBOARD HOOKS ====================

  /**
   * Get top 20 leaderboard for a specific metric
   * Metrics: "volume", "sales", "mints", "points", "earnings", "purchases"
   */
  const useLeaderboard = (metric: string = "mints") => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getLeaderboard',
    args: [metric],
  });

  /**
   * Get user's position with neighbors (user above and below)
   */
  const useUserLeaderboardPosition = (metric: string = "mints", userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserLeaderboardPosition',
    args: [(userAddress || address) as `0x${string}`, metric],
    query: { enabled: !!(userAddress || address) }
  });

  /**
   * Get user's rank for a specific metric
   */
  const useUserRank = (metric: string = "mints", userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserRank',
    args: [(userAddress || address) as `0x${string}`, metric],
    query: { enabled: !!(userAddress || address) }
  });

  /**
   * Get top NFTs by likes
   */
  const useTopNFTsByLikes = (limit: bigint = 20n) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getTopNFTsByLikes',
    args: [limit],
  });

  /**
   * Get top NFTs by price
   */
  const useTopNFTsByPrice = (limit: bigint = 20n) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getTopNFTsByPrice',
    args: [limit],
  });

  /**
   * Batch fetch multiple NFTs
   */
  const useNFTsBatch = (tokenIds: bigint[]) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getNFTsBatch',
    args: [tokenIds],
    query: { enabled: tokenIds.length > 0 }
  });

  // Flagging checks
  const useIsNFTFlagged = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'isNFTFlagged',
    args: [tokenId],
    query: { enabled: tokenId > 0n }
  });

  const useIsUserFlagged = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'isUserFlagged',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  // ==================== WRITE HOOKS ====================

  /**
   * Mint NFT with on-chain SVG data
   */
  const mintNFT = useMutation({
    mutationFn: async ({ 
      svgData, 
      name,
      description,
      traitTypes,
      traitValues,
      rarityScores,
      calculatedPrice
    }: {
      svgData: string;
      name: string;
      description: string;
      traitTypes: string[];
      traitValues: string[];
      rarityScores: bigint[];
      calculatedPrice: bigint;
    }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'mintNFTOnChain',
            args: [
              svgData,
              name,
              description,
              traitTypes,
              traitValues,
              rarityScores,
              calculatedPrice
            ],
            value: calculatedPrice,
          })
        );
        // Fetch the receipt to decode tokenId from Transfer event
        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
        let mintedTokenId: bigint | null = null;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({ abi: nogglrBetaABI as any, data: log.data, topics: log.topics }) as { eventName?: string; args?: any };
            if (decoded && decoded.eventName === 'Transfer') {
              const args: any = decoded.args;
              // Mint event is Transfer(from=0x0, to=address, tokenId)
              if (args?.from && /^0x0{40}$/i.test(String(args.from))) {
                mintedTokenId = BigInt(args.tokenId);
                break;
              }
            }
          } catch {
            // ignore non-matching logs
          }
        }
        return { hash, tokenId: mintedTokenId };
      }, 'NFT minted successfully!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totalSupply'] });
      queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });

  /**
   * Like an NFT
   */
  const likeNFT = useMutation({
    mutationFn: async ({ tokenId }: { tokenId: bigint }) => {
      return handleContractCall(async () => {
        // Get like price from contract
        const likePrice = await readContract(wagmiConfig, {
          address: CONTRACT_ADDRESS,
          abi: nogglrBetaABI,
          functionName: 'likePrice',
        });
        
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'likeNFT',
            args: [tokenId],
            value: likePrice as bigint,
          })
        );
        return hash;
      }, 'NFT liked successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['hasLiked', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });

  /**
   * List NFT for sale
   */
  const listNFT = useMutation({
    mutationFn: async ({ tokenId, price }: { tokenId: bigint; price: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'listNFT',
            args: [tokenId, price],
          })
        );
        return hash;
      }, 'NFT listed successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
    },
  });

  /**
   * Unlist NFT
   */
  const unlistNFT = useMutation({
    mutationFn: async ({ tokenId }: { tokenId: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'unlistNFT',
            args: [tokenId],
          })
        );
        return hash;
      }, 'NFT unlisted successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
    },
  });

  /**
   * Buy NFT directly
   */
  const buyNow = useMutation({
    mutationFn: async ({ tokenId, price }: { tokenId: bigint; price: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'buyNow',
            args: [tokenId],
            value: price,
          })
        );
        return hash;
      }, 'NFT purchased successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });

  /**
   * Claim accumulated earnings
   */
  const claimEarnings = useMutation({
    mutationFn: async () => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'claimEarnings',
          })
        );
        return hash;
      }, 'Earnings claimed successfully!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['claimableEarnings'] });
    },
  });

  // ==================== BIDDING MUTATIONS ====================

  /**
   * Place a bid on an NFT
   */
  const placeBid = useMutation({
    mutationFn: async ({ tokenId, value }: { tokenId: bigint; value: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'placeBid',
            args: [tokenId],
            value: value,
          })
        );
        return hash;
      }, 'Bid placed successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['bids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['activeBids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
    },
  });

  /**
   * Accept a bid on an NFT
   */
  const acceptBid = useMutation({
    mutationFn: async ({ tokenId, bidIndex }: { tokenId: bigint; bidIndex: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'acceptBid',
            args: [tokenId, bidIndex],
          })
        );
        return hash;
      }, 'Bid accepted successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['bids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['activeBids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['globalStats'] });
      queryClient.invalidateQueries({ queryKey: ['claimableEarnings'] });
    },
  });

  /**
   * Withdraw a bid
   */
  const withdrawBid = useMutation({
    mutationFn: async ({ tokenId, bidIndex }: { tokenId: bigint; bidIndex: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'withdrawBid',
            args: [tokenId, bidIndex],
          })
        );
        return hash;
      }, 'Bid withdrawn successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['bids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['activeBids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  /**
   * Reject all bids on an NFT
   */
  const rejectBid = useMutation({
    mutationFn: async ({ tokenId }: { tokenId: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'rejectBid',
            args: [tokenId],
          })
        );
        return hash;
      }, 'All bids rejected successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['bids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['activeBids', tokenId] });
    },
  });

  /**
   * Cancel your own bid (with fee)
   */
  const cancelBid = useMutation({
    mutationFn: async ({ tokenId }: { tokenId: bigint }) => {
      return handleContractCall(async () => {
        const hash = await writeAndConfirm(() =>
          writeContractAction(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: nogglrBetaABI,
            functionName: 'cancelBid',
            args: [tokenId],
          })
        );
        return hash;
      }, 'Bid cancelled successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['bids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['activeBids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Generate simple SVG data for minting
   */
  const generateSVGData = useCallback((params: {
    backgroundColor?: string;
    textColor?: string;
    text?: string;
    width?: number;
    height?: number;
  }) => {
    const {
      backgroundColor = '#1E73ED',
      textColor = '#FFFFFF',
      text = 'Nogglr NFT',
      width = 400,
      height = 400
    } = params;

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
  <text x="${width/2}" y="${height/2}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="32" font-family="Urbanist, sans-serif" font-weight="bold">
    ${text}
  </text>
</svg>`;
    
    return svgContent.trim();
  }, []);

  /**
   * Calculate mint price based on traits
   */
  const calculateMintPrice = useCallback((rarityScores: bigint[], baseMintPrice: bigint, rarityPriceIncrement: bigint) => {
    let totalPrice = baseMintPrice;
    
    // Add increment for each rare trait (score > 70)
    for (const score of rarityScores) {
      if (score > 70n) {
        totalPrice += rarityPriceIncrement;
      }
    }
    
    return totalPrice;
  }, []);

  /**
   * Format ether values for display
   */
  const formatEtherValue = useCallback((value: bigint | undefined | null) => {
    if (!value || value === 0n) return '0';
    return formatEther(value);
  }, []);

  /**
   * Parse ether value from string
   */
  const parseEtherValue = useCallback((value: string) => {
    try {
      return parseEther(value);
    } catch {
      return 0n;
    }
  }, []);

  /**
   * Decode base64 tokenURI to get metadata
   */
  const decodeTokenURI = useCallback((uri: string) => {
    try {
      // Remove data:application/json;base64, prefix
      const base64Data = uri.replace('data:application/json;base64,', '');
      const jsonString = atob(base64Data);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error decoding tokenURI:', error);
      return null;
    }
  }, []);

  /**
   * Decode base64 SVG from metadata
   */
  const decodeSVGFromMetadata = useCallback((imageUri: string) => {
    try {
      // Remove data:image/svg+xml;base64, prefix
      const base64Data = imageUri.replace('data:image/svg+xml;base64,', '');
      return atob(base64Data);
    } catch (error) {
      console.error('Error decoding SVG:', error);
      return null;
    }
  }, []);

  /**
   * Format leaderboard metric name for display
   */
  const formatMetricName = useCallback((metric: string) => {
    const names: Record<string, string> = {
      volume: 'Sales Volume',
      sales: 'Total Sales',
      mints: 'NFTs Minted',
      points: 'Points',
      earnings: 'Total Earnings',
      purchases: 'NFTs Purchased'
    };
    return names[metric] || metric;
  }, []);

  return {
    // State
    isLoading,
    error,
    isConnected,
    address,
    
    // Contract info
    contractAddress: CONTRACT_ADDRESS,
    chainId: CHAIN_ID,
    
    // Basic read hooks
    useContractInfo,
    useMintPrice,
    useLikePrice,
    useTotalSupply,
    
    // NFT data hooks
    useNFTData,
    useNFTMetadata,
    useTokenURI,
    useSVGData,
    useOwnerOf,
    useBids,
    useActiveBids,
    useNFTsBatch,
    
    // User data hooks
    useUserStats,
    useUserMarketplaceStats,
    useUserNFTs,
    useUserCreatedNFTs,
    useUserLikedNFTs,
    useUserTransactionHistory,
    useHasLiked,
    useClaimableEarnings,
    
    // Global data hooks
    useGlobalStats,
    
    // Leaderboard hooks
    useLeaderboard,
    useUserLeaderboardPosition,
    useUserRank,
    useTopNFTsByLikes,
    useTopNFTsByPrice,
    
    // Flagging hooks
    useIsNFTFlagged,
    useIsUserFlagged,
    
    // Write mutations
    mintNFT,
    likeNFT,
    listNFT,
    unlistNFT,
    buyNow,
    claimEarnings,
    
    // Bidding mutations
    placeBid,
    acceptBid,
    withdrawBid,
    rejectBid,
    cancelBid,
    
    // Utility functions
    generateSVGData,
    calculateMintPrice,
    formatEtherValue,
    parseEtherValue,
    decodeTokenURI,
    decodeSVGFromMetadata,
    formatMetricName,
  };
};