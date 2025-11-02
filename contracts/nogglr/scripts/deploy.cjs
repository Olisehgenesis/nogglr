const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying NogglrNFT...");
  
  const NogglrNFT = await ethers.getContractFactory("NogglrNFT");
  const nogglrNFT = await upgrades.deployProxy(NogglrNFT, [], {
    initializer: "initialize",
  });
  
  await nogglrNFT.deployed();
  console.log("NogglrNFT deployed to:", nogglrNFT.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
