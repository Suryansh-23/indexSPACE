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
  generateCustomShape: vi.fn().mockImplementation((controlValues: number[], numBuckets: number) => {
    const len = numBuckets + 1;
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
  buy: vi.fn(),
  sell: vi.fn(),
  previewPayoutCurve: vi.fn(),
  previewSell: vi.fn(),
  discoverMarkets: vi.fn(),
}));

import { FunctionSpaceProvider, useMarket, useMarkets, useConsensus, usePositions, useTradeHistory, useBucketDistribution, useMarketHistory, useDistributionState, useAuth, useCustomShape, useChartZoom, useBuy, useSell, usePreviewPayout, usePreviewSell, useMarketFilters } from '../packages/react/src';
import type { ChartZoomOptions, SortOption } from '../packages/react/src';
import { queryMarketState, getConsensusCurve, queryMarketPositions, queryTradeHistory, queryMarketHistory, calculateBucketDistribution, computePercentiles, FSClient, loginUser, passwordlessLoginUser, silentReAuth, buy, sell, previewPayoutCurve, previewSell, discoverMarkets } from '@functionspace/core';
import { QueryCache } from '../packages/react/src/cache/QueryCache';
import { QueryCacheContext } from '../packages/react/src/QueryCacheContext';
import { FunctionSpaceContext } from '../packages/react/src/context';
import type { ChartColors } from '../packages/react/src/themes';

const mockConfig = {
  baseUrl: 'https://test.api.com',
  username: 'testuser',
  password: 'testpass',
};

// Helper wrapper using FunctionSpaceProvider (for auth/non-data hooks)
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <React.StrictMode>
        <FunctionSpaceProvider config={mockConfig} theme="fs-dark">
          {children}
        </FunctionSpaceProvider>
      </React.StrictMode>
    );
  };
}

// Minimal chart colors for cache wrapper
const minimalChartColors: ChartColors = {
  grid: '#333',
  axisText: '#888',
  tooltipBg: '#1e293b',
  tooltipBorder: '#334155',
  tooltipText: '#f1f5f9',
  crosshair: '#666',
  consensus: '#3b82f6',
  previewLine: '#f59e0b',
  payout: '#10b981',
  positions: ['#3b82f6', '#f59e0b', '#10b981'],
  fanBands: {
    mean: 'rgba(59,130,246,0.40)',
    band25: 'rgba(59,130,246,0.34)',
    band50: 'rgba(59,130,246,0.26)',
    band75: 'rgba(59,130,246,0.18)',
    band95: 'rgba(59,130,246,0.10)',
  },
};

// Lightweight wrapper that provides QueryCache + FunctionSpaceContext directly.
// This bypasses FunctionSpaceProvider's auth flow so tests can focus on cache behavior.
function createCacheWrapper(cacheOverride?: QueryCache) {
  const cache = cacheOverride ?? new QueryCache();
  const mockClient = new (FSClient as any)();

  const ctxValue = {
    client: mockClient,
    previewBelief: null,
    setPreviewBelief: () => {},
    previewPayout: null,
    setPreviewPayout: () => {},
    invalidate: (marketId: string | number) => { cache.invalidate(String(marketId)); },
    invalidateAll: () => { cache.invalidateAll(); },
    selectedPosition: null,
    setSelectedPosition: () => {},
    user: null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    passwordlessLogin: vi.fn(),
    showAdminLogin: false,
    pendingAdminUsername: null,
    clearAdminLogin: vi.fn(),
    chartColors: minimalChartColors,
  };

  function CacheWrapper({ children }: { children: React.ReactNode }) {
    return (
      <React.StrictMode>
        <QueryCacheContext.Provider value={cache}>
          <FunctionSpaceContext.Provider value={ctxValue as any}>
            {children}
          </FunctionSpaceContext.Provider>
        </QueryCacheContext.Provider>
      </React.StrictMode>
    );
  }

  return { wrapper: CacheWrapper, cache, ctx: ctxValue };
}

// ============================================================================
// useMarket hook
// ============================================================================

describe('useMarket hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useMarket('1'));
    }).toThrow('useMarket must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns data after successful fetch', async () => {
    const mockMarket = {
      config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
      title: 'Test Market',
      consensusBelief: [0.5, 0.5],
    };
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.market).toEqual(mockMarket);
    expect(result.current.error).toBe(null);
    expect(vi.mocked(queryMarketState)).toHaveBeenCalledWith(
      expect.anything(),
      '1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns loading initially', async () => {
    vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.market).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('loading vs isFetching on refetch', async () => {
    let callCount = 0;
    vi.mocked(queryMarketState).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ config: { numBuckets: 60, K: 60 }, title: 'First' });
      return new Promise((resolve) => setTimeout(() => resolve({ config: { numBuckets: 80, K: 80 }, title: 'Second' }), 50));
    });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.market).not.toBe(null);
    });
    expect(result.current.loading).toBe(false);

    // Trigger refetch -- should have isFetching=true but loading=false (data already present)
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.loading).toBe(false); // We already have data, so loading stays false

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketState).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.market).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on successful refetch', async () => {
    vi.mocked(queryMarketState).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    // Wait for error
    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });
    expect(result.current.error?.message).toBe('Network error');

    // Switch to success for the refetch
    vi.mocked(queryMarketState).mockResolvedValue({ config: { numBuckets: 60, K: 60 }, title: 'Recovered' });

    // Refetch successfully
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.market).toEqual({ config: { numBuckets: 60, K: 60 }, title: 'Recovered' });
  });

  it('refetch returns Promise', async () => {
    vi.mocked(queryMarketState).mockResolvedValue({ config: { numBuckets: 60, K: 60 }, title: 'First' });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.market?.title).toBe('First');
    });

    // Switch mock for the refetch
    vi.mocked(queryMarketState).mockResolvedValue({ config: { numBuckets: 80, K: 80 }, title: 'Updated' });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.market?.title).toBe('Updated');
  });

  it('pollInterval causes periodic refetches', async () => {
    let resolvers: Array<(v: any) => void> = [];
    vi.mocked(queryMarketState).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { wrapper } = createCacheWrapper();
    renderHook(
      () => useMarket('1', { pollInterval: 500 }),
      { wrapper },
    );

    // Resolve initial fetch(es) -- StrictMode may cause more than one
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    const initialCount = resolvers.length;
    act(() => { resolvers.forEach(r => r({ config: { numBuckets: 60, K: 60 }, title: 'First' })); });

    // The poll timer is now set. We need to wait for it to fire.
    // Use real timers but a short pollInterval so it fires quickly.
    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(initialCount);
    }, { timeout: 3000 });
  });
});

// ============================================================================
// useMarkets hook
// ============================================================================

const mockMarketsList = [
  {
    marketId: 1,
    title: 'Bitcoin Price',
    resolutionState: 'open',
    totalVolume: 50000,
    poolBalance: 10000,
    config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
    metadata: { categories: ['crypto'] },
  },
  {
    marketId: 2,
    title: 'Election',
    resolutionState: 'resolved',
    totalVolume: 100000,
    poolBalance: 25000,
    config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
    metadata: { categories: ['politics'] },
  },
];

