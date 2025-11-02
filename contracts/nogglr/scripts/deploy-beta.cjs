const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Nogglrv3BETA (Beta Version with Full Marketplace Features)...");

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
  console.log("🔨 Deploying Nogglrv3BETA...");
  const Nogglrv3BETA = await hre.ethers.getContractFactory("Nogglrv3BETA");
  const nogglrv3BETA = await Nogglrv3BETA.deploy(feeRecipient);

  // Wait for deployment to complete
  await nogglrv3BETA.deployed();

  console.log("✅ Nogglrv3BETA deployed to:", nogglrv3BETA.address);
  console.log("📄 Transaction hash:", nogglrv3BETA.deployTransaction.hash);

  // Get contract info
  const contractInfo = await nogglrv3BETA.getContractInfo();
  console.log("\n📊 Contract Information:");
  console.log("   Version:", contractInfo[0]);
  console.log("   Total Supply:", contractInfo[1].toString());
  console.log("   Base Mint Price:", hre.ethers.utils.formatEther(contractInfo[2]), "CELO");
  console.log("   Like Price:", hre.ethers.utils.formatEther(contractInfo[3]), "CELO");
  console.log("   Sale Fee (bps):", contractInfo[4].toString());
  console.log("   Fee Recipient:", contractInfo[5]);

  // Wait for a few block confirmations before verifying
  console.log("\n⏳ Waiting for block confirmations...");
  await nogglrv3BETA.deployTransaction.wait(5);

  // Verify contract on block explorer
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: nogglrv3BETA.address,
        constructorArguments: [feeRecipient],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
      console.log("You can verify manually later with:");
      console.log(`npx hardhat verify --network ${hre.network.name} ${nogglrv3BETA.address} ${feeRecipient}`);
    }
  }

  // Save deployment info
  console.log("\n💾 Deployment Summary:");
  console.log("=====================================");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", nogglrv3BETA.address);
  console.log("Deployer:", deployer.address);
  console.log("Fee Recipient:", feeRecipient);
  console.log("Block Number:", nogglrv3BETA.deployTransaction.blockNumber);
  console.log("=====================================");

  return nogglrv3BETA.address;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });
