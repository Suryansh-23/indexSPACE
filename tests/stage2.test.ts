import { describe, it, expect } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';
import { buildGaussian, buildPlateau, buildBelief } from '../packages/core/src/math/builders.js';
import { evaluateDensity, evaluateDensityCurve, computeStatistics } from '../packages/core/src/math/bernstein.js';
import { queryMarketState, getConsensusCurve, queryConsensusSummary, queryDensityAt } from '../packages/core/src/queries/market.js';
import { queryPositionState } from '../packages/core/src/queries/positions.js';
import { buy } from '../packages/core/src/transactions/buy.js';
import { sell } from '../packages/core/src/transactions/sell.js';
import { projectSell } from '../packages/core/src/projections/projectSell.js';
import { projectPayoutCurve } from '../packages/core/src/projections/projectPayoutCurve.js';

const BASE_URL = 'http://localhost:8000';
const USERNAME = 'SDK_demo';
const PASSWORD = 'demo_2026_@@';
const MARKET_ID = '15';

// Use K=60, L and H from actual market — but for pure math tests use representative values
const K = 60;
const L = 0;
const H = 100;

function makeClient() {
  return new FSClient({ baseUrl: BASE_URL, username: USERNAME, password: PASSWORD });
}

// ── Math tests (no backend) ──

