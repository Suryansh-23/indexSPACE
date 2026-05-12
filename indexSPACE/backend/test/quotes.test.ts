import { describe, it, expect } from "vitest";
import { createDb } from "../src/db";
import { computeSubscribeQuote, computeRedeemQuote } from "../src/quotes";
import { FORECAST_INDICES } from "@indexspace/shared";

const aiIndex = FORECAST_INDICES.find((i) => i.id === "ai-acceleration")!;

function seedRequest(db: ReturnType<typeof createDb>, overrides: Record<string, string | number> = {}) {
  const defaults = {
    chain_id: 84532,
    vault_id: "ai-acceleration",
    vault_address: null,
    internal_request_id: 1,
    controller: "0xuser",
    owner: "0xuser",
    kind: "subscribe",
    status: "claimable",
    asset_amount: "1000",
    share_amount: "1000",
    tx_hash: null,
    log_index: null,
    block_number: null,
    execution_id: null,
    error: null,
  };
  const row = { ...defaults, ...overrides };
  db.run(
    `INSERT INTO requests (chain_id, vault_id, vault_address, internal_request_id, controller, owner, kind, status, asset_amount, share_amount, tx_hash, log_index, block_number, execution_id, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [row.chain_id, row.vault_id, row.vault_address, row.internal_request_id, row.controller, row.owner, row.kind, row.status, row.asset_amount, row.share_amount, row.tx_hash, row.log_index, row.block_number, row.execution_id, row.error],
  );
}

describe("computeSubscribeQuote", () => {
  it("returns correct shape for first deposit (navPerShare = 1)", () => {
    const db = createDb();
    const quote = computeSubscribeQuote("ai-acceleration", 500, aiIndex, db);

    expect(quote.vaultId).toBe("ai-acceleration");
    expect(quote.side).toBe("subscribe");
    expect(quote.inputAssets).toBe("500.000000");
    expect(quote.navPerShare).toBe("1.000000000000000000");
    expect(quote.estimatedShares).toBe("500.000000000000000000");
    expect(quote.allocations).toHaveLength(9);
    expect(quote.allocations[0]!.marketId).toBe(215);
    expect(quote.allocations[0]!.collateral).toBe("90.000000");
    expect(quote.quoteExpiry).toBeTruthy();
  });

  it("computes navPerShare from existing deposits", () => {
    const db = createDb();
    seedRequest(db, { asset_amount: "2000", share_amount: "1000" });

    const quote = computeSubscribeQuote("ai-acceleration", 500, aiIndex, db);
    expect(quote.navPerShare).toBe("2.000000000000000000");
    expect(quote.estimatedShares).toBe("250.000000000000000000");
  });
});

describe("computeRedeemQuote", () => {
  it("returns correct shape with no open positions", () => {
    const db = createDb();
    seedRequest(db, { asset_amount: "1000", share_amount: "500" });

    const quote = computeRedeemQuote("ai-acceleration", 50, aiIndex, db);

    expect(quote.vaultId).toBe("ai-acceleration");
    expect(quote.side).toBe("redeem");
    expect(quote.inputShares).toBe("50.000000000000000000");
    expect(quote.navPerShare).toBe("2.000000000000000000");
    expect(quote.estimatedAssets).toBe("100.000000");
    expect(quote.unwindPlan).toHaveLength(9);
    expect(quote.unwindPlan[0]!.positionIds).toEqual([]);
  });

  it("includes open positions in unwind plan", () => {
    const db = createDb();
    seedRequest(db, { asset_amount: "1000", share_amount: "500" });

    db.run(
      `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, request_id, created_at)
       VALUES ('ai-acceleration', 215, 'pos-1', 'open', '180', 1, datetime('now'))`,
    );

    const quote = computeRedeemQuote("ai-acceleration", 50, aiIndex, db);
    const aiAlloc = quote.unwindPlan.find((p) => p.marketId === 215)!;
    expect(aiAlloc.positionIds).toEqual(["pos-1"]);
    expect(aiAlloc.targetValue).toBe("18.000000");
  });
});
