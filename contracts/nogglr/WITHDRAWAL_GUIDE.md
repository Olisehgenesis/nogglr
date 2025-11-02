# 💸 Fee Withdrawal Guide

This guide explains how to withdraw accumulated fees from your Nogglr NFT contracts using the automated withdrawal script.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd contracts/nogglr
pnpm install
```

### 2. Set Up Environment Variables
Create a `.env` file in the `contracts/nogglr` directory:
```env
PRIVATE_KEY=your_private_key_here
CELOSCAN_API_KEY=your_celoscan_api_key_here
```

### 3. Update Contract Addresses
Edit `scripts/withdrawFees.ts` and update the contract addresses:
```typescript
const CONTRACTS = {
  v1: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a", // Your v1 contract
  v2: "0x0cc096b1cc568a22c1f02dab769881d1afe6161a", // Your v2 contract
};
```

## 📋 Available Commands

### Withdraw All Fees
```bash
pnpm withdraw
```
This command will:
- Check your ownership of each contract
- Display current contract balances
- Withdraw all accumulated fees
- Show transaction details and final balance

### Check Contract Balances
```bash
pnpm check-balances
```
Shows the current balance of each contract without withdrawing.

### Check Contract Ownership
```bash
pnpm check-ownership
```
Verifies that your private key corresponds to the owner of each contract.

## 🔧 How It Works

### 1. **Environment Setup**
- Uses `dotenvx` to securely load your private key
- Connects to Celo network via viem
- Creates wallet and public clients for blockchain interaction

### 2. **Ownership Verification**
- Checks if your address is the owner of each contract
- Skips contracts where you're not the owner
- Provides clear error messages for unauthorized access

### 3. **Balance Checking**
- Retrieves current CELO balance for each contract
- Shows formatted amounts in CELO
- Identifies contracts with no funds to withdraw

### 4. **Fee Withdrawal**
- Calls the `withdraw()` function on each contract
- Waits for transaction confirmation
- Shows gas usage and block confirmation
- Calculates total withdrawn amount

### 5. **Final Summary**
- Displays balance before and after withdrawal
- Shows total amount withdrawn
- Provides success/failure status

## 🛡️ Security Features

### Private Key Protection
- Private key loaded from environment variables only
- Never logged or exposed in console output
- Uses secure viem account creation

### Transaction Safety
- Only withdraws from contracts you own
- Validates ownership before attempting withdrawal
- Handles errors gracefully without exposing sensitive data

### Network Security
- Connects to official Celo network
- Uses secure HTTP transport
- Validates all contract interactions

## 📊 Example Output

```
🚀 Starting fee withdrawal process...

📝 Withdrawing fees as: 0x1234...5678

💰 Signer balance before: 5.5 CELO

🔍 Checking contract v1 at 0x0cc096b1cc568a22c1f02dab769881d1afe6161a...
💼 Contract v1 balance: 2.3 CELO
💸 Withdrawing 2.3 CELO from v1...
📤 Transaction hash: 0xabc123...
✅ Withdrawal confirmed in block 12345
⛽ Gas used: 21000

🔍 Checking contract v2 at 0x0cc096b1cc568a22c1f02dab769881d1afe6161a...
💼 Contract v2 balance: 1.7 CELO
💸 Withdrawing 1.7 CELO from v2...
📤 Transaction hash: 0xdef456...
✅ Withdrawal confirmed in block 12346
⛽ Gas used: 21000

💰 Signer balance after: 9.5 CELO
💸 Total withdrawn: 4.0 CELO
🎉 Successfully withdrew 4.0 CELO in fees!
```

## ⚠️ Important Notes

### Gas Costs
- Each withdrawal transaction costs ~21,000 gas
- Gas price varies with network congestion
- Ensure you have sufficient CELO for gas fees

### Contract Ownership
- Only contract owners can withdraw fees
- The script will skip contracts you don't own
- Update contract addresses in the script as needed

### Network Selection
- Script connects to Celo mainnet by default
- Modify the chain configuration for testnets
- Ensure your private key has sufficient balance

## 🔄 Troubleshooting

### Common Issues

**"PRIVATE_KEY not found"**
- Ensure `.env` file exists in `contracts/nogglr/`
- Check that `PRIVATE_KEY` is set correctly
- Remove any quotes around the private key

**"Signer is not owner"**
- Verify you're the owner of the contract
- Check contract addresses in the script
- Ensure you're using the correct private key

**"Insufficient funds for gas"**
- Add more CELO to your wallet
- Check current gas prices
- Ensure you have enough for multiple transactions

**"Contract not found"**
- Verify contract addresses are correct
- Check if contracts are deployed
- Ensure you're on the correct network

### Getting Help

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your environment setup
3. Ensure contract addresses are correct
4. Check your wallet balance and network connection

## 🎯 Best Practices

### Regular Withdrawals
- Run withdrawals regularly to avoid large accumulations
- Monitor contract balances using `pnpm check-balances`
- Set up automated monitoring if possible

### Security
- Never share your private key
- Use a dedicated wallet for contract operations
- Keep your `.env` file secure and private
- Consider using hardware wallets for large amounts

### Monitoring
- Track withdrawal history
- Monitor gas costs
- Keep records of contract addresses and deployments
