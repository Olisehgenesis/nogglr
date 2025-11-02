import { EthereumProvider } from '@walletconnect/ethereum-provider'
import { QueryClient } from '@tanstack/react-query'
import { celo } from 'wagmi/chains'
import { http } from 'wagmi'
import { createConfig } from 'wagmi'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { injected, walletConnect } from 'wagmi/connectors'

const walletconnectID=  "ee20b89d8767ee29cff592e1fb9d822e"

// Create WalletConnect provider
let walletConnectProvider: InstanceType<typeof EthereumProvider> | null = null

export const createWalletConnectProvider = async () => {
  if (!walletConnectProvider) {
    walletConnectProvider = await EthereumProvider.init({
      projectId: walletconnectID,
      chains: [celo.id],
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'light',
        themeVariables: {
          '--wcm-accent-color': '#F5C518',
          '--wcm-background-color': '#FBF8F5',
          '--wcm-overlay-background-color': 'rgba(0, 0, 0, 0.5)',
          '--wcm-background-border-radius': '12px',
          '--wcm-font-family': 'inherit',
        },
      },
      metadata: {
        name: 'Nogglr',
        description: 'NFT Generator and Marketplace',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://nogglr.vercel.app',
        icons: [typeof window !== 'undefined' ? `${window.location.origin}/icon.png` : 'https://nogglr.vercel.app/icon.png'],
      },
    })
  }
  return walletConnectProvider
}

// Create wagmi config with multiple connectors in order: MetaMask, Farcaster, WalletConnect
// Build connectors conditionally to avoid SSR accessing browser APIs
const connectors = [
  injected(), // MetaMask and other injected wallets (first priority)
  farcasterMiniApp(), // Farcaster Mini App (second priority)
  // Only include WalletConnect on the client to avoid idb-keyval in SSR
  ...(typeof window !== 'undefined'
    ? [
        walletConnect({
          projectId: walletconnectID,
          metadata: {
            name: 'Nogglr',
            description: 'NFT Generator and Marketplace',
            url: window.location.origin,
            icons: [`${window.location.origin}/icon.png`],
          },
        }),
      ]
    : []),
]

export const config = createConfig({
  chains: [celo],
  connectors,
  transports: {
    [celo.id]: http('https://rpc.ankr.com/celo'),
  },
})

console.log('Wagmi config created with connectors:', config.connectors.map(c => c.name))

// Create query client
export const queryClient = new QueryClient()

// Export function to open WalletConnect modal
export const openModal = async () => {
  console.log('Opening WalletConnect modal...')
  try {
    const provider = await createWalletConnectProvider()
    await provider.connect()
  } catch (error) {
    console.error('Error opening WalletConnect modal:', error)
  }
}
