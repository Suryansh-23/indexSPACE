import type { Database } from "bun:sqlite";
import {
  FORECAST_INDICES,
  ANVIL_AI_VAULT, ANVIL_CRYPTO_VAULT, ANVIL_CHAIN_ID,
  BASE_SEPOLIA_AI_VAULT, BASE_SEPOLIA_CRYPTO_VAULT,
} from "@indexspace/shared";
import type { IndexConstituent, Orientation } from "@indexspace/shared";
import { getDefaultStrategy, tryFsBuy, tryFsSell } from "./sdk.ts";
import type { Address } from "viem";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from "viem";
import { anvil, baseSepolia } from "viem/chains";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { logError, logRuntime } from "./logger.ts";

const FULFILL_ABI = parseAbi([
  "function fulfillDeposit(address controller, uint256 shares) external",
  "function fulfillRedeem(address controller, uint256 assets) external",
  "function pendingDepositRequest(uint256 requestId, address controller) view returns (uint256, uint256)",
  "function pendingRedeemRequest(uint256 requestId, address controller) view returns (uint256, uint256)",
]);

const VAULT_ADDRESSES: Record<number, Record<string, Address>> = {
  [ANVIL_CHAIN_ID]: {
    "ai-acceleration": ANVIL_AI_VAULT as Address,
    "crypto-reflexivity": ANVIL_CRYPTO_VAULT as Address,
  },
  84532: {
    "ai-acceleration": BASE_SEPOLIA_AI_VAULT as Address,
    "crypto-reflexivity": BASE_SEPOLIA_CRYPTO_VAULT as Address,
  },
};

export class Curator {
  private db: Database;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private publicClient: ReturnType<typeof createPublicClient> | null = null;
  private curatorAccount: PrivateKeyAccount | null = null;
  private chainId: number = ANVIL_CHAIN_ID;

  constructor(db: Database) {
    this.db = db;
  }

  configureRpc(rpcUrl: string, curatorPrivateKey?: string, chainId?: number) {
    if (!curatorPrivateKey) return;

    this.chainId = chainId ?? ANVIL_CHAIN_ID;
    const chain = this.chainId === ANVIL_CHAIN_ID ? anvil : baseSepolia;
    this.curatorAccount = privateKeyToAccount(
      (curatorPrivateKey.startsWith("0x")
        ? curatorPrivateKey
        : `0x${curatorPrivateKey}`) as Address,
    );
    this.walletClient = createWalletClient({
      account: this.curatorAccount,
      chain,
      transport: http(rpcUrl),
    });
    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  }

  async processPendingRequests(): Promise<string[]> {
    type PendingRow = {
      id: number;
      vault_id: string;
      kind: string;
      controller: string;
      owner: string;
      asset_amount: string;
      share_amount: string;
      internal_request_id: number;
    };

    const pending = this.db.query(
      "SELECT * FROM requests WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5",
    ).all() as PendingRow[];

    if (pending.length === 0) return [];

    // Claim all selected rows atomically before processing to prevent concurrent double-execution.
    const ids = pending.map((r) => r.id);
    this.db.run(
      `UPDATE requests SET status = 'executing', updated_at = datetime('now')
       WHERE id IN (${ids.map(() => "?").join(",")}) AND status = 'pending'`,
      ids,
    );

    const results: string[] = [];

    for (const req of pending) {
      try {
        logRuntime("curator.tick", "Processing request", {
          requestId: req.id,
          vaultId: req.vault_id,
          kind: req.kind,
          controller: req.controller,
          internalRequestId: req.internal_request_id,
        });
        if (req.kind === "subscribe") {
          results.push(await this.processSubscribe(req));
        } else if (req.kind === "redeem") {
          results.push(await this.processRedeem(req));
        }
      } catch (err) {
        logError("curator.tick", "Request processing failed", err, {
          requestId: req.id,
          vaultId: req.vault_id,
          kind: req.kind,
          controller: req.controller,
        });
        this.db.run(
          "UPDATE requests SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?",
          [String(err), req.id],
        );
        results.push(`request ${req.id} failed: ${err}`);
      }
    }

    return results;
  }

