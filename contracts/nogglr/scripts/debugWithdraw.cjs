const { createWalletClient, createPublicClient, http, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');
require('dotenv').config();

async function debugWithdraw() {
  console.log("🔍 Debugging withdrawal issue...\n");

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });
  
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http()
  });

  const contractAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";

  // Contract ABI with more functions
  const contractABI = [
    {
      "inputs": [],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getBalance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "balance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  try {
    // Check owner
    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'owner'
    });
    console.log(`👤 Contract owner: ${owner}`);
    console.log(`🔑 Your address: ${account.address}`);
    console.log(`✅ Is owner: ${owner.toLowerCase() === account.address.toLowerCase()}\n`);

    // Check contract balance
    const contractBalance = await publicClient.getBalance({ address: contractAddress });
    console.log(`💰 Contract balance: ${formatEther(contractBalance)} CELO\n`);

    // Try to estimate gas for withdraw
    try {
      const gasEstimate = await publicClient.estimateContractGas({
        address: contractAddress,
        abi: contractABI,
        functionName: 'withdraw',
        account: account.address
      });
      console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);
    } catch (error) {
      console.log(`❌ Gas estimation failed: ${error.message}`);
      
      // Try to get more detailed error info
      if (error.message.includes('execution reverted')) {
        console.log("\n🔍 Trying to get revert reason...");
        
        // Try to simulate the transaction
        try {
          await publicClient.simulateContract({
            address: contractAddress,
            abi: contractABI,
            functionName: 'withdraw',
            account: account.address
          });
        } catch (simError) {
          console.log(`📋 Simulation error: ${simError.message}`);
          
          // Check if it's a specific revert reason
          if (simError.message.includes('Ownable')) {
            console.log("🔒 Error: Ownable revert - not the owner");
          } else if (simError.message.includes('ReentrancyGuard')) {
            console.log("🔒 Error: ReentrancyGuard revert - reentrancy protection");
          } else if (simError.message.includes('No funds')) {
            console.log("💰 Error: No funds to withdraw");
          } else {
            console.log("❓ Unknown revert reason");
          }
        }
      }
    }

    // Try alternative withdrawal methods
    console.log("\n🔍 Trying alternative withdrawal methods...");
    
    // Method 1: Try with higher gas limit
    try {
      console.log("📤 Attempting withdrawal with higher gas limit...");
      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'withdraw',
        gas: 100000n // Higher gas limit
      });
      console.log(`✅ Transaction sent: ${hash}`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      console.log(`❌ High gas withdrawal failed: ${error.message}`);
    }

  } catch (error) {
    console.error("💥 Debug failed:", error);
  }
}

debugWithdraw()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
