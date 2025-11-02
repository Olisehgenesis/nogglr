# NogglrNFT Fee Withdrawal Scripts

This directory contains scripts to withdraw accumulated fees from NogglrNFT contracts.

## Available Scripts

### 1. `withdrawFees-v3.cjs` / `withdrawFees-v3.ts`
**Purpose**: Withdraw fees specifically from NogglrNFTv3 contract
**Contract**: `0x24630560efD07D7008Bb6336a6724bA0835e76c7`

### 2. `withdrawAllFees.cjs`
**Purpose**: Withdraw fees from all NogglrNFT contract versions (v1, v2, v3)
**Contracts**: 
- v1: `0x0cc096b1cc568a22c1f02dab769881d1afe6161a`
- v2: `0x99B905C99C552d629b889d4FeF1c10903b3BfA07`
- v3: `0x24630560efD07D7008Bb6336a6724bA0835e76c7`

### 3. `withdrawFees.cjs` / `withdrawFees.ts`
**Purpose**: Original withdraw script for v1/v2 contracts

## Setup

1. **Install dependencies**:
   ```bash
   cd contracts/nogglr
   pnpm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the `contracts/nogglr` directory:
   ```env
   PRIVATE_KEY=your_private_key_here
   ```

3. **Ensure you have CELO for gas fees**:
   The scripts will check your balance before attempting withdrawals.

## Usage

### Withdraw from v3 contract only:
```bash
# JavaScript version
node scripts/withdrawFees-v3.cjs

# TypeScript version (if you have ts-node)
npx ts-node scripts/withdrawFees-v3.ts
```

### Withdraw from all contracts:
```bash
node scripts/withdrawAllFees.cjs
```

### Check contract balances:
```bash
node -e "require('./scripts/withdrawAllFees.cjs').checkAllContractBalances()"
```

### Check ownership:
```bash
node -e "require('./scripts/withdrawAllFees.cjs').checkAllOwnership()"
```

## What the Scripts Do

1. **Connect to Celo network** using your private key
2. **Check contract ownership** - only the owner can withdraw fees
3. **Display contract information** (for v3: version, supply, prices, etc.)
4. **Check contract balances** to see available fees
5. **Withdraw fees** if any are available
6. **Wait for transaction confirmation**
7. **Display summary** of withdrawn amounts

## Security Notes

- ⚠️ **Never commit your private key to version control**
- 🔒 **Only the contract owner can withdraw fees**
- 💰 **Ensure you have enough CELO for gas fees**
- 📝 **All transactions are logged with hashes for verification**

## Contract Information

### NogglrNFTv3 (Current)
- **Address**: `0x24630560efD07D7008Bb6336a6724bA0835e76c7`
- **Features**: On-chain SVG storage, improved gas efficiency
- **Fee Structure**: 
  - Mint fees: 1.0 CELO minimum
  - Like fees: 0.1 CELO
  - Sale fees: Configurable basis points

### Fee Distribution
- **App Fee**: 50% of like price goes to app
- **Owner Fee**: 50% of like price goes to NFT owner
- **Sale Fees**: Configurable percentage of sale price

## Troubleshooting

### "Signer is not owner" Error
- Only the contract owner can withdraw fees
- Check that you're using the correct private key
- Verify the contract ownership on the block explorer

### "No funds to withdraw" Message
- The contract has no accumulated fees
- This is normal if no transactions have occurred recently

### Gas Estimation Errors
- Ensure you have enough CELO for gas fees
- Check network connectivity
- Verify contract addresses are correct

## Example Output

```
🚀 Starting NogglrNFTv3 fee withdrawal process...

📝 Withdrawing fees as: 0x1234...5678

💰 Signer balance before: 1.5 CELO

🔍 Checking NogglrNFTv3 contract at 0x24630560efD07D7008Bb6336a6724bA0835e76c7...
📊 Contract Information:
   Version: NogglrNFTv3
   Total Supply: 150
   Base Mint Price: 1.0 CELO
   Like Price: 0.1 CELO
   Sale Fee (bps): 250
   Fee Recipient: 0x1234...5678

👑 Contract owner: 0x1234...5678
🔑 You are owner: ✅ Yes

💼 Contract balance: 2.5 CELO
💸 Withdrawing 2.5 CELO from NogglrNFTv3...
📤 Transaction hash: 0xabc123...
✅ Withdrawal confirmed in block 12345
⛽ Gas used: 21000

💰 Signer balance after: 4.0 CELO
💸 Total withdrawn: 2.5 CELO
🎉 Successfully withdrew 2.5 CELO in fees from NogglrNFTv3!
```