  private async processSubscribe(req: {
    id: number;
    vault_id: string;
    controller: string;
    asset_amount: string;
    internal_request_id: number;
  }): Promise<string> {
    const index = FORECAST_INDICES.find((i) => i.id === req.vault_id);
    if (!index) throw new Error(`unknown vault: ${req.vault_id}`);

    const assets = parseFloat(req.asset_amount);
    const sharePrice = this.computeNavPerShare(req.vault_id);
    const sharesToMint = sharePrice > 0 ? assets / sharePrice : assets;
    logRuntime("curator.subscribe", "Starting subscribe execution", {
      requestId: req.id,
      vaultId: req.vault_id,
      controller: req.controller,
      assets,
      sharePrice,
      sharesToMint,
    });

    const positionIds: string[] = [];
    for (const constituent of index.constituents) {
      const strategy = getDefaultStrategy(constituent.weight, constituent.orientation as Orientation);
      // assets is in USDC micro-units (6 decimals); collateral stays in micros here.
      // sdk.ts / tryFsBuy normalises to dollars before sending to the FS API.
      const collateral = (assets * constituent.weight) / 100;

      const posId = await this.execFsBuy(req.id, req.vault_id, constituent, strategy, collateral);
      if (posId) positionIds.push(posId);
    }

    const fulfilled = await this.tryFulfillDeposit(req.vault_id, req.controller as Address, sharesToMint);
    if (!fulfilled) {
      throw new Error(`fulfillDeposit failed onchain for ${req.vault_id}/${req.controller}`);
    }

    const executionId = `exec-${req.id}-${Date.now()}`;
    this.db.run(
      "UPDATE requests SET status = 'claimable', share_amount = ?, execution_id = ?, updated_at = datetime('now') WHERE id = ?",
      [sharesToMint.toFixed(18), executionId, req.id],
    );
    logRuntime("curator.subscribe", "Subscribe became claimable", {
      requestId: req.id,
      vaultId: req.vault_id,
      controller: req.controller,
      sharesToMint,
      executionId,
      positionIds,
    });

    return `subscribe ${req.id}: minted ${sharesToMint.toFixed(6)} shares (${positionIds.length} positions)`;
  }

  private async processRedeem(req: {
    id: number;
    vault_id: string;
    controller: string;
    share_amount: string;
    internal_request_id: number;
  }): Promise<string> {
    const index = FORECAST_INDICES.find((i) => i.id === req.vault_id);
    if (!index) throw new Error(`unknown vault: ${req.vault_id}`);

    const shares = parseFloat(req.share_amount);
    const totalShares = this.getTotalShares(req.vault_id);
    const usdcBalance = this.getUsdcBalance(req.vault_id);
    const redeemFraction = totalShares > 0 ? shares / totalShares : 0;
    const targetAssets = usdcBalance * redeemFraction;
    logRuntime("curator.redeem", "Starting redeem execution", {
      requestId: req.id,
      vaultId: req.vault_id,
      controller: req.controller,
      shares,
      totalShares,
      usdcBalance,
      redeemFraction,
      targetAssets,
    });

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

      await this.execFsSell(req.vault_id, lot.position_id, lot.market_id, soldAmount);

      this.db.run(
        "UPDATE fs_positions SET status = 'closed', returned_collateral = ?, closed_at = datetime('now') WHERE id = ?",
        [soldAmount.toFixed(6), lot.id],
      );

      totalReturned += soldAmount;
    }

    const fulfilled = await this.tryFulfillRedeem(req.vault_id, req.controller as Address, totalReturned);
    if (!fulfilled) {
      throw new Error(`fulfillRedeem failed onchain for ${req.vault_id}/${req.controller}`);
    }

    const executionId = `exec-${req.id}-${Date.now()}`;
    this.db.run(
      "UPDATE requests SET status = 'claimable', asset_amount = ?, execution_id = ?, updated_at = datetime('now') WHERE id = ?",
      [totalReturned.toFixed(6), executionId, req.id],
    );
    logRuntime("curator.redeem", "Redeem became claimable", {
      requestId: req.id,
      vaultId: req.vault_id,
      controller: req.controller,
      totalReturned,
      executionId,
    });

