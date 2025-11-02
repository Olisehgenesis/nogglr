const { createWalletClient, createPublicClient, http, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');
require('dotenv').config();

async function main() {
  console.log("🚀 Starting NogglrNFTv3 fee withdrawal process...\n");

  // NogglrNFTv3 contract address (On-Chain SVG Storage)
  const V3_CONTRACT_ADDRESS = "0x24630560efD07D7008Bb6336a6724bA0835e76c7";

  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }

  // Create account and clients
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

  console.log(`📝 Withdrawing fees as: ${account.address}\n`);

  // Check balance before withdrawal
  const balanceBefore = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Signer balance before: ${formatEther(balanceBefore)} CELO\n`);

  // Contract ABI for v3 withdraw functions
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
      "name": "feeRecipient",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractInfo",
      "outputs": [
        {"internalType": "string", "name": "", "type": "string"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "address", "name": "", "type": "address"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  try {
    console.log(`🔍 Checking NogglrNFTv3 contract at ${V3_CONTRACT_ADDRESS}...`);
    
    // Get contract info
    const contractInfo = await publicClient.readContract({
      address: V3_CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'getContractInfo'
    });
    
    console.log(`📊 Contract Information:`);
    console.log(`   Version: ${contractInfo[0]}`);
    console.log(`   Total Supply: ${contractInfo[1].toString()}`);
    console.log(`   Base Mint Price: ${formatEther(contractInfo[2])} CELO`);
    console.log(`   Like Price: ${formatEther(contractInfo[3])} CELO`);
    console.log(`   Sale Fee (bps): ${contractInfo[4].toString()}`);
    console.log(`   Fee Recipient: ${contractInfo[5]}\n`);
    
    // Check if signer is owner
    const owner = await publicClient.readContract({
      address: V3_CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'owner'
    });
    
    console.log(`👑 Contract owner: ${owner}`);
    console.log(`🔑 You are owner: ${owner.toLowerCase() === account.address.toLowerCase() ? '✅ Yes' : '❌ No'}\n`);
    
    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.log(`❌ Signer is not owner of v3 contract. Only the owner can withdraw fees.`);
      return;
    }

    // Check contract balance
    const contractBalance = await publicClient.getBalance({ address: V3_CONTRACT_ADDRESS });
    console.log(`💼 Contract balance: ${formatEther(contractBalance)} CELO`);

    if (contractBalance > 0n) {
      console.log(`💸 Withdrawing ${formatEther(contractBalance)} CELO from NogglrNFTv3...`);
      
      // Withdraw fees
      const hash = await walletClient.writeContract({
        address: V3_CONTRACT_ADDRESS,
        abi: contractABI,
        functionName: 'withdraw'
      });
      
      console.log(`📤 Transaction hash: ${hash}`);
      
      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);
      console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}\n`);
    } else {
      console.log(`💡 No funds to withdraw from NogglrNFTv3\n`);
    }

  } catch (error) {
    console.error(`❌ Error withdrawing from NogglrNFTv3:`, error);
    throw error;
  }

  // Check final balance
  const balanceAfter = await publicClient.getBalance({ address: account.address });
  const withdrawn = balanceAfter - balanceBefore;
  
  console.log(`💰 Signer balance after: ${formatEther(balanceAfter)} CELO`);
  console.log(`💸 Total withdrawn: ${formatEther(withdrawn)} CELO`);
  
  if (withdrawn > 0n) {
    console.log(`🎉 Successfully withdrew ${formatEther(withdrawn)} CELO in fees from NogglrNFTv3!`);
  } else {
    console.log(`💡 No fees were withdrawn from NogglrNFTv3.`);
  }
}

// Additional utility functions
async function checkV3ContractBalance() {
  console.log("🔍 Checking NogglrNFTv3 contract balance...\n");

  const V3_CONTRACT_ADDRESS = "0x24630560efD07D7008Bb6336a6724bA0835e76c7";

  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  try {
    const balance = await publicClient.getBalance({ address: V3_CONTRACT_ADDRESS });
    console.log(`📊 NogglrNFTv3 (${V3_CONTRACT_ADDRESS}): ${formatEther(balance)} CELO`);
  } catch (error) {
    console.log(`❌ Could not check balance for NogglrNFTv3: ${error}`);
  }
}

async function checkV3Ownership() {
  console.log("👑 Checking NogglrNFTv3 ownership...\n");

  const V3_CONTRACT_ADDRESS = "0x24630560efD07D7008Bb6336a6724bA0835e76c7";

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  const contractABI = [
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  try {
    const owner = await publicClient.readContract({
      address: V3_CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'owner'
    });
    
    const isOwner = owner.toLowerCase() === account.address.toLowerCase();
    
    console.log(`👤 NogglrNFTv3 owner: ${owner}`);
    console.log(`🔑 You are owner: ${isOwner ? '✅ Yes' : '❌ No'}\n`);
  } catch (error) {
    console.log(`❌ Could not check ownership for NogglrNFTv3: ${error}\n`);
  }
}

async function getV3ContractInfo() {
  console.log("📊 Getting NogglrNFTv3 contract information...\n");

  const V3_CONTRACT_ADDRESS = "0x24630560efD07D7008Bb6336a6724bA0835e76c7";

  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  const contractABI = [
    {
      "inputs": [],
      "name": "getContractInfo",
      "outputs": [
        {"internalType": "string", "name": "", "type": "string"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "uint256", "name": "", "type": "uint256"},
        {"internalType": "address", "name": "", "type": "address"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  try {
    const contractInfo = await publicClient.readContract({
      address: V3_CONTRACT_ADDRESS,
      abi: contractABI,
      functionName: 'getContractInfo'
    });
    
    console.log(`📊 NogglrNFTv3 Contract Information:`);
    console.log(`   Version: ${contractInfo[0]}`);
    console.log(`   Total Supply: ${contractInfo[1].toString()}`);
    console.log(`   Base Mint Price: ${formatEther(contractInfo[2])} CELO`);
    console.log(`   Like Price: ${formatEther(contractInfo[3])} CELO`);
    console.log(`   Sale Fee (bps): ${contractInfo[4].toString()}`);
    console.log(`   Fee Recipient: ${contractInfo[5]}\n`);
  } catch (error) {
    console.log(`❌ Could not get contract info for NogglrNFTv3: ${error}\n`);
  }
}

// Export functions for use in other scripts
module.exports = {
  main,
  checkV3ContractBalance,
  checkV3Ownership,
  getV3ContractInfo
};

// Run the script if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}
