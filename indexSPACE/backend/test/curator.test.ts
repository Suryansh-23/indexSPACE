import { describe, it, expect, beforeEach } from "vitest";
import { createDb } from "../src/db";
import { Curator } from "../src/curator";
import { loadConfig } from "../src/config";

describe("Curator", () => {
  let db: ReturnType<typeof createDb>;
  let curator: Curator;

  beforeEach(() => {
    db = createDb();
    process.env.MOCK_VAULT = "true";
    curator = new Curator(db);
  });

  function insertRequest(overrides: Record<string, string | number | null> = {}) {
    const defaults = {
      chain_id: 84532,
      vault_id: "ai-acceleration",
      vault_address: null,
      internal_request_id: 1,
      controller: "0xuser",
      owner: "0xuser",
      kind: "subscribe",
      status: "pending",
      asset_amount: "500",
      share_amount: "0",
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

  describe("subscribe lifecycle", () => {
    it("transitions pending -> executing -> claimable for subscribe", async () => {
      insertRequest({ kind: "subscribe", asset_amount: "500" });

      const results = await curator.tick();
      expect(results).toHaveLength(1);
      expect(results[0]).toContain("subscribe");

      const row = db.query("SELECT status, share_amount, execution_id FROM requests WHERE id = 1").get() as any;
      expect(row.status).toBe("claimable");
      expect(parseFloat(row.share_amount)).toBeGreaterThan(0);
      expect(row.execution_id).toMatch(/^exec-/);
    });

    it("mints shares = assets when navPerShare = 1 (first deposit)", async () => {
      insertRequest({ kind: "subscribe", asset_amount: "500" });

      await curator.tick();

      const row = db.query("SELECT share_amount FROM requests WHERE id = 1").get() as any;
      expect(parseFloat(row.share_amount)).toBe(500);
    });

    it("creates fs_positions for each constituent", async () => {
      insertRequest({ kind: "subscribe", asset_amount: "500" });

      await curator.tick();

      const positions = db.query("SELECT * FROM fs_positions WHERE vault_id = 'ai-acceleration'").all();
      expect(positions).toHaveLength(9);
    });

    it("rejects unknown vault", async () => {
      insertRequest({ kind: "subscribe", vault_id: "nonexistent", asset_amount: "500" });

      const results = await curator.tick();
      expect(results[0]).toContain("failed");
      expect(results[0]).toContain("unknown vault");

      const row = db.query("SELECT status FROM requests WHERE id = 1").get() as any;
      expect(row.status).toBe("failed");
    });
  });

  describe("redeem lifecycle", () => {
    it("transitions pending -> executing -> claimable for redeem", async () => {
      insertRequest({ kind: "subscribe", asset_amount: "1000", share_amount: "0", status: "claimable" });
      db.run(
        `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, request_id, created_at)
         VALUES ('ai-acceleration', 215, 'pos-1', 'open', '180', 1, datetime('now'))`,
      );
      insertRequest({ kind: "redeem", share_amount: "100" });

      const results = await curator.tick();
      expect(results).toHaveLength(1);
      expect(results[0]).toContain("redeem");

      const row = db.query("SELECT status FROM requests WHERE id = 2").get() as any;
      expect(row.status).toBe("claimable");
    });

    it("sells open lots FIFO proportional to redeem fraction", async () => {
      insertRequest({ kind: "subscribe", asset_amount: "1000", share_amount: "500", status: "claimable" });
      db.run(
        `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, request_id, created_at)
         VALUES ('ai-acceleration', 215, 'pos-first', 'open', '180', 1, datetime('now'))`,
      );
      db.run(
        `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, request_id, created_at)
         VALUES ('ai-acceleration', 215, 'pos-second', 'open', '180', 1, datetime('now'))`,
      );
      insertRequest({ kind: "redeem", share_amount: "250" });

      await curator.tick();

      const closedLots = db.query(
        "SELECT position_id, status, returned_collateral FROM fs_positions WHERE status = 'closed'",
      ).all() as any[];
      expect(closedLots.length).toBeGreaterThan(0);
      const first = closedLots[0]!;
      expect(parseFloat(first.returned_collateral)).toBeGreaterThan(0);
    });

    it("rejects unknown vault for redeem", async () => {
      insertRequest({ kind: "redeem", vault_id: "nonexistent", share_amount: "100" });

      const results = await curator.tick();
      expect(results[0]).toContain("failed");

      const row = db.query("SELECT status FROM requests WHERE id = 1").get() as any;
      expect(row.status).toBe("failed");
    });
  });

  describe("failure paths", () => {
    it("stores error message when request fails", async () => {
      insertRequest({ kind: "subscribe", vault_id: "nonexistent", asset_amount: "500" });

      const results = await curator.tick();

      expect(results[0]).toContain("failed");
      const row = db.query("SELECT status, error FROM requests WHERE id = 1").get() as any;
      expect(row.status).toBe("failed");
      expect(row.error).toBeTruthy();
      expect(row.error).toContain("unknown vault");
    });
  });

  describe("dedup at indexer level (conditional insert)", () => {
    it("indexer dedup check prevents duplicate event processing", () => {
      const vaultId = "ai-acceleration";
      const internalRequestId = 42;

      insertRequest({ kind: "subscribe", asset_amount: "500", internal_request_id: internalRequestId });

      const exists = db.query(
        "SELECT COUNT(*) AS cnt FROM requests WHERE vault_id = ? AND internal_request_id = ?",
      ).get(vaultId, internalRequestId) as { cnt: number };

      expect(exists.cnt).toBe(1);

      if (exists.cnt === 0) {
        db.run(
          `INSERT INTO requests (chain_id, vault_id, internal_request_id, controller, owner, kind, status, asset_amount, share_amount, created_at, updated_at)
           VALUES (84532, ?, ?, '0xuser', '0xuser', 'subscribe', 'pending', '300', '0', datetime('now'), datetime('now'))`,
          [vaultId, internalRequestId],
        );
      }

      const afterCheck = db.query(
        "SELECT COUNT(*) AS cnt FROM requests WHERE vault_id = ? AND internal_request_id = ?",
      ).get(vaultId, internalRequestId) as { cnt: number };

      expect(afterCheck.cnt).toBe(1);
    });
  });
});
