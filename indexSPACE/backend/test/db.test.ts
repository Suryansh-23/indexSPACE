import { describe, it, expect } from "vitest";
import { createDb } from "../src/db";
import { loadConfig } from "../src/config";

describe("Database schema", () => {
  it("creates all required tables on boot", () => {
    const db = createDb();
    const tables = db.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all() as { name: string }[];

    const names = tables.map((t) => t.name);
    expect(names).toContain("requests");
    expect(names).toContain("fs_positions");
    expect(names).toContain("indexer_checkpoints");
    expect(names).toContain("index_candles");
    expect(names).toContain("simulator_state");
  });

  it("requests table has all required columns", () => {
    const db = createDb();
    const cols = db.query("PRAGMA table_info('requests')").all() as { name: string }[];
    const names = cols.map((c) => c.name);

    const required = [
      "id", "chain_id", "vault_id", "vault_address", "internal_request_id",
      "controller", "owner", "kind", "status", "asset_amount", "share_amount",
      "tx_hash", "log_index", "block_number", "execution_id", "error",
      "created_at", "updated_at",
    ];
    for (const col of required) {
      expect(names).toContain(col);
    }
  });

  it("fs_positions table has all required columns", () => {
    const db = createDb();
    const cols = db.query("PRAGMA table_info('fs_positions')").all() as { name: string }[];
    const names = cols.map((c) => c.name);

    const required = [
      "id", "vault_id", "market_id", "position_id", "status",
      "collateral", "returned_collateral", "belief_json", "belief_hash",
      "request_id", "created_at", "closed_at",
    ];
    for (const col of required) {
      expect(names).toContain(col);
    }
  });

  it("enforces CHECK constraints on request status", () => {
    const db = createDb();
    expect(() => {
      db.run(
        `INSERT INTO requests (chain_id, vault_id, internal_request_id, controller, owner, kind, status, asset_amount, share_amount, created_at, updated_at)
         VALUES (84532, 'test', 1, '0xuser', '0xuser', 'subscribe', 'invalid_status', '100', '0', datetime('now'), datetime('now'))`,
      );
    }).toThrow();
  });

  it("enforces CHECK constraints on fs_positions status", () => {
    const db = createDb();
    expect(() => {
      db.run(
        `INSERT INTO fs_positions (vault_id, market_id, position_id, status, collateral, created_at)
         VALUES ('test', 1, 'pos-1', 'invalid', '100', datetime('now'))`,
      );
    }).toThrow();
  });
});

describe("Config loader", () => {
  it("loads defaults when env vars are not set", () => {
    const config = loadConfig();
    expect(config.port).toBe(8787);
    expect(config.host).toBe("0.0.0.0");
    expect(config.mockVault).toBe(true);
    expect(config.fsApiUrl).toBe("https://fs-engine-api-dev.onrender.com");
    expect(config.pollIntervalMs).toBe(10000);
  });

  it("reads env vars when set", () => {
    process.env.PORT = "9999";
    process.env.HOST = "127.0.0.1";
    process.env.MOCK_VAULT = "false";
    process.env.FS_API_URL = "https://custom.example.com";

    const config = loadConfig();
    expect(config.port).toBe(9999);
    expect(config.host).toBe("127.0.0.1");
    expect(config.mockVault).toBe(false);
    expect(config.fsApiUrl).toBe("https://custom.example.com");

    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.MOCK_VAULT;
    delete process.env.FS_API_URL;
  });
});
