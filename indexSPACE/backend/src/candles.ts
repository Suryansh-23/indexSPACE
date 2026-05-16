import type { Database } from "bun:sqlite";

const HOUR_MS = 60 * 60 * 1000;
const SEED_DAYS = 90;

function floorToHour(ts: number): number {
  return Math.floor(ts / HOUR_MS) * HOUR_MS;
}

function isoHour(ts: number): string {
  return new Date(ts).toISOString().slice(0, 13) + ":00:00.000Z";
}

export function seedCandleHistory(db: Database, vaultId: string): void {
  const existing = db.query(
    "SELECT COUNT(*) AS cnt FROM index_candles WHERE vault_id = ?",
  ).get(vaultId) as { cnt: number };

  if (existing.cnt > 0) return;

  const now = floorToHour(Date.now());
  const totalHours = SEED_DAYS * 24;

  // Generate mean-reverting random walk backward from now.
  // Target NAV at present = 1.0. Walk backward so history converges to 1.0 now.
  const navs: number[] = new Array(totalHours + 1);
  navs[totalHours] = 1.0;

  const mean = 1.0;
  const meanReversion = 0.005;
  const hourlyVol = 0.0018;

  for (let i = totalHours - 1; i >= 0; i--) {
    const next = navs[i + 1]!;
    const drift = meanReversion * (mean - next);
    const shock = (Math.random() - 0.5) * 2 * hourlyVol;
    navs[i] = Math.max(0.85, Math.min(1.25, next - drift + shock));
  }

  const insert = db.prepare(`
    INSERT INTO index_candles
      (vault_id, bucket_ts, open, high, low, close, gross_nav, share_supply, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT DO NOTHING
  `);

  const insertMany = db.transaction(() => {
    for (let i = 0; i < totalHours; i++) {
      const bucketTs = new Date(now - (totalHours - i) * HOUR_MS).toISOString();
      const o = navs[i]!;
      const c = navs[i + 1]!;
      const hi = Math.max(o, c) * (1 + Math.random() * 0.0008);
      const lo = Math.min(o, c) * (1 - Math.random() * 0.0008);
      const shares = 0;
      insert.run(vaultId, bucketTs, o.toFixed(6), hi.toFixed(6), lo.toFixed(6), c.toFixed(6), c.toFixed(6), shares);
    }
  });

  insertMany();
}

export function appendCurrentCandle(db: Database, vaultId: string, navPerShare: number, shareSupply: number): void {
  const bucketTs = isoHour(floorToHour(Date.now()));

  const existing = db.query(
    "SELECT id, open, high, low FROM index_candles WHERE vault_id = ? AND bucket_ts = ?",
  ).get(vaultId, bucketTs) as { id: number; open: string; high: string; low: string } | null;

  const nav = navPerShare.toFixed(6);

  if (existing) {
    const hi = Math.max(parseFloat(existing.high), navPerShare).toFixed(6);
    const lo = Math.min(parseFloat(existing.low), navPerShare).toFixed(6);
    db.run(
      "UPDATE index_candles SET close = ?, gross_nav = ?, high = ?, low = ?, share_supply = ? WHERE id = ?",
      [nav, nav, hi, lo, shareSupply.toFixed(6), existing.id],
    );
  } else {
    db.run(
      `INSERT INTO index_candles (vault_id, bucket_ts, open, high, low, close, gross_nav, share_supply, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [vaultId, bucketTs, nav, nav, nav, nav, nav, shareSupply.toFixed(6)],
    );
  }
}
