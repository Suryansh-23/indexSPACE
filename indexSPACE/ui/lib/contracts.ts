import { type Address, createPublicClient, createWalletClient, custom, parseUnits, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import vaultAbi from './IndexVault.json'
import { ANVIL_AI_VAULT, ANVIL_CRYPTO_VAULT } from '@indexspace/shared'

const VAULT_ADDRESSES: Record<string, Address> = {
  'ai-acceleration': ANVIL_AI_VAULT as Address,
  'crypto-reflexivity': ANVIL_CRYPTO_VAULT as Address,
}

export function getVaultAddress(vaultId: string): Address | null {
  return VAULT_ADDRESSES[vaultId] ?? null
}

export function getVaultAbi() {
  return vaultAbi.abi
}

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: custom(window.ethereum!),
  })
}

export function getWalletClient() {
  return createWalletClient({
    chain: baseSepolia,
    transport: custom(window.ethereum!),
  })
}

export async function approveVault(vaultId: string, assets: number) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient()
  const [address] = await walletClient.requestAddresses()

  const hash = await walletClient.writeContract({
    address: vaultAddress,
    abi: vaultAbi.abi,
    functionName: 'approve',
    args: [vaultAddress, parseUnits(assets.toString(), 6)],
    account: address,
  } as any)

  return hash
}

export async function requestDeposit(vaultId: string, assets: number, controller: Address) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient()
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

export async function requestRedeem(vaultId: string, shares: number, controller: Address) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient()
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

export async function claimDeposit(vaultId: string, receiver: Address, controller: Address) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient()
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

export async function claimRedeem(vaultId: string, receiver: Address, controller: Address) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) throw new Error(`Unknown vault: ${vaultId}`)

  const walletClient = getWalletClient()
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

export async function readUserRequest(vaultId: string, controller: Address) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) return null

  const publicClient = getPublicClient()

  const [pendingAssets, pendingShares] = await publicClient.readContract({
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

export async function readBalances(vaultId: string, owner: Address) {
  const vaultAddress = getVaultAddress(vaultId)
  if (!vaultAddress) return null

  const publicClient = getPublicClient()

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
