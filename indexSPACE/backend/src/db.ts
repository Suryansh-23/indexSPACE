import { Database } from "bun:sqlite";

export function createDb(path = ":memory:"): Database {
  const db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  runMigrations(db);
  return db;
}

function runMigrations(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain_id INTEGER NOT NULL,
      vault_id TEXT NOT NULL,
      vault_address TEXT,
      internal_request_id INTEGER NOT NULL,
      controller TEXT NOT NULL,
      owner TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('subscribe', 'redeem')),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'executing', 'claimable', 'claimed', 'failed', 'cancelled')),
      asset_amount TEXT NOT NULL DEFAULT '0',
      share_amount TEXT NOT NULL DEFAULT '0',
      tx_hash TEXT,
      log_index INTEGER,
      block_number INTEGER,
      execution_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fs_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_id TEXT NOT NULL,
      market_id INTEGER NOT NULL,
      position_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open'
        CHECK(status IN ('open', 'closing', 'closed', 'failed')),
      collateral TEXT NOT NULL DEFAULT '0',
      returned_collateral TEXT,
      belief_json TEXT,
      belief_hash TEXT,
      request_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS indexer_checkpoints (
      chain_id INTEGER NOT NULL,
      contract_address TEXT NOT NULL,
      last_indexed_block INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (chain_id, contract_address)
    );

    CREATE TABLE IF NOT EXISTS index_candles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault_id TEXT NOT NULL,
      bucket_ts TEXT NOT NULL,
      open TEXT NOT NULL DEFAULT '0',
      high TEXT NOT NULL DEFAULT '0',
      low TEXT NOT NULL DEFAULT '0',
      close TEXT NOT NULL DEFAULT '0',
      gross_nav TEXT NOT NULL DEFAULT '0',
      share_supply TEXT NOT NULL DEFAULT '0',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS simulator_state (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_requests_vault_status ON requests(vault_id, status);
    CREATE INDEX IF NOT EXISTS idx_requests_controller ON requests(controller);
    CREATE INDEX IF NOT EXISTS idx_fs_positions_vault ON fs_positions(vault_id);
    CREATE INDEX IF NOT EXISTS idx_fs_positions_open ON fs_positions(vault_id, market_id)
      WHERE status = 'open';
    CREATE INDEX IF NOT EXISTS idx_candles_vault_ts ON index_candles(vault_id, bucket_ts);
  `);
}
