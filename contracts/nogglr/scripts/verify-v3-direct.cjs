const { execSync } = require('child_process');

async function main() {
  const contractAddress = "0x24630560efD07D7008Bb6336a6724bA0835e76c7";
  const feeRecipient = "0x53eaF4CD171842d8144e45211308e5D90B4b0088";
  
  console.log("🔍 Verifying NogglrNFTv3 contract on Celo Mainnet...");
  console.log("==================================================");
  console.log("Contract Address:", contractAddress);
  console.log("Fee Recipient:", feeRecipient);
  
  try {
    // Use dotenvx to inject environment variables and run hardhat verify directly
    const command = `dotenvx run -- npx hardhat verify --network celo ${contractAddress} "${feeRecipient}"`;
    console.log("Running:", command);
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
    console.log("\n🔧 Try manual verification:");
    console.log(`https://celoscan.io/verifyContract?a=${contractAddress}`);
  }
  
  console.log("\n🌐 View on CeloScan:");
  console.log(`https://celoscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Verification failed:", error);
    process.exit(1);
  });