describe('useMarkets hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useMarkets());
    }).toThrow('useMarkets must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns data after successful fetch', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsList as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.markets).toEqual(mockMarketsList);
    expect(result.current.error).toBe(null);
    expect(vi.mocked(discoverMarkets)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns loading initially', async () => {
    vi.mocked(discoverMarkets).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.markets).toEqual([]);
  });

  it('loading vs isFetching on refetch', async () => {
    let callCount = 0;
    vi.mocked(discoverMarkets).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve(mockMarketsList as any);
      return new Promise((resolve) => setTimeout(() => resolve(mockMarketsList as any), 50));
    });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.markets).toHaveLength(2);
    });
    expect(result.current.loading).toBe(false);

    // Trigger refetch -- should have isFetching=true but loading=false (data already present)
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.loading).toBe(false); // We already have data, so loading stays false

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(discoverMarkets).mockRejectedValue(new Error('Discovery failed'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.markets).toEqual([]);
    expect(result.current.error?.message).toBe('Discovery failed');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on successful refetch', async () => {
    vi.mocked(discoverMarkets).mockRejectedValue(new Error('Discovery failed'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    // Wait for error
    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });
    expect(result.current.error?.message).toBe('Discovery failed');

    // Switch to success for the refetch
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsList as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.markets).toEqual(mockMarketsList);
  });

  it('refetch returns Promise', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsList as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    await waitFor(() => {
      expect(result.current.markets).toHaveLength(2);
    });

    // Switch mock for the refetch
    const updatedList = [...mockMarketsList, { marketId: 3, title: 'New Market' }];
    vi.mocked(discoverMarkets).mockResolvedValue(updatedList as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.markets).toHaveLength(3);
  });

  it('pollInterval causes periodic refetches', async () => {
    let resolvers: Array<(v: any) => void> = [];
    vi.mocked(discoverMarkets).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { wrapper } = createCacheWrapper();
    renderHook(
      () => useMarkets({ pollInterval: 500 }),
      { wrapper },
    );

    // Resolve initial fetch(es) -- StrictMode may cause more than one
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    const initialCount = resolvers.length;
    act(() => { resolvers.forEach(r => r(mockMarketsList)); });

    // Wait for poll interval to trigger another fetch
    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(initialCount);
    }, { timeout: 3000 });
  });
});

// ============================================================================
// useConsensus hook
// ============================================================================

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

  it('returns data after successful fetch', async () => {
    const mockConsensus = {
      points: [
        { x: 0, y: 0.1 },
        { x: 50, y: 0.5 },
        { x: 100, y: 0.1 },
      ],
    };
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1', 100), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.consensus).toEqual(mockConsensus);
    expect(result.current.error).toBe(null);
    expect(vi.mocked(getConsensusCurve)).toHaveBeenCalledWith(
      expect.anything(),
      '1',
      100,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns loading initially', async () => {
    vi.mocked(getConsensusCurve).mockImplementation(() => new Promise(() => {}));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.consensus).toBe(null);
  });

  it('loading vs isFetching on refetch', async () => {
    let callCount = 0;
    vi.mocked(getConsensusCurve).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ points: [{ x: 0, y: 0.5 }] });
      return new Promise((resolve) => setTimeout(() => resolve({ points: [{ x: 0, y: 0.8 }] }), 50));
    });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.consensus).not.toBe(null);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(getConsensusCurve).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.consensus).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on successful refetch', async () => {
    vi.mocked(getConsensusCurve).mockRejectedValue(new Error('Fail'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    // Switch to success for the refetch
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [{ x: 0, y: 0.5 }] });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.consensus).toEqual({ points: [{ x: 0, y: 0.5 }] });
  });

  it('refetch returns Promise', async () => {
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [{ x: 0, y: 0.1 }] });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.consensus).not.toBe(null);
    });

    // Switch mock for the refetch
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [{ x: 0, y: 0.9 }] });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.consensus).toEqual({ points: [{ x: 0, y: 0.9 }] });
  });

  it('pollInterval causes periodic refetches', async () => {
    let resolvers: Array<(v: any) => void> = [];
    vi.mocked(getConsensusCurve).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { wrapper } = createCacheWrapper();
    renderHook(
      () => useConsensus('1', 100, { pollInterval: 500 }),
      { wrapper },
    );

    // Resolve initial fetch(es) -- StrictMode may cause more than one
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    const initialCount = resolvers.length;
    act(() => { resolvers.forEach(r => r({ points: [{ x: 0, y: 0.1 }] })); });

    // Wait for poll interval to trigger another fetch
    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(initialCount);
    }, { timeout: 3000 });
  });
});

// ============================================================================
// usePositions hook
// ============================================================================

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

  it('returns data after successful fetch', async () => {
    vi.mocked(queryMarketPositions).mockResolvedValue([
      { positionId: 1, owner: 'testuser', belief: [0.5] },
      { positionId: 2, owner: 'otheruser', belief: [0.3] },
      { positionId: 3, owner: 'testuser', belief: [0.7] },
    ] as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1', 'testuser'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should only have positions for 'testuser'
    expect(result.current.positions).toHaveLength(2);
    expect(result.current.positions?.every(p => p.owner === 'testuser')).toBe(true);
    expect(vi.mocked(queryMarketPositions)).toHaveBeenCalledWith(
      expect.anything(),
      '1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns loading initially', async () => {
    vi.mocked(queryMarketPositions).mockImplementation(() => new Promise(() => {}));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1', 'testuser'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.positions).toBe(null);
  });

  it('loading vs isFetching on refetch', async () => {
    let callCount = 0;
    vi.mocked(queryMarketPositions).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([{ positionId: 1, owner: 'u', belief: [0.5] }] as any);
      return new Promise((resolve) => setTimeout(() => resolve([{ positionId: 2, owner: 'u', belief: [0.6] }] as any), 50));
    });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.positions).not.toBe(null);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketPositions).mockRejectedValue(new Error('API error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1', 'testuser'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.positions).toBe(null);
    expect(result.current.error?.message).toBe('API error');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on successful refetch', async () => {
    vi.mocked(queryMarketPositions).mockRejectedValue(new Error('API error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    // Switch to success for the refetch
    vi.mocked(queryMarketPositions).mockResolvedValue([{ positionId: 1, owner: 'u', belief: [0.5] }] as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.positions).not.toBe(null);
  });

  it('refetch returns Promise', async () => {
    vi.mocked(queryMarketPositions).mockResolvedValue([{ positionId: 1, owner: 'u', belief: [0.5] }] as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.positions).not.toBe(null);
    });

    // Switch mock for the refetch
    vi.mocked(queryMarketPositions).mockResolvedValue([{ positionId: 1, owner: 'u', belief: [0.5] }, { positionId: 2, owner: 'u', belief: [0.6] }] as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.positions).toHaveLength(2);
  });

  it('pollInterval causes periodic refetches', async () => {
    let resolvers: Array<(v: any) => void> = [];
    vi.mocked(queryMarketPositions).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { wrapper } = createCacheWrapper();
    renderHook(
      () => usePositions('1', undefined, { pollInterval: 500 }),
      { wrapper },
    );

    // Resolve initial fetch(es) -- StrictMode may cause more than one
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    const initialCount = resolvers.length;
    act(() => { resolvers.forEach(r => r([{ positionId: 1, owner: 'u', belief: [0.5] }])); });

    // Wait for poll interval to trigger another fetch
    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(initialCount);
    }, { timeout: 3000 });
  });

  it('returns all positions when username is omitted', async () => {
    vi.mocked(queryMarketPositions).mockResolvedValue([
      { positionId: 1, owner: 'testuser', belief: [0.5] },
      { positionId: 2, owner: 'otheruser', belief: [0.3] },
      { positionId: 3, owner: 'testuser', belief: [0.7] },
    ] as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should return ALL positions (no filter applied)
    expect(result.current.positions).toHaveLength(3);
  });
});

