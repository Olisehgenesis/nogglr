const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0x9C4691649b919B42E955DaFB3533f0855366c0d1"; // Replace with your deployed proxy address
  
  console.log("Contract Addresses:");
  console.log("===================");
  console.log("Proxy Contract (Main):", proxyAddress);
  console.log("Implementation Contract:", "0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75");
  
  try {
    const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log("ProxyAdmin Contract:", adminAddress);
  } catch (error) {
    console.log("ProxyAdmin Contract: Could not retrieve (might be UUPS pattern)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
