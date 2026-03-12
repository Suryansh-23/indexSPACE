/**
 * Mapping contract tests -- mocked-fetch unit tests for all mapping functions.
 *
 * These tests document the exact raw API response shapes and verify that each
 * mapping function correctly transforms snake_case API data into camelCase SDK
 * types. They run offline (no backend required) and serve as the baseline for
 * safe endpoint migration.
 *
 * Note: passwordlessLoginUser and silentReAuth already have mocked-fetch tests
 * in stage2.test.ts (lines 461-616). They are not duplicated here.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FSClient } from '../packages/core/src/client.js';
import { queryMarketState } from '../packages/core/src/queries/market.js';
import { queryMarketPositions } from '../packages/core/src/queries/positions.js';
import { queryMarketHistory } from '../packages/core/src/queries/history.js';
import { buy } from '../packages/core/src/transactions/buy.js';
import { sell } from '../packages/core/src/transactions/sell.js';
import { previewSell } from '../packages/core/src/previews/previewSell.js';
import { previewPayoutCurve } from '../packages/core/src/previews/previewPayoutCurve.js';
import { loginUser, signupUser, fetchCurrentUser } from '../packages/core/src/auth/auth.js';
import { discoverMarkets } from '../packages/core/src/discovery/markets.js';

// -- Shared utilities --

function makeMockClient() {
  return new FSClient({ baseUrl: 'http://localhost:8000' });
}

function makeMockClientWithAuth() {
  const client = makeMockClient();
  client.setToken('mock-token');
  return client;
}

// -- Raw API fixtures --

const mockMarketStateRaw = {
  alpha_vector: [10, 20, 30, 20, 10, 10],
  market_params: {
    K: 6,
    L: 0,
    H: 100,
    P0: 100,
    mu: 0.01,
    eps_alpha: 0.001,
    tau: 1.0,
    gamma: 0.5,
    lambda_s: 0.1,
    lambda_d: 0.05,
  },
  current_pool: 500.0,
  num_positions: 12,
  total_volume: 1500.0,
  positions_currently_open: 5,
  title: 'Test Market',
  x_axis_units: 'USD',
  decimals: 2,
  is_settled: false,
  settlement_outcome: null,
};

const expectedMarketState = {
  alpha: [10, 20, 30, 20, 10, 10],
  consensus: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
  totalMass: 100,
  poolBalance: 500.0,
  participantCount: 12,
  totalVolume: 1500.0,
  positionsOpen: 5,
  config: {
    K: 6,
    L: 0,
    H: 100,
    P0: 100,
    mu: 0.01,
    epsAlpha: 0.001,
    tau: 1.0,
    gamma: 0.5,
    lambdaS: 0.1,
    lambdaD: 0.05,
  },
  title: 'Test Market',
  xAxisUnits: 'USD',
  decimals: 2,
  resolutionState: 'open',
  resolvedOutcome: null,
};

const mockPositionsRaw = {
  positions: [
    {
      position_id: 42,
      belief_p: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
      input_collateral_C: 100.0,
      minted_claims_m: 95.5,
      username: 'trader1',
      status: 'open',
      prediction: 50,
      std_dev: 12.5,
      created_at: '2026-01-15T10:30:00Z',
      position_closed_at: null,
      sold_price: null,
      settlement_payout: null,
    },
    {
      position_id: 43,
      belief_p: [0.05, 0.1, 0.1, 0.3, 0.25, 0.2],
      input_collateral_C: 50.0,
      minted_claims_m: 48.2,
      username: 'trader2',
      status: 'closed',
      prediction: 70,
      std_dev: 15.0,
      created_at: '2026-01-16T14:00:00Z',
      position_closed_at: '2026-02-01T09:00:00Z',
      sold_price: 55.0,
      settlement_payout: null,
    },
  ],
};

const expectedPositions = [
  {
    positionId: 42,
    belief: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
    collateral: 100.0,
    claims: 95.5,
    owner: 'trader1',
    status: 'open',
    prediction: 50,
    stdDev: 12.5,
    createdAt: '2026-01-15T10:30:00Z',
    closedAt: null,
    soldPrice: null,
    settlementPayout: null,
  },
  {
    positionId: 43,
    belief: [0.05, 0.1, 0.1, 0.3, 0.25, 0.2],
    collateral: 50.0,
    claims: 48.2,
    owner: 'trader2',
    status: 'closed',
    prediction: 70,
    stdDev: 15.0,
    createdAt: '2026-01-16T14:00:00Z',
    closedAt: '2026-02-01T09:00:00Z',
    soldPrice: 55.0,
    settlementPayout: null,
  },
];

const mockHistoryRaw = {
  market_id: '123',
  total_snapshots: 2,
  snapshots: [
    {
      snapshot_id: 1,
      trade_id: 101,
      side: 'buy',
      position_id: 42,
      alpha_vector: [10, 20, 30, 20, 10, 10],
      total_deposits: 1000.0,
      total_withdrawals: 200.0,
      total_volume: 1200.0,
      current_pool: 800.0,
      num_open_positions: 5,
      created_at: '2026-01-15T10:30:00Z',
    },
    {
      snapshot_id: 2,
      trade_id: 102,
      side: 'sell',
      position_id: 43,
      alpha_vector: [12, 18, 28, 22, 10, 10],
      total_deposits: 1000.0,
      total_withdrawals: 250.0,
      total_volume: 1250.0,
      current_pool: 750.0,
      num_open_positions: 4,
      created_at: '2026-01-16T14:00:00Z',
    },
  ],
};

const expectedHistory = {
  marketId: '123',
  totalSnapshots: 2,
  snapshots: [
    {
      snapshotId: 1,
      tradeId: 101,
      side: 'buy',
      positionId: '42',
      alphaVector: [10, 20, 30, 20, 10, 10],
      totalDeposits: 1000.0,
      totalWithdrawals: 200.0,
      totalVolume: 1200.0,
      currentPool: 800.0,
      numOpenPositions: 5,
      createdAt: '2026-01-15T10:30:00Z',
    },
    {
      snapshotId: 2,
      tradeId: 102,
      side: 'sell',
      positionId: '43',
      alphaVector: [12, 18, 28, 22, 10, 10],
      totalDeposits: 1000.0,
      totalWithdrawals: 250.0,
      totalVolume: 1250.0,
      currentPool: 750.0,
      numOpenPositions: 4,
      createdAt: '2026-01-16T14:00:00Z',
    },
  ],
};

const mockBuyResponseRaw = {
  success: true,
  position: {
    position_id: 99,
    belief_p: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
    minted_claims_m: 9.5,
    input_collateral_C: 10,
  },
};

const expectedBuyResult = {
  positionId: 99,
  belief: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
  claims: 9.5,
  collateral: 10,
};

const mockSellResponseRaw = {
  position_id: 42,
  collateral_paid_t_star: 95.5,
};

const expectedSellResult = {
  positionId: 42,
  collateralReturned: 95.5,
};

const mockPreviewSellRaw = {
  current_value_t_star: 88.3,
  iterations: 15,
};

const expectedPreviewSellResult = {
  collateralReturned: 88.3,
  iterations: 15,
};

const mockPayoutCurveRaw = {
  projections: [
    { outcome: 0, payout: 5.0, profit_loss: -5.0 },
    { outcome: 50, payout: 15.0, profit_loss: 5.0 },
    { outcome: 100, payout: 8.0, profit_loss: -2.0 },
  ],
  max_payout: 15.0,
  max_payout_outcome: 50,
  input_collateral: 10,
};

const expectedPayoutCurve = {
  previews: [
    { outcome: 0, payout: 5.0, profitLoss: -5.0 },
    { outcome: 50, payout: 15.0, profitLoss: 5.0 },
    { outcome: 100, payout: 8.0, profitLoss: -2.0 },
  ],
  maxPayout: 15.0,
  maxPayoutOutcome: 50,
  inputCollateral: 10,
};

const mockLoginResponseRaw = {
  success: true,
  access_token: 'jwt-token-123',
  user: {
    user_id: 1,
    username: 'testuser',
    wallet_value: 1000.0,
    role: 'trader',
  },
};

const mockSignupResponseRaw = {
  user: {
    user_id: 2,
    username: 'newuser',
    wallet_value: 0,
    role: 'trader',
  },
};

const mockCurrentUserNested = {
  user: {
    user_id: 1,
    username: 'testuser',
    wallet_value: 1000.0,
    role: 'admin',
  },
};

const mockCurrentUserFlat = {
  user_id: 1,
  username: 'testuser',
  wallet_value: 1000.0,
  role: 'admin',
};

const expectedCurrentUser = {
  userId: 1,
  username: 'testuser',
  walletValue: 1000.0,
  role: 'admin',
};

const mockDiscoverMarketsRaw = [
  {
    alpha_vector: [10, 20, 30, 20, 10, 10],
    market_params: {
      K: 6, L: 0, H: 100, P0: 100,
      mu: 0.01, eps_alpha: 0.001, tau: 1.0,
      gamma: 0.5, lambda_s: 0.1, lambda_d: 0.05,
    },
    current_pool: 500.0,
    num_positions: 12,
    total_volume: 1500.0,
    positions_currently_open: 5,
    title: 'Market A',
    x_axis_units: 'USD',
    decimals: 2,
    is_settled: false,
    settlement_outcome: null,
  },
  {
    alpha_vector: [5, 5],
    market_params: {
      K: 2, L: 0, H: 1, P0: 50,
      mu: 0.01, eps_alpha: 0.001, tau: 1.0,
      gamma: 0.5, lambda_s: 0.1, lambda_d: 0.05,
    },
    current_pool: 100.0,
    num_positions: 3,
    total_volume: 200.0,
    positions_currently_open: 1,
    title: 'Market B',
    x_axis_units: '',
    decimals: 0,
    is_settled: true,
    settlement_outcome: 0,
  },
];

const expectedDiscoverMarkets = [
  {
    alpha: [10, 20, 30, 20, 10, 10],
    consensus: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
    totalMass: 100,
    poolBalance: 500.0,
    participantCount: 12,
    totalVolume: 1500.0,
    positionsOpen: 5,
    config: {
      K: 6, L: 0, H: 100, P0: 100,
      mu: 0.01, epsAlpha: 0.001, tau: 1.0,
      gamma: 0.5, lambdaS: 0.1, lambdaD: 0.05,
    },
    title: 'Market A',
    xAxisUnits: 'USD',
    decimals: 2,
    resolutionState: 'open',
    resolvedOutcome: null,
  },
  {
    alpha: [5, 5],
    consensus: [0.5, 0.5],
    totalMass: 10,
    poolBalance: 100.0,
    participantCount: 3,
    totalVolume: 200.0,
    positionsOpen: 1,
    config: {
      K: 2, L: 0, H: 1, P0: 50,
      mu: 0.01, epsAlpha: 0.001, tau: 1.0,
      gamma: 0.5, lambdaS: 0.1, lambdaD: 0.05,
    },
    title: 'Market B',
    xAxisUnits: '',
    decimals: 0,
    resolutionState: 'resolved',
    resolvedOutcome: 0,
  },
];

// -- Query mappings --

describe('queryMarketState', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('maps all fields correctly including computed consensus and totalMass', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMarketStateRaw),
    });

    const client = makeMockClient();
    const result = await queryMarketState(client, '123');

    expect(result).toEqual(expectedMarketState);
  });

  it('sends GET to correct URL with market_id query param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMarketStateRaw),
    });

    const client = makeMockClient();
    await queryMarketState(client, '123');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/market/state');
    expect(url).toContain('market_id=123');
  });
});

describe('queryMarketPositions', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('maps all position fields correctly for both open and closed positions', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPositionsRaw),
    });

    const client = makeMockClient();
    const result = await queryMarketPositions(client, '123');

    expect(result).toEqual(expectedPositions);
  });

  it('returns empty array when positions is undefined', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const client = makeMockClient();
    const result = await queryMarketPositions(client, '123');

    expect(result).toEqual([]);
  });

  it('sends GET to correct URL with market_id query param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPositionsRaw),
    });

    const client = makeMockClient();
    await queryMarketPositions(client, '123');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/market/positions');
    expect(url).toContain('market_id=123');
  });
});

describe('queryMarketHistory', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('maps all fields correctly including String() conversion on positionId', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryRaw),
    });

    const client = makeMockClient();
    const result = await queryMarketHistory(client, '123');

    expect(result).toEqual(expectedHistory);
  });

  it('sends GET to correct URL with market_id and optional limit/offset params', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryRaw),
    });

    const client = makeMockClient();
    await queryMarketHistory(client, '123', 10, 5);

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/market/history');
    expect(url).toContain('market_id=123');
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=5');
  });

  it('returns empty snapshots array when snapshots key is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ market_id: '123', total_snapshots: 0 }),
    });

    const client = makeMockClient();
    const result = await queryMarketHistory(client, '123');

    expect(result.snapshots).toEqual([]);
  });
});

// -- Transaction mappings --

describe('buy', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends POST body with correct shape { C, p_vector, prediction }', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBuyResponseRaw),
    });

    const client = makeMockClientWithAuth();
    await buy(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10, { prediction: 50 });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      C: 10,
      p_vector: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
      prediction: 50,
    });
  });

  it('sends POST to correct URL with market_id query param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBuyResponseRaw),
    });

    const client = makeMockClientWithAuth();
    await buy(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10, { prediction: 50 });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/market/buy');
    expect(url).toContain('market_id=123');
  });

  it('maps response to BuyResult correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBuyResponseRaw),
    });

    const client = makeMockClientWithAuth();
    const result = await buy(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10, { prediction: 50 });

    expect(result).toEqual(expectedBuyResult);
  });

  it('omits prediction from POST body when undefined', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBuyResponseRaw),
    });

    const client = makeMockClientWithAuth();
    await buy(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10);

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      C: 10,
      p_vector: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
    });
    expect(body).not.toHaveProperty('prediction');
  });
});

describe('sell', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends POST to correct URL with positionId in path and market_id query param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSellResponseRaw),
    });

    const client = makeMockClientWithAuth();
    await sell(client, 42, '123');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/sell/execute/42');
    expect(url).toContain('market_id=123');
  });

  it('sends no request body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSellResponseRaw),
    });

    const client = makeMockClientWithAuth();
    await sell(client, 42, '123');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.body).toBeUndefined();
  });

  it('maps response to SellResult correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSellResponseRaw),
    });

    const client = makeMockClientWithAuth();
    const result = await sell(client, 42, '123');

    expect(result).toEqual(expectedSellResult);
  });
});

// -- Preview mappings --

describe('previewSell', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends GET to correct URL with positionId in path and market_id query param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPreviewSellRaw),
    });

    const client = makeMockClient();
    await previewSell(client, 42, '123');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/sell/simulate/42');
    expect(url).toContain('market_id=123');
  });

  it('maps response to PreviewSellResult correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPreviewSellRaw),
    });

    const client = makeMockClient();
    const result = await previewSell(client, 42, '123');

    expect(result).toEqual(expectedPreviewSellResult);
  });
});

describe('previewPayoutCurve', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends POST body with correct shape { belief_vector, collateral, num_outcomes }', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPayoutCurveRaw),
    });

    const client = makeMockClientWithAuth();
    await previewPayoutCurve(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10, 100);

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      belief_vector: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
      collateral: 10,
      num_outcomes: 100,
    });
  });

  it('omits num_outcomes from POST body when undefined', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPayoutCurveRaw),
    });

    const client = makeMockClientWithAuth();
    await previewPayoutCurve(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10);

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      belief_vector: [0.1, 0.2, 0.3, 0.2, 0.1, 0.1],
      collateral: 10,
    });
    expect(body).not.toHaveProperty('num_outcomes');
  });

  it('sends POST to correct URL with market_id query param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPayoutCurveRaw),
    });

    const client = makeMockClientWithAuth();
    await previewPayoutCurve(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10, 100);

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/projection/project_settlement');
    expect(url).toContain('market_id=123');
  });

  it('maps response correctly including projections->previews and profit_loss->profitLoss', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPayoutCurveRaw),
    });

    const client = makeMockClientWithAuth();
    const result = await previewPayoutCurve(client, '123', [0.1, 0.2, 0.3, 0.2, 0.1, 0.1], 10, 100);

    expect(result).toEqual(expectedPayoutCurve);
  });
});

// -- Auth mappings --
// Note: passwordlessLoginUser and silentReAuth tested in stage2.test.ts (lines 461-616)

describe('loginUser', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends POST body with { username, password }', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLoginResponseRaw),
    });

    const client = makeMockClient();
    await loginUser(client, 'testuser', 'testpass');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({ username: 'testuser', password: 'testpass' });
  });

  it('sends POST to /api/auth/login', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLoginResponseRaw),
    });

    const client = makeMockClient();
    await loginUser(client, 'testuser', 'testpass');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/auth/login');
  });

  it('returns { user, token } with user mapped via mapUserProfile', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLoginResponseRaw),
    });

    const client = makeMockClient();
    const result = await loginUser(client, 'testuser', 'testpass');

    expect(result).toEqual({
      user: {
        userId: 1,
        username: 'testuser',
        walletValue: 1000.0,
        role: 'trader',
      },
      token: 'jwt-token-123',
    });
  });
});

describe('signupUser', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends POST body with { username, password } when no access code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSignupResponseRaw),
    });

    const client = makeMockClient();
    await signupUser(client, 'newuser', 'newpass');

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({ username: 'newuser', password: 'newpass' });
    expect(body).not.toHaveProperty('access_code');
  });

  it('sends POST body with { username, password, access_code } when access code provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSignupResponseRaw),
    });

    const client = makeMockClient();
    await signupUser(client, 'newuser', 'newpass', { accessCode: 'INVITE123' });

    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toEqual({ username: 'newuser', password: 'newpass', access_code: 'INVITE123' });
  });

  it('sends POST to /api/auth/signup', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSignupResponseRaw),
    });

    const client = makeMockClient();
    await signupUser(client, 'newuser', 'newpass');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/auth/signup');
  });

  it('returns { user } with user mapped via mapUserProfile', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSignupResponseRaw),
    });

    const client = makeMockClient();
    const result = await signupUser(client, 'newuser', 'newpass');

    expect(result).toEqual({
      user: {
        userId: 2,
        username: 'newuser',
        walletValue: 0,
        role: 'trader',
      },
    });
  });
});

describe('fetchCurrentUser', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('maps nested response { user: {...} } correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCurrentUserNested),
    });

    const client = makeMockClientWithAuth();
    const result = await fetchCurrentUser(client);

    expect(result).toEqual(expectedCurrentUser);
  });

  it('maps flat response { user_id, ... } correctly', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCurrentUserFlat),
    });

    const client = makeMockClientWithAuth();
    const result = await fetchCurrentUser(client);

    expect(result).toEqual(expectedCurrentUser);
  });

  it('sends GET to /api/auth/me', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCurrentUserNested),
    });

    const client = makeMockClientWithAuth();
    await fetchCurrentUser(client);

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/auth/me');
  });

  it('defaults walletValue to 0 when wallet_value is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: {
          user_id: 1,
          username: 'testuser',
          role: 'admin',
        },
      }),
    });

    const client = makeMockClientWithAuth();
    const result = await fetchCurrentUser(client);

    expect(result.walletValue).toBe(0);
  });

  it('defaults role to trader when role is missing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        user: {
          user_id: 1,
          username: 'testuser',
          wallet_value: 500,
        },
      }),
    });

    const client = makeMockClientWithAuth();
    const result = await fetchCurrentUser(client);

    expect(result.role).toBe('trader');
  });
});

// -- Discovery mappings --

describe('discoverMarkets', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('maps array of markets correctly including open and resolved states', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDiscoverMarketsRaw),
    });

    const client = makeMockClient();
    const result = await discoverMarkets(client);

    expect(result).toEqual(expectedDiscoverMarkets);
  });

  it('sends GET to /api/markets with no market_id param', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockDiscoverMarketsRaw),
    });

    const client = makeMockClient();
    await discoverMarkets(client);

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/markets');
    expect(url).not.toContain('market_id');
  });

  it('returns empty array when API returns empty array', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const client = makeMockClient();
    const result = await discoverMarkets(client);

    expect(result).toEqual([]);
  });
});