// ============================================================================
// useTradeHistory hook
// ============================================================================

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

  it('returns data after successful fetch', async () => {
    const mockTrades = [
      { id: '1_open', timestamp: '2025-01-15 14:00:00', side: 'buy', prediction: 52.5, amount: 100, username: 'alice', positionId: '1' },
      { id: '2_open', timestamp: '2025-01-15 13:00:00', side: 'buy', prediction: 60.0, amount: 50, username: 'bob', positionId: '2' },
    ];
    vi.mocked(queryTradeHistory).mockResolvedValue(mockTrades as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.trades).toEqual(mockTrades);
    expect(result.current.error).toBe(null);
    expect(vi.mocked(queryTradeHistory)).toHaveBeenCalledWith(
      expect.anything(),
      '1',
      expect.objectContaining({ limit: 100, signal: expect.any(AbortSignal) }),
    );
  });

  it('returns loading initially', async () => {
    vi.mocked(queryTradeHistory).mockImplementation(() => new Promise(() => {}));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.trades).toBe(null);
  });

  it('loading vs isFetching on refetch', async () => {
    let callCount = 0;
    vi.mocked(queryTradeHistory).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve([{ id: '1_open' }] as any);
      return new Promise((resolve) => setTimeout(() => resolve([{ id: '2_open' }] as any), 50));
    });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.trades).not.toBe(null);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryTradeHistory).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.trades).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on successful refetch', async () => {
    vi.mocked(queryTradeHistory).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    // Switch to success for the refetch
    vi.mocked(queryTradeHistory).mockResolvedValue([{ id: '1_open' }] as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.trades).not.toBe(null);
  });

  it('refetch returns Promise', async () => {
    vi.mocked(queryTradeHistory).mockResolvedValue([{ id: '1_open' }] as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.trades).not.toBe(null);
    });

    // Switch mock for the refetch
    vi.mocked(queryTradeHistory).mockResolvedValue([{ id: '1_open' }, { id: '2_open' }] as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.trades).toHaveLength(2);
  });

  it('pollInterval causes periodic refetches', async () => {
    let resolvers: Array<(v: any) => void> = [];
    vi.mocked(queryTradeHistory).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { wrapper } = createCacheWrapper();
    renderHook(
      () => useTradeHistory('1', { pollInterval: 500 }),
      { wrapper },
    );

    // Resolve initial fetch(es) -- StrictMode may cause more than one
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    const initialCount = resolvers.length;
    act(() => { resolvers.forEach(r => r([{ id: '1_open' }])); });

    // Wait for poll interval to trigger another fetch
    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(initialCount);
    }, { timeout: 3000 });
  });
});

// ============================================================================
// useMarketHistory hook
// ============================================================================

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

  it('returns data after successful fetch', async () => {
    const mockHistory = {
      marketId: 1,
      totalSnapshots: 2,
      snapshots: [
        { snapshotId: 1, tradeId: 1, side: 'buy', positionId: '1', alphaVector: [1, 1], totalDeposits: 10, totalWithdrawals: 0, totalVolume: 10, currentPool: 10, numOpenPositions: 1, createdAt: '2025-01-15T14:00:00Z' },
        { snapshotId: 2, tradeId: 2, side: 'buy', positionId: '2', alphaVector: [1, 2], totalDeposits: 20, totalWithdrawals: 0, totalVolume: 20, currentPool: 20, numOpenPositions: 2, createdAt: '2025-01-15T15:00:00Z' },
      ],
    };
    vi.mocked(queryMarketHistory).mockResolvedValue(mockHistory as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toEqual(mockHistory);
    expect(result.current.error).toBe(null);
    expect(vi.mocked(queryMarketHistory)).toHaveBeenCalledWith(
      expect.anything(),
      '1',
      undefined,
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns loading initially', async () => {
    vi.mocked(queryMarketHistory).mockImplementation(() => new Promise(() => {}));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.isFetching).toBe(true);
    expect(result.current.history).toBe(null);
  });

  it('loading vs isFetching on refetch', async () => {
    let callCount = 0;
    vi.mocked(queryMarketHistory).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ marketId: 1, totalSnapshots: 0, snapshots: [] } as any);
      return new Promise((resolve) => setTimeout(() => resolve({ marketId: 1, totalSnapshots: 1, snapshots: [{}] } as any), 50));
    });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.history).not.toBe(null);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true);
    });
    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('returns error on fetch failure', async () => {
    vi.mocked(queryMarketHistory).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.history).toBe(null);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on successful refetch', async () => {
    vi.mocked(queryMarketHistory).mockRejectedValue(new Error('Network error'));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    // Switch to success for the refetch
    vi.mocked(queryMarketHistory).mockResolvedValue({ marketId: 1, totalSnapshots: 0, snapshots: [] } as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.history).not.toBe(null);
  });

  it('refetch returns Promise', async () => {
    vi.mocked(queryMarketHistory).mockResolvedValue({ marketId: 1, totalSnapshots: 0, snapshots: [] } as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketHistory('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.history).not.toBe(null);
    });

    // Switch mock for the refetch
    vi.mocked(queryMarketHistory).mockResolvedValue({ marketId: 1, totalSnapshots: 2, snapshots: [{}, {}] } as any);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.history?.totalSnapshots).toBe(2);
  });

  it('pollInterval causes periodic refetches', async () => {
    let resolvers: Array<(v: any) => void> = [];
    vi.mocked(queryMarketHistory).mockImplementation(() => {
      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { wrapper } = createCacheWrapper();
    renderHook(
      () => useMarketHistory('1', { pollInterval: 500 }),
      { wrapper },
    );

    // Resolve initial fetch(es) -- StrictMode may cause more than one
    await waitFor(() => expect(resolvers.length).toBeGreaterThanOrEqual(1));
    const initialCount = resolvers.length;
    act(() => { resolvers.forEach(r => r({ marketId: 1, totalSnapshots: 1, snapshots: [] })); });

    // Wait for poll interval to trigger another fetch
    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThan(initialCount);
    }, { timeout: 3000 });
  });
});

// ============================================================================
// Hook Return Shape
// ============================================================================

