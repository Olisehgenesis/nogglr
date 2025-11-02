const { run } = require("hardhat");

async function main() {
  const contractAddress = "0x24630560efD07D7008Bb6336a6724bA0835e76c7";
  const feeRecipient = "0x53eaF4CD171842d8144e45211308e5D90B4b0088";
  
  console.log("🔍 Verifying NogglrNFTv3 contract on Celo Mainnet...");
  console.log("==================================================");
  console.log("Contract Address:", contractAddress);
  console.log("Fee Recipient:", feeRecipient);
  
  // Verify Contract using standard Hardhat verification
  console.log("\n📋 Verifying NogglrNFTv3 Contract...");
  console.log("Address:", contractAddress);
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [feeRecipient],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract is already verified!");
    } else {
      console.log("❌ Verification failed:", error.message);
      console.log("\n🔧 Try manual verification:");
      console.log(`https://celoscan.io/verifyContract?a=${contractAddress}`);
    }
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
