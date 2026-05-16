import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "bun";
import { loadConfig, INDICES, LIVE_VAULTS, PREVIEW_INDICES, ANVIL_AI_VAULT, ANVIL_CRYPTO_VAULT, BASE_SEPOLIA_AI_VAULT, BASE_SEPOLIA_CRYPTO_VAULT } from "./config.ts";
import { createDb } from "./db.ts";
import { getFsClient } from "./sdk.ts";
import { MockVault } from "./mock-vault.ts";
import { RealIndexer } from "./indexer.ts";
import { computeSubscribeQuote, computeRedeemQuote } from "./quotes.ts";
import { Curator } from "./curator.ts";
import { Simulator } from "./simulator.ts";
import { seedCandleHistory, appendCurrentCandle } from "./candles.ts";
import type { Address } from "viem";

const config = loadConfig();
const db = createDb(process.env.DB_PATH ?? "data/indexspace.db");
const mockVault = new MockVault(db, INDICES);
const curator = new Curator(db);
const simulator = new Simulator(mockVault);
const fsClient = getFsClient(config.fsApiUrl, config.fsUsername, config.fsPassword);

if (!config.mockVault) {
  curator.configureRpc(config.rpcUrl, config.curatorPrivateKey, config.chainId);
}

const realVaultAddresses = config.chainId === 31337
  ? { "ai-acceleration": ANVIL_AI_VAULT as Address, "crypto-reflexivity": ANVIL_CRYPTO_VAULT as Address }
  : { "ai-acceleration": BASE_SEPOLIA_AI_VAULT as Address, "crypto-reflexivity": BASE_SEPOLIA_CRYPTO_VAULT as Address };

const realIndexer = config.mockVault ? null : new RealIndexer(db, config, realVaultAddresses);

// Seed artificial price history for all vaults on startup (no-op if already seeded)
for (const idx of INDICES) {
  seedCandleHistory(db, idx.id);
}

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    fsClientConfigured: fsClient !== null,
    mockVault: config.mockVault,
    simulatorEnabled: simulator.isEnabled(),
  });
});

app.get("/api/indices", (c) => {
  return c.json(INDICES);
});

app.get("/api/vaults", (c) => {
  const vaults = INDICES.map((idx) => ({
    id: idx.id,
    name: idx.name,
    mode: idx.mode,
    isLive: LIVE_VAULTS.includes(idx.id as typeof LIVE_VAULTS[number]),
    isPreview: PREVIEW_INDICES.includes(idx.id as typeof PREVIEW_INDICES[number]),
    constituentCount: idx.constituents.length,
  }));
  return c.json(vaults);
});

app.get("/api/vaults/:vaultId", (c) => {
  const vaultId = c.req.param("vaultId");
  const index = INDICES.find((i) => i.id === vaultId);
  if (!index) return c.json({ error: "vault not found" }, 404);

  const totalShares = mockVault.getTotalShares(vaultId);
  const usdcBalance = mockVault.getVaultUsdcBalance(vaultId);
  const navPerShare = totalShares > 0 ? usdcBalance / totalShares : 1;

  return c.json({
    ...index,
    metrics: {
      navPerShare: navPerShare.toFixed(18),
      totalShares: totalShares.toFixed(18),
      usdcBalance: usdcBalance.toFixed(6),
      curatorConfigured: fsClient !== null,
    },
  });
});

app.get("/api/vaults/:vaultId/requests", (c) => {
  const vaultId = c.req.param("vaultId");
  const controller = c.req.query("controller") ?? "";

  if (controller) {
    const rows = db.query(
      "SELECT * FROM requests WHERE vault_id = ? AND controller = ? ORDER BY created_at DESC LIMIT 100",
    ).all(vaultId, controller);
    return c.json(rows);
  }

  const rows = db.query(
    "SELECT * FROM requests WHERE vault_id = ? ORDER BY created_at DESC LIMIT 100",
  ).all(vaultId);
  return c.json(rows);
});

app.get("/api/vaults/:vaultId/positions", (c) => {
  const vaultId = c.req.param("vaultId");
  const rows = db.query(
    "SELECT * FROM fs_positions WHERE vault_id = ? ORDER BY created_at DESC LIMIT 100",
  ).all(vaultId);
  return c.json(rows);
});

app.get("/api/vaults/:vaultId/candles", (c) => {
  const vaultId = c.req.param("vaultId");
  type CandleRow = { bucket_ts: string; close: string; share_supply: string };
  const rows = db.query(
    "SELECT bucket_ts, close, share_supply FROM index_candles WHERE vault_id = ? ORDER BY bucket_ts ASC LIMIT 2200",
  ).all(vaultId) as CandleRow[];
  const navPoints = rows.map((r) => ({
    ts: r.bucket_ts,
    nav: parseFloat(r.close),
    shares: parseFloat(r.share_supply),
  }));
  return c.json(navPoints);
});

app.post("/api/vaults/:vaultId/quote-subscribe", async (c) => {
  const vaultId = c.req.param("vaultId");
  const index = INDICES.find((i) => i.id === vaultId);
  if (!index) return c.json({ error: "vault not found" }, 404);

  let assets = 100;
  try {
    const body = await c.req.json<{ assets?: string }>();
    if (body.assets) assets = parseFloat(body.assets);
  } catch {}

  const quote = computeSubscribeQuote(vaultId, assets, index, db);
  return c.json(quote);
});