describe('Hook Return Shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryMarketState).mockResolvedValue({ config: {} });
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [] });
    vi.mocked(queryMarketPositions).mockResolvedValue([]);
    vi.mocked(queryTradeHistory).mockResolvedValue([]);
    vi.mocked(discoverMarkets).mockResolvedValue([]);
  });

  it('useMarkets returns { markets, loading, isFetching, error, refetch }', async () => {
    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarkets(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('markets');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isFetching');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('useMarket returns { market, loading, isFetching, error, refetch }', async () => {
    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('market');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isFetching');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('useConsensus returns { consensus, loading, isFetching, error, refetch }', async () => {
    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useConsensus('1'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('consensus');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isFetching');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('usePositions returns { positions, loading, isFetching, error, refetch }', async () => {
    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => usePositions('1', 'user'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('positions');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isFetching');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('useTradeHistory returns { trades, loading, isFetching, error, refetch }', async () => {
    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useTradeHistory('1'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('trades');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('isFetching');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});

// ============================================================================
// System-level cache tests
// ============================================================================

describe('Cache system behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidateAll triggers refetch for active hooks', async () => {
    let callCount = 0;
    vi.mocked(queryMarketState).mockImplementation(async () => {
      callCount++;
      return { config: { numBuckets: 60, K: 60 }, title: `Call ${callCount}` };
    });

    const { wrapper, ctx } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('42'), { wrapper });

    await waitFor(() => {
      expect(result.current.market).not.toBe(null);
    });
    const callsAfterInitial = callCount;

    // Trigger invalidateAll
    act(() => {
      ctx.invalidateAll();
    });

    await waitFor(() => {
      expect(callCount).toBeGreaterThan(callsAfterInitial);
    });
  });

  it('targeted invalidate scoped to market', async () => {
    let market42Calls = 0;
    let market43Calls = 0;

    vi.mocked(queryMarketState).mockImplementation(async (_client: any, marketId: any) => {
      if (String(marketId) === '42') {
        market42Calls++;
        return { config: { numBuckets: 60, K: 60 }, title: `Market 42 call ${market42Calls}` };
      }
      market43Calls++;
      return { config: { numBuckets: 60, K: 60 }, title: `Market 43 call ${market43Calls}` };
    });

    const { wrapper, ctx } = createCacheWrapper();

    // Render hooks for two different markets
    const { result: result42 } = renderHook(() => useMarket('42'), { wrapper });
    const { result: result43 } = renderHook(() => useMarket('43'), { wrapper });

    await waitFor(() => {
      expect(result42.current.market).not.toBe(null);
      expect(result43.current.market).not.toBe(null);
    });

    const calls42Before = market42Calls;
    const calls43Before = market43Calls;

    // Invalidate only market 42
    act(() => {
      ctx.invalidate('42');
    });

    await waitFor(() => {
      expect(market42Calls).toBeGreaterThan(calls42Before);
    });

    // Market 43 should not have been refetched
    expect(market43Calls).toBe(calls43Before);
  });

  it('cache deduplication: two hook instances with same key produce one core function call', async () => {
    let callCount = 0;
    vi.mocked(queryMarketState).mockImplementation(async () => {
      callCount++;
      return { config: { numBuckets: 60, K: 60 }, title: 'Shared' };
    });

    const { wrapper } = createCacheWrapper();

    // Render both hooks in the same call so they share the same mount cycle.
    // This ensures cache deduplication is tested without separate React tree
    // mount/unmount cycles interfering.
    const { result } = renderHook(
      () => ({ m1: useMarket('1'), m2: useMarket('1') }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.m1.market).not.toBe(null);
      expect(result.current.m2.market).not.toBe(null);
    });

    // Both hooks share the same cache key, so only one fetch per mount cycle
    // should have been made. Under StrictMode, at most 2 mount cycles occur,
    // but each cycle should deduplicate the two hook instances to a single call.
    expect(callCount).toBeLessThanOrEqual(2);
  });

  it('enabled: false suppresses fetch', async () => {
    vi.mocked(queryMarketState).mockResolvedValue({ config: { numBuckets: 60, K: 60 }, title: 'Should Not Fetch' });

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarket('1', { enabled: false }), { wrapper });

    // Give it a tick to ensure no fetch fires
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.market).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(queryMarketState).not.toHaveBeenCalled();
  });

  it('SSR snapshot returns idle shape', async () => {
    // useCacheSubscription's getServerSnapshot returns { data: null, error: null, status: 'idle' }
    // We verify this indirectly: before any fetch, the snapshot should be idle
    const { wrapper } = createCacheWrapper();

    // Render without letting fetch happen yet
    vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useMarket('1'), { wrapper });

    // Before first data arrives, we should see the initial state
    // (data null, no error). The exact status is internal; loading/isFetching reflect it.
    expect(result.current.market).toBe(null);
    expect(result.current.error).toBe(null);
  });
});

// ============================================================================
// useBuy hook (mutation)
// ============================================================================

// Helper to create a cache wrapper with a spy-able invalidate for mutation tests
function createMutationWrapper() {
  const cache = new QueryCache();
  const mockClient = new (FSClient as any)();
  const invalidateSpy = vi.fn((marketId: string | number) => { cache.invalidate(String(marketId)); });

  const ctxValue = {
    client: mockClient,
    previewBelief: null,
    setPreviewBelief: () => {},
    previewPayout: null,
    setPreviewPayout: () => {},
    invalidate: invalidateSpy,
    invalidateAll: () => { cache.invalidateAll(); },
    selectedPosition: null,
    setSelectedPosition: () => {},
    user: null,
    isAuthenticated: false,
    authLoading: false,
    authError: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    passwordlessLogin: vi.fn(),
    showAdminLogin: false,
    pendingAdminUsername: null,
    clearAdminLogin: vi.fn(),
    chartColors: minimalChartColors,
  };

  function MutationWrapper({ children }: { children: React.ReactNode }) {
    return (
      <React.StrictMode>
        <QueryCacheContext.Provider value={cache}>
          <FunctionSpaceContext.Provider value={ctxValue as any}>
            {children}
          </FunctionSpaceContext.Provider>
        </QueryCacheContext.Provider>
      </React.StrictMode>
    );
  }

  return { wrapper: MutationWrapper, cache, ctx: ctxValue, invalidateSpy };
}

