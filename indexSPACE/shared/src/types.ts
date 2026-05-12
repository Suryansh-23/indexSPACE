export type VaultMode = "live-vault" | "preview-only";

export type RequestStatus =
  | "pending"
  | "executing"
  | "claimable"
  | "claimed"
  | "failed"
  | "cancelled";

export type Orientation =
  | "higher_is_bullish"
  | "lower_is_bullish"
  | "higher_is_stress"
  | "lower_is_stress";

export type ConstituentRole =
  | "capital"
  | "capability"
  | "deployment"
  | "liquidity"
  | "macro"
  | "adoption";

export type IndexConstituent = {
  id: string;
  marketId: number;
  label: string;
  weight: number;
  orientation: Orientation;
  role: ConstituentRole;
};

export type ForecastIndex = {
  id: string;
  name: string;
  mode: VaultMode;
  vaultAddress?: `0x${string}`;
  shareAddress?: `0x${string}`;
  assetAddress?: `0x${string}`;
  fsVaultUsername?: string;
  constituents: IndexConstituent[];
};

export type ConstituentStrategy = {
  weight: number;
  shape: "gaussian" | "range" | "right_skew" | "left_skew";
  centerNormalized: number;
  widthNormalized: number;
  jitterBps?: number;
};

export type VaultExecution = {
  executionId: string;
  vaultId: string;
  requestId: string;
  internalRequestId?: string;
  side: "subscribe" | "redeem";
  controller: `0x${string}`;
  fsUsername: string;
  navBefore: string;
  navAfter: string;
  txHash?: `0x${string}`;
  fsTrades: Array<{
    marketId: number;
    side: "buy" | "sell";
    positionId: string;
    collateral: number;
    beliefHash?: string;
    returnedCollateral?: number;
  }>;
  createdAt: string;
};

export function weightSum(constituents: IndexConstituent[]): number {
  return constituents.reduce((sum, c) => sum + c.weight, 0);
}

export function assertWeightsSumTo100(constituents: IndexConstituent[]): void {
  const sum = weightSum(constituents);
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error(`Constituent weights sum to ${sum}, expected 100`);
  }
}
