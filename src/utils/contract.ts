import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem'
import { celo } from 'viem/chains'
import { CONTRACT_ABI, CONTRACT_CONFIG } from '../config/contract'
import { processTransactionWithDivvi } from './divvi'
// IPFS functionality removed - using on-chain SVG data only

export interface NFTData {
  likes: bigint
  totalEarnings: bigint
  creator: string
  createdAt: bigint
  isListed: boolean
  currentBid: bigint
  currentBidder: string
  bidEndTime: bigint
}

export interface UserStats {
  totalMinted: bigint
  totalLikes: bigint
  totalEarnings: bigint
  level: bigint
  experience: bigint
}

export interface ContractInfo {
  version: string
  verified: boolean
  hash: string
  totalSupply: bigint
  currentMintPrice: bigint
  currentLikePrice: bigint
}

export class NogglrNFTContract {
  private publicClient: any
  private walletClient: any
  private contractAddress: `0x${string}`

  constructor(contractAddress: string, rpcUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`
    
    this.publicClient = createPublicClient({
      chain: celo,
      transport: http(rpcUrl || 'https://forno.celo.org')
    })

    this.walletClient = createWalletClient({
      chain: celo,
      transport: http(rpcUrl || 'https://forno.celo.org')
    })
  }

  // Mint NFT with on-chain SVG data
  async mintNFT(
    svgData: string,
    account: any
  ): Promise<string> {
    try {
      // Use Divvi integration for mint transaction
      const hash = await processTransactionWithDivvi(
        async () => {
          return await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'mintNFT',
            args: [svgData],
            value: CONTRACT_CONFIG.MINT_PRICE,
            account
          });
        },
        account.address,
        42220 // Celo Mainnet
      );

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return receipt.transactionHash
    } catch (error) {
      console.error('Error minting NFT:', error)
      throw error
    }
  }

  // Mint NFT with gamified metadata (simplified - no IPFS)
  async mintGamifiedNFT(
    svgData: string,
    account: any
  ): Promise<string> {
    try {
      // Use the standard mintNFT function with SVG data
      return await this.mintNFT(svgData, account)
    } catch (error) {
      console.error('Error minting gamified NFT:', error)
      throw error
    }
  }

  // Like NFT
  async likeNFT(tokenId: bigint, account: any): Promise<string> {
    try {
      // Use Divvi integration for like transaction
      const hash = await processTransactionWithDivvi(
        async () => {
          return await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'likeNFT',
            args: [tokenId],
            value: CONTRACT_CONFIG.LIKE_PRICE,
            account
          });
        },
        account.address,
        42220 // Celo Mainnet
      );

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return receipt.transactionHash
    } catch (error) {
      console.error('Error liking NFT:', error)
      throw error
    }
  }

  // Place bid on NFT
  async placeBid(tokenId: bigint, bidAmount: bigint, account: any): Promise<string> {
    try {
      // Use Divvi integration for place bid transaction
      const hash = await processTransactionWithDivvi(
        async () => {
          return await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'placeBid',
            args: [tokenId],
            value: bidAmount,
            account
          });
        },
        account.address,
        42220 // Celo Mainnet
      );

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return receipt.transactionHash
    } catch (error) {
      console.error('Error placing bid:', error)
      throw error
    }
  }

  // Accept bid
  async acceptBid(tokenId: bigint, account: any): Promise<string> {
    try {
      // Use Divvi integration for accept bid transaction
      const hash = await processTransactionWithDivvi(
        async () => {
          return await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'acceptBid',
            args: [tokenId],
            account
          });
        },
        account.address,
        42220 // Celo Mainnet
      );

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return receipt.transactionHash
    } catch (error) {
      console.error('Error accepting bid:', error)
      throw error
    }
  }

  // List NFT for bidding
  async listForBidding(tokenId: bigint, duration: bigint, account: any): Promise<string> {
    try {
      // Use Divvi integration for list for bidding transaction
      const hash = await processTransactionWithDivvi(
        async () => {
          return await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: CONTRACT_ABI,
            functionName: 'listForBidding',
            args: [tokenId, duration],
            account
          });
        },
        account.address,
        42220 // Celo Mainnet
      );

      const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
      return receipt.transactionHash
    } catch (error) {
      console.error('Error listing for bidding:', error)
      throw error
    }
  }

  // Read functions
  async getNFTData(tokenId: bigint): Promise<NFTData> {
    try {
      const data = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getNFTData',
        args: [tokenId]
      })

      return {
        likes: data[0],
        totalEarnings: data[1],
        creator: data[2],
        createdAt: data[3],
        isListed: data[4],
        currentBid: data[5],
        currentBidder: data[6],
        bidEndTime: data[7]
      }
    } catch (error) {
      console.error('Error fetching NFT data:', error)
      throw error
    }
  }

  async getUserStats(userAddress: string): Promise<UserStats> {
    try {
      const stats = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getUserStats',
        args: [userAddress as `0x${string}`]
      })

      return {
        totalMinted: stats[0],
        totalLikes: stats[1],
        totalEarnings: stats[2],
        level: stats[3],
        experience: stats[4]
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }
  }

  async getContractInfo(): Promise<ContractInfo> {
    try {
      const info = await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getContractInfo'
      })

      return {
        version: info[0],
        verified: info[1],
        hash: info[2],
        totalSupply: info[3],
        currentMintPrice: info[4],
        currentLikePrice: info[5]
      }
    } catch (error) {
      console.error('Error fetching contract info:', error)
      throw error
    }
  }

  async getTokenURI(tokenId: bigint): Promise<string> {
    try {
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'tokenURI',
        args: [tokenId]
      })
    } catch (error) {
      console.error('Error fetching token URI:', error)
      throw error
    }
  }

  async getOwnerOf(tokenId: bigint): Promise<string> {
    try {
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'ownerOf',
        args: [tokenId]
      })
    } catch (error) {
      console.error('Error fetching owner:', error)
      throw error
    }
  }

  async getTotalSupply(): Promise<bigint> {
    try {
      return await this.publicClient.readContract({
        address: this.contractAddress,
        abi: CONTRACT_ABI,
        functionName: 'getTotalSupply'
      })
    } catch (error) {
      console.error('Error fetching total supply:', error)
      throw error
    }
  }

  // Utility functions
  async getNFTWithSVG(tokenId: bigint): Promise<{ nftData: NFTData; svgData: string }> {
    try {
      const nftData = await this.getNFTData(tokenId)
      const svgData = await this.getTokenURI(tokenId) // TokenURI now contains SVG data directly
      
      return { nftData, svgData }
    } catch (error) {
      console.error('Error fetching NFT with SVG:', error)
      throw error
    }
  }

  // Format values for display
  formatEther(value: bigint): string {
    return formatEther(value)
  }

  parseEther(value: string): bigint {
    return parseEther(value)
  }
}