    return `redeem ${req.id}: returned ${totalReturned.toFixed(6)} USDC (${openLots.length} lots sold)`;
  }

  private async execFsBuy(
    requestId: number,
    vaultId: string,
    constituent: IndexConstituent,
    strategy: ReturnType<typeof getDefaultStrategy>,
    collateral: number,
  ): Promise<string | null> {
    const result = await tryFsBuy(constituent.marketId, collateral, strategy);
    if (result) {
      this.db.run(
        `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, belief_json, request_id, created_at)
         VALUES (?, ?, ?, 'open', ?, ?, ?, datetime('now'))`,
        [vaultId, constituent.marketId, result.positionId, collateral.toFixed(6), JSON.stringify(strategy), requestId],
      );
      logRuntime("curator.subscribe", "Recorded live FunctionSpace position", {
        requestId,
        vaultId,
        marketId: constituent.marketId,
        positionId: result.positionId,
        collateral,
      });
      return String(result.positionId);
    }
    logRuntime("curator.subscribe", "FunctionSpace buy unavailable, falling back to simulated position", {
      requestId,
      vaultId,
      marketId: constituent.marketId,
      collateral,
    }, "warn");
    return this.simulateFsBuy(requestId, vaultId, constituent, strategy, collateral);
  }

  private async execFsSell(_vaultId: string, positionId: string | number, marketId: number, _amount: number): Promise<void> {
    await tryFsSell(positionId, marketId);
  }

  private async tryFulfillDeposit(vaultId: string, controller: Address, shares: number): Promise<boolean> {
    if (!this.walletClient || !this.curatorAccount || !this.publicClient) return true;

    const vaultAddress = VAULT_ADDRESSES[this.chainId]?.[vaultId];
    if (!vaultAddress) return false;

    try {
      const hash = await this.walletClient.writeContract({
        address: vaultAddress,
        abi: FULFILL_ABI,
        functionName: "fulfillDeposit",
        args: [controller, parseUnits(shares.toFixed(18), 18)],
        account: this.curatorAccount,
      } as any);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      logRuntime("curator.fulfill_deposit", "fulfillDeposit settled", {
        vaultId,
        controller,
        shares,
        txHash: hash,
        receiptStatus: receipt.status,
      });
      return receipt.status === "success";
    } catch (err) {
      logError("curator.fulfill_deposit", `Fulfill deposit failed for ${vaultId}/${controller}`, err, {
        vaultId,
        controller,
        shares,
      });
      return false;
    }
  }

  private async tryFulfillRedeem(vaultId: string, controller: Address, assets: number): Promise<boolean> {
    if (!this.walletClient || !this.curatorAccount || !this.publicClient) return true;

    const vaultAddress = VAULT_ADDRESSES[this.chainId]?.[vaultId];
    if (!vaultAddress) return false;

    try {
      const hash = await this.walletClient.writeContract({
        address: vaultAddress,
        abi: FULFILL_ABI,
        functionName: "fulfillRedeem",
        args: [controller, parseUnits(assets.toFixed(6), 6)],
        account: this.curatorAccount,
      } as any);
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
      logRuntime("curator.fulfill_redeem", "fulfillRedeem settled", {
        vaultId,
        controller,
        assets,
        txHash: hash,
        receiptStatus: receipt.status,
      });
      return receipt.status === "success";
    } catch (err) {
      logError("curator.fulfill_redeem", `Fulfill redeem failed for ${vaultId}/${controller}`, err, {
        vaultId,
        controller,
        assets,
      });
      return false;
    }
  }

  private simulateFsBuy(
    requestId: number,
    vaultId: string,
    constituent: IndexConstituent,
    strategy: ReturnType<typeof getDefaultStrategy>,
    collateral: number,
  ): string | null {
    const posId = `mock-fs-pos-${vaultId}-${constituent.marketId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    this.db.run(
      `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, belief_json, request_id, created_at)
       VALUES (?, ?, ?, 'open', ?, ?, ?, datetime('now'))`,
      [vaultId, constituent.marketId, posId, collateral.toFixed(6), JSON.stringify(strategy), requestId],
    );
    logRuntime("curator.subscribe", "Recorded simulated FunctionSpace position", {
      requestId,
      vaultId,
      marketId: constituent.marketId,
      positionId: posId,
      collateral,
    });

    return posId;
  }

  private computeNavPerShare(vaultId: string): number {
    const totalShares = this.getTotalShares(vaultId);
    if (totalShares === 0) {
      // Seed starting NAV from last candle so live trading continues where history left off
      const row = this.db.query(
        "SELECT close FROM index_candles WHERE vault_id = ? ORDER BY bucket_ts DESC LIMIT 1",
      ).get(vaultId) as { close: string } | null;
      return row ? parseFloat(row.close) : 1.0;
    }
    return this.getUsdcBalance(vaultId) / totalShares;
  }

  private getTotalShares(vaultId: string): number {
    const row = this.db.query(
      "SELECT COALESCE(SUM(CAST(share_amount AS REAL)), 0) - COALESCE((SELECT SUM(CAST(share_amount AS REAL)) FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('claimable','claimed') AND CAST(share_amount AS REAL) > 0), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe' AND status IN ('claimable', 'claimed') AND CAST(share_amount AS REAL) > 0",
    ).get(vaultId, vaultId) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  private getUsdcBalance(vaultId: string): number {
    const row = this.db.query(
      "SELECT COALESCE(SUM(CAST(asset_amount AS REAL)), 0) - COALESCE((SELECT SUM(CAST(asset_amount AS REAL)) FROM requests WHERE vault_id = ? AND kind = 'redeem' AND status IN ('claimable','claimed') AND CAST(share_amount AS REAL) > 0), 0) AS total FROM requests WHERE vault_id = ? AND kind = 'subscribe' AND status IN ('claimable', 'claimed') AND CAST(share_amount AS REAL) > 0",
    ).get(vaultId, vaultId) as { total: number } | undefined;
    return row?.total ?? 0;
  }

  async tick(): Promise<string[]> {
    return this.processPendingRequests();
  }
}
