const https = require('https');
const fs = require('fs');
const path = require('path');

// Read the contract source code
function readContractSource() {
  const contractPath = path.join(__dirname, '../contracts/NogglrNFT.sol');
  return fs.readFileSync(contractPath, 'utf8');
}

// Make API request to Etherscan
function makeApiRequest(postData) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.etherscan.io',
      port: 443,
      path: '/v2/api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Verify Implementation Contract
async function verifyImplementation() {
  const apiKey = "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42";
  const chainId = 11142220; // Celo Sepolia
  const address = "0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75";
  
  console.log("🔍 Verifying Implementation Contract...");
  console.log("Address:", address);
  
  const sourceCode = readContractSource();
  
  const postData = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    chainid: chainId,
    address: address,
    contractname: 'NogglrNFT',
    compilerversion: 'v0.8.28+commit.aa123cc2',
    optimizationUsed: '1',
    runs: '200',
    constructorArguements: '',
    sourceCode: sourceCode
  }).toString();

  try {
    const response = await makeApiRequest(postData);
    console.log("Response:", response);
    
    if (response.status === '1') {
      console.log("✅ Implementation contract verification submitted!");
      console.log("GUID:", response.result);
      console.log("Check status at: https://alfajores.celoscan.io/address/" + address);
    } else {
      console.log("❌ Verification failed:", response.message);
    }
  } catch (error) {
    console.log("❌ API Error:", error.message);
  }
}

// Verify Proxy Contract
async function verifyProxy() {
  const apiKey = "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42";
  const chainId = 11142220; // Celo Sepolia
  const address = "0xf48F69b8eF4194d78c45b082119A97997B51c7B1";
  const implementationAddress = "0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75";
  
  console.log("\n🔍 Verifying Proxy Contract...");
  console.log("Address:", address);
  
  // ERC1967Proxy source code
  const proxySourceCode = `// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.0) (proxy/ERC1967/ERC1967Proxy.sol)

pragma solidity ^0.8.0;

import "../Proxy.sol";
import "./ERC1967Upgrade.sol";

contract ERC1967Proxy is Proxy, ERC1967Upgrade {
    constructor(address implementation, bytes memory _data) payable {
        _upgradeToAndCall(implementation, _data, false);
    }

    function _implementation() internal view virtual override returns (address impl) {
        return ERC1967Upgrade._getImplementation();
    }
}`;

  const constructorArgs = JSON.stringify([implementationAddress, "0x"]);
  
  const postData = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    chainid: chainId,
    address: address,
    contractname: 'ERC1967Proxy',
    compilerversion: 'v0.8.28+commit.aa123cc2',
    optimizationUsed: '1',
    runs: '200',
    constructorArguements: constructorArgs,
    sourceCode: proxySourceCode
  }).toString();

  try {
    const response = await makeApiRequest(postData);
    console.log("Response:", response);
    
    if (response.status === '1') {
      console.log("✅ Proxy contract verification submitted!");
      console.log("GUID:", response.result);
      console.log("Check status at: https://alfajores.celoscan.io/address/" + address);
    } else {
      console.log("❌ Verification failed:", response.message);
    }
  } catch (error) {
    console.log("❌ API Error:", error.message);
  }
}

// Check verification status
async function checkVerificationStatus(address, guid) {
  const apiKey = "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42";
  const chainId = 11142220;
  
  const postData = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'checkverifystatus',
    chainid: chainId,
    guid: guid
  }).toString();

  try {
    const response = await makeApiRequest(postData);
    console.log("Verification Status:", response);
    return response;
  } catch (error) {
    console.log("❌ Status Check Error:", error.message);
  }
}

async function main() {
  console.log("🚀 Starting Contract Verification via Etherscan V2 API");
  console.log("=====================================================");
  console.log("API Key:", "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42");
  console.log("Chain ID:", "11142220 (Celo Sepolia)");
  
  // Verify Implementation Contract
  await verifyImplementation();
  
  // Wait a bit between requests
  console.log("\n⏳ Waiting 5 seconds before next verification...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify Proxy Contract
  await verifyProxy();
  
  console.log("\n✅ Verification process completed!");
  console.log("\n📋 Contract Addresses:");
  console.log("Implementation:", "0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75");
  console.log("Proxy (Main):", "0xf48F69b8eF4194d78c45b082119A97997B51c7B1");
  
  console.log("\n🌐 Check verification status on Celo Sepolia Explorer:");
  console.log("Implementation:", "https://alfajores.celoscan.io/address/0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75");
  console.log("Proxy:", "https://alfajores.celoscan.io/address/0xf48F69b8eF4194d78c45b082119A97997B51c7B1");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
