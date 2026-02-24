import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock the core module before importing hooks
vi.mock('@functionspace/core', () => ({
  FSClient: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    isAuthenticated: false,
    base: 'https://test.api.com',
  })),
  queryMarketState: vi.fn(),
  getConsensusCurve: vi.fn(),
  queryMarketPositions: vi.fn(),
  queryTradeHistory: vi.fn(),
  queryMarketHistory: vi.fn(),
  mapPosition: vi.fn((p) => p),
  calculateBucketDistribution: vi.fn(),
  computePercentiles: vi.fn(),
  loginUser: vi.fn().mockResolvedValue({
    token: 'mock-token',
    user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
  }),
  signupUser: vi.fn().mockResolvedValue({
    user: { userId: 2, username: 'newuser', walletValue: 1000, role: 'trader' },
  }),
  fetchCurrentUser: vi.fn().mockResolvedValue({
    userId: 1, username: 'testuser', walletValue: 1000, role: 'trader',
  }),
}));

import { FunctionSpaceProvider, useMarket, useConsensus, usePositions, useTradeHistory, useBucketDistribution, useMarketHistory, useDistributionState, useAuth } from '../packages/react/src';
import { queryMarketState, getConsensusCurve, queryMarketPositions, queryTradeHistory, queryMarketHistory, calculateBucketDistribution, computePercentiles, FSClient, loginUser } from '@functionspace/core';

const mockConfig = {
  baseUrl: 'https://test.api.com',
  username: 'testuser',
  password: 'testpass',
};

// Helper wrapper component
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <FunctionSpaceProvider config={mockConfig} theme="fs-dark">
        {children}
      </FunctionSpaceProvider>
    );
  };
}

describe('useMarket hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useMarket('1'));
    }).toThrow('useMarket must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns loading=true initially', async () => {
    vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useMarket('1'), {
      wrapper: createWrapper(),
    });

    // Wait for authentication to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.market).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('returns market data after successful fetch', async () => {
    const mockMarket = {
      config: { K: 60, L: 0, H: 100 },
      title: 'Test Market',
      consensusBelief: [0.5, 0.5],
    };
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket);

    const { result } = renderHook(() => useMarket('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.market).toEqual(mockMarket);
    expect(result.current.error).toBe(null);
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketState).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMarket('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.market).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('provides refetch function that re-fetches data', async () => {
    const mockMarket1 = { config: { K: 60 }, title: 'First' };
    const mockMarket2 = { config: { K: 80 }, title: 'Updated' };

    vi.mocked(queryMarketState)
      .mockResolvedValueOnce(mockMarket1)
      .mockResolvedValueOnce(mockMarket2);

    const { result } = renderHook(() => useMarket('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.market?.title).toBe('First');
    });

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.market?.title).toBe('Updated');
  });
});

describe('useConsensus hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useConsensus('1'));
    }).toThrow('useConsensus must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns consensus data after successful fetch', async () => {
    const mockConsensus = {
      points: [
        { x: 0, y: 0.1 },
        { x: 50, y: 0.5 },
        { x: 100, y: 0.1 },
      ],
    };
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus);

    const { result } = renderHook(() => useConsensus('1', 100), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.consensus).toEqual(mockConsensus);
    expect(result.current.error).toBe(null);
  });

  it('passes numPoints parameter to API', async () => {
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [] });

    renderHook(() => useConsensus('market-123', 50), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(getConsensusCurve).toHaveBeenCalled();
    });

    // Verify the numPoints parameter was passed
    expect(getConsensusCurve).toHaveBeenCalledWith(
      expect.anything(), // client
      'market-123',
      50
    );
  });
});

