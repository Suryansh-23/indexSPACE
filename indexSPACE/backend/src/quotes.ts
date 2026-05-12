import type { Database } from "bun:sqlite";
import type { ForecastIndex, IndexConstituent } from "@indexspace/shared";
import { weightSum } from "@indexspace/shared";

export interface SubscribeQuote {
  vaultId: string;
  side: "subscribe";
  inputAssets: string;
  navPerShare: string;
  estimatedShares: string;
  quoteExpiry: string;
  allocations: Array<{
    marketId: number;
    weight: number;
    collateral: string;
    shape: string;
    centerNormalized: number;
    widthNormalized: number;
  }>;
}

export interface RedeemQuote {
  vaultId: string;
  side: "redeem";
  inputShares: string;
  navPerShare: string;
  estimatedAssets: string;
  quoteExpiry: string;
  unwindPlan: Array<{
    marketId: number;
    targetValue: string;
    positionIds: string[];
  }>;
}

export function computeSubscribeQuote(
  vaultId: string,
  assets: number,
  index: ForecastIndex,
  db: Database,
): SubscribeQuote {
  const totalShares = getTotalShareSupply(vaultId, db);
  const usdcBalance = getUsdcBalance(vaultId, db);
  const navPerShare = totalShares > 0 ? usdcBalance / totalShares : 1;
  const estimatedShares = totalShares > 0 ? assets / navPerShare : assets;
  const sum = weightSum(index.constituents);
  const expiry = new Date(Date.now() + 30_000).toISOString();

  const allocations = index.constituents.map((c: IndexConstituent) => ({
    marketId: c.marketId,
    weight: c.weight,
    collateral: ((assets * c.weight) / sum).toFixed(6),
    shape: getDefaultShape(c.orientation),
    centerNormalized: c.orientation.includes("higher") ? 0.72 : 0.28,
    widthNormalized: 0.15,
  }));

  return {
    vaultId,
    side: "subscribe",
    inputAssets: assets.toFixed(6),
    navPerShare: navPerShare.toFixed(18),
    estimatedShares: estimatedShares.toFixed(18),
    quoteExpiry: expiry,
    allocations,
  };
}

export function computeRedeemQuote(
  vaultId: string,
  shares: number,
  index: ForecastIndex,
  db: Database,
): RedeemQuote {
  const totalShares = getTotalShareSupply(vaultId, db);
  const usdcBalance = getUsdcBalance(vaultId, db);
  const navPerShare = totalShares > 0 ? usdcBalance / totalShares : 1;
  const estimatedAssets = shares * navPerShare;
  const sum = weightSum(index.constituents);
  const expiry = new Date(Date.now() + 30_000).toISOString();

  const openPositions = db.query(
    "SELECT market_id, position_id, collateral FROM fs_positions WHERE vault_id = ? AND status = 'open' ORDER BY created_at ASC",
  ).all(vaultId) as Array<{ market_id: number; position_id: string; collateral: string }>;

  const unwindPlan = index.constituents.map((c: IndexConstituent) => {
    const targetValue = (estimatedAssets * c.weight) / sum;
    const relevant = openPositions
      .filter((p) => p.market_id === c.marketId)
      .map((p) => p.position_id);
    return {
      marketId: c.marketId,
      targetValue: targetValue.toFixed(6),
      positionIds: relevant,
    };
  });

  return {
    vaultId,
    side: "redeem",
    inputShares: shares.toFixed(18),
    navPerShare: navPerShare.toFixed(18),
    estimatedAssets: estimatedAssets.toFixed(6),
    quoteExpiry: expiry,
    unwindPlan,
  };
}

function getTotalShareSupply(vaultId: string, db: Database): number {
  const claimed = db.query(
    "SELECT COALESCE(SUM(CAST(share_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe' AND status IN ('claimable', 'claimed')",
  ).get(vaultId) as { total: number } | undefined;

  const redeemed = db.query(
    "SELECT COALESCE(SUM(CAST(share_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('executing', 'claimable', 'claimed')",
  ).get(vaultId) as { total: number } | undefined;

  return (claimed?.total ?? 0) - (redeemed?.total ?? 0);
}

function getUsdcBalance(vaultId: string, db: Database): number {
  const deposits = db.query(
    "SELECT COALESCE(SUM(CAST(asset_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe'",
  ).get(vaultId) as { total: number } | undefined;

  const redemptions = db.query(
    "SELECT COALESCE(SUM(CAST(asset_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('claimable', 'claimed')",
  ).get(vaultId) as { total: number } | undefined;

  return (deposits?.total ?? 0) - (redemptions?.total ?? 0);
}

function getDefaultShape(orientation: string): string {
  if (orientation.includes("bullish")) return "right_skew";
  if (orientation.includes("stress")) return "range";
  return "gaussian";
}