// Helper to pre-populate the cache with market data containing config.numBuckets
async function populateMarketCache(cache: QueryCache, marketId: string, numBuckets: number) {
  cache.registerQueryFn(['marketState', marketId], async () => ({
    config: { numBuckets, lowerBound: 0, upperBound: 100, K: numBuckets, L: 0, H: 100 },
    title: 'Test Market',
    consensusBelief: new Array(numBuckets + 1).fill(1 / (numBuckets + 1)),
  }));
  cache.ensureFetching(['marketState', marketId]);
  // Wait for the async fetch to complete
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('useBuy hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useBuy('42'));
    }).toThrow('useBuy must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns data on success', async () => {
    const mockResult = { positionId: 1, belief: [0.5, 0.5], claims: 100, collateral: 50 };
    vi.mocked(buy).mockResolvedValue(mockResult);

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.execute([0.5, 0.5], 50);
    });

    expect(returnValue).toEqual(mockResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    const belief = [0.5, 0.5];
    const collateral = 50;
    const numBuckets = 10;
    expect(buy).toHaveBeenCalledWith(expect.anything(), '42', belief, collateral, numBuckets);
  });

  it('loading state lifecycle: false -> true -> false', async () => {
    let resolvePromise: (v: any) => void;
    vi.mocked(buy).mockImplementation(() => new Promise(r => { resolvePromise = r; }));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    expect(result.current.loading).toBe(false);

    let executePromise: Promise<any>;
    act(() => {
      executePromise = result.current.execute([0.5, 0.5], 50);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ positionId: 1, belief: [0.5, 0.5], claims: 100, collateral: 50 });
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('error state on failure', async () => {
    vi.mocked(buy).mockRejectedValue(new Error('Insufficient funds'));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 50).catch(() => {});
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.message).toBe('Insufficient funds');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on retry', async () => {
    vi.mocked(buy)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce({ positionId: 1, belief: [0.5, 0.5], claims: 100, collateral: 50 });

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    // First call fails
    await act(async () => {
      await result.current.execute([0.5, 0.5], 50).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    // Retry succeeds -- error clears before calling core fn
    await act(async () => {
      await result.current.execute([0.5, 0.5], 50);
    });
    expect(result.current.error).toBe(null);
  });

  it('reset clears error', async () => {
    vi.mocked(buy).mockRejectedValue(new Error('Fail'));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 50).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBe(null);
  });

  it('re-throws on failure so callers can catch', async () => {
    vi.mocked(buy).mockRejectedValue(new Error('Boom'));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.execute([0.5, 0.5], 50);
      } catch (err) {
        caught = err as Error;
      }
    });
    expect(caught).not.toBe(null);
    expect(caught!.message).toBe('Boom');
  });

  it('invalidates market cache on success', async () => {
    vi.mocked(buy).mockResolvedValue({ positionId: 1, belief: [0.5, 0.5], claims: 100, collateral: 50 });

    const { wrapper, cache, invalidateSpy } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 50);
    });

    expect(invalidateSpy).toHaveBeenCalledWith('42');
  });

  it('reads numBuckets from cache and throws if market not loaded', async () => {
    const { wrapper } = createMutationWrapper();
    // Do NOT populate cache -- market data is not loaded

    const { result } = renderHook(() => useBuy('42'), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.execute([0.5, 0.5], 50);
      } catch (err) {
        caught = err as Error;
      }
    });
    expect(caught).not.toBe(null);
    expect(caught!.message).toMatch(/Market data not loaded/);
    // buy should not have been called since validation failed before it
    expect(buy).not.toHaveBeenCalled();
  });

  describe('auto-clear error timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    async function populateMarketCacheWithFakeTimers(cache: QueryCache) {
      const promise = populateMarketCache(cache, '42', 10);
      vi.advanceTimersByTime(0);
      await promise;
    }

    it('error auto-clears after 5 seconds', async () => {
      vi.mocked(buy).mockRejectedValue(new Error('Insufficient funds'));
      const { wrapper, cache } = createMutationWrapper();
      await populateMarketCacheWithFakeTimers(cache);

      const { result } = renderHook(() => useBuy('42'), { wrapper });

      await act(async () => {
        try { await result.current.execute([0.5, 0.5], 100); } catch {}
      });

      expect(result.current.error).not.toBeNull();

      act(() => { vi.advanceTimersByTime(5000); });

      expect(result.current.error).toBeNull();
    });

    it('timer cancelled on re-execute', async () => {
      vi.mocked(buy).mockRejectedValueOnce(new Error('First error'));
      vi.mocked(buy).mockRejectedValueOnce(new Error('Second error'));
      const { wrapper, cache } = createMutationWrapper();
      await populateMarketCacheWithFakeTimers(cache);

      const { result } = renderHook(() => useBuy('42'), { wrapper });

      // First execute fails
      await act(async () => {
        try { await result.current.execute([0.5, 0.5], 100); } catch {}
      });
      expect(result.current.error?.message).toBe('First error');

      // Second execute fails immediately (cancels first timer)
      await act(async () => {
        try { await result.current.execute([0.5, 0.5], 100); } catch {}
      });
      expect(result.current.error?.message).toBe('Second error');

      // Advance 5s -- should clear second error, not leave stale first error
      act(() => { vi.advanceTimersByTime(5000); });
      expect(result.current.error).toBeNull();
    });

    it('timer cancelled on reset()', async () => {
      vi.mocked(buy).mockRejectedValue(new Error('Error'));
      const { wrapper, cache } = createMutationWrapper();
      await populateMarketCacheWithFakeTimers(cache);

      const { result } = renderHook(() => useBuy('42'), { wrapper });

      await act(async () => {
        try { await result.current.execute([0.5, 0.5], 100); } catch {}
      });
      expect(result.current.error).not.toBeNull();

      // Reset manually
      act(() => { result.current.reset(); });
      expect(result.current.error).toBeNull();

      // Advance 5s -- should still be null (timer was cancelled by reset)
      act(() => { vi.advanceTimersByTime(5000); });
      expect(result.current.error).toBeNull();
    });

    it('timer cancelled on unmount', async () => {
      vi.mocked(buy).mockRejectedValue(new Error('Error'));
      const { wrapper, cache } = createMutationWrapper();
      await populateMarketCacheWithFakeTimers(cache);

      const { result, unmount } = renderHook(() => useBuy('42'), { wrapper });

      await act(async () => {
        try { await result.current.execute([0.5, 0.5], 100); } catch {}
      });

      // Unmount before timer fires
      unmount();

      // Advance 5s -- should not cause setState warning
      act(() => { vi.advanceTimersByTime(5000); });
      // No assertion needed -- test passes if no React warning is thrown
    });
  });
});

// ============================================================================
// useSell hook (mutation)
// ============================================================================

describe('useSell hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useSell('42'));
    }).toThrow('useSell must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns data on success', async () => {
    const mockResult = { positionId: 7, collateralReturned: 75 };
    vi.mocked(sell).mockResolvedValue(mockResult);

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.execute(7);
    });

    expect(returnValue).toEqual(mockResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    const positionId = 7;
    expect(sell).toHaveBeenCalledWith(expect.anything(), positionId, '42');
  });

  it('loading state lifecycle: false -> true -> false', async () => {
    let resolvePromise: (v: any) => void;
    vi.mocked(sell).mockImplementation(() => new Promise(r => { resolvePromise = r; }));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    expect(result.current.loading).toBe(false);

    let executePromise: Promise<any>;
    act(() => {
      executePromise = result.current.execute(7);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ positionId: 7, collateralReturned: 75 });
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('error state on failure', async () => {
    vi.mocked(sell).mockRejectedValue(new Error('Position not found'));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7).catch(() => {});
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.message).toBe('Position not found');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on retry', async () => {
    vi.mocked(sell)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce({ positionId: 7, collateralReturned: 75 });

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    await act(async () => {
      await result.current.execute(7);
    });
    expect(result.current.error).toBe(null);
  });

  it('reset clears error', async () => {
    vi.mocked(sell).mockRejectedValue(new Error('Fail'));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBe(null);
  });

  it('re-throws on failure so callers can catch', async () => {
    vi.mocked(sell).mockRejectedValue(new Error('Boom'));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.execute(7);
      } catch (err) {
        caught = err as Error;
      }
    });
    expect(caught).not.toBe(null);
    expect(caught!.message).toBe('Boom');
  });

  it('invalidates market cache on success', async () => {
    vi.mocked(sell).mockResolvedValue({ positionId: 7, collateralReturned: 75 });

    const { wrapper, invalidateSpy } = createMutationWrapper();
    const { result } = renderHook(() => useSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7);
    });

    expect(invalidateSpy).toHaveBeenCalledWith('42');
  });
});

