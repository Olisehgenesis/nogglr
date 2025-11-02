const { run } = require("hardhat");

async function main() {
  // Update these values after deployment
  const contractAddress = "0xdf7614341f6f5775569462550f219F5b4381724A"; // Replace with actual deployed address
  const feeRecipient = "0x0000000000000000000000000000000000000000"; // Replace with actual fee recipient
  
  console.log("🔍 Verifying Nogglrv3BETA contract...");
  console.log("==================================================");
  console.log("Contract Address:", contractAddress);
  console.log("Fee Recipient:", feeRecipient);
  
  // Verify Contract using standard Hardhat verification
  console.log("\n📋 Verifying Nogglrv3BETA Contract...");
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
      if (hre.network.name === "celo") {
        console.log(`https://celoscan.io/verifyContract?a=${contractAddress}`);
      } else if (hre.network.name === "celoSepolia") {
        console.log(`https://alfajores.celoscan.io/verifyContract?a=${contractAddress}`);
      }
    }
  }
  
  console.log("\n🌐 View on Block Explorer:");
  if (hre.network.name === "celo") {
    console.log(`https://celoscan.io/address/${contractAddress}`);
  } else if (hre.network.name === "celoSepolia") {
    console.log(`https://alfajores.celoscan.io/address/${contractAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Verification failed:", error);
    process.exit(1);
  });
