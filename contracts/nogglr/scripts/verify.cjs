const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0xf48F69b8eF4194d78c45b082119A97997B51c7B1";
  const implementationAddress = "0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75";
  const apiKey = "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42";
  const chainId = 11142220; // Celo Sepolia
  
  console.log("🔍 Verifying contracts on Celo Sepolia...");
  console.log("=====================================");
  
  // Verify Implementation Contract
  console.log("\n📋 Verifying Implementation Contract...");
  console.log("Address:", implementationAddress);
  
  try {
    const verifyImplementation = await ethers.provider.send("hardhat_verify", {
      address: implementationAddress,
      contract: "contracts/NogglrNFT.sol:NogglrNFT",
      constructorArguments: [],
    });
    console.log("✅ Implementation contract verified!");
  } catch (error) {
    console.log("❌ Implementation verification failed:", error.message);
  }
  
  // Verify Proxy Contract using Etherscan V2 API
  console.log("\n📋 Verifying Proxy Contract...");
  console.log("Address:", proxyAddress);
  
  try {
    const verifyProxy = await ethers.provider.send("hardhat_verify", {
      address: proxyAddress,
      contract: "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy",
      constructorArguments: [implementationAddress, "0x"],
    });
    console.log("✅ Proxy contract verified!");
  } catch (error) {
    console.log("❌ Proxy verification failed:", error.message);
  }
  
  console.log("\n🌐 View on Celo Sepolia Explorer:");
  console.log("Implementation:", `https://alfajores.celoscan.io/address/${implementationAddress}`);
  console.log("Proxy (Main):", `https://alfajores.celoscan.io/address/${proxyAddress}`);
  
  console.log("\n📝 Manual verification URLs:");
  console.log("Implementation:", `https://alfajores.celoscan.io/verifyContract?a=${implementationAddress}`);
  console.log("Proxy:", `https://alfajores.celoscan.io/verifyContract?a=${proxyAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
