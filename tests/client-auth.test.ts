import { describe, it, expect } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';
import { calculateBucketDistribution } from '../packages/core/src/math/distribution.js';
import { computePercentiles } from '../packages/core/src/math/density.js';
import { transformHistoryToFanChart } from '../packages/core/src/math/fanChart.js';
import type { MarketSnapshot } from '../packages/core/src/types.js';
import type {
  MarketConfig,
  MarketState,
  ConsensusSummary,
  ConsensusCurve,
  Position,
  BuyResult,
  SellResult,
  PreviewSellResult,
  PayoutCurve,
  BeliefVector,
  GaussianParams,
  RangeParams,
  BucketData,
  FSConfig,
} from '../packages/core/src/types.js';

const BASE_URL = process.env.FS_TEST_URL || 'http://localhost:8000';
const USERNAME = process.env.FS_TEST_USERNAME || '';
const PASSWORD = process.env.FS_TEST_PASSWORD || '';
const MARKET_ID = process.env.FS_TEST_MARKET_ID || '15';

describe('Stage 1: Types compile correctly', () => {
  it('all type imports resolve without error', () => {
    // If this test runs, all type imports compiled successfully
    const config: FSConfig = { baseUrl: BASE_URL, username: USERNAME, password: PASSWORD };
    expect(config.baseUrl).toBe(BASE_URL);
  });

  it('MarketState type has expected shape', () => {
    const state: Partial<MarketState> = {
      alpha: [1, 2, 3],
      consensus: [0.1, 0.2, 0.7],
      totalMass: 6,
      resolutionState: 'open',
      resolvedOutcome: null,
    };
    expect(state.resolutionState).toBe('open');
  });
});

describe('Stage 1: FSClient authentication', () => {
  it('authenticates and receives a JWT token', async () => {
    const client = new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
    await client.authenticate();
    // If no error thrown, auth succeeded
    expect(true).toBe(true);
  });

  it('fails with bad credentials', async () => {
    const client = new FSClient({ baseUrl: BASE_URL, username: 'bad_user', password: 'bad_pass' });
    await expect(client.authenticate()).rejects.toThrow();
  });
});

describe('Stage 1: FSClient API calls', () => {
  it('GET /api/views/markets/{id} returns data', async () => {
    const client = new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
    const data = await client.get<any>(`/api/views/markets/${MARKET_ID}`);
    expect(data.alpha_vector).toBeDefined();
    expect(data.market_model_params).toBeDefined();
    expect(data.title).toBeDefined();
    expect(Array.isArray(data.alpha_vector)).toBe(true);
  });

  it('retries on 401 (auto-reauth)', async () => {
    const client = new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
    // First call authenticates
    await client.get<any>(`/api/views/markets/${MARKET_ID}`);
    // Manually invalidate token by calling private field -- simulate expiry
    (client as any).token = 'expired_token';
    // Second call should auto-reauth and succeed
    const data = await client.get<any>(`/api/views/markets/${MARKET_ID}`);
    expect(data.alpha_vector).toBeDefined();
  });
});

describe('calculateBucketDistribution', () => {
  it('returns correct number of buckets', () => {
    const points = [
      { x: 0, y: 0.5 },
      { x: 50, y: 1.0 },
      { x: 100, y: 0.5 },
    ];
    const result = calculateBucketDistribution(points, 0, 100, 10, 0);
    expect(result).toHaveLength(10);
  });

  it('bucket ranges cover [lowerBound, upperBound] exactly', () => {
    const points = [
      { x: 0, y: 1.0 },
      { x: 100, y: 1.0 },
    ];
    const result = calculateBucketDistribution(points, 0, 100, 5, 0);
    expect(result[0].min).toBe(0);
    expect(result[4].max).toBe(100);
    for (const b of result) {
      expect(b.max - b.min).toBeCloseTo(20, 10);
    }
  });

  it('probabilities sum to approximately 1.0 for a proper density', () => {
    // Uniform density: f(x) = 1/100 on [0, 100]
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 100; i++) {
      points.push({ x: i, y: 0.01 });
    }
    const result = calculateBucketDistribution(points, 0, 100, 10, 0);
    const totalProb = result.reduce((sum, b) => sum + b.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 2);
  });

  it('each bucket has equal probability for uniform density', () => {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 100; i++) {
      points.push({ x: i, y: 0.01 });
    }
    const result = calculateBucketDistribution(points, 0, 100, 10, 0);
    for (const b of result) {
      expect(b.percentage).toBeCloseTo(10, 1);
    }
  });

  it('returns empty array for empty points', () => {
    expect(calculateBucketDistribution([], 0, 100, 10, 0)).toEqual([]);
  });

  it('returns empty array for single point', () => {
    expect(calculateBucketDistribution([{ x: 50, y: 1 }], 0, 100, 10, 0)).toEqual([]);
  });

  it('returns empty array when upperBound <= lowerBound', () => {
    const points = [{ x: 0, y: 1 }, { x: 100, y: 1 }];
    expect(calculateBucketDistribution(points, 100, 0, 10, 0)).toEqual([]);
    expect(calculateBucketDistribution(points, 50, 50, 10, 0)).toEqual([]);
  });

  it('clamps numBuckets to [1, 200]', () => {
    const points = [{ x: 0, y: 0.5 }, { x: 100, y: 0.5 }];
    expect(calculateBucketDistribution(points, 0, 100, 0, 0)).toHaveLength(1);
    expect(calculateBucketDistribution(points, 0, 100, -5, 0)).toHaveLength(1);
    expect(calculateBucketDistribution(points, 0, 100, 500, 0)).toHaveLength(200);
  });

  it('formats range labels with decimals', () => {
    const points = [{ x: 0, y: 0.5 }, { x: 10, y: 0.5 }];
    const result = calculateBucketDistribution(points, 0, 10, 2, 2);
    expect(result[0].range).toBe('0.00-5.00');
    expect(result[1].range).toBe('5.00-10.00');
  });

  it('formats range labels without decimals as rounded integers', () => {
    const points = [{ x: 0, y: 0.5 }, { x: 100, y: 0.5 }];
    const result = calculateBucketDistribution(points, 0, 100, 4, 0);
    expect(result[0].range).toBe('0-25');
    expect(result[3].range).toBe('75-100');
  });

  it('handles single bucket case', () => {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 100; i++) {
      points.push({ x: i, y: 0.01 });
    }
    const result = calculateBucketDistribution(points, 0, 100, 1, 0);
    expect(result).toHaveLength(1);
    expect(result[0].min).toBe(0);
    expect(result[0].max).toBe(100);
    expect(result[0].probability).toBeCloseTo(1.0, 2);
  });

  it('concentrates mass correctly for spike density', () => {
    // Spike at x=50
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 100; i++) {
      const dist = Math.abs(i - 50);
      points.push({ x: i, y: dist < 5 ? 0.1 : 0.001 });
    }
    const result = calculateBucketDistribution(points, 0, 100, 10, 0);
    // Bucket containing 50 (index 4, range 40-50 or index 5, range 50-60) should have highest mass
    const maxBucket = result.reduce((max, b) => b.percentage > max.percentage ? b : max, result[0]);
    expect(maxBucket.min).toBeLessThanOrEqual(50);
    expect(maxBucket.max).toBeGreaterThanOrEqual(45);
  });
});

