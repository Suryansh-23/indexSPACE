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
    setStoredUsername: vi.fn(),
    getStoredUsername: vi.fn().mockReturnValue(null),
    clearStoredUsername: vi.fn(),
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
  generateCustomShape: vi.fn().mockImplementation((controlValues: number[], K: number) => {
    const len = K + 1;
    return new Array(len).fill(1 / len);
  }),
  generateBellShape: vi.fn().mockImplementation((n: number) => new Array(n).fill(0.5)),
  computeStatistics: vi.fn().mockReturnValue({ mode: 100, mean: 100, median: 100, variance: 25, stdDev: 5 }),
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
  passwordlessLoginUser: vi.fn().mockResolvedValue({
    action: 'login',
    user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
    token: 'mock-passwordless-token',
  }),
  silentReAuth: vi.fn().mockResolvedValue({
    user: { userId: 1, username: 'testuser', walletValue: 1000, role: 'trader' },
    token: 'mock-reauth-token',
  }),
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  pixelToDataX: vi.fn((clientX: number, left: number, right: number, domain: [number, number]) => {
    const plotWidth = right - left;
    if (plotWidth <= 0) return domain[0];
    const ratio = Math.max(0, Math.min(1, (clientX - left) / plotWidth));
    return domain[0] + ratio * (domain[1] - domain[0]);
  }),
  computeZoomedDomain: vi.fn(({ currentDomain, fullDomain, cursorDataX, direction, zoomFactor = 0.15, maxZoomFactor = 50 }: any) => {
    const [min, max] = currentDomain;
    const [fullMin, fullMax] = fullDomain;
    const fullRange = fullMax - fullMin;
    const range = max - min;
    const factor = 1 + direction * zoomFactor;
    const newRange = Math.max(fullRange / maxZoomFactor, Math.min(fullRange, range * factor));
    if (newRange >= fullRange * 0.99) return null;
    const cursorRatio = range > 0 ? (cursorDataX - min) / range : 0.5;
    let newMin = cursorDataX - cursorRatio * newRange;
    let newMax = cursorDataX + (1 - cursorRatio) * newRange;
    if (newMin < fullMin) { newMin = fullMin; newMax = newMin + newRange; }
    if (newMax > fullMax) { newMax = fullMax; newMin = newMax - newRange; }
    return [newMin, newMax] as [number, number];
  }),
  computePannedDomain: vi.fn(({ startDomain, fullDomain, pixelDelta, plotAreaWidth }: any) => {
    const [min, max] = startDomain;
    const [fullMin, fullMax] = fullDomain;
    const range = max - min;
    if (plotAreaWidth <= 0) return startDomain;
    const dataDelta = -(pixelDelta / plotAreaWidth) * range;
    let newMin = min + dataDelta;
    let newMax = max + dataDelta;
    if (newMin < fullMin) { newMin = fullMin; newMax = newMin + range; }
    if (newMax > fullMax) { newMax = fullMax; newMin = newMax - range; }
    return [newMin, newMax] as [number, number];
  }),
  filterVisibleData: vi.fn((data: any[], xKey: string, domain: [number, number]) => {
    return data.filter((d: any) => d[xKey] >= domain[0] && d[xKey] <= domain[1]);
  }),
}));

import { FunctionSpaceProvider, useMarket, useConsensus, usePositions, useTradeHistory, useBucketDistribution, useMarketHistory, useDistributionState, useAuth, useCustomShape, useChartZoom } from '../packages/react/src';
import type { ChartZoomOptions } from '../packages/react/src';
import { queryMarketState, getConsensusCurve, queryMarketPositions, queryTradeHistory, queryMarketHistory, calculateBucketDistribution, computePercentiles, FSClient, loginUser, passwordlessLoginUser, silentReAuth } from '@functionspace/core';

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
      setStoredUsername: vi.fn(),
      getStoredUsername: vi.fn().mockReturnValue(null),
      clearStoredUsername: vi.fn(),
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

  it('returns passwordlessLogin, showAdminLogin, pendingAdminUsername, clearAdminLogin with correct types', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify the new passwordless auth fields exist
    expect(result.current).toHaveProperty('passwordlessLogin');
    expect(result.current).toHaveProperty('showAdminLogin');
    expect(result.current).toHaveProperty('pendingAdminUsername');
    expect(result.current).toHaveProperty('clearAdminLogin');

    // Verify correct types
    expect(typeof result.current.passwordlessLogin).toBe('function');
    expect(typeof result.current.showAdminLogin).toBe('boolean');
    // pendingAdminUsername is string | null -- initially null
    expect(result.current.pendingAdminUsername === null || typeof result.current.pendingAdminUsername === 'string').toBe(true);
    expect(typeof result.current.clearAdminLogin).toBe('function');
  });

  it('passwordlessLogin calls passwordlessLoginUser and updates auth state', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call passwordlessLogin
    await act(async () => {
      const loginResult = await result.current.passwordlessLogin('testuser');
      expect(loginResult.action).toBe('login');
      expect(loginResult.user.username).toBe('testuser');
    });

    // Verify state updated
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.username).toBe('testuser');
    expect(passwordlessLoginUser).toHaveBeenCalledTimes(1);
  });

  it('storedUsername prop triggers silentReAuth on mount', async () => {
    function StoredUsernameWrapper({ children }: { children: React.ReactNode }) {
      return (
        <FunctionSpaceProvider
          config={{ baseUrl: 'https://test.api.com' }}
          theme="fs-dark"
          storedUsername="returning-user"
        >
          {children}
        </FunctionSpaceProvider>
      );
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: StoredUsernameWrapper,
    });

    // Wait for silentReAuth to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(silentReAuth).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).not.toBeNull();
  });
});

