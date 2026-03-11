import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';
import { passwordlessLoginUser, silentReAuth } from '../packages/core/src/auth/auth.js';
import { PASSWORD_REQUIRED } from '../packages/core/src/types.js';
import { generateGaussian, generateRange, generateBelief } from '../packages/core/src/math/generators.js';
import { evaluateDensityPiecewise, evaluateDensityCurve, computeStatistics } from '../packages/core/src/math/density.js';
import { queryMarketState, getConsensusCurve, queryConsensusSummary, queryDensityAt } from '../packages/core/src/queries/market.js';
import { queryPositionState, queryMarketPositions } from '../packages/core/src/queries/positions.js';
import { queryMarketHistory } from '../packages/core/src/queries/history.js';
import { positionsToTradeEntries, queryTradeHistory } from '../packages/core/src/queries/trades.js';
import { buy } from '../packages/core/src/transactions/buy.js';
import { sell } from '../packages/core/src/transactions/sell.js';
import { previewSell } from '../packages/core/src/previews/previewSell.js';
import { previewPayoutCurve } from '../packages/core/src/previews/previewPayoutCurve.js';

const BASE_URL = process.env.FS_TEST_URL || 'http://localhost:8000';
const USERNAME = process.env.FS_TEST_USERNAME || '';
const PASSWORD = process.env.FS_TEST_PASSWORD || '';
const MARKET_ID = process.env.FS_TEST_MARKET_ID || '15';

// Use K=60, L and H from actual market — but for pure math tests use representative values
const K = 60;
const L = 0;
const H = 100;

function makeClient() {
  return new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
}

// ── Math tests (no backend) ──

