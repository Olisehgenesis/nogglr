const { createWalletClient, createPublicClient, http, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');
require('dotenv').config();

async function main() {
  console.log("🚀 Starting comprehensive fee withdrawal process for all NogglrNFT contracts...\n");

  // All contract addresses
  const CONTRACTS = {
    v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a", // NogglrNFT v1 (update if needed)
    v2: "0x99B905C99C552d629b889d4FeF1c10903b3BfA07", // NogglrNFTv2
    v3: "0x24630560efD07D7008Bb6336a6724bA0835e76c7"  // NogglrNFTv3 (On-Chain SVG Storage)
  };

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

  // Contract ABI for withdraw function (common across all versions)
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
    }
  ];

  // Additional ABI for v3 contract info
  const v3ABI = [
    ...contractABI,
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

  let totalWithdrawn = 0n;

  // Withdraw from each contract
  for (const [version, address] of Object.entries(CONTRACTS)) {
    try {
      console.log(`🔍 Checking contract ${version} at ${address}...`);
      
      // Use v3 ABI for v3 contract, regular ABI for others
      const abi = version === 'v3' ? v3ABI : contractABI;
      
      // Get contract info for v3
      if (version === 'v3') {
        try {
          const contractInfo = await publicClient.readContract({
            address: address,
            abi: abi,
            functionName: 'getContractInfo'
          });
          
          console.log(`📊 ${version} Contract Information:`);
          console.log(`   Version: ${contractInfo[0]}`);
          console.log(`   Total Supply: ${contractInfo[1].toString()}`);
          console.log(`   Base Mint Price: ${formatEther(contractInfo[2])} CELO`);
          console.log(`   Like Price: ${formatEther(contractInfo[3])} CELO`);
          console.log(`   Sale Fee (bps): ${contractInfo[4].toString()}`);
          console.log(`   Fee Recipient: ${contractInfo[5]}`);
        } catch (error) {
          console.log(`⚠️  Could not get contract info for ${version}: ${error.message}`);
        }
      }
      
      // Check if signer is owner
      const owner = await publicClient.readContract({
        address: address,
        abi: abi,
        functionName: 'owner'
      });
      
      console.log(`👑 ${version} owner: ${owner}`);
      
      if (owner.toLowerCase() !== account.address.toLowerCase()) {
        console.log(`❌ Signer is not owner of ${version} contract. Skipping...\n`);
        continue;
      }

      // Check contract balance
      const contractBalance = await publicClient.getBalance({ address: address });
      console.log(`💼 Contract ${version} balance: ${formatEther(contractBalance)} CELO`);

      if (contractBalance > 0n) {
        console.log(`💸 Withdrawing ${formatEther(contractBalance)} CELO from ${version}...`);
        
        // Withdraw fees
        const hash = await walletClient.writeContract({
          address: address,
          abi: abi,
          functionName: 'withdraw'
        });
        
        console.log(`📤 Transaction hash: ${hash}`);
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        totalWithdrawn += contractBalance;
        console.log(`💰 Withdrawn from ${version}: ${formatEther(contractBalance)} CELO\n`);
      } else {
        console.log(`💡 No funds to withdraw from ${version}\n`);
      }

    } catch (error) {
      console.error(`❌ Error withdrawing from ${version}:`, error.message);
      console.log(`⚠️  Skipping ${version} contract...\n`);
    }
  }

  // Check final balance
  const balanceAfter = await publicClient.getBalance({ address: account.address });
  const actualWithdrawn = balanceAfter - balanceBefore;
  
  console.log(`💰 Signer balance after: ${formatEther(balanceAfter)} CELO`);
  console.log(`💸 Total withdrawn (calculated): ${formatEther(totalWithdrawn)} CELO`);
  console.log(`💸 Actual balance increase: ${formatEther(actualWithdrawn)} CELO`);
  
  if (totalWithdrawn > 0n) {
    console.log(`🎉 Successfully withdrew fees from all contracts!`);
    console.log(`📊 Summary:`);
    for (const [version, address] of Object.entries(CONTRACTS)) {
      try {
        const balance = await publicClient.getBalance({ address: address });
        console.log(`   ${version}: ${formatEther(balance)} CELO remaining`);
      } catch (error) {
        console.log(`   ${version}: Could not check balance`);
      }
    }
  } else {
    console.log(`💡 No fees were withdrawn from any contract.`);
  }
}

// Additional utility functions
async function checkAllContractBalances() {
  console.log("🔍 Checking all contract balances...\n");

  const CONTRACTS = {
    v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a",
    v2: "0x99B905C99C552d629b889d4FeF1c10903b3BfA07",
    v3: "0x24630560efD07D7008Bb6336a6724bA0835e76c7"
  };

  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  for (const [version, address] of Object.entries(CONTRACTS)) {
    try {
      const balance = await publicClient.getBalance({ address: address });
      console.log(`📊 ${version} (${address}): ${formatEther(balance)} CELO`);
    } catch (error) {
      console.log(`❌ Could not check balance for ${version}: ${error.message}`);
    }
  }
}

async function checkAllOwnership() {
  console.log("👑 Checking contract ownership for all versions...\n");

  const CONTRACTS = {
    v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a",
    v2: "0x99B905C99C552d629b889d4FeF1c10903b3BfA07",
    v3: "0x24630560efD07D7008Bb6336a6724bA0835e76c7"
  };

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

  for (const [version, address] of Object.entries(CONTRACTS)) {
    try {
      const owner = await publicClient.readContract({
        address: address,
        abi: contractABI,
        functionName: 'owner'
      });
      
      const isOwner = owner.toLowerCase() === account.address.toLowerCase();
      
      console.log(`👤 ${version} owner: ${owner}`);
      console.log(`🔑 You are owner: ${isOwner ? '✅ Yes' : '❌ No'}\n`);
    } catch (error) {
      console.log(`❌ Could not check ownership for ${version}: ${error.message}\n`);
    }
  }
}

// Export functions for use in other scripts
module.exports = {
  main,
  checkAllContractBalances,
  checkAllOwnership
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