describe('usePositions hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => usePositions('1', 'testuser'));
    }).toThrow('usePositions must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns filtered positions for the specified user', async () => {
    vi.mocked(queryMarketPositions).mockResolvedValue([
      { positionId: 1, owner: 'testuser', belief: [0.5] },
      { positionId: 2, owner: 'otheruser', belief: [0.3] },
      { positionId: 3, owner: 'testuser', belief: [0.7] },
    ] as any);

    const { result } = renderHook(() => usePositions('1', 'testuser'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should only have positions for 'testuser'
    expect(result.current.positions).toHaveLength(2);
    expect(result.current.positions?.every(p => p.owner === 'testuser')).toBe(true);
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketPositions).mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => usePositions('1', 'testuser'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.positions).toBe(null);
    expect(result.current.error?.message).toBe('API error');
  });

  it('returns all positions when username is omitted', async () => {
    vi.mocked(queryMarketPositions).mockResolvedValue([
      { positionId: 1, owner: 'testuser', belief: [0.5] },
      { positionId: 2, owner: 'otheruser', belief: [0.3] },
      { positionId: 3, owner: 'testuser', belief: [0.7] },
    ] as any);

    const { result } = renderHook(() => usePositions('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should return ALL positions (no filter applied)
    expect(result.current.positions).toHaveLength(3);
  });
});

describe('Hook Return Shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryMarketState).mockResolvedValue({ config: {} });
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [] });
    vi.mocked(queryMarketPositions).mockResolvedValue([]);
    vi.mocked(queryTradeHistory).mockResolvedValue([]);
    vi.mocked(FSClient).mockImplementation(() => ({
      authenticate: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ positions: [] }),
      setToken: vi.fn(),
      clearToken: vi.fn(),
      isAuthenticated: false,
      base: 'https://test.api.com',
    }) as any);
  });

  it('useMarket returns { market, loading, error, refetch }', async () => {
    const { result } = renderHook(() => useMarket('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('market');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('useConsensus returns { consensus, loading, error, refetch }', async () => {
    const { result } = renderHook(() => useConsensus('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('consensus');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('usePositions returns { positions, loading, error, refetch }', async () => {
    const { result } = renderHook(() => usePositions('1', 'user'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('positions');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('useTradeHistory returns { trades, loading, error, refetch }', async () => {
    const { result } = renderHook(() => useTradeHistory('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('trades');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useTradeHistory hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTradeHistory('1'));
    }).toThrow('useTradeHistory must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns trade entries after successful fetch', async () => {
    const mockTrades = [
      { id: '1_open', timestamp: '2025-01-15 14:00:00', side: 'buy', prediction: 52.5, amount: 100, username: 'alice', positionId: '1' },
      { id: '2_open', timestamp: '2025-01-15 13:00:00', side: 'buy', prediction: 60.0, amount: 50, username: 'bob', positionId: '2' },
    ];
    vi.mocked(queryTradeHistory).mockResolvedValue(mockTrades as any);

    const { result } = renderHook(() => useTradeHistory('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trades).toEqual(mockTrades);
    expect(result.current.error).toBe(null);
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryTradeHistory).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTradeHistory('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trades).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('passes limit option to queryTradeHistory', async () => {
    vi.mocked(queryTradeHistory).mockResolvedValue([]);

    renderHook(() => useTradeHistory('market-1', { limit: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(queryTradeHistory).toHaveBeenCalled();
    });

    expect(queryTradeHistory).toHaveBeenCalledWith(
      expect.anything(),
      'market-1',
      { limit: 50 },
    );
  });
});

describe('useBucketDistribution hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBucketDistribution('1'));
    }).toThrow('useBucketDistribution must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns bucket data after consensus loads', async () => {
    const mockConsensus = {
      points: [{ x: 0, y: 0.1 }, { x: 50, y: 0.5 }, { x: 100, y: 0.1 }],
      config: { K: 60, L: 0, H: 100 },
    };
    const mockMarket = {
      config: { K: 60, L: 0, H: 100 },
      title: 'Test',
      decimals: 0,
    };
    const mockBuckets = [
      { range: '0-50', min: 0, max: 50, probability: 0.6, percentage: 60 },
      { range: '50-100', min: 50, max: 100, probability: 0.4, percentage: 40 },
    ];

    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);

    const { result } = renderHook(() => useBucketDistribution('1', 2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.buckets).toEqual(mockBuckets);
    expect(result.current.error).toBe(null);
  });

  it('returns { buckets, loading, error, refetch }', async () => {
    vi.mocked(queryMarketState).mockResolvedValue({ config: { L: 0, H: 100 }, decimals: 0 } as any);
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [] } as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue([]);

    const { result } = renderHook(() => useBucketDistribution('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('buckets');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useMarketHistory hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useMarketHistory('1'));
    }).toThrow('useMarketHistory must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns history data after successful fetch', async () => {
    const mockHistory = {
      marketId: 1,
      totalSnapshots: 2,
      snapshots: [
        { snapshotId: 1, tradeId: 1, side: 'buy', positionId: '1', alphaVector: [1, 1], totalDeposits: 10, totalWithdrawals: 0, totalVolume: 10, currentPool: 10, numOpenPositions: 1, createdAt: '2025-01-15T14:00:00Z' },
        { snapshotId: 2, tradeId: 2, side: 'buy', positionId: '2', alphaVector: [1, 2], totalDeposits: 20, totalWithdrawals: 0, totalVolume: 20, currentPool: 20, numOpenPositions: 2, createdAt: '2025-01-15T15:00:00Z' },
      ],
    };
    vi.mocked(queryMarketHistory).mockResolvedValue(mockHistory as any);

    const { result } = renderHook(() => useMarketHistory('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual(mockHistory);
    expect(result.current.error).toBe(null);
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketHistory).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMarketHistory('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
  });

  it('passes limit option to queryMarketHistory', async () => {
    vi.mocked(queryMarketHistory).mockResolvedValue({ marketId: 1, totalSnapshots: 0, snapshots: [] } as any);

    renderHook(() => useMarketHistory('market-1', { limit: 100 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(queryMarketHistory).toHaveBeenCalled();
    });

    expect(queryMarketHistory).toHaveBeenCalledWith(
      expect.anything(),
      'market-1',
      100,
    );
  });

  it('returns { history, loading, error, refetch }', async () => {
    vi.mocked(queryMarketHistory).mockResolvedValue({ marketId: 1, totalSnapshots: 0, snapshots: [] } as any);

    const { result } = renderHook(() => useMarketHistory('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('history');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useDistributionState hook', () => {
  const mockMarket = {
    config: { K: 60, L: 0, H: 100, P0: 1, mu: 1, epsAlpha: 0.01, tau: 1, gamma: 1, lambdaS: 0, lambdaD: 0 },
    consensus: [0.5, 0.5],
    title: 'Test Market',
    decimals: 0,
    alpha: [1, 1],
    totalMass: 2,
    poolBalance: 100,
    participantCount: 1,
    totalVolume: 100,
    positionsOpen: 1,
    xAxisUnits: 'USD',
    resolutionState: 'open' as const,
    resolvedOutcome: null,
  };

  const mockConsensus = {
    points: [{ x: 0, y: 0.1 }, { x: 50, y: 0.5 }, { x: 100, y: 0.1 }],
    config: mockMarket.config,
  };

  const mockBuckets = [
    { range: '0-8', min: 0, max: 8.33, probability: 0.05, percentage: 5 },
    { range: '8-17', min: 8.33, max: 16.67, probability: 0.08, percentage: 8 },
  ];

  const mockPercentiles = {
    p2_5: 10,
    p12_5: 20,
    p25: 30,
    p37_5: 40,
    p50: 50,
    p62_5: 60,
    p75: 70,
    p87_5: 80,
    p97_5: 90,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDistributionState('1'));
    }).toThrow('useDistributionState must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns loading=true while data is fetching', async () => {
    vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {}));
    vi.mocked(getConsensusCurve).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.market).toBe(null);
    expect(result.current.buckets).toBe(null);
    expect(result.current.percentiles).toBe(null);
  });

  it('returns bucket data after market and consensus load', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.buckets).toEqual(mockBuckets);
    expect(result.current.error).toBe(null);
    expect(calculateBucketDistribution).toHaveBeenCalledWith(
      mockConsensus.points,
      0,    // L
      100,  // H
      12,   // default bucketCount
      0,    // decimals
    );
  });

  it('computes percentiles from market consensus coefficients', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.percentiles).toEqual(mockPercentiles);
    expect(computePercentiles).toHaveBeenCalledWith(
      mockMarket.consensus,
      0,    // L
      100,  // H
    );
  });

  it('setBucketCount updates bucket computation', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initial call with default 12 buckets
    expect(calculateBucketDistribution).toHaveBeenCalledWith(
      expect.anything(), 0, 100, 12, 0,
    );

    // Change bucket count
    act(() => {
      result.current.setBucketCount(20);
    });

    expect(result.current.bucketCount).toBe(20);
    expect(calculateBucketDistribution).toHaveBeenCalledWith(
      expect.anything(), 0, 100, 20, 0,
    );
  });

  it('clamps bucket count to [2, 50]', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue([]);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setBucketCount(0);
    });
    expect(result.current.bucketCount).toBe(2);

    act(() => {
      result.current.setBucketCount(100);
    });
    expect(result.current.bucketCount).toBe(50);
  });

  it('getBucketsForRange computes buckets over a narrowed range', async () => {
    const narrowedBuckets = [
      { range: '10-30', min: 10, max: 30, probability: 0.3, percentage: 30 },
      { range: '30-50', min: 30, max: 50, probability: 0.4, percentage: 40 },
    ];

    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution)
      .mockReturnValueOnce(mockBuckets)  // initial full-range
      .mockReturnValue(narrowedBuckets); // narrowed range call
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const narrowed = result.current.getBucketsForRange(10, 50);
    expect(narrowed).toEqual(narrowedBuckets);
    expect(calculateBucketDistribution).toHaveBeenCalledWith(
      mockConsensus.points,
      10,   // narrowed min
      50,   // narrowed max
      12,   // current bucketCount
      0,    // decimals
    );
  });

  it('accepts custom defaultBucketCount via config', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue([]);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(
      () => useDistributionState('1', { defaultBucketCount: 8 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bucketCount).toBe(8);
    expect(calculateBucketDistribution).toHaveBeenCalledWith(
      expect.anything(), 0, 100, 8, 0,
    );
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketState).mockRejectedValue(new Error('Network error'));
    vi.mocked(getConsensusCurve).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.buckets).toBe(null);
    expect(result.current.percentiles).toBe(null);
  });

  it('returns correct shape { market, loading, error, refetch, bucketCount, setBucketCount, buckets, percentiles, getBucketsForRange }', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue([]);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { result } = renderHook(() => useDistributionState('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('market');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(result.current).toHaveProperty('bucketCount');
    expect(result.current).toHaveProperty('setBucketCount');
    expect(result.current).toHaveProperty('buckets');
    expect(result.current).toHaveProperty('percentiles');
    expect(result.current).toHaveProperty('getBucketsForRange');
    expect(typeof result.current.refetch).toBe('function');
    expect(typeof result.current.setBucketCount).toBe('function');
    expect(typeof result.current.getBucketsForRange).toBe('function');
  });
});

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within FunctionSpaceProvider');

    spy.mockRestore();
  });

  it('returns correct shape { user, isAuthenticated, loading, error, login, signup, logout, refreshUser }', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('signup');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('refreshUser');
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.signup).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.refreshUser).toBe('function');
  });

  it('returns authenticated state when credentials are provided (auto-auth)', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Auto-auth mode: provider calls loginUser during mount
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user).toEqual({
      userId: 1,
      username: 'testuser',
      walletValue: 1000,
      role: 'trader',
    });
    expect(loginUser).toHaveBeenCalledWith(
      expect.anything(),
      'testuser',
      'testpass',
    );
  });

  it('returns unauthenticated state when no credentials provided', async () => {
    function GuestWrapper({ children }: { children: React.ReactNode }) {
      return (
        <FunctionSpaceProvider config={{ baseUrl: 'https://test.api.com' }} theme="fs-dark">
          {children}
        </FunctionSpaceProvider>
      );
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: GuestWrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
    expect(loginUser).not.toHaveBeenCalled();
  });
});
