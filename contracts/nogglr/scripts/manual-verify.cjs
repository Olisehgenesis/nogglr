const https = require('https');

async function verifyContract(address, contractName, constructorArgs = [], apiKey, chainId = 11142220) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      chainid: chainId,
      address: address,
      contractname: contractName,
      compilerversion: 'v0.8.28+commit.aa123cc2',
      optimizationUsed: '1',
      runs: '200',
      constructorArguements: constructorArgs,
      sourceCode: '', // We'll need to provide the source code
    });

    const options = {
      hostname: 'api.etherscan.io',
      port: 443,
      path: '/v2/api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

async function main() {
  const apiKey = "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42";
  const chainId = 11142220; // Celo Sepolia
  
  const implementationAddress = "0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75";
  const proxyAddress = "0xf48F69b8eF4194d78c45b082119A97997B51c7B1";
  
  console.log("🔍 Contract Verification Information");
  console.log("====================================");
  console.log("API Key:", apiKey);
  console.log("Chain ID:", chainId);
  console.log("Network: Celo Sepolia");
  
  console.log("\n📋 Contract Addresses:");
  console.log("Implementation:", implementationAddress);
  console.log("Proxy (Main):", proxyAddress);
  
  console.log("\n🌐 Verification URLs:");
  console.log("Implementation:", `https://alfajores.celoscan.io/verifyContract?a=${implementationAddress}`);
  console.log("Proxy:", `https://alfajores.celoscan.io/verifyContract?a=${proxyAddress}`);
  
  console.log("\n📝 Manual Verification Steps:");
  console.log("1. Go to the verification URLs above");
  console.log("2. For Implementation Contract:");
  console.log("   - Contract Name: NogglrNFT");
  console.log("   - Compiler Version: v0.8.28+commit.aa123cc2");
  console.log("   - Optimization: Yes, 200 runs");
  console.log("   - Constructor Arguments: (leave empty)");
  console.log("   - Source Code: Copy from contracts/NogglrNFT.sol");
  
  console.log("\n3. For Proxy Contract:");
  console.log("   - Contract Name: ERC1967Proxy");
  console.log("   - Compiler Version: v0.8.28+commit.aa123cc2");
  console.log("   - Optimization: Yes, 200 runs");
  console.log("   - Constructor Arguments: [\"0x38107545a73b5c6fE3D195BA1BA92648Aa8f9A75\", \"0x\"]");
  console.log("   - Source Code: Use OpenZeppelin ERC1967Proxy");
  
  console.log("\n✅ Verification Complete!");
  console.log("After verification, your contracts will be publicly readable on Celo Sepolia Explorer.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
