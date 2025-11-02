const { createPublicClient, http } = require('viem');
const { celo } = require('viem/chains');
require('dotenv').config();

async function checkContract() {
  console.log("🔍 Checking contract functions...\n");

  const contractAddress = "0x0cc096b1cc568a22c1f02dab769881d1afe6161a";
  
  const publicClient = createPublicClient({
    chain: celo,
    transport: http()
  });

  // Try to get the contract code to see if it exists
  try {
    const code = await publicClient.getBytecode({ address: contractAddress });
    if (!code || code === '0x') {
      console.log("❌ No contract found at this address");
      return;
    }
    console.log("✅ Contract exists at address");
  } catch (error) {
    console.log("❌ Error checking contract:", error.message);
    return;
  }

  // Try different possible function signatures
  const possibleFunctions = [
    { name: 'withdraw', signature: '0x3ccfd60b' },
    { name: 'withdrawFees', signature: '0x12345678' },
    { name: 'owner', signature: '0x8da5cb5b' },
    { name: 'getBalance', signature: '0x12065fe0' },
    { name: 'balance', signature: '0x12065fe0' }
  ];

  console.log("🔍 Testing function signatures...\n");

  for (const func of possibleFunctions) {
    try {
      // Try to call the function (this will fail but give us info)
      await publicClient.call({
        to: contractAddress,
        data: func.signature
      });
      console.log(`✅ ${func.name} (${func.signature}) - Function exists`);
    } catch (error) {
      if (error.message.includes('execution reverted')) {
        console.log(`✅ ${func.name} (${func.signature}) - Function exists but reverted`);
      } else if (error.message.includes('invalid opcode')) {
        console.log(`❌ ${func.name} (${func.signature}) - Function does not exist`);
      } else {
        console.log(`❓ ${func.name} (${func.signature}) - Unknown error: ${error.message}`);
      }
    }
  }

  // Try to get the owner
  try {
    const ownerABI = [
      {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const owner = await publicClient.readContract({
      address: contractAddress,
      abi: ownerABI,
      functionName: 'owner'
    });
    
    console.log(`\n👤 Contract owner: ${owner}`);
  } catch (error) {
    console.log(`❌ Could not get owner: ${error.message}`);
  }

  // Try to get contract balance
  try {
    const balance = await publicClient.getBalance({ address: contractAddress });
    console.log(`💰 Contract balance: ${balance.toString()} wei`);
  } catch (error) {
    console.log(`❌ Could not get balance: ${error.message}`);
  }
}

checkContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });
