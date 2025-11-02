const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying NogglrNFTv2...");
  
  const NogglrNFTv2 = await ethers.getContractFactory("NogglrNFTv2");
  const nogglrNFTv2 = await upgrades.deployProxy(NogglrNFTv2, [], {
    initializer: "initialize",
  });
  
  await nogglrNFTv2.deployed();
  console.log("NogglrNFTv2 deployed to:", nogglrNFTv2.address);
  
  // Verify the contract is working
  console.log("\nVerifying deployment...");
  
  try {
    const contractInfo = await nogglrNFTv2.getContractInfo();
    console.log("Contract Info:");
    console.log("- Version:", contractInfo.version);
    console.log("- Verified:", contractInfo.verified);
    console.log("- Total Supply:", contractInfo.totalSupply.toString());
    console.log("- Mint Price:", contractInfo.currentMintPrice.toString());
    console.log("- Like Price:", contractInfo.currentLikePrice.toString());
    
    console.log("\n✅ Deployment verification successful!");
  } catch (error) {
    console.error("❌ Deployment verification failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