app.post("/api/vaults/:vaultId/quote-redeem", async (c) => {
  const vaultId = c.req.param("vaultId");
  const index = INDICES.find((i) => i.id === vaultId);
  if (!index) return c.json({ error: "vault not found" }, 404);

  let shares = 10;
  try {
    const body = await c.req.json<{ shares?: string }>();
    if (body.shares) shares = parseFloat(body.shares);
  } catch {}

  const quote = computeRedeemQuote(vaultId, shares, index, db);
  return c.json(quote);
});

app.get("/internal/status", (c) => {
  const checkpointCount = db.query(
    "SELECT COUNT(*) AS cnt FROM indexer_checkpoints",
  ).get() as { cnt: number };

  const requestCount = db.query(
    "SELECT status, COUNT(*) AS cnt FROM requests GROUP BY status",
  ).all();

  const positionCount = db.query(
    "SELECT status, COUNT(*) AS cnt FROM fs_positions GROUP BY status",
  ).all();

  return c.json({
    config: {
      port: config.port,
      mockVault: config.mockVault,
      fsConfigured: config.fsUsername !== undefined,
      rpcUrl: config.rpcUrl,
      pollIntervalMs: config.pollIntervalMs,
    },
    db: {
      checkpoints: checkpointCount?.cnt ?? 0,
      requests: requestCount,
      positions: positionCount,
    },
    simulator: {
      enabled: simulator.isEnabled(),
    },
  });
});

app.post("/internal/curator/tick", async (c) => {
  const results = await curator.tick();
  return c.json({ processed: results.length, results });
});

app.post("/internal/indexer/tick", async (c) => {
  if (realIndexer) {
    const events = await realIndexer.tick();
    const count = realIndexer.persistEvents(events);
    return c.json({ indexed: count });
  }

  const events = mockVault.pollEvents();
  for (const ev of events) {
    const exists = db.query(
      "SELECT COUNT(*) AS cnt FROM requests WHERE vault_id = ? AND internal_request_id = ?",
    ).get(ev.vaultId, ev.internalRequestId) as { cnt: number };

    if (exists.cnt === 0) {
      db.run(
        `INSERT INTO requests (chain_id, vault_id, internal_request_id, controller, owner, kind, status, asset_amount, share_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
        [config.chainId, ev.vaultId, ev.internalRequestId, ev.controller, ev.owner, ev.kind, ev.assetAmount, ev.shareAmount],
      );
    }
  }

  if (events.length > 0) {
    const existing = db.query(
      "SELECT last_indexed_block FROM indexer_checkpoints WHERE chain_id = ? AND contract_address = 'mock-vault'",
    ).get(config.chainId) as { last_indexed_block: number } | null;
    const nextBlock = (existing?.last_indexed_block ?? 0) + 1;
    db.run(
      "INSERT OR REPLACE INTO indexer_checkpoints (chain_id, contract_address, last_indexed_block, updated_at) VALUES (?, 'mock-vault', ?, datetime('now'))",
      [config.chainId, nextBlock],
    );
  }

  return c.json({ indexed: events.length });
});

app.post("/internal/simulator", async (c) => {
  let enabled: boolean | undefined;
  try {
    const body = await c.req.json<{ enabled?: boolean }>();
    enabled = body.enabled;
  } catch {}

  if (enabled !== undefined) {
    simulator.setEnabled(enabled);
  }
  return c.json({ enabled: simulator.isEnabled() });
});

app.post("/internal/simulator/generate", (c) => {
  const count = simulator.generateActivity();
  return c.json({ generated: count });
});

if (config.mockVault) {
  setInterval(() => {
    const events = mockVault.pollEvents();
    for (const ev of events) {
      const exists = db.query(
        "SELECT COUNT(*) AS cnt FROM requests WHERE vault_id = ? AND internal_request_id = ?",
      ).get(ev.vaultId, ev.internalRequestId) as { cnt: number };

      if (exists.cnt === 0) {
        db.run(
          `INSERT INTO requests (chain_id, vault_id, internal_request_id, controller, owner, kind, status, asset_amount, share_amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'), datetime('now'))`,
          [config.chainId, ev.vaultId, ev.internalRequestId, ev.controller, ev.owner, ev.kind, ev.assetAmount, ev.shareAmount],
        );
      }
    }
  }, config.pollIntervalMs);

  setInterval(async () => {
    await curator.tick();
    for (const idx of INDICES) {
      const totalShares = mockVault.getTotalShares(idx.id);
      const usdcBalance = mockVault.getVaultUsdcBalance(idx.id);
      const nav = totalShares > 0 ? usdcBalance / totalShares : 1;
      appendCurrentCandle(db, idx.id, nav, totalShares);
    }
  }, Math.max(config.pollIntervalMs, 15000));

  simulator.start();
} else {
  setInterval(async () => {
    const events = await realIndexer!.tick();
    realIndexer!.persistEvents(events);
  }, config.pollIntervalMs);

  setInterval(async () => {
    await curator.tick();
    for (const idx of INDICES) {
      const totalShares = mockVault.getTotalShares(idx.id);
      const usdcBalance = mockVault.getVaultUsdcBalance(idx.id);
      const nav = totalShares > 0 ? usdcBalance / totalShares : 1;
      appendCurrentCandle(db, idx.id, nav, totalShares);
    }
  }, Math.max(config.pollIntervalMs, 15000));
}

console.log(`IndexSpace backend starting on http://${config.host}:${config.port}`);
console.log(`  Mock vault: ${config.mockVault}`);
console.log(`  FS client: ${fsClient ? "configured" : "not configured"}`);
console.log(`  Simulator: ${simulator.isEnabled() ? "enabled" : "disabled"}`);

serve({
  fetch: app.fetch,
  port: config.port,
  hostname: config.host,
});