// ── useCustomShape (state management hook) ──

const mockMarket = {
  config: { K: 50, L: 50, H: 150 },
  consensus: new Array(51).fill(1 / 51),
  alpha: new Array(51).fill(1),
} as any;

describe('useCustomShape hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useCustomShape(null));
    }).toThrow('useCustomShape must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns all expected state and actions', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current).toHaveProperty('controlValues');
    expect(result.current).toHaveProperty('lockedPoints');
    expect(result.current).toHaveProperty('numPoints');
    expect(result.current).toHaveProperty('pVector');
    expect(result.current).toHaveProperty('prediction');
    expect(result.current).toHaveProperty('setControlValue');
    expect(result.current).toHaveProperty('toggleLock');
    expect(result.current).toHaveProperty('setNumPoints');
    expect(result.current).toHaveProperty('resetToDefault');
    expect(result.current).toHaveProperty('startDrag');
    expect(result.current).toHaveProperty('handleDrag');
    expect(result.current).toHaveProperty('endDrag');
    expect(result.current).toHaveProperty('isDragging');
    expect(result.current).toHaveProperty('draggingIndex');
    expect(typeof result.current.setControlValue).toBe('function');
    expect(typeof result.current.toggleLock).toBe('function');
  });

  it('initializes with 20 control points', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.numPoints).toBe(20);
    expect(result.current.controlValues).toHaveLength(20);
  });

  it('setControlValue updates a control point', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => {
      result.current.setControlValue(5, 1.8);
    });
    expect(result.current.controlValues[5]).toBe(1.8);
  });

  it('setControlValue clamps to [0, 25]', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => {
      result.current.setControlValue(5, 30.0);
    });
    expect(result.current.controlValues[5]).toBe(25);
    act(() => {
      result.current.setControlValue(5, -1.0);
    });
    expect(result.current.controlValues[5]).toBe(0);
  });

  it('locked points cannot be changed via setControlValue', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    const original = result.current.controlValues[3];
    act(() => {
      result.current.toggleLock(3);
    });
    act(() => {
      result.current.setControlValue(3, 0.1);
    });
    expect(result.current.controlValues[3]).toBe(original);
  });

  it('toggleLock adds and removes locks', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.lockedPoints).toHaveLength(0);
    act(() => {
      result.current.toggleLock(5);
    });
    expect(result.current.lockedPoints).toContain(5);
    act(() => {
      result.current.toggleLock(5);
    });
    expect(result.current.lockedPoints).not.toContain(5);
  });

  it('lock FIFO: max 2 locked points, oldest evicted', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => { result.current.toggleLock(0); });
    act(() => { result.current.toggleLock(1); });
    act(() => { result.current.toggleLock(2); }); // evicts 0
    expect(result.current.lockedPoints).not.toContain(0);
    expect(result.current.lockedPoints).toContain(1);
    expect(result.current.lockedPoints).toContain(2);
  });

  it('setNumPoints clamps to [5, 25]', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => { result.current.setNumPoints(3); });
    expect(result.current.numPoints).toBe(5);
    expect(result.current.controlValues).toHaveLength(5);
    act(() => { result.current.setNumPoints(30); });
    expect(result.current.numPoints).toBe(25);
    expect(result.current.controlValues).toHaveLength(25);
  });

  it('pVector is null when market is null', async () => {
    const { result } = renderHook(() => useCustomShape(null), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.pVector).toBe(null);
  });

  it('pVector is computed when market is provided', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.pVector).not.toBe(null);
    expect(result.current.pVector).toHaveLength(51);
  });

  it('drag lifecycle works correctly', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggingIndex).toBe(null);
    act(() => { result.current.startDrag(5); });
    expect(result.current.isDragging).toBe(true);
    expect(result.current.draggingIndex).toBe(5);
    act(() => { result.current.handleDrag(1.5); });
    expect(result.current.controlValues[5]).toBe(1.5);
    act(() => { result.current.endDrag(); });
    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggingIndex).toBe(null);
  });

  it('startDrag rejects locked points', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => { result.current.toggleLock(3); });
    act(() => { result.current.startDrag(3); });
    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggingIndex).toBe(null);
  });

  it('resetToDefault restores initial state', async () => {
    const { result } = renderHook(() => useCustomShape(mockMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => { result.current.setControlValue(5, 1.8); });
    act(() => { result.current.toggleLock(3); });
    act(() => { result.current.resetToDefault(); });
    expect(result.current.lockedPoints).toHaveLength(0);
    expect(result.current.isDragging).toBe(false);
  });
});

