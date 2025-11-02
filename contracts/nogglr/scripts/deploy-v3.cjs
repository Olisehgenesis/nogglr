const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying NogglrNFTv3 (On-Chain SVG Storage)...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with the account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "CELO");

  // Fee recipient address (use deployer or set a specific address)
  const feeRecipient = deployer.address;
  console.log("💵 Fee recipient:", feeRecipient);

  // Deploy the contract
  console.log("🔨 Deploying NogglrNFTv3...");
  const NogglrNFTv3 = await hre.ethers.getContractFactory("NogglrNFTv3");
  const nogglrNFTv3 = await NogglrNFTv3.deploy(feeRecipient);

  // Wait for deployment to complete
  await nogglrNFTv3.deployed();

  console.log("✅ NogglrNFTv3 deployed to:", nogglrNFTv3.address);
  console.log("📄 Transaction hash:", nogglrNFTv3.deployTransaction.hash);

  // Get contract info
  const contractInfo = await nogglrNFTv3.getContractInfo();
  console.log("\n📊 Contract Information:");
  console.log("   Version:", contractInfo[0]);
  console.log("   Total Supply:", contractInfo[1].toString());
  console.log("   Base Mint Price:", hre.ethers.utils.formatEther(contractInfo[2]), "CELO");
  console.log("   Like Price:", hre.ethers.utils.formatEther(contractInfo[3]), "CELO");
  console.log("   Sale Fee (bps):", contractInfo[4].toString());
  console.log("   Fee Recipient:", contractInfo[5]);

  // Wait for a few block confirmations before verifying
  console.log("\n⏳ Waiting for block confirmations...");
  await nogglrNFTv3.deployTransaction.wait(5);

  // Verify contract on block explorer
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: nogglrNFTv3.address,
        constructorArguments: [feeRecipient],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
      console.log("You can verify manually later with:");
      console.log(`npx hardhat verify --network ${hre.network.name} ${nogglrNFTv3.address} ${feeRecipient}`);
    }
  }

  // Save deployment info
  console.log("\n💾 Deployment Summary:");
  console.log("=====================================");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", nogglrNFTv3.address);
  console.log("Deployer:", deployer.address);
  console.log("Fee Recipient:", feeRecipient);
  console.log("Block Number:", nogglrNFTv3.deployTransaction.blockNumber);
  console.log("=====================================");

  return nogglrNFTv3.address;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });