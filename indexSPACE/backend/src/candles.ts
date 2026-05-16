import type { Database } from "bun:sqlite";

const CANDLE_SEED_VERSION = 2;
const MIN5_MS = 5 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Hourly candles for days 3–90 (2088 buckets), 5-min for last 3 days (864 buckets)
const SEED_RECENT_DAYS = 3;
const SEED_TOTAL_DAYS = 90;
const SEED_HOURS_HOURLY = (SEED_TOTAL_DAYS - SEED_RECENT_DAYS) * 24;
const SEED_5MIN_BUCKETS = SEED_RECENT_DAYS * 24 * 12;

const VAULT_START_NAV: Record<string, number> = {
  "ai-acceleration": 0.94,
  "crypto-reflexivity": 1.03,
};

function floorTo5Min(ts: number): number {
  return Math.floor(ts / MIN5_MS) * MIN5_MS;
}

function isoTs(ts: number): string {
  return new Date(ts).toISOString();
}

// Seeded LCG — deterministic per vault so history stays stable across restarts
function makeLcgRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

// Forward Ornstein-Uhlenbeck walk. mean-reverting by construction.
function forwardWalk(
  startNav: number,
  steps: number,
  mean: number,
  theta: number,     // mean-reversion speed per step
  stepVol: number,
  rng: () => number,
): number[] {
  const navs = new Array<number>(steps + 1);
  navs[0] = startNav;
  for (let i = 1; i <= steps; i++) {
    const prev = navs[i - 1]!;
    const drift = theta * (mean - prev);
    const shock = (rng() - 0.5) * 2 * stepVol;
    navs[i] = Math.max(0.82, Math.min(1.40, prev + drift + shock));
  }
  return navs;
}

export function seedCandleHistory(db: Database, vaultId: string): void {
  const stateKey = `candle_seed_version_${vaultId}`;
  const stored = db.query(
    "SELECT value_json FROM simulator_state WHERE key = ?",
  ).get(stateKey) as { value_json: string } | null;

  if (stored && JSON.parse(stored.value_json) === CANDLE_SEED_VERSION) return;

  // Version mismatch — clear stale data and reseed
  db.run("DELETE FROM index_candles WHERE vault_id = ?", [vaultId]);

  const startNav = VAULT_START_NAV[vaultId] ?? 1.0;
  const mean = 1.0;

  // Hourly walk: theta=0.004 per hour, vol=0.0018 per hour
  const hourlyNavs = forwardWalk(
    startNav,
    SEED_HOURS_HOURLY,
    mean,
    0.004,
    0.0018,
    makeLcgRand(hashSeed(`${vaultId}:hourly`)),
  );

  // 5-min walk: bridge from where hourly walk ends
  // Scale theta and vol from hourly → 5-min (1/12 of an hour)
  const bridgeNav = hourlyNavs[hourlyNavs.length - 1]!;
  const fiveMinNavs = forwardWalk(
    bridgeNav,
    SEED_5MIN_BUCKETS,
    mean,
    0.004 / 12,
    0.0018 / Math.sqrt(12),
    makeLcgRand(hashSeed(`${vaultId}:5min`)),
  );

  const now = Date.now();
  // Boundary: the 5-min bucket that is exactly SEED_RECENT_DAYS ago
  const recentBoundaryTs = floorTo5Min(now) - SEED_5MIN_BUCKETS * MIN5_MS;

  const insert = db.prepare(`
    INSERT INTO index_candles
      (vault_id, bucket_ts, open, high, low, close, gross_nav, share_supply, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertMany = db.transaction(() => {
    // Hourly candles: i-th bucket is recentBoundaryTs - (SEED_HOURS_HOURLY - i) * HOUR_MS
    for (let i = 0; i < SEED_HOURS_HOURLY; i++) {
      const bucketTs = isoTs(recentBoundaryTs - (SEED_HOURS_HOURLY - i) * HOUR_MS);
      const o = hourlyNavs[i]!;
      const c = hourlyNavs[i + 1]!;
      const spread = Math.abs(c - o);
      const hi = (Math.max(o, c) * (1 + spread * 0.4 + 0.0003)).toFixed(6);
      const lo = (Math.min(o, c) * (1 - spread * 0.4 - 0.0003)).toFixed(6);
      insert.run(vaultId, bucketTs, o.toFixed(6), hi, lo, c.toFixed(6), c.toFixed(6), '0');
    }

    // 5-min candles: j-th bucket starts at recentBoundaryTs + j * MIN5_MS
    for (let j = 0; j < SEED_5MIN_BUCKETS; j++) {
      const bucketTs = isoTs(recentBoundaryTs + j * MIN5_MS);
      const o = fiveMinNavs[j]!;
      const c = fiveMinNavs[j + 1]!;
      const spread = Math.abs(c - o);
      const hi = (Math.max(o, c) * (1 + spread * 0.5 + 0.0002)).toFixed(6);
      const lo = (Math.min(o, c) * (1 - spread * 0.5 - 0.0002)).toFixed(6);
      insert.run(vaultId, bucketTs, o.toFixed(6), hi, lo, c.toFixed(6), c.toFixed(6), '0');
    }
  });

  insertMany();

  db.run(
    "INSERT OR REPLACE INTO simulator_state (key, value_json, updated_at) VALUES (?, ?, datetime('now'))",
    [stateKey, JSON.stringify(CANDLE_SEED_VERSION)],
  );
}

export function appendCurrentCandle(
  db: Database,
  vaultId: string,
  navPerShare: number,
  shareSupply: number,
): void {
  const bucketTs = isoTs(floorTo5Min(Date.now()));
  const nav = navPerShare.toFixed(6);

  const existing = db.query(
    "SELECT id, open, high, low FROM index_candles WHERE vault_id = ? AND bucket_ts = ?",
  ).get(vaultId, bucketTs) as { id: number; open: string; high: string; low: string } | null;

  if (existing) {
    const hi = Math.max(parseFloat(existing.high), navPerShare).toFixed(6);
    const lo = Math.min(parseFloat(existing.low), navPerShare).toFixed(6);
    db.run(
      "UPDATE index_candles SET close = ?, gross_nav = ?, high = ?, low = ?, share_supply = ? WHERE id = ?",
      [nav, nav, hi, lo, shareSupply.toFixed(6), existing.id],
    );
  } else {
    db.run(
      `INSERT INTO index_candles
         (vault_id, bucket_ts, open, high, low, close, gross_nav, share_supply, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [vaultId, bucketTs, nav, nav, nav, nav, nav, shareSupply.toFixed(6)],
    );
  }
}
