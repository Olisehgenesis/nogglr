import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyContract() {
  const contractAddress = '0x99B905C99C552d629b889d4FeF1c10903b3BfA07';
  const chainId = 42220; // Celo mainnet
  
  // Read the contract source code
  const contractPath = path.join(__dirname, '../contracts/NogglrNFTv2.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');
  
  // Read the ABI
  const abiPath = path.join(__dirname, '../artifacts/contracts/NogglrNFTv2.sol/NogglrNFTv2.json');
  const contractArtifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  
  console.log('Contract Address:', contractAddress);
  console.log('Chain ID:', chainId);
  console.log('Contract Name:', contractArtifact.contractName);
  console.log('Compiler Version:', contractArtifact.compilerVersion);
  
  // Prepare verification data
  const verificationData = {
    apikey: process.env.ETHERSCAN_API_KEY || 'H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42',
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: contractAddress,
    sourceCode: contractSource,
    codeformat: 'solidity-single-file',
    contractname: contractArtifact.contractName,
    compilerversion: 'v0.8.28+commit.93fd099d',
    optimizationUsed: '1',
    runs: '200',
    constructorArguements: ''
  };
  
  console.log('\nVerification data prepared:');
  console.log('- Contract Name:', verificationData.contractname);
  console.log('- Compiler Version:', verificationData.compilerversion);
  console.log('- Optimization:', verificationData.optimizationUsed);
  console.log('- Runs:', verificationData.runs);
  
  // Make the verification request to CeloScan
  const formData = new URLSearchParams();
  Object.keys(verificationData).forEach(key => {
    formData.append(key, verificationData[key]);
  });
  
  try {
    const response = await fetch('https://api.celoscan.io/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.status === '1') {
      console.log('\n✅ Contract verification submitted successfully!');
      console.log('GUID:', result.result);
      console.log('\nYou can check the verification status at:');
      console.log(`https://celoscan.io/address/${contractAddress}#code`);
    } else {
      console.log('\n❌ Verification failed:');
      console.log('Status:', result.status);
      console.log('Message:', result.message);
      console.log('Result:', result.result);
    }
  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifyContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
