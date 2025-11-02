import { getContractFactory, deployContract } from "hardhat";

async function main() {
  console.log("Deploying NogglrNFTv2...");

  // Deploy the implementation contract
  const NogglrNFTv2 = await getContractFactory("NogglrNFTv2");
  const nogglrNFTv2Impl = await deployContract(NogglrNFTv2, []);
  
  console.log("NogglrNFTv2 implementation deployed to:", nogglrNFTv2Impl.address);

  // Deploy ProxyAdmin
  const ProxyAdmin = await getContractFactory("ProxyAdmin");
  const proxyAdmin = await deployContract(ProxyAdmin, []);
  
  console.log("ProxyAdmin deployed to:", proxyAdmin.address);

  // Deploy TransparentUpgradeableProxy
  const TransparentUpgradeableProxy = await getContractFactory("TransparentUpgradeableProxy");
  
  // Encode the initialize function call
  const initializeData = NogglrNFTv2.interface.encodeFunctionData("initialize", []);
  
  const proxy = await deployContract(TransparentUpgradeableProxy, [
    nogglrNFTv2Impl.address,
    proxyAdmin.address,
    initializeData
  ]);
  
  console.log("TransparentUpgradeableProxy deployed to:", proxy.address);
  
  console.log("Deployment complete!");
  console.log("Contract addresses:");
  console.log("- NogglrNFTv2 Implementation:", nogglrNFTv2Impl.address);
  console.log("- ProxyAdmin:", proxyAdmin.address);
  console.log("- NogglrNFTv2 Proxy:", proxy.address);
  
  // Verify the contract is working
  console.log("\nVerifying deployment...");
  const contract = NogglrNFTv2.attach(proxy.address);
  
  try {
    const contractInfo = await contract.getContractInfo();
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