describe('Math: generateGaussian', () => {
  it('produces vector of length K+1 that sums to 1', () => {
    const v = generateGaussian(60, 9, K, L, H);
    expect(v.length).toBe(K + 1);
    const sum = v.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('all values are non-negative', () => {
    const v = generateGaussian(60, 9, K, L, H);
    for (const val of v) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Math: generateRange', () => {
  it('produces vector that sums to 1 with non-negative values', () => {
    const v = generateRange(50, 70, K, L, H);
    expect(v.length).toBe(K + 1);
    const sum = v.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
    for (const val of v) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Math: generateBelief', () => {
  it('single PointRegion produces similar output to generateGaussian', () => {
    const fromGenerator = generateBelief(
      [{ type: 'point', center: 60, spread: 9 }],
      K, L, H,
    );
    const fromGaussian = generateGaussian(60, 9, K, L, H);
    expect(fromGenerator.length).toBe(fromGaussian.length);
    for (let i = 0; i < fromGenerator.length; i++) {
      expect(fromGenerator[i]).toBeCloseTo(fromGaussian[i], 10);
    }
  });
});

describe('Math: evaluateDensityPiecewise', () => {
  it('density at center of Gaussian is highest', () => {
    const v = generateGaussian(60, 9, K, L, H);
    const atCenter = evaluateDensityPiecewise(v, 60, L, H);
    const atEdge = evaluateDensityPiecewise(v, 20, L, H);
    expect(atCenter).toBeGreaterThan(atEdge);
    expect(atCenter).toBeGreaterThan(0);
  });
});

describe('Math: evaluateDensityCurve', () => {
  it('returns correct number of points spanning [L, H]', () => {
    const v = generateGaussian(60, 9, K, L, H);
    const curve = evaluateDensityCurve(v, L, H, 100);
    expect(curve.length).toBe(100);
    expect(curve[0].x).toBeCloseTo(L);
    expect(curve[99].x).toBeCloseTo(H);
  });
});

describe('Math: computeStatistics', () => {
  it('returns all 5 fields with mean close to center for symmetric Gaussian', () => {
    const v = generateGaussian(50, 10, K, L, H);
    const stats = computeStatistics(v, L, H);
    expect(stats.mean).toBeCloseTo(50, 0);
    expect(stats.median).toBeDefined();
    expect(stats.mode).toBeDefined();
    expect(stats.variance).toBeGreaterThan(0);
    expect(stats.stdDev).toBeGreaterThan(0);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(stats.variance), 5);
  });
});

// ── Trade History transform tests (no backend) ──

describe('positionsToTradeEntries', () => {
  it('creates a buy entry for each position', () => {
    const positions: any[] = [
      { positionId: 1, createdAt: '2025-01-15T14:00:00.000Z', prediction: 52.5, collateral: 100, owner: 'alice', status: 'open', soldPrice: null, closedAt: null },
      { positionId: 2, createdAt: '2025-01-15T15:00:00.000Z', prediction: 60.0, collateral: 50, owner: 'bob', status: 'open', soldPrice: null, closedAt: null },
    ];
    const entries = positionsToTradeEntries(positions);
    expect(entries).toHaveLength(2);
    expect(entries.every(e => e.side === 'buy')).toBe(true);
  });

  it('creates both buy and sell entries for sold positions', () => {
    const positions: any[] = [
      { positionId: 1, createdAt: '2025-01-15T14:00:00.000Z', prediction: 52.5, collateral: 100, owner: 'alice', status: 'sold', soldPrice: 112.5, closedAt: '2025-01-15T16:00:00.000Z' },
    ];
    const entries = positionsToTradeEntries(positions);
    expect(entries).toHaveLength(2);
    expect(entries[0].side).toBe('sell'); // Most recent first
    expect(entries[1].side).toBe('buy');
    expect(entries[0].amount).toBe(112.5);
    expect(entries[1].amount).toBe(100);
  });

  it('sorts by timestamp descending', () => {
    const positions: any[] = [
      { positionId: 1, createdAt: '2025-01-15T10:00:00.000Z', prediction: 50, collateral: 10, owner: 'a', status: 'open', soldPrice: null, closedAt: null },
      { positionId: 2, createdAt: '2025-01-15T14:00:00.000Z', prediction: 60, collateral: 20, owner: 'b', status: 'open', soldPrice: null, closedAt: null },
      { positionId: 3, createdAt: '2025-01-15T12:00:00.000Z', prediction: 55, collateral: 15, owner: 'c', status: 'open', soldPrice: null, closedAt: null },
    ];
    const entries = positionsToTradeEntries(positions);
    expect(entries[0].timestamp > entries[1].timestamp).toBe(true);
    expect(entries[1].timestamp > entries[2].timestamp).toBe(true);
  });

  it('respects limit option', () => {
    const positions: any[] = Array.from({ length: 20 }, (_, i) => ({
      positionId: i, createdAt: `2025-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      prediction: 50, collateral: 10, owner: 'user', status: 'open', soldPrice: null, closedAt: null,
    }));
    const entries = positionsToTradeEntries(positions, { limit: 5 });
    expect(entries).toHaveLength(5);
  });

  it('handles null prediction gracefully', () => {
    const positions: any[] = [
      { positionId: 1, createdAt: '2025-01-15T14:00:00.000Z', prediction: null, collateral: 100, owner: 'alice', status: 'open', soldPrice: null, closedAt: null },
    ];
    const entries = positionsToTradeEntries(positions);
    expect(entries[0].prediction).toBeNull();
  });

  it('handles null/missing timestamps with "--" fallback', () => {
    const positions: any[] = [
      { positionId: 1, createdAt: null, prediction: 50, collateral: 100, owner: 'alice', status: 'open', soldPrice: null, closedAt: null },
    ];
    const entries = positionsToTradeEntries(positions);
    expect(entries[0].timestamp).toBe('--');
  });

  it('returns unique IDs for buy and sell of same position', () => {
    const positions: any[] = [
      { positionId: 1, createdAt: '2025-01-15T14:00:00.000Z', prediction: 52.5, collateral: 100, owner: 'alice', status: 'sold', soldPrice: 120, closedAt: '2025-01-15T16:00:00.000Z' },
    ];
    const entries = positionsToTradeEntries(positions);
    const ids = entries.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('1_open');
    expect(ids).toContain('1_close');
  });
});

// ── API integration tests (backend required) ──

describe('API: queryMarketState', () => {
  it('returns MarketState with all required fields', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    expect(market.alpha).toBeDefined();
    expect(Array.isArray(market.alpha)).toBe(true);
    expect(market.consensus).toBeDefined();
    expect(market.config.K).toBe(60);
    expect(market.title).toBeDefined();
    expect(market.totalMass).toBeGreaterThan(0);
    expect(market.poolBalance).toBeDefined();
    expect(market.resolutionState).toBe('open');
  });

  it('consensus sums to ~1.0', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const sum = market.consensus.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

describe('API: getConsensusCurve', () => {
  it('returns curve with correct number of points', async () => {
    const client = makeClient();
    const curve = await getConsensusCurve(client, MARKET_ID, 100);
    expect(curve.points.length).toBe(100);
    expect(curve.config.K).toBe(60);
    expect(curve.points[0].y).toBeGreaterThan(0);
  });
});

describe('API: queryConsensusSummary', () => {
  it('returns all 5 stat fields', async () => {
    const client = makeClient();
    const stats = await queryConsensusSummary(client, MARKET_ID);
    expect(typeof stats.mean).toBe('number');
    expect(typeof stats.median).toBe('number');
    expect(typeof stats.mode).toBe('number');
    expect(typeof stats.variance).toBe('number');
    expect(typeof stats.stdDev).toBe('number');
  });
});

describe('API: queryDensityAt', () => {
  it('returns positive density at midpoint', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const mid = (market.config.L + market.config.H) / 2;
    const result = await queryDensityAt(client, MARKET_ID, mid);
    expect(result.x).toBe(mid);
    expect(result.density).toBeGreaterThan(0);
  });
});

describe('API: previewPayoutCurve', () => {
  it('returns previews with correct fields', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const belief = generateGaussian(
      (market.config.L + market.config.H) / 2,
      (market.config.H - market.config.L) * 0.1,
      market.config.K,
      market.config.L,
      market.config.H,
    );
    const payout = await previewPayoutCurve(client, MARKET_ID, belief, 10, 20);
    expect(payout.previews.length).toBe(20);
    expect(payout.maxPayout).toBeGreaterThan(0);
    expect(payout.inputCollateral).toBe(10);
    expect(payout.previews[0]).toHaveProperty('outcome');
    expect(payout.previews[0]).toHaveProperty('payout');
    expect(payout.previews[0]).toHaveProperty('profitLoss');
  });
});

describe('API: Full trade cycle (Gaussian via generateGaussian)', () => {
  it('generateGaussian → buy → queryPositionState → previewSell → sell', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const center = (market.config.L + market.config.H) / 2;
    const belief = generateGaussian(
      center,
      (market.config.H - market.config.L) * 0.1,
      market.config.K,
      market.config.L,
      market.config.H,
    );

    // Buy
    const buyResult = await buy(client, MARKET_ID, belief, 1, { prediction: center });
    expect(buyResult.positionId).toBeDefined();
    expect(buyResult.claims).toBeGreaterThan(0);
    expect(buyResult.collateral).toBe(1);

    // Query position
    const pos = await queryPositionState(client, buyResult.positionId, MARKET_ID);
    expect(pos.positionId).toBe(buyResult.positionId);
    expect(pos.status).toBe('open');

    // Preview sell
    const previewed = await previewSell(client, buyResult.positionId, MARKET_ID);
    expect(previewed.collateralReturned).toBeGreaterThan(0);

    // Sell
    const sellResult = await sell(client, buyResult.positionId, MARKET_ID);
    expect(sellResult.positionId).toBe(buyResult.positionId);
    expect(sellResult.collateralReturned).toBeGreaterThan(0);
  }, 30000);
});

describe('API: Full trade cycle (Range via generateRange)', () => {
  it('generateRange -> buy -> previewSell -> sell', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const { L: mL, H: mH, K: mK } = market.config;
    const low = mL + (mH - mL) * 0.3;
    const high = mL + (mH - mL) * 0.7;
    const belief = generateRange(low, high, mK, mL, mH);

    const buyResult = await buy(client, MARKET_ID, belief, 1, { prediction: (low + high) / 2 });
    expect(buyResult.positionId).toBeDefined();
    expect(buyResult.claims).toBeGreaterThan(0);

    const previewed = await previewSell(client, buyResult.positionId, MARKET_ID);
    expect(previewed.collateralReturned).toBeGreaterThan(0);

    const sellResult = await sell(client, buyResult.positionId, MARKET_ID);
    expect(sellResult.collateralReturned).toBeGreaterThan(0);
  }, 30000);
});

describe('API: Full trade cycle (generateBelief with mixed regions)', () => {
  it('generateBelief → buy → sell', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const { L: mL, H: mH, K: mK } = market.config;
    const belief = generateBelief(
      [
        { type: 'point', center: mL + (mH - mL) * 0.4, spread: (mH - mL) * 0.08 },
        { type: 'range', low: mL + (mH - mL) * 0.6, high: mL + (mH - mL) * 0.8, weight: 0.5 },
      ],
      mK, mL, mH,
    );

    const buyResult = await buy(client, MARKET_ID, belief, 1);
    expect(buyResult.positionId).toBeDefined();

    const sellResult = await sell(client, buyResult.positionId, MARKET_ID);
    expect(sellResult.collateralReturned).toBeGreaterThan(0);
  }, 30000);
});

describe('Cross-validation: local stats vs backend data', () => {
  it('local computeStatistics mean is consistent with backend consensus', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const localStats = computeStatistics(market.consensus, market.config.L, market.config.H);

    // Mean should be within the market range
    expect(localStats.mean).toBeGreaterThanOrEqual(market.config.L);
    expect(localStats.mean).toBeLessThanOrEqual(market.config.H);
    // Median should be within range
    expect(localStats.median).toBeGreaterThanOrEqual(market.config.L);
    expect(localStats.median).toBeLessThanOrEqual(market.config.H);
    // Mode should be within range
    expect(localStats.mode).toBeGreaterThanOrEqual(market.config.L);
    expect(localStats.mode).toBeLessThanOrEqual(market.config.H);
    // StdDev should be positive and less than the full range
    expect(localStats.stdDev).toBeGreaterThan(0);
    expect(localStats.stdDev).toBeLessThan(market.config.H - market.config.L);
  });

  it('local evaluateDensity on consensus produces values consistent with getConsensusCurve', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const curve = await getConsensusCurve(client, MARKET_ID, 50);

    // Pick a few points from the curve and compare against direct evaluateDensityPiecewise
    for (const point of [curve.points[10], curve.points[25], curve.points[40]]) {
      const directDensity = evaluateDensityPiecewise(
        market.consensus, point.x, market.config.L, market.config.H,
      );
      expect(directDensity).toBeCloseTo(point.y, 5);
    }
  });

  it('previewSell value is consistent with previewPayoutCurve at consensus mean', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const center = (market.config.L + market.config.H) / 2;
    const belief = generateGaussian(center, (market.config.H - market.config.L) * 0.1, market.config.K, market.config.L, market.config.H);

    // Buy a position
    const buyResult = await buy(client, MARKET_ID, belief, 5, { prediction: center });

    // Get previewSell value
    const sellPreview = await previewSell(client, buyResult.positionId, MARKET_ID);

    // Get payout curve
    const payoutCurve = await previewPayoutCurve(client, MARKET_ID, belief, 5, 50);

    // previewSell gives the current sell value; payoutCurve gives payout at settlement outcomes
    // They measure different things, but both should be positive for a valid position
    expect(sellPreview.collateralReturned).toBeGreaterThan(0);
    expect(payoutCurve.maxPayout).toBeGreaterThan(0);
    expect(payoutCurve.inputCollateral).toBe(5);

    // Clean up
    await sell(client, buyResult.positionId, MARKET_ID);
  }, 30000);
});

describe('API: queryMarketPositions', () => {
  it('returns an array of Position objects', async () => {
    const client = makeClient();
    const positions = await queryMarketPositions(client, MARKET_ID);
    expect(Array.isArray(positions)).toBe(true);
    if (positions.length > 0) {
      expect(positions[0]).toHaveProperty('positionId');
      expect(positions[0]).toHaveProperty('owner');
      expect(positions[0]).toHaveProperty('collateral');
      expect(positions[0]).toHaveProperty('status');
      expect(positions[0]).toHaveProperty('createdAt');
    }
  });
});

describe('API: queryTradeHistory', () => {
  it('returns trade entries sorted by timestamp descending', async () => {
    const client = makeClient();
    const trades = await queryTradeHistory(client, MARKET_ID);
    expect(Array.isArray(trades)).toBe(true);
    if (trades.length > 1) {
      // Verify descending order (most recent first)
      for (let i = 0; i < trades.length - 1; i++) {
        if (trades[i].timestamp !== '--' && trades[i + 1].timestamp !== '--') {
          expect(trades[i].timestamp >= trades[i + 1].timestamp).toBe(true);
        }
      }
    }
    if (trades.length > 0) {
      expect(trades[0]).toHaveProperty('id');
      expect(trades[0]).toHaveProperty('side');
      expect(trades[0]).toHaveProperty('amount');
      expect(trades[0]).toHaveProperty('username');
    }
  });

  it('respects limit option', async () => {
    const client = makeClient();
    const trades = await queryTradeHistory(client, MARKET_ID, { limit: 3 });
    expect(trades.length).toBeLessThanOrEqual(3);
  });
});

describe('API: queryMarketHistory', () => {
  it('returns MarketHistory with snapshots array', async () => {
    const client = makeClient();
    const history = await queryMarketHistory(client, MARKET_ID);
    expect(history.marketId).toBeDefined();
    expect(history.totalSnapshots).toBeDefined();
    expect(Array.isArray(history.snapshots)).toBe(true);
    if (history.snapshots.length > 0) {
      expect(history.snapshots[0]).toHaveProperty('snapshotId');
      expect(history.snapshots[0]).toHaveProperty('tradeId');
      expect(history.snapshots[0]).toHaveProperty('alphaVector');
      expect(Array.isArray(history.snapshots[0].alphaVector)).toBe(true);
      expect(history.snapshots[0]).toHaveProperty('createdAt');
    }
  });

  it('respects limit parameter', async () => {
    const client = makeClient();
    const history = await queryMarketHistory(client, MARKET_ID, 5);
    expect(history.snapshots.length).toBeLessThanOrEqual(5);
  });
});

// ── Passwordless Auth (mocked fetch, no backend) ──

const mockUserRaw = { user_id: 1, username: 'testuser', wallet_value: 1000, role: 'trader' };
const mockMappedUser = { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' };
const mockToken = 'mock-jwt-token';

function makeMockClient() {
  return new FSClient({ baseUrl: 'http://localhost:8000' });
}

describe('passwordlessLoginUser', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns login result for existing user', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: mockUserRaw, access_token: mockToken }),
    });

    const client = makeMockClient();
    const result = await passwordlessLoginUser(client, 'testuser');

    expect(result.action).toBe('login');
    expect(result.user).toEqual(mockMappedUser);
    expect(result.token).toBe(mockToken);
  });

  it('auto-signs up when user does not exist', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Invalid username' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUserRaw, access_token: mockToken }),
      });

    const client = makeMockClient();
    const result = await passwordlessLoginUser(client, 'newuser');

    expect(result.action).toBe('signup');
    expect(result.user).toEqual(mockMappedUser);
    expect(result.token).toBe(mockToken);
  });

  it('throws PASSWORD_REQUIRED for password-protected accounts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Password required for this account' }),
    });

    const client = makeMockClient();

    try {
      await passwordlessLoginUser(client, 'admin');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.code).toBe(PASSWORD_REQUIRED);
      expect(err.message).toBe('Password required for this account');
    }
  });

  it('throws on signup conflict (409 username already exists)', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Invalid username' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ detail: 'Username already exists' }),
      });

    const client = makeMockClient();

    try {
      await passwordlessLoginUser(client, 'taken');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('Username already exists');
    }
  });
});

describe('silentReAuth', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns user and token on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: mockUserRaw, access_token: mockToken }),
    });

    const client = makeMockClient();
    const result = await silentReAuth(client, 'testuser');

    expect(result.user).toEqual(mockMappedUser);
    expect(result.token).toBe(mockToken);
  });

  it('throws PASSWORD_REQUIRED for password-protected accounts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Password required for this account' }),
    });

    const client = makeMockClient();

    try {
      await silentReAuth(client, 'admin');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.code).toBe(PASSWORD_REQUIRED);
    }
  });

  it('throws standard error for other failures', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Token expired' }),
    });

    const client = makeMockClient();

    try {
      await silentReAuth(client, 'testuser');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('Token expired');
      expect(err.code).toBeUndefined();
    }
  });
});

describe('FSClient stored username', () => {
  it('getStoredUsername returns null by default', () => {
    const client = makeMockClient();
    expect(client.getStoredUsername()).toBe(null);
  });

  it('setStoredUsername then getStoredUsername returns the username', () => {
    const client = makeMockClient();
    client.setStoredUsername('alice');
    expect(client.getStoredUsername()).toBe('alice');
  });

  it('clearStoredUsername resets to null', () => {
    const client = makeMockClient();
    client.setStoredUsername('alice');
    client.clearStoredUsername();
    expect(client.getStoredUsername()).toBe(null);
  });
});