// ============================================================================
// usePreviewPayout hook (mutation)
// ============================================================================

describe('usePreviewPayout hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => usePreviewPayout('42'));
    }).toThrow('usePreviewPayout must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns data on success', async () => {
    const mockResult = {
      previews: [{ outcome: 50, payout: 120, profitLoss: 20 }],
      maxPayout: 120,
      maxPayoutOutcome: 50,
      inputCollateral: 100,
    };
    vi.mocked(previewPayoutCurve).mockResolvedValue(mockResult);

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.execute([0.5, 0.5], 100);
    });

    expect(returnValue).toEqual(mockResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    const belief = [0.5, 0.5];
    const collateral = 100;
    const numBuckets = 10;
    expect(previewPayoutCurve).toHaveBeenCalledWith(expect.anything(), '42', belief, collateral, numBuckets, undefined, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('loading state lifecycle: false -> true -> false', async () => {
    let resolvePromise: (v: any) => void;
    vi.mocked(previewPayoutCurve).mockImplementation(() => new Promise(r => { resolvePromise = r; }));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    expect(result.current.loading).toBe(false);

    let executePromise: Promise<any>;
    act(() => {
      executePromise = result.current.execute([0.5, 0.5], 100);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({
        previews: [{ outcome: 50, payout: 120, profitLoss: 20 }],
        maxPayout: 120,
        maxPayoutOutcome: 50,
        inputCollateral: 100,
      });
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('error state on failure', async () => {
    vi.mocked(previewPayoutCurve).mockRejectedValue(new Error('Preview failed'));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 100).catch(() => {});
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.message).toBe('Preview failed');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on retry', async () => {
    vi.mocked(previewPayoutCurve)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce({
        previews: [{ outcome: 50, payout: 120, profitLoss: 20 }],
        maxPayout: 120,
        maxPayoutOutcome: 50,
        inputCollateral: 100,
      });

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 100).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    await act(async () => {
      await result.current.execute([0.5, 0.5], 100);
    });
    expect(result.current.error).toBe(null);
  });

  it('reset clears error', async () => {
    vi.mocked(previewPayoutCurve).mockRejectedValue(new Error('Fail'));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 100).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBe(null);
  });

  it('re-throws on failure so callers can catch', async () => {
    vi.mocked(previewPayoutCurve).mockRejectedValue(new Error('Boom'));

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.execute([0.5, 0.5], 100);
      } catch (err) {
        caught = err as Error;
      }
    });
    expect(caught).not.toBe(null);
    expect(caught!.message).toBe('Boom');
  });

  it('reads numBuckets from cache and throws if market not loaded', async () => {
    const { wrapper } = createMutationWrapper();
    // Do NOT populate cache -- market data is not loaded

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.execute([0.5, 0.5], 100);
      } catch (err) {
        caught = err as Error;
      }
    });
    expect(caught).not.toBe(null);
    expect(caught!.message).toMatch(/Market data not loaded/);
    expect(previewPayoutCurve).not.toHaveBeenCalled();
  });

  it('does not call invalidate on success', async () => {
    vi.mocked(previewPayoutCurve).mockResolvedValue({
      previews: [{ outcome: 50, payout: 120, profitLoss: 20 }],
      maxPayout: 120,
      maxPayoutOutcome: 50,
      inputCollateral: 100,
    });

    const { wrapper, cache, ctx } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    await act(async () => {
      await result.current.execute([0.5, 0.5], 100);
    });

    expect(ctx.invalidate).not.toHaveBeenCalled();
  });

  it('aborts previous request when execute is called again', async () => {
    let capturedSignals: AbortSignal[] = [];
    vi.mocked(previewPayoutCurve).mockImplementation(
      (_client, _marketId, _belief, _collateral, _numBuckets, _numOutcomes, options) => {
        if (options?.signal) capturedSignals.push(options.signal);
        // First call never resolves; second call resolves immediately
        if (capturedSignals.length === 1) return new Promise(() => {});
        return Promise.resolve({
          previews: [{ outcome: 50, payout: 120, profitLoss: 20 }],
          maxPayout: 120,
          maxPayoutOutcome: 50,
          inputCollateral: 100,
        });
      },
    );

    const { wrapper, cache } = createMutationWrapper();
    await populateMarketCache(cache, '42', 10);

    const { result } = renderHook(() => usePreviewPayout('42'), { wrapper });

    // First call (will never resolve)
    act(() => {
      result.current.execute([0.5, 0.5], 100).catch(() => {});
    });

    // Second call (resolves immediately, should abort the first)
    await act(async () => {
      await result.current.execute([0.5, 0.5], 100);
    });

    expect(capturedSignals).toHaveLength(2);
    expect(capturedSignals[0].aborted).toBe(true);
    expect(capturedSignals[1].aborted).toBe(false);
  });
});

// ============================================================================
// usePreviewSell hook (mutation)
// ============================================================================

describe('usePreviewSell hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => usePreviewSell('42'));
    }).toThrow('usePreviewSell must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns data on success', async () => {
    const mockResult = { collateralReturned: 80, positionId: 7 };
    vi.mocked(previewSell).mockResolvedValue(mockResult);

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.execute(7);
    });

    expect(returnValue).toEqual(mockResult);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    const positionId = 7;
    expect(previewSell).toHaveBeenCalledWith(expect.anything(), positionId, '42', { signal: undefined });
  });

  it('loading state lifecycle: false -> true -> false', async () => {
    let resolvePromise: (v: any) => void;
    vi.mocked(previewSell).mockImplementation(() => new Promise(r => { resolvePromise = r; }));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    expect(result.current.loading).toBe(false);

    let executePromise: Promise<any>;
    act(() => {
      executePromise = result.current.execute(7);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    await act(async () => {
      resolvePromise!({ collateralReturned: 80, positionId: 7 });
      await executePromise;
    });

    expect(result.current.loading).toBe(false);
  });

  it('error state on failure', async () => {
    vi.mocked(previewSell).mockRejectedValue(new Error('Preview sell failed'));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7).catch(() => {});
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.message).toBe('Preview sell failed');
    expect(result.current.loading).toBe(false);
  });

  it('error clears on retry', async () => {
    vi.mocked(previewSell)
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce({ collateralReturned: 80, positionId: 7 });

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    await act(async () => {
      await result.current.execute(7);
    });
    expect(result.current.error).toBe(null);
  });

  it('reset clears error', async () => {
    vi.mocked(previewSell).mockRejectedValue(new Error('Fail'));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7).catch(() => {});
    });
    expect(result.current.error).not.toBe(null);

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBe(null);
  });

  it('re-throws on failure so callers can catch', async () => {
    vi.mocked(previewSell).mockRejectedValue(new Error('Boom'));

    const { wrapper } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.execute(7);
      } catch (err) {
        caught = err as Error;
      }
    });
    expect(caught).not.toBe(null);
    expect(caught!.message).toBe('Boom');
  });

  it('does not call invalidate on success', async () => {
    const mockResult = { collateralReturned: 80, positionId: 7 };
    vi.mocked(previewSell).mockResolvedValue(mockResult);

    const { wrapper, ctx } = createMutationWrapper();
    const { result } = renderHook(() => usePreviewSell('42'), { wrapper });

    await act(async () => {
      await result.current.execute(7);
    });

    expect(ctx.invalidate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// useBucketDistribution hook (derived)
// ============================================================================

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

  it('returns computed bucket data from underlying hooks', async () => {
    const mockConsensus = {
      points: [{ x: 0, y: 0.1 }, { x: 50, y: 0.5 }, { x: 100, y: 0.1 }],
      config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
    };
    const mockMarket = {
      config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
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

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useBucketDistribution('1', 2), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.buckets).toEqual(mockBuckets);
    expect(result.current.error).toBe(null);
  });

  it('returns { buckets, loading, error, refetch }', async () => {
    vi.mocked(queryMarketState).mockResolvedValue({ config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 }, decimals: 0 } as any);
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [] } as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useBucketDistribution('1'), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current).toHaveProperty('buckets');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('refetch');
    expect(typeof result.current.refetch).toBe('function');
  });
});

