import { http, createConfig } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { type Chain } from 'viem'

export const anvil = {
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
} as const satisfies Chain

export const config = createConfig({
  chains: [anvil, baseSepolia],
  connectors: [injected()],
  transports: {
    [anvil.id]: http('http://localhost:8545'),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

export const ANVIL_CHAIN_ID = 31337
export const BASE_SEPOLIA_CHAIN_ID = 84532
