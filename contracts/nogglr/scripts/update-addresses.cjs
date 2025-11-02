const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Contract Address Update Script");
  console.log("=================================");
  
  // Get the deployed contract address from command line or environment
  const contractAddress = process.argv[2] || process.env.DEPLOYED_CONTRACT_ADDRESS;
  const feeRecipient = process.argv[3] || process.env.FEE_RECIPIENT;
  
  if (!contractAddress) {
    console.log("❌ Please provide the deployed contract address:");
    console.log("Usage: node scripts/update-addresses.cjs <contractAddress> [feeRecipient]");
    console.log("Or set DEPLOYED_CONTRACT_ADDRESS environment variable");
    process.exit(1);
  }
  
  console.log("📝 Updating contract addresses...");
  console.log("Contract Address:", contractAddress);
  console.log("Fee Recipient:", feeRecipient || "Not specified");
  
  // Files to update
  const filesToUpdate = [
    {
      path: path.join(__dirname, '../../src/config/contract.ts'),
      search: /contractAddress: '0x0000000000000000000000000000000000000000'/g,
      replace: `contractAddress: '${contractAddress}'`
    },
    {
      path: path.join(__dirname, '../../src/hooks/useNogglrv3.ts'),
      search: /const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"/g,
      replace: `const CONTRACT_ADDRESS = "${contractAddress}"`
    },
    {
      path: path.join(__dirname, '../../src/hooks/useNogglrBeta.ts'),
      search: /const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"/g,
      replace: `const CONTRACT_ADDRESS = "${contractAddress}"`
    },
    {
      path: path.join(__dirname, '../../src/config/contractBeta.ts'),
      search: /contractAddress: '0x0000000000000000000000000000000000000000'/g,
      replace: `contractAddress: '${contractAddress}'`
    },
    {
      path: path.join(__dirname, 'verify-beta.cjs'),
      search: /const contractAddress = "0x0000000000000000000000000000000000000000"/g,
      replace: `const contractAddress = "${contractAddress}"`
    }
  ];
  
  // Update fee recipient if provided
  if (feeRecipient) {
    filesToUpdate.push({
      path: path.join(__dirname, 'verify-beta.cjs'),
      search: /const feeRecipient = "0x0000000000000000000000000000000000000000"/g,
      replace: `const feeRecipient = "${feeRecipient}"`
    });
  }
  
  let updatedFiles = 0;
  
  for (const file of filesToUpdate) {
    try {
      if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        const originalContent = content;
        
        content = content.replace(file.search, file.replace);
        
        if (content !== originalContent) {
          fs.writeFileSync(file.path, content, 'utf8');
          console.log(`✅ Updated: ${path.relative(process.cwd(), file.path)}`);
          updatedFiles++;
        } else {
          console.log(`⚠️  No changes needed: ${path.relative(process.cwd(), file.path)}`);
        }
      } else {
        console.log(`❌ File not found: ${path.relative(process.cwd(), file.path)}`);
      }
    } catch (error) {
      console.log(`❌ Error updating ${path.relative(process.cwd(), file.path)}:`, error.message);
    }
  }
  
  console.log("\n📊 Summary:");
  console.log(`Updated ${updatedFiles} files with contract address: ${contractAddress}`);
  if (feeRecipient) {
    console.log(`Fee recipient: ${feeRecipient}`);
  }
  
  console.log("\n🔍 Next steps:");
  console.log("1. Verify the contract: pnpm run verify-beta-mainnet");
  console.log("2. Test the frontend with the new contract address");
  console.log("3. Update any environment variables if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Update failed:", error);
    process.exit(1);
  });
