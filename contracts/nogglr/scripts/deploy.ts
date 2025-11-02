import { getContractFactory, deployContract } from "hardhat";

async function main() {
  console.log("Deploying NogglrNFT...");

  // Deploy the implementation contract
  const NogglrNFT = await getContractFactory("NogglrNFT");
  const nogglrNFTImpl = await deployContract(NogglrNFT, []);
  
  console.log("NogglrNFT implementation deployed to:", nogglrNFTImpl.address);

  // Deploy ProxyAdmin
  const ProxyAdmin = await getContractFactory("ProxyAdmin");
  const proxyAdmin = await deployContract(ProxyAdmin, []);
  
  console.log("ProxyAdmin deployed to:", proxyAdmin.address);

  // Deploy TransparentUpgradeableProxy
  const TransparentUpgradeableProxy = await getContractFactory("TransparentUpgradeableProxy");
  
  // Encode the initialize function call
  const initializeData = NogglrNFT.interface.encodeFunctionData("initialize", []);
  
  const proxy = await deployContract(TransparentUpgradeableProxy, [
    nogglrNFTImpl.address,
    proxyAdmin.address,
    initializeData
  ]);
  
  console.log("TransparentUpgradeableProxy deployed to:", proxy.address);
  
  console.log("Deployment complete!");
  console.log("Contract addresses:");
  console.log("- NogglrNFT Implementation:", nogglrNFTImpl.address);
  console.log("- ProxyAdmin:", proxyAdmin.address);
  console.log("- NogglrNFT Proxy:", proxy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
