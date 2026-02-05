import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock the core module before importing hooks
vi.mock('@functionspace/core', () => ({
  FSClient: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
  })),
  queryMarketState: vi.fn(),
  getConsensusCurve: vi.fn(),
  mapPosition: vi.fn((p) => p),
}));

import { FunctionSpaceProvider, useMarket, useConsensus, usePositions } from '../packages/react/src';
import { queryMarketState, getConsensusCurve, FSClient } from '@functionspace/core';

const mockConfig = {
  baseUrl: 'https://test.api.com',
  username: 'testuser',
  password: 'testpass',
};

// Helper wrapper component
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <FunctionSpaceProvider config={mockConfig} theme="dark">
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
    const mockClientGet = vi.fn().mockResolvedValue({
      positions: [
        { positionId: 1, owner: 'testuser', belief: [0.5] },
        { positionId: 2, owner: 'otheruser', belief: [0.3] },
        { positionId: 3, owner: 'testuser', belief: [0.7] },
      ],
    });

    // Update the mock to return a client with our get function
    vi.mocked(FSClient).mockImplementation(() => ({
      authenticate: vi.fn().mockResolvedValue(undefined),
      get: mockClientGet,
    }) as any);

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
    vi.mocked(FSClient).mockImplementation(() => ({
      authenticate: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockRejectedValue(new Error('API error')),
    }) as any);

    const { result } = renderHook(() => usePositions('1', 'testuser'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.positions).toBe(null);
    expect(result.current.error?.message).toBe('API error');
  });
});

describe('Hook Return Shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryMarketState).mockResolvedValue({ config: {} });
    vi.mocked(getConsensusCurve).mockResolvedValue({ points: [] });
    vi.mocked(FSClient).mockImplementation(() => ({
      authenticate: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ positions: [] }),
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
});
