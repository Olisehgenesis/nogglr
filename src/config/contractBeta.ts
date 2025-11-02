import { parseEther } from 'viem'
import { celo } from 'viem/chains'
import { nogglrBetaABI } from '../abi/nogglrBetaABI'

// Beta Contract configuration
export const CONTRACT_BETA_CONFIG = {
  // CELO Mainnet
  chainId: 42220, 
  chain: celo,
  // Nogglrv3BETA deployed address on Celo mainnet (Beta Version with Full Marketplace Features + Bidding)
  contractAddress: '0x5785f84FBD8cd657Ad3dc9C78BEC4028F7BfD88C' as `0x${string}`,
  
  // Pricing (in CELO)
  MINT_PRICE: parseEther('1.0'), // 1.0 CELO minimum
  LIKE_PRICE: parseEther('0.1'), // 0.1 CELO
  
  // Fee distribution
  APP_FEE_PERCENTAGE: 50, // 50% of like price goes to app
  OWNER_FEE_PERCENTAGE: 50, // 50% of like price goes to NFT owner
}

// Beta Contract ABI (v3.1.0-BETA - Full Marketplace Features)
export const CONTRACT_BETA_ABI = nogglrBetaABI;
