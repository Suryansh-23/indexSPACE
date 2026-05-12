import { VAULTS, ACTIVITY } from './mock-data'
import type { SubscribeQuote, RedeemQuote, RequestRow, PositionRow } from './types'

export async function getIndices() {
  return VAULTS.map((v) => ({
    id: v.id,
    name: v.name,
    mode: v.mode,
    status: v.status,
  }))
}

export async function getVault(vaultId: string) {
  return VAULTS.find((v) => v.id === vaultId) ?? null
}

export async function getVaultCandles(vaultId: string) {
  const v = VAULTS.find((x) => x.id === vaultId)
  return v?.navHistory ?? []
}

export async function getVaultRequests(vaultId: string, _controller?: string): Promise<RequestRow[]> {
  return []
}

export async function getVaultPositions(vaultId: string): Promise<PositionRow[]> {
  return []
}

export async function quoteSubscribe(vaultId: string, assets: number): Promise<SubscribeQuote> {
  const v = VAULTS.find((x) => x.id === vaultId)
  const nav = v?.nav ?? 1
  return {
    vaultId,
    inputAssets: assets.toFixed(6),
    estimatedShares: (assets / nav).toFixed(18),
    navPerShare: nav.toFixed(18),
    allocations: v?.constituents.map((c) => ({
      marketId: c.marketId,
      weight: c.weight,
      collateral: ((assets * c.weight) / 100).toFixed(6),
    })) ?? [],
  }
}

export async function quoteRedeem(vaultId: string, shares: number): Promise<RedeemQuote> {
  const v = VAULTS.find((x) => x.id === vaultId)
  const nav = v?.nav ?? 1
  return {
    vaultId,
    inputShares: shares.toFixed(18),
    estimatedAssets: (shares * nav).toFixed(6),
    navPerShare: nav.toFixed(18),
    unwindPlan: v?.constituents.map((c) => ({
      marketId: c.marketId,
      targetValue: ((shares * nav * c.weight) / 100).toFixed(6),
    })) ?? [],
  }
}

export async function getInternalStatus() {
  return {
    ports: { mock: true },
    indices: VAULTS.length,
    curatorArmed: VAULTS.filter((v) => v.curatorState === 'armed').length,
  }
}
