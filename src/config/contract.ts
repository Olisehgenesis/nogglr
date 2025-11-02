import { parseEther } from 'viem'
import { celo } from 'viem/chains'
import { nogglrBetaABI } from '../abi/nogglrBetaABI'

// Contract configuration - Updated to use Beta contract
export const CONTRACT_CONFIG = {
  // CELO Mainnet
  chainId: 42220, 
  chain: celo,
  // Nogglrv3BETA deployed address on Celo mainnet (Beta Version with Full Marketplace Features)
  contractAddress: '0xdf7614341f6f5775569462550f219F5b4381724A' as `0x${string}`,
  
  // Pricing (in CELO)
  MINT_PRICE: parseEther('1.0'), // 1.0 CELO minimum
  LIKE_PRICE: parseEther('0.1'), // 0.1 CELO
  
  // Fee distribution
  APP_FEE_PERCENTAGE: 50, // 50% of like price goes to app
  OWNER_FEE_PERCENTAGE: 50, // 50% of like price goes to NFT owner
}

// Contract ABI (v3.1.0-BETA - Full Marketplace Features)
export const CONTRACT_ABI = nogglrBetaABI;