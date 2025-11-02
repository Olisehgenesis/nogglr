import { useAccount, useReadContract } from 'wagmi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nogglrBetaABI } from '../abi/nogglrBetaABI';
import { useState, useCallback } from 'react';
import { formatEther } from 'viem';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { writeContract as writeContractAction } from 'wagmi/actions';
import { config as wagmiConfig } from '../walletkit';
import { processTransactionWithDivvi } from '../utils/divvi';

// Contract address (Nogglrv3BETA deployed address on Celo mainnet)
const CONTRACT_ADDRESS = "0xdf7614341f6f5775569462550f219F5b4381724A" as const;
const CHAIN_ID = 42220; // Celo Mainnet

// ==================== TYPES ====================

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
  svgData: string; // On-chain SVG data instead of IPFS URI
}

export interface Bid {
  bidder: string;
  amount: bigint;
  timestamp: bigint;
}

export interface UserStats {
  totalLikes: bigint;
  totalEarnings: bigint;
  nftCount: bigint;
}

export interface ContractInfo {
  totalSupply: bigint;
  baseMintPrice: bigint;
  likePrice: bigint;
  version: string;
}

export interface TopUsers {
  addresses: string[];
  likeCounts: bigint[];
  earnings: bigint[];
}

// ==================== MAIN HOOK ====================

