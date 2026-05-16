import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { type Chain } from 'viem'

export const anvil = {
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
} as const satisfies Chain

export const config = getDefaultConfig({
  appName: 'IndexSpace',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
  chains: [baseSepolia, anvil],
  transports: {
    [baseSepolia.id]: http(),
    [anvil.id]: http('http://localhost:8545'),
  },
  ssr: true,
})

export const ANVIL_CHAIN_ID = 31337
export const BASE_SEPOLIA_CHAIN_ID = 84532