// ============================================================================
// useDistributionState hook (derived)
// ============================================================================

describe('useDistributionState hook', () => {
  const mockMarket = {
    config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100, P0: 1, mu: 1, epsAlpha: 0.01, tau: 1, gamma: 1, lambdaS: 0, lambdaD: 0 },
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

  it('returns computed data from underlying hooks', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.buckets).toEqual(mockBuckets);
    expect(result.current.error).toBe(null);
    expect(calculateBucketDistribution).toHaveBeenCalledWith(
      mockConsensus.points,
      0,    // lowerBound
      100,  // upperBound
      12,   // default bucketCount
      0,    // decimals
    );
  });

  it('refetch returns Promise', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // refetch should return a Promise that resolves
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.loading).toBe(false);
  });

  it('returns loading=true while data is fetching', async () => {
    vi.mocked(queryMarketState).mockImplementation(() => new Promise(() => {}));
    vi.mocked(getConsensusCurve).mockImplementation(() => new Promise(() => {}));

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });
    expect(result.current.market).toBe(null);
    expect(result.current.buckets).toBe(null);
    expect(result.current.percentiles).toBe(null);
  });

  it('computes percentiles from market consensus coefficients', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.percentiles).toEqual(mockPercentiles);
    expect(computePercentiles).toHaveBeenCalledWith(
      mockMarket.consensus,
      0,    // lowerBound
      100,  // upperBound
    );
  });

  it('setBucketCount updates bucket computation', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue(mockBuckets);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

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

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

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

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

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

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(
      () => useDistributionState('1', { defaultBucketCount: 8 }),
      { wrapper },
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

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.buckets).toBe(null);
    expect(result.current.percentiles).toBe(null);
  });

  it('returns correct shape', async () => {
    vi.mocked(queryMarketState).mockResolvedValue(mockMarket as any);
    vi.mocked(getConsensusCurve).mockResolvedValue(mockConsensus as any);
    vi.mocked(calculateBucketDistribution).mockReturnValue([]);
    vi.mocked(computePercentiles).mockReturnValue(mockPercentiles);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useDistributionState('1'), { wrapper });

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

// ============================================================================
// useAuth hook (state/action hook -- uses FunctionSpaceProvider, not cache)
// ============================================================================

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

// ============================================================================
// useCustomShape (state management hook)
// ============================================================================

const mockCustomShapeMarket = {
  config: { numBuckets: 50, lowerBound: 50, upperBound: 150, K: 50, L: 50, H: 150 },
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.numPoints).toBe(20);
    expect(result.current.controlValues).toHaveLength(20);
  });

  it('setControlValue updates a control point', async () => {
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => {
      result.current.setControlValue(5, 1.8);
    });
    expect(result.current.controlValues[5]).toBe(1.8);
  });

  it('setControlValue clamps to [0, 25]', async () => {
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.pVector).not.toBe(null);
    expect(result.current.pVector).toHaveLength(51);
  });

  it('drag lifecycle works correctly', async () => {
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() => { result.current.toggleLock(3); });
    act(() => { result.current.startDrag(3); });
    expect(result.current.isDragging).toBe(false);
    expect(result.current.draggingIndex).toBe(null);
  });

  it('resetToDefault restores initial state', async () => {
    const { result } = renderHook(() => useCustomShape(mockCustomShapeMarket), {
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

// ============================================================================
// useChartZoom (state/action hook -- no context dependency)
// ============================================================================

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
    // Renders without wrapper -- should not throw
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

// ============================================================================
// useMarketFilters hook (derived)
// ============================================================================

const mockMarketsWithCategories = [
  {
    marketId: 1,
    title: 'Bitcoin Price',
    resolutionState: 'open',
    totalVolume: 50000,
    poolBalance: 10000,
    positionsOpen: 5,
    config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
    metadata: { categories: ['crypto', 'finance'] },
  },
  {
    marketId: 2,
    title: 'Election Outcome',
    resolutionState: 'open',
    totalVolume: 100000,
    poolBalance: 25000,
    positionsOpen: 12,
    config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
    metadata: { categories: ['politics'] },
  },
  {
    marketId: 3,
    title: 'Weather Forecast',
    resolutionState: 'resolved',
    totalVolume: 20000,
    poolBalance: 5000,
    positionsOpen: 3,
    config: { numBuckets: 60, lowerBound: 0, upperBound: 100, K: 60, L: 0, H: 100 },
    metadata: { categories: ['science', 'crypto'] },
  },
];

describe('useMarketFilters hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws error when used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useMarketFilters());
    }).toThrow('useMarketFilters must be used within FunctionSpaceProvider');
    spy.mockRestore();
  });

  it('returns markets after data loads', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.markets).toEqual(mockMarketsWithCategories);
    expect(result.current.error).toBe(null);
  });

  it('provides 5 default sort options', () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    expect(result.current.sortOptions).toHaveLength(5);
    expect(result.current.sortOptions.map((s: SortOption) => s.field)).toEqual([
      'totalVolume', 'poolBalance', 'positionsOpen', 'createdAt', 'expiresAt',
    ]);
    expect(result.current.sortOptions[0]).toEqual({ field: 'totalVolume', label: 'Volume', defaultOrder: 'desc' });
    expect(result.current.sortOptions[3]).toEqual({ field: 'createdAt', label: 'Newest', defaultOrder: 'desc' });
    expect(result.current.sortOptions[4]).toEqual({ field: 'expiresAt', label: 'Ending Soon', defaultOrder: 'asc' });
  });

  it('custom sort options override defaults', () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const customSorts: SortOption[] = [
      { field: 'title', label: 'Name', defaultOrder: 'asc' },
    ];

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(
      () => useMarketFilters({ sortOptions: customSorts }),
      { wrapper },
    );

    expect(result.current.sortOptions).toEqual(customSorts);
  });

  it('setSearchText updates searchText immediately', () => {
    vi.useFakeTimers();
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    act(() => {
      result.current.setSearchText('bitcoin');
    });

    expect(result.current.searchText).toBe('bitcoin');
  });

  it('debounced: titleContains not updated until timer fires', () => {
    vi.useFakeTimers();
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    act(() => {
      result.current.setSearchText('bitcoin');
    });

    // Before debounce fires, discoveryOptions should not have titleContains
    expect(result.current.discoveryOptions.titleContains).toBeUndefined();

    // At 299ms, still within debounce window -- titleContains should remain undefined
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current.discoveryOptions.titleContains).toBeUndefined();

    // At 300ms, debounce fires
    act(() => {
      vi.advanceTimersByTime(1);
    });

    // After debounce fires, discoveryOptions should have titleContains
    expect(result.current.discoveryOptions.titleContains).toBe('bitcoin');
  });

  it('toggleCategory adds and removes categories', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    // Add a category
    act(() => {
      result.current.toggleCategory('crypto');
    });
    expect(result.current.selectedCategories).toEqual(['crypto']);

    // Add another
    act(() => {
      result.current.toggleCategory('politics');
    });
    expect(result.current.selectedCategories).toEqual(['crypto', 'politics']);

    // Remove first
    act(() => {
      result.current.toggleCategory('crypto');
    });
    expect(result.current.selectedCategories).toEqual(['politics']);
  });

  it('empty selectedCategories does not add category filter', () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    expect(result.current.selectedCategories).toEqual([]);
    expect(result.current.discoveryOptions.filters).toBeUndefined();
  });

  it('setSortField updates field and applies defaultOrder', () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    // Default
    expect(result.current.activeSortField).toBe('totalVolume');
    expect(result.current.sortOrder).toBe('desc');

    // Change to a field with ascending default
    act(() => {
      result.current.setSortField('expiresAt');
    });
    expect(result.current.activeSortField).toBe('expiresAt');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('toggleSortOrder flips between asc and desc', () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    expect(result.current.sortOrder).toBe('desc');

    act(() => {
      result.current.toggleSortOrder();
    });
    expect(result.current.sortOrder).toBe('asc');

    act(() => {
      result.current.toggleSortOrder();
    });
    expect(result.current.sortOrder).toBe('desc');
  });

  it('resetFilters clears all filter state', () => {
    vi.useFakeTimers();
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    // Set some filters
    act(() => {
      result.current.setSearchText('test');
      result.current.toggleCategory('crypto');
      result.current.setSortField('expiresAt');
    });

    expect(result.current.searchText).toBe('test');
    expect(result.current.selectedCategories).toEqual(['crypto']);
    expect(result.current.activeSortField).toBe('expiresAt');
    expect(result.current.sortOrder).toBe('asc');

    // Reset
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.searchText).toBe('');
    expect(result.current.selectedCategories).toEqual([]);
    expect(result.current.activeSortField).toBe('totalVolume');
    expect(result.current.sortOrder).toBe('desc');
  });

  it('clearCategories clears only categories without affecting search or sort', () => {
    vi.useFakeTimers();
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    // Setup: set searchText, toggle a category, change sort
    act(() => {
      result.current.setSearchText('bitcoin');
      result.current.toggleCategory('crypto');
      result.current.toggleCategory('politics');
      result.current.setSortField('expiresAt');
    });

    expect(result.current.searchText).toBe('bitcoin');
    expect(result.current.selectedCategories).toEqual(['crypto', 'politics']);
    expect(result.current.activeSortField).toBe('expiresAt');
    expect(result.current.sortOrder).toBe('asc');

    // Call clearCategories
    act(() => {
      result.current.clearCategories();
    });

    // Verify: selectedCategories is empty, searchText unchanged, sort unchanged
    expect(result.current.selectedCategories).toEqual([]);
    expect(result.current.searchText).toBe('bitcoin');
    expect(result.current.activeSortField).toBe('expiresAt');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('categories config flows to discoveryOptions.categories', () => {
    vi.mocked(discoverMarkets).mockResolvedValue([]);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(
      () => useMarketFilters({ categories: ['crypto', 'politics'] }),
      { wrapper },
    );

    expect(result.current.discoveryOptions.categories).toEqual(['crypto', 'politics']);
  });

  it('availableCategories from config.categories', () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(
      () => useMarketFilters({ categories: ['crypto', 'politics'] }),
      { wrapper },
    );

    expect(result.current.availableCategories).toEqual(['crypto', 'politics']);
  });

  it('availableCategories from featured + metadata', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(
      () => useMarketFilters({ featuredCategories: ['politics'] }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Featured first, then unique non-featured from metadata
    expect(result.current.availableCategories[0]).toBe('politics');
    expect(result.current.availableCategories).toContain('crypto');
    expect(result.current.availableCategories).toContain('finance');
    expect(result.current.availableCategories).toContain('science');
    // No duplicates
    const unique = new Set(result.current.availableCategories);
    expect(unique.size).toBe(result.current.availableCategories.length);
  });

  it('availableCategories from metadata only (no config)', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should extract all unique categories from metadata
    expect(result.current.availableCategories).toContain('crypto');
    expect(result.current.availableCategories).toContain('finance');
    expect(result.current.availableCategories).toContain('politics');
    expect(result.current.availableCategories).toContain('science');
  });

  it('resultCount equals markets.length', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.resultCount).toBe(3);
    expect(result.current.resultCount).toBe(result.current.markets.length);
  });

  it('filterBarProps contains all expected fields', async () => {
    vi.mocked(discoverMarkets).mockResolvedValue(mockMarketsWithCategories as any);

    const { wrapper } = createCacheWrapper();
    const { result } = renderHook(() => useMarketFilters(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const props = result.current.filterBarProps;
    expect(props).toHaveProperty('searchText');
    expect(props).toHaveProperty('onSearchChange');
    expect(props).toHaveProperty('onSearchClear');
    expect(props).toHaveProperty('availableCategories');
    expect(props).toHaveProperty('selectedCategories');
    expect(props).toHaveProperty('onToggleCategory');
    expect(props).toHaveProperty('onClearCategories');
    expect(props).toHaveProperty('sortOptions');
    expect(props).toHaveProperty('activeSortField');
    expect(props).toHaveProperty('sortOrder');
    expect(props).toHaveProperty('onSortFieldChange');
    expect(props).toHaveProperty('onSortOrderToggle');
    expect(props).toHaveProperty('resultCount');
    expect(props).toHaveProperty('loading');
    expect(props).toHaveProperty('onReset');
    expect(typeof props.onSearchChange).toBe('function');
    expect(typeof props.onSearchClear).toBe('function');
    expect(typeof props.onToggleCategory).toBe('function');
    expect(typeof props.onClearCategories).toBe('function');
    expect(typeof props.onSortFieldChange).toBe('function');
    expect(typeof props.onSortOrderToggle).toBe('function');
    expect(typeof props.onReset).toBe('function');
    expect(props.resultCount).toBe(3);
  });
});
