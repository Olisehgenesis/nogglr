require("@nomiclabs/hardhat-ethers");
// require("@openzeppelin/hardhat-upgrades"); // Temporarily disabled to avoid plugin conflicts
require("@nomicfoundation/hardhat-verify");
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    celo: {
      url: process.env.CELO_RPC_URL || "https://forno.celo.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42220,
    },
    celoSepolia: {
      url: process.env.CELO_SEPOLIA_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11142220,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "H61R3Q6MPMFF5GGN3GP9JNBYYFT6WDDM42",
    customChains: [
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/v2/api",
          browserURL: "https://celoscan.io"
        }
      },
      {
        network: "celoSepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/v2/api",
          browserURL: "https://alfajores.celoscan.io"
        }
      }
    ]
  },
  sourcify: {
    enabled: true
  },
};