describe('computePercentiles', () => {
  it('returns evenly spaced percentiles for uniform coefficients', () => {
    // Uniform: all coefficients equal → flat density
    const numBuckets = 60;
    const uniform = new Array(numBuckets + 1).fill(1 / (numBuckets + 1));
    const p = computePercentiles(uniform, 0, 100);
    // p50 should be near 50
    expect(p.p50).toBeCloseTo(50, 0);
    // p25 should be near 25
    expect(p.p25).toBeCloseTo(25, 0);
    // p75 should be near 75
    expect(p.p75).toBeCloseTo(75, 0);
  });

  it('returns tight inner bands for peaked distribution', () => {
    // Peaked at center: Gaussian-like
    const numBuckets = 60;
    const peaked = new Array(numBuckets + 1).fill(0);
    for (let i = 0; i <= numBuckets; i++) {
      const u = i / numBuckets;
      peaked[i] = Math.exp(-Math.pow((u - 0.5) * 10, 2));
    }
    const sum = peaked.reduce((a: number, b: number) => a + b, 0);
    const normalized = peaked.map((v: number) => v / sum);
    const p = computePercentiles(normalized, 0, 100);
    // Inner bands (25) should be much tighter than outer bands (95)
    const innerWidth = p.p62_5 - p.p37_5;
    const outerWidth = p.p97_5 - p.p2_5;
    expect(innerWidth).toBeLessThan(outerWidth);
  });

  it('produces monotonically ordered percentiles', () => {
    const numBuckets = 60;
    const uniform = new Array(numBuckets + 1).fill(1 / (numBuckets + 1));
    const p = computePercentiles(uniform, 0, 100);
    expect(p.p2_5).toBeLessThanOrEqual(p.p12_5);
    expect(p.p12_5).toBeLessThanOrEqual(p.p25);
    expect(p.p25).toBeLessThanOrEqual(p.p37_5);
    expect(p.p37_5).toBeLessThanOrEqual(p.p50);
    expect(p.p50).toBeLessThanOrEqual(p.p62_5);
    expect(p.p62_5).toBeLessThanOrEqual(p.p75);
    expect(p.p75).toBeLessThanOrEqual(p.p87_5);
    expect(p.p87_5).toBeLessThanOrEqual(p.p97_5);
  });

  it('all values within [lowerBound, upperBound]', () => {
    const numBuckets = 60;
    const uniform = new Array(numBuckets + 1).fill(1 / (numBuckets + 1));
    const p = computePercentiles(uniform, 10, 90);
    const values = [p.p2_5, p.p12_5, p.p25, p.p37_5, p.p50, p.p62_5, p.p75, p.p87_5, p.p97_5];
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(90);
    }
  });
});

describe('transformHistoryToFanChart', () => {
  function makeSnapshot(overrides: Partial<MarketSnapshot> = {}): MarketSnapshot {
    return {
      snapshotId: 1,
      tradeId: 1,
      side: 'buy',
      positionId: '1',
      alphaVector: new Array(61).fill(1),
      totalDeposits: 10,
      totalWithdrawals: 0,
      totalVolume: 10,
      currentPool: 10,
      numOpenPositions: 1,
      createdAt: '2025-01-15T14:00:00Z',
      ...overrides,
    };
  }

  it('returns empty for empty input', () => {
    expect(transformHistoryToFanChart([], 0, 100)).toEqual([]);
  });

  it('returns single point for single snapshot', () => {
    const result = transformHistoryToFanChart([makeSnapshot()], 0, 100);
    expect(result).toHaveLength(1);
    expect(result[0].percentiles).toBeDefined();
    expect(result[0].mean).toBeDefined();
  });

  it('downsamples >200 snapshots to exactly 200', () => {
    const snaps = Array.from({ length: 300 }, (_, i) =>
      makeSnapshot({
        snapshotId: i,
        tradeId: i,
        createdAt: new Date(2025, 0, 1, 0, i).toISOString(),
      })
    );
    const result = transformHistoryToFanChart(snaps, 0, 100, 200);
    expect(result).toHaveLength(200);
  });

  it('preserves first and last after downsampling', () => {
    const snaps = Array.from({ length: 300 }, (_, i) =>
      makeSnapshot({
        snapshotId: i,
        tradeId: i,
        createdAt: new Date(2025, 0, 1, 0, i).toISOString(),
      })
    );
    const result = transformHistoryToFanChart(snaps, 0, 100, 200);
    // First point matches first snapshot
    expect(result[0].createdAt).toBe(snaps[0].createdAt);
    // Last point matches last snapshot
    expect(result[result.length - 1].createdAt).toBe(snaps[snaps.length - 1].createdAt);
  });

  it('timestamps are monotonically increasing', () => {
    const snaps = Array.from({ length: 10 }, (_, i) =>
      makeSnapshot({
        snapshotId: i,
        tradeId: i,
        createdAt: new Date(2025, 0, 1, i).toISOString(),
      })
    );
    const result = transformHistoryToFanChart(snaps, 0, 100);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].timestamp).toBeGreaterThanOrEqual(result[i - 1].timestamp);
    }
  });

  it('filters out snapshots with all-zero alpha', () => {
    const snaps = [
      makeSnapshot({ snapshotId: 1, alphaVector: new Array(61).fill(1) }),
      makeSnapshot({ snapshotId: 2, alphaVector: new Array(61).fill(0) }), // bad
      makeSnapshot({ snapshotId: 3, alphaVector: new Array(61).fill(2) }),
    ];
    const result = transformHistoryToFanChart(snaps, 0, 100);
    expect(result).toHaveLength(2);
  });
});
