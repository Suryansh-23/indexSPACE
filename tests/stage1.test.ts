import { describe, it, expect } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';
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