// ── useChartZoom (state/action hook — no context dependency) ──

const zoomTestData = [
  { x: 0, y: 1 },
  { x: 25, y: 2 },
  { x: 50, y: 3 },
  { x: 75, y: 4 },
  { x: 100, y: 5 },
];
const zoomFullXDomain: [number, number] = [0, 100];
const zoomGetPlotArea = (rect: DOMRect) => ({ left: rect.left + 70, right: rect.right - 15 });

describe('useChartZoom hook', () => {
  it('does NOT require FunctionSpaceProvider (no context)', () => {
    // Renders without wrapper — should not throw
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea }),
    );
    expect(result.current).toBeDefined();
  });

  it('returns correct shape (all fields + containerProps sub-fields)', () => {
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea }),
    );

    expect(result.current).toHaveProperty('containerRef');
    expect(result.current).toHaveProperty('xDomain');
    expect(result.current).toHaveProperty('yDomain');
    expect(result.current).toHaveProperty('isZoomed');
    expect(result.current).toHaveProperty('isPanning');
    expect(result.current).toHaveProperty('containerProps');
    expect(result.current).toHaveProperty('reset');
    expect(typeof result.current.reset).toBe('function');

    // containerProps sub-fields
    const cp = result.current.containerProps;
    expect(typeof cp.onMouseDown).toBe('function');
    expect(typeof cp.onMouseMove).toBe('function');
    expect(typeof cp.onMouseUp).toBe('function');
    expect(typeof cp.onMouseLeave).toBe('function');
    expect(typeof cp.onDoubleClick).toBe('function');
    expect(cp.style).toBeDefined();
  });

  it('starts unzoomed (isZoomed=false, xDomain=fullXDomain, isPanning=false)', () => {
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea }),
    );

    expect(result.current.isZoomed).toBe(false);
    expect(result.current.xDomain).toEqual(zoomFullXDomain);
    expect(result.current.isPanning).toBe(false);
  });

  it('disabled mode (enabled=false) returns static full domain', () => {
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea, enabled: false }),
    );

    expect(result.current.isZoomed).toBe(false);
    expect(result.current.xDomain).toEqual(zoomFullXDomain);
    expect(result.current.containerProps.style).toEqual({});
  });

  it('yDomain is undefined when no computeYDomain provided', () => {
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea }),
    );

    expect(result.current.yDomain).toBeUndefined();
  });

  it('yDomain is computed from full data when unzoomed and computeYDomain is provided', () => {
    const computeYDomain = (visible: any[], full: any[]) => {
      const vals = visible.map((d: any) => d.y);
      return [Math.min(...vals), Math.max(...vals)] as [number, number];
    };

    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea, computeYDomain }),
    );

    expect(result.current.yDomain).toEqual([1, 5]);
  });

  it('reset() is idempotent from unzoomed state', () => {
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea }),
    );
    act(() => { result.current.reset(); });
    expect(result.current.isZoomed).toBe(false);
    expect(result.current.xDomain).toEqual(zoomFullXDomain);
    expect(result.current.isPanning).toBe(false);
  });

  it('onDoubleClick in containerProps resets to full domain', () => {
    const { result } = renderHook(() =>
      useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea }),
    );
    act(() => { result.current.containerProps.onDoubleClick(); });
    expect(result.current.isZoomed).toBe(false);
    expect(result.current.xDomain).toEqual(zoomFullXDomain);
  });

  it('resetTrigger change resets zoom state', () => {
    const { result, rerender } = renderHook(
      ({ t }) => useChartZoom({ data: zoomTestData, xKey: 'x', fullXDomain: zoomFullXDomain, getPlotArea: zoomGetPlotArea, resetTrigger: t }),
      { initialProps: { t: 'initial' } },
    );
    expect(result.current.isZoomed).toBe(false);
    rerender({ t: 'changed' });
    expect(result.current.isZoomed).toBe(false);
    expect(result.current.xDomain).toEqual(zoomFullXDomain);
    expect(result.current.isPanning).toBe(false);
  });

  // Note: Testing isZoomed=true requires simulating wheel events with a real DOM container
  // and getBoundingClientRect, which JSDOM does not support. The zoomed-state behavior
  // (filterVisibleData, yDomain narrowing, cursor styles) is covered by the pure function
  // tests in chart-zoom.test.ts. Full interaction testing should use a browser-based runner.
});
