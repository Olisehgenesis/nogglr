const { ethers } = require("ethers");

async function main() {
  const proxyAddress = "0x9C4691649b919B42E955DaFB3533f0855366c0d1";
  
  console.log("Contract Addresses:");
  console.log("===================");
  console.log("Proxy Contract (Main):", proxyAddress);
  console.log("");
  console.log("To get implementation and admin addresses, you need to:");
  console.log("1. Connect to the Celo Sepolia network");
  console.log("2. Call the following functions on the proxy:");
  console.log("   - Implementation: await upgrades.erc1967.getImplementationAddress(proxyAddress)");
  console.log("   - Admin: await upgrades.erc1967.getAdminAddress(proxyAddress)");
  console.log("");
  console.log("Or check the deployment logs for the implementation address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
