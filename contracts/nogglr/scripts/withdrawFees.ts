import { createWalletClient, createPublicClient, http, formatEther, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  console.log("🚀 Starting fee withdrawal process...\n");

  // Contract addresses (update these with your deployed contracts)
  const CONTRACTS = {
    v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a", // NogglrNFT v1
    v2: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a", // NogglrNFTv2 (update with actual address)
  };

  // Get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }

  // Create account and clients
  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}` as `0x${string}`);
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

  // Contract ABI for withdraw function
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
  ] as const;

  // Withdraw from each contract
  for (const [version, address] of Object.entries(CONTRACTS)) {
    try {
      console.log(`🔍 Checking contract ${version} at ${address}...`);
      
      // Check if signer is owner
      const owner = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: contractABI,
        functionName: 'owner'
      });
      
      if (owner.toLowerCase() !== account.address.toLowerCase()) {
        console.log(`❌ Signer is not owner of ${version} contract. Owner: ${owner}`);
        continue;
      }

      // Check contract balance
      const contractBalance = await publicClient.getBalance({ address: address as `0x${string}` });
      console.log(`💼 Contract ${version} balance: ${formatEther(contractBalance)} CELO`);

      if (contractBalance > 0n) {
        console.log(`💸 Withdrawing ${formatEther(contractBalance)} CELO from ${version}...`);
        
        // Withdraw fees
        const hash = await walletClient.writeContract({
          address: address as `0x${string}`,
          abi: contractABI,
          functionName: 'withdraw'
        });
        
        console.log(`📤 Transaction hash: ${hash}`);
        
        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}\n`);
      } else {
        console.log(`💡 No funds to withdraw from ${version}\n`);
      }

    } catch (error) {
      console.error(`❌ Error withdrawing from ${version}:`, error);
      console.log(`⚠️  Skipping ${version} contract...\n`);
    }
  }

  // Check final balance
  const balanceAfter = await publicClient.getBalance({ address: account.address });
  const withdrawn = balanceAfter - balanceBefore;
  
  console.log(`💰 Signer balance after: ${formatEther(balanceAfter)} CELO`);
  console.log(`💸 Total withdrawn: ${formatEther(withdrawn)} CELO`);
  
  if (withdrawn > 0n) {
    console.log(`🎉 Successfully withdrew ${formatEther(withdrawn)} CELO in fees!`);
  } else {
    console.log(`💡 No fees were withdrawn.`);
  }
}

// Additional utility functions
export async function checkContractBalances() {
  console.log("🔍 Checking all contract balances...\n");

  const CONTRACTS = {
    v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a",
    v2: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a",
  };

  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  for (const [version, address] of Object.entries(CONTRACTS)) {
    try {
      const balance = await publicClient.getBalance({ address: address as `0x${string}` });
      console.log(`📊 ${version} (${address}): ${formatEther(balance)} CELO`);
    } catch (error) {
      console.log(`❌ Could not check balance for ${version}: ${error}`);
    }
  }
}

export async function checkOwnership() {
  console.log("👑 Checking contract ownership...\n");

  const CONTRACTS = {
    v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a",
    v2: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a",
  };

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("❌ PRIVATE_KEY not found in environment variables");
  }

  const account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}` as `0x${string}`);
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
  ] as const;

  for (const [version, address] of Object.entries(CONTRACTS)) {
    try {
      const owner = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: contractABI,
        functionName: 'owner'
      });
      
      const isOwner = owner.toLowerCase() === account.address.toLowerCase();
      
      console.log(`👤 ${version} owner: ${owner}`);
      console.log(`🔑 You are owner: ${isOwner ? '✅ Yes' : '❌ No'}\n`);
    } catch (error) {
      console.log(`❌ Could not check ownership for ${version}: ${error}\n`);
    }
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Script failed:", error);
      process.exit(1);
    });
}
