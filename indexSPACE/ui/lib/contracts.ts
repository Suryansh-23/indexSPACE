import { type Address, createPublicClient, createWalletClient, custom, parseUnits, formatUnits } from 'viem'
import { anvil, baseSepolia } from 'viem/chains'
import vaultAbi from './IndexVault.json'
import {
  ANVIL_AI_VAULT,
  ANVIL_CRYPTO_VAULT,
  ANVIL_MOCK_USDC,
  BASE_SEPOLIA_AI_VAULT,
  BASE_SEPOLIA_CRYPTO_VAULT,
  BASE_SEPOLIA_MOCK_USDC,
  ANVIL_CHAIN_ID,
} from '@indexspace/shared'

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const VAULT_ADDRESSES: Record<number, Record<string, Address>> = {
  [ANVIL_CHAIN_ID]: {
    'ai-acceleration': ANVIL_AI_VAULT as Address,
    'crypto-reflexivity': ANVIL_CRYPTO_VAULT as Address,
  },
  84532: {
    'ai-acceleration': BASE_SEPOLIA_AI_VAULT as Address,
    'crypto-reflexivity': BASE_SEPOLIA_CRYPTO_VAULT as Address,
  },
}

const USDC_ADDRESSES: Record<number, Address> = {
  [ANVIL_CHAIN_ID]: ANVIL_MOCK_USDC as Address,
  84532: BASE_SEPOLIA_MOCK_USDC as Address,
}

function getChain(chainId: number) {
  return chainId === ANVIL_CHAIN_ID ? anvil : baseSepolia
}

export function getVaultAddress(vaultId: string, chainId: number): Address | null {
  return VAULT_ADDRESSES[chainId]?.[vaultId] ?? null
}

export function getUsdcAddress(chainId: number): Address | null {
  return USDC_ADDRESSES[chainId] ?? null
}

export function getVaultAbi() {
  return vaultAbi.abi
}

export function getPublicClient(chainId: number) {
  return createPublicClient({
    chain: getChain(chainId),
    transport: custom(window.ethereum!),
  })
}

export function getWalletClient(chainId: number) {
  return createWalletClient({
    chain: getChain(chainId),
    transport: custom(window.ethereum!),
  })
}

export async function approveUsdc(vaultId: string, assets: number, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const usdcAddress = getUsdcAddress(chainId)
  if (!usdcAddress) throw new Error(`No USDC address for chain ${chainId}`)

  const walletClient = getWalletClient(chainId)
  const [address] = await walletClient.requestAddresses()

  const hash = await walletClient.writeContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [vaultAddress, parseUnits(assets.toString(), 6)],
    account: address,
  } as any)

  return hash
}

export async function requestDeposit(vaultId: string, assets: number, controller: Address, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient(chainId)
  const [address] = await walletClient.requestAddresses()

  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'requestDeposit',
    args: [parseUnits(assets.toString(), 6), controller, address],
    account: address,
  } as any)

  return hash
}

export async function requestRedeem(vaultId: string, shares: number, controller: Address, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient(chainId)
  const [address] = await walletClient.requestAddresses()

  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'requestRedeem',
    args: [parseUnits(shares.toString(), 18), controller, address],
    account: address,
  } as any)

  return hash
}

export async function claimDeposit(vaultId: string, receiver: Address, controller: Address, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient(chainId)
  const [address] = await walletClient.requestAddresses()

  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'claimDeposit',
    args: [receiver, controller],
    account: address,
  } as any)

  return hash
}

export async function claimRedeem(vaultId: string, receiver: Address, controller: Address, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient(chainId)
  const [address] = await walletClient.requestAddresses()

  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'claimRedeem',
    args: [receiver, controller],
    account: address,
  } as any)

  return hash
}

export async function readUserRequest(vaultId: string, controller: Address, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) return null

  const publicClient = getPublicClient(chainId)

  const [pendingAssets] = await publicClient.readContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'pendingDepositRequest',
    args: [0n, controller],
  }) as [bigint, bigint]

  if (pendingAssets > 0n) {
    return {
      kind: 'subscribe' as const,
      status: 'pending' as const,
      assets: formatUnits(pendingAssets, 6),
      shares: '0',
    }
  }

  const [claimableAssets, claimableShares] = await publicClient.readContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'claimableDepositRequest',
    args: [0n, controller],
  }) as [bigint, bigint]

  if (claimableShares > 0n) {
    return {
      kind: 'subscribe' as const,
      status: 'claimable' as const,
      assets: formatUnits(claimableAssets, 6),
      shares: formatUnits(claimableShares, 18),
    }
  }

  return null
}

export async function readBalances(vaultId: string, owner: Address, chainId: number) {
  const vaultAddress = getVaultAddress(vaultId, chainId)
  if (!vaultAddress) return null

  const publicClient = getPublicClient(chainId)

  const [shareBalance, pendingRedeem] = await Promise.all([
    publicClient.readContract({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'balanceOf',
      args: [owner],
    }) as Promise<bigint>,
    publicClient.readContract({
      address: vaultAddress,
      abi: vaultAbi.abi,
      functionName: 'pendingRedeemRequest',
      args: [0n, owner],
    }) as Promise<[bigint, bigint]>,
  ])

  return {
    shares: formatUnits(shareBalance, 18),
    pendingRedeemAssets: formatUnits(pendingRedeem[0], 6),
    pendingRedeemShares: formatUnits(pendingRedeem[1], 18),
  }
}