export const useNogglrv3 = () => {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log hook initialization
  console.log('useNogglrv3 hook initialized with formatEtherValue function');

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

  // Note: writeAndConfirm helper removed - now using Divvi integration pattern

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
    functionName: 'getTotalSupply',
  });

  const useIsVerified = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'isVerified',
  });

  // Fee settings
  const useBidCancelFeeBps = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'bidCancelFeeBps',
  });

  const useListingFeeBps = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'listingFeeBps',
  });

  // NFT data
  const useNFTData = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getNFTData',
    args: [tokenId],
  });

  const useNFTBids = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getNFTBids',
    args: [tokenId],
  });

  const useTokenURI = (tokenId: bigint) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'tokenURI',
    args: [tokenId],
  });

  // User data
  const useUserStats = (userAddress: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserStats',
    args: [userAddress],
  });

  const useUserNFTs = (userAddress: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserNFTs',
    args: [userAddress],
  });

  // Top users
  const useTopUsers = () => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getTopUsers',
  });

  // Check if user has liked an NFT
  const useHasLiked = (tokenId: number, userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'hasLiked',
    args: [BigInt(tokenId), (userAddress || address) as `0x${string}`],
    query: { enabled: tokenId > 0 && !!(userAddress || address) }
  });

  // User ranking and detailed stats
  const useUserRanking = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserRanking',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  const useUserDetailedStats = (userAddress?: string) => useReadContract({
    address: CONTRACT_ADDRESS,
    abi: nogglrBetaABI,
    functionName: 'getUserDetailedStats',
    args: [(userAddress || address) as `0x${string}`],
    query: { enabled: !!(userAddress || address) }
  });

  // ==================== WRITE HOOKS ====================

  // Mint NFT with on-chain SVG data
  const mintNFT = useMutation({
    mutationFn: async ({ svgData, value, name, description, traitTypes, traitValues, rarityScores }: { 
      svgData: string; 
      value: bigint;
      name?: string;
      description?: string;
      traitTypes?: string[];
      traitValues?: string[];
      rarityScores?: bigint[];
    }) => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for mint transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'mintNFTOnChain',
              args: [
                svgData,
                name || `Nogglr NFT #${Date.now()}`,
                description || 'A unique Nogglr NFT with on-chain SVG storage',
                traitTypes || [],
                traitValues || [],
                rarityScores || [],
                value
              ],
              value,
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'NFT minted successfully!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totalSupply'] });
      queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
    },
  });

  // Like NFT
  const likeNFT = useMutation({
    mutationFn: async ({ tokenId, value }: { tokenId: bigint; value: bigint }) => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for like transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'likeNFT',
              args: [tokenId],
              value,
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'NFT liked successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  // Place bid
  const placeBid = useMutation({
    mutationFn: async ({ tokenId, value }: { tokenId: bigint; value: bigint }) => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for place bid transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'placeBid',
              args: [tokenId],
              value,
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'Bid placed successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['nftBids', tokenId] });
    },
  });

  // Accept bid
  const acceptBid = useMutation({
    mutationFn: async (tokenId: bigint) => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for accept bid transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'acceptBid',
              args: [tokenId],
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'Bid accepted successfully!');
    },
    onSuccess: (_, tokenId) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['nftBids', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['userNFTs'] });
    },
  });

  // List for bidding
  const listForBidding = useMutation({
    mutationFn: async ({ tokenId, duration }: { tokenId: bigint; duration: bigint }) => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for list for bidding transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'listForBidding',
              args: [tokenId, duration],
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'NFT listed for bidding successfully!');
    },
    onSuccess: (_, { tokenId }) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
    },
  });

  // Cancel bid
  const cancelBid = useMutation({
    mutationFn: async (tokenId: bigint) => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for cancel bid transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'cancelBid',
              args: [tokenId],
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'Bid cancelled successfully!');
    },
    onSuccess: (_, tokenId) => {
      queryClient.invalidateQueries({ queryKey: ['nftData', tokenId] });
      queryClient.invalidateQueries({ queryKey: ['nftBids', tokenId] });
    },
  });

  // Withdraw earnings
  const withdrawEarnings = useMutation({
    mutationFn: async () => {
      return handleContractCall(async () => {
        if (!address) throw new Error('Wallet not connected');
        
        // Use Divvi integration for withdraw earnings transaction
        const hash = await processTransactionWithDivvi(
          async () => {
            return await writeContractAction(wagmiConfig, {
              address: CONTRACT_ADDRESS,
              abi: nogglrBetaABI,
              functionName: 'withdrawEarnings',
            });
          },
          address,
          CHAIN_ID
        );
        
        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      }, 'Earnings withdrawn successfully!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  // ==================== UTILITY FUNCTIONS ====================

  // Generate SVG data for minting
  const generateSVGData = useCallback((traits: any) => {
    // This function should generate SVG data based on traits
    // For now, return a placeholder - you'll need to implement the actual SVG generation
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="#${traits.backgroundColor || 'ffffff'}"/>
        <text x="200" y="200" text-anchor="middle" fill="#${traits.textColor || '000000'}">
          ${traits.text || 'Nogglr NFT'}
        </text>
      </svg>
    `;
    return svgContent;
  }, []);

  // Format SVG data for contract
  const formatSVGForContract = useCallback((svgContent: string) => {
    // Remove unnecessary whitespace and format for on-chain storage
    return svgContent.replace(/\s+/g, ' ').trim();
  }, []);

  // Format ether values for display
  const formatEtherValue = useCallback((value: bigint | undefined | null) => {
    console.log('formatEtherValue called with:', value);
    if (!value || value === 0n) return '0';
    return formatEther(value);
  }, []);

  return {
    // State
    isLoading,
    error,
    isConnected,
    address,
    
    // Contract address
    contractAddress: CONTRACT_ADDRESS,
    chainId: CHAIN_ID,
    
    // Read hooks
    useContractInfo,
    useMintPrice,
    useLikePrice,
    useTotalSupply,
    useIsVerified,
    useBidCancelFeeBps,
    useListingFeeBps,
    useNFTData,
    useNFTBids,
    useTokenURI,
    useUserStats,
    useUserNFTs,
    useTopUsers,
    useHasLiked,
    useUserRanking,
    useUserDetailedStats,
    
    // Write mutations
    mintNFT,
    likeNFT,
    placeBid,
    acceptBid,
    listForBidding,
    cancelBid,
    withdrawEarnings,
    
    // Utility functions
    generateSVGData,
    formatSVGForContract,
    formatEtherValue,
  };
};
