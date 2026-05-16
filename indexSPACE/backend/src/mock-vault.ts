import type { Database } from "bun:sqlite";
import type { ForecastIndex } from "@indexspace/shared";

export interface MockRequestEvent {
  vaultId: string;
  internalRequestId: number;
  controller: string;
  owner: string;
  kind: "subscribe" | "redeem";
  assetAmount: string;
  shareAmount: string;
}

export class MockVault {
  private db: Database;
  private indices: ForecastIndex[];
  private nextRequestId = 1;
  private pendingRequests: MockRequestEvent[] = [];

  constructor(db: Database, indices: ForecastIndex[]) {
    this.db = db;
    this.indices = indices;
  }

  simulateDepositRequest(vaultId: string, controller: string, owner: string, assets: string): MockRequestEvent {
    const ev: MockRequestEvent = {
      vaultId,
      internalRequestId: this.nextRequestId++,
      controller,
      owner,
      kind: "subscribe",
      assetAmount: assets,
      shareAmount: "0",
    };
    this.pendingRequests.push(ev);
    return ev;
  }

  simulateRedeemRequest(vaultId: string, controller: string, owner: string, shares: string): MockRequestEvent {
    const ev: MockRequestEvent = {
      vaultId,
      internalRequestId: this.nextRequestId++,
      controller,
      owner,
      kind: "redeem",
      assetAmount: "0",
      shareAmount: shares,
    };
    this.pendingRequests.push(ev);
    return ev;
  }

  pollEvents(): MockRequestEvent[] {
    const batch = this.pendingRequests;
    this.pendingRequests = [];
    return batch;
  }

  getVaultUsdcBalance(vaultId: string): number {
    const index = this.indices.find((i) => i.id === vaultId);
    if (!index) return 0;

    const deposits = this.db.query(
      "SELECT COALESCE(SUM(CAST(asset_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe' AND status IN ('claimable', 'claimed')",
    ).get(vaultId) as { total: number } | undefined;

    const redemptions = this.db.query(
      "SELECT COALESCE(SUM(CAST(asset_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('claimable', 'claimed')",
    ).get(vaultId) as { total: number } | undefined;

    return (deposits?.total ?? 0) - (redemptions?.total ?? 0);
  }

  getTotalShares(vaultId: string): number {
    const claimed = this.db.query(
      "SELECT COALESCE(SUM(CAST(share_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe' AND status IN ('claimable', 'claimed')",
    ).get(vaultId) as { total: number } | undefined;

    const redeemed = this.db.query(
      "SELECT COALESCE(SUM(CAST(share_amount AS REAL)), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('executing', 'claimable', 'claimed')",
    ).get(vaultId) as { total: number } | undefined;

    return (claimed?.total ?? 0) - (redeemed?.total ?? 0);
  }
}