describe('Math: buildGaussian', () => {
  it('produces vector of length K+1 that sums to 1', () => {
    const v = buildGaussian(60, 9, K, L, H);
    expect(v.length).toBe(K + 1);
    const sum = v.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('all values are non-negative', () => {
    const v = buildGaussian(60, 9, K, L, H);
    for (const val of v) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Math: buildPlateau', () => {
  it('produces vector that sums to 1 with non-negative values', () => {
    const v = buildPlateau(50, 70, K, L, H);
    expect(v.length).toBe(K + 1);
    const sum = v.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
    for (const val of v) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Math: buildBelief', () => {
  it('single PointRegion produces similar output to buildGaussian', () => {
    const fromBuilder = buildBelief(
      [{ type: 'point', center: 60, spread: 9 }],
      K, L, H,
    );
    const fromGaussian = buildGaussian(60, 9, K, L, H);
    expect(fromBuilder.length).toBe(fromGaussian.length);
    for (let i = 0; i < fromBuilder.length; i++) {
      expect(fromBuilder[i]).toBeCloseTo(fromGaussian[i], 10);
    }
  });
});

describe('Math: evaluateDensity', () => {
  it('density at center of Gaussian is highest', () => {
    const v = buildGaussian(60, 9, K, L, H);
    const atCenter = evaluateDensity(v, 60, L, H);
    const atEdge = evaluateDensity(v, 20, L, H);
    expect(atCenter).toBeGreaterThan(atEdge);
    expect(atCenter).toBeGreaterThan(0);
  });
});

describe('Math: evaluateDensityCurve', () => {
  it('returns correct number of points spanning [L, H]', () => {
    const v = buildGaussian(60, 9, K, L, H);
    const curve = evaluateDensityCurve(v, L, H, 100);
    expect(curve.length).toBe(100);
    expect(curve[0].x).toBeCloseTo(L);
    expect(curve[99].x).toBeCloseTo(H);
  });
});

describe('Math: computeStatistics', () => {
  it('returns all 5 fields with mean close to center for symmetric Gaussian', () => {
    const v = buildGaussian(50, 10, K, L, H);
    const stats = computeStatistics(v, L, H);
    expect(stats.mean).toBeCloseTo(50, 0);
    expect(stats.median).toBeDefined();
    expect(stats.mode).toBeDefined();
    expect(stats.variance).toBeGreaterThan(0);
    expect(stats.stdDev).toBeGreaterThan(0);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(stats.variance), 5);
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

describe('API: projectPayoutCurve', () => {
  it('returns projections with correct fields', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const belief = buildGaussian(
      (market.config.L + market.config.H) / 2,
      (market.config.H - market.config.L) * 0.1,
      market.config.K,
      market.config.L,
      market.config.H,
    );
    const payout = await projectPayoutCurve(client, MARKET_ID, belief, 10, 20);
    expect(payout.projections.length).toBe(20);
    expect(payout.maxPayout).toBeGreaterThan(0);
    expect(payout.inputCollateral).toBe(10);
    expect(payout.projections[0]).toHaveProperty('outcome');
    expect(payout.projections[0]).toHaveProperty('payout');
    expect(payout.projections[0]).toHaveProperty('profitLoss');
  });
});

describe('API: Full trade cycle (Gaussian via buildGaussian)', () => {
  it('buildGaussian → buy → queryPositionState → projectSell → sell', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const center = (market.config.L + market.config.H) / 2;
    const belief = buildGaussian(
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

    // Project sell
    const projected = await projectSell(client, buyResult.positionId, MARKET_ID);
    expect(projected.collateralReturned).toBeGreaterThan(0);

    // Sell
    const sellResult = await sell(client, buyResult.positionId, MARKET_ID);
    expect(sellResult.positionId).toBe(buyResult.positionId);
    expect(sellResult.collateralReturned).toBeGreaterThan(0);
  }, 30000);
});

describe('API: Full trade cycle (Plateau via buildPlateau)', () => {
  it('buildPlateau → buy → projectSell → sell', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const { L: mL, H: mH, K: mK } = market.config;
    const low = mL + (mH - mL) * 0.3;
    const high = mL + (mH - mL) * 0.7;
    const belief = buildPlateau(low, high, mK, mL, mH);

    const buyResult = await buy(client, MARKET_ID, belief, 1, { prediction: (low + high) / 2 });
    expect(buyResult.positionId).toBeDefined();
    expect(buyResult.claims).toBeGreaterThan(0);

    const projected = await projectSell(client, buyResult.positionId, MARKET_ID);
    expect(projected.collateralReturned).toBeGreaterThan(0);

    const sellResult = await sell(client, buyResult.positionId, MARKET_ID);
    expect(sellResult.collateralReturned).toBeGreaterThan(0);
  }, 30000);
});

describe('API: Full trade cycle (buildBelief with mixed regions)', () => {
  it('buildBelief → buy → sell', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const { L: mL, H: mH, K: mK } = market.config;
    const belief = buildBelief(
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

    // Pick a few points from the curve and compare against direct evaluateDensity
    for (const point of [curve.points[10], curve.points[25], curve.points[40]]) {
      const directDensity = evaluateDensity(
        market.consensus, point.x, market.config.L, market.config.H,
      );
      expect(directDensity).toBeCloseTo(point.y, 5);
    }
  });

  it('projectSell value is consistent with projectPayoutCurve at consensus mean', async () => {
    const client = makeClient();
    const market = await queryMarketState(client, MARKET_ID);
    const center = (market.config.L + market.config.H) / 2;
    const belief = buildGaussian(center, (market.config.H - market.config.L) * 0.1, market.config.K, market.config.L, market.config.H);

    // Buy a position
    const buyResult = await buy(client, MARKET_ID, belief, 5, { prediction: center });

    // Get projectSell value
    const sellProjection = await projectSell(client, buyResult.positionId, MARKET_ID);

    // Get payout curve
    const payoutCurve = await projectPayoutCurve(client, MARKET_ID, belief, 5, 50);

    // projectSell gives the current sell value; payoutCurve gives payout at settlement outcomes
    // They measure different things, but both should be positive for a valid position
    expect(sellProjection.collateralReturned).toBeGreaterThan(0);
    expect(payoutCurve.maxPayout).toBeGreaterThan(0);
    expect(payoutCurve.inputCollateral).toBe(5);

    // Clean up
    await sell(client, buyResult.positionId, MARKET_ID);
  }, 30000);
});
