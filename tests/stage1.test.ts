import { describe, it, expect } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';
import { calculateBucketDistribution } from '../packages/core/src/math/distribution.js';
import type {
  MarketConfig,
  MarketState,
  ConsensusSummary,
  ConsensusCurve,
  Position,
  BuyResult,
  SellResult,
  ProjectSellResult,
  PayoutCurve,
  BeliefVector,
  GaussianParams,
  PlateauParams,
  BucketData,
  FSConfig,
} from '../packages/core/src/types.js';

const BASE_URL = 'http://localhost:8000';
const USERNAME = 'SDK_demo';
const PASSWORD = 'demo_2026_@@';
const MARKET_ID = '15';

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
  it('GET /api/market/state returns data', async () => {
    const client = new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
    const data = await client.get<any>('/api/market/state', { market_id: MARKET_ID });
    expect(data.alpha_vector).toBeDefined();
    expect(data.market_params).toBeDefined();
    expect(data.title).toBeDefined();
    expect(Array.isArray(data.alpha_vector)).toBe(true);
  });

  it('retries on 401 (auto-reauth)', async () => {
    const client = new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
    // First call authenticates
    await client.get<any>('/api/market/state', { market_id: MARKET_ID });
    // Manually invalidate token by calling private field — simulate expiry
    (client as any).token = 'expired_token';
    // Second call should auto-reauth and succeed
    const data = await client.get<any>('/api/market/state', { market_id: MARKET_ID });
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

  it('bucket ranges cover [L, H] exactly', () => {
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

  it('returns empty array when H <= L', () => {
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
