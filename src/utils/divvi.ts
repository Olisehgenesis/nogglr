import { getReferralTag, submitReferral } from '@divvi/referral-sdk';

// Your Divvi consumer address from sovseas.divvi.xyz
const DIVVI_CONSUMER_ADDRESS = '0x53eaF4CD171842d8144e45211308e5D90B4b0088' as const;
const CHAIN_ID = 42220; // Celo Mainnet

/**
 * Divvi integration utility for tracking referrals in write transactions
 */
export class DivviIntegration {
  constructor() {
    // Wallet client initialization removed as it's not needed for the current implementation
  }

  /**
   * Generate a referral tag for a user transaction
   * @param userAddress - The address of the user making the transaction
   * @returns The referral tag to append to transaction data
   */
  async generateReferralTag(userAddress: string): Promise<string> {
    try {
      const referralTag = getReferralTag({
        user: userAddress as `0x${string}`,
        consumer: DIVVI_CONSUMER_ADDRESS,
      });
      return referralTag;
    } catch (error) {
      console.error('Error generating Divvi referral tag:', error);
      // Return empty string if referral tag generation fails
      return '';
    }
  }

  /**
   * Submit a referral to Divvi after transaction confirmation
   * @param txHash - The transaction hash
   * @param chainId - The chain ID (defaults to Celo mainnet)
   */
  async submitReferral(txHash: string, chainId: number = CHAIN_ID): Promise<void> {
    try {
      await submitReferral({
        txHash: txHash as `0x${string}`,
        chainId,
      });
      console.log('Divvi referral submitted successfully for tx:', txHash);
    } catch (error) {
      console.error('Error submitting Divvi referral:', error);
      // Don't throw - we don't want referral failures to break the main transaction flow
    }
  }

  /**
   * Add referral tag to transaction data
   * @param originalData - The original transaction data
   * @param userAddress - The user's address
   * @returns Transaction data with referral tag appended
   */
  async addReferralTagToData(originalData: string, userAddress: string): Promise<string> {
    try {
      const referralTag = await this.generateReferralTag(userAddress);
      if (referralTag) {
        return originalData + referralTag;
      }
      return originalData;
    } catch (error) {
      console.error('Error adding referral tag to data:', error);
      return originalData;
    }
  }

  /**
   * Process a transaction with Divvi tracking
   * This is a helper function that can be used to wrap any write transaction
   * @param transactionFn - Function that returns a transaction hash
   * @param _userAddress - The user's address (used for future enhancements)
   * @param chainId - The chain ID (defaults to Celo mainnet)
   * @returns The transaction hash
   */
  async processTransactionWithDivvi(
    transactionFn: () => Promise<`0x${string}`>,
    _userAddress: string,
    chainId: number = CHAIN_ID
  ): Promise<`0x${string}`> {
    try {
      // Execute the transaction
      const txHash = await transactionFn();
      
      // Submit referral to Divvi (don't await to avoid blocking)
      this.submitReferral(txHash, chainId).catch(error => {
        console.error('Divvi referral submission failed:', error);
      });
      
      return txHash;
    } catch (error) {
      console.error('Transaction with Divvi tracking failed:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const divviIntegration = new DivviIntegration();

// Export utility functions for direct use
export const generateDivviReferralTag = (userAddress: string) => 
  divviIntegration.generateReferralTag(userAddress);

export const submitDivviReferral = (txHash: string, chainId: number = CHAIN_ID) => 
  divviIntegration.submitReferral(txHash, chainId);

export const addDivviTagToData = (originalData: string, userAddress: string) => 
  divviIntegration.addReferralTagToData(originalData, userAddress);

export const processTransactionWithDivvi = (
  transactionFn: () => Promise<`0x${string}`>,
  userAddress: string,
  chainId: number = CHAIN_ID
) => divviIntegration.processTransactionWithDivvi(transactionFn, userAddress, chainId);
