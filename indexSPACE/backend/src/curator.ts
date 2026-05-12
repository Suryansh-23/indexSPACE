import type { Database } from "bun:sqlite";
import { FORECAST_INDICES } from "@indexspace/shared";
import type { IndexConstituent, Orientation } from "@indexspace/shared";
import { getDefaultStrategy } from "./sdk.ts";

export class Curator {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  processPendingRequests(): string[] {
    const pending = this.db.query(
      "SELECT * FROM requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5",
    ).all() as Array<{
      id: number;
      vault_id: string;
      kind: string;
      controller: string;
      owner: string;
      asset_amount: string;
      share_amount: string;
      internal_request_id: number;
    }>;

    const results: string[] = [];

    for (const req of pending) {
      try {
        if (req.kind === "subscribe") {
          results.push(this.processSubscribe(req));
        } else if (req.kind === "redeem") {
          results.push(this.processRedeem(req));
        }
      } catch (err) {
        this.db.run(
          "UPDATE requests SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?",
          [String(err), req.id],
        );
        results.push(`request ${req.id} failed: ${err}`);
      }
    }

    return results;
  }

  private processSubscribe(req: {
    id: number;
    vault_id: string;
    asset_amount: string;
    internal_request_id: number;
  }): string {
    const index = FORECAST_INDICES.find((i) => i.id === req.vault_id);
    if (!index) throw new Error(`unknown vault: ${req.vault_id}`);

    this.db.run(
      "UPDATE requests SET status = 'executing', updated_at = datetime('now') WHERE id = ?",
      [req.id],
    );

    const assets = parseFloat(req.asset_amount);
    const sharePrice = this.computeNavPerShare(req.vault_id);
    const sharesToMint = sharePrice > 0 ? assets / sharePrice : assets;

    const positionIds: string[] = [];
    for (const constituent of index.constituents) {
      const strategy = getDefaultStrategy(constituent.weight, constituent.orientation as Orientation);
      const collateral = (assets * constituent.weight) / 100;

      const posId = this.simulateFsBuy(index.id, constituent, strategy, collateral);
      if (posId) positionIds.push(posId);
    }

    const executionId = `exec-${req.id}-${Date.now()}`;
    this.db.run(
      "UPDATE requests SET status = 'claimable', share_amount = ?, execution_id = ?, updated_at = datetime('now') WHERE id = ?",
      [sharesToMint.toFixed(18), executionId, req.id],
    );

    return `subscribe ${req.id}: minted ${sharesToMint.toFixed(6)} shares (${positionIds.length} positions)`;
  }

  private processRedeem(req: {
    id: number;
    vault_id: string;
    share_amount: string;
    internal_request_id: number;
  }): string {
    const index = FORECAST_INDICES.find((i) => i.id === req.vault_id);
    if (!index) throw new Error(`unknown vault: ${req.vault_id}`);

    this.db.run(
      "UPDATE requests SET status = 'executing', updated_at = datetime('now') WHERE id = ?",
      [req.id],
    );

    const shares = parseFloat(req.share_amount);
    const totalShares = this.getTotalShares(req.vault_id);
    const usdcBalance = this.getUsdcBalance(req.vault_id);
    const redeemFraction = totalShares > 0 ? shares / totalShares : 0;
    const targetAssets = usdcBalance * redeemFraction;

    const openLots = this.db.query(
      "SELECT * FROM fs_positions WHERE vault_id = ? AND status = 'open' ORDER BY created_at ASC",
    ).all(req.vault_id) as Array<{
      id: number;
      market_id: number;
      position_id: string;
      collateral: string;
    }>;

    let totalReturned = 0;
    for (const lot of openLots) {
      const remaining = targetAssets - totalReturned;
      if (remaining <= 0) break;

      const lotCollateral = parseFloat(lot.collateral);
      const soldAmount = Math.min(lotCollateral, remaining);

      this.db.run(
        "UPDATE fs_positions SET status = 'closed', returned_collateral = ?, closed_at = datetime('now') WHERE id = ?",
        [soldAmount.toFixed(6), lot.id],
      );

      totalReturned += soldAmount;
    }

    const executionId = `exec-${req.id}-${Date.now()}`;
    this.db.run(
      "UPDATE requests SET status = 'claimable', asset_amount = ?, execution_id = ?, updated_at = datetime('now') WHERE id = ?",
      [totalReturned.toFixed(6), executionId, req.id],
    );

    return `redeem ${req.id}: returned ${totalReturned.toFixed(6)} USDC (${openLots.length} lots sold)`;
  }

  private simulateFsBuy(
    vaultId: string,
    constituent: IndexConstituent,
    strategy: ReturnType<typeof getDefaultStrategy>,
    collateral: number,
  ): string | null {
    const posId = `mock-fs-pos-${vaultId}-${constituent.marketId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    this.db.run(
      `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, belief_json, request_id, created_at)
       VALUES (?, ?, ?, 'open', ?, ?, ?, datetime('now'))`,
      [vaultId, constituent.marketId, posId, collateral.toFixed(6), JSON.stringify(strategy), null],
    );

    return posId;
  }

  private computeNavPerShare(vaultId: string): number {
    const totalShares = this.getTotalShares(vaultId);
    if (totalShares === 0) return 1;
    return this.getUsdcBalance(vaultId) / totalShares;
  }

  private getTotalShares(vaultId: string): number {
    const row = this.db.query(
      "SELECT COALESCE(SUM(CAST(share_amount AS REAL)), 0) - COALESCE((SELECT SUM(CAST(share_amount AS REAL)) FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('executing','claimable','claimed')), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe' AND status IN ('claimable', 'claimed')",
    ).get(vaultId, vaultId) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  private getUsdcBalance(vaultId: string): number {
    const row = this.db.query(
      "SELECT COALESCE(SUM(CAST(asset_amount AS REAL)), 0) - COALESCE((SELECT SUM(CAST(asset_amount AS REAL)) FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('claimable','claimed')), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe'",
    ).get(vaultId, vaultId) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  tick(): string[] {
    return this.processPendingRequests();
  }
}
