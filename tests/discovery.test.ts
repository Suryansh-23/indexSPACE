import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MarketState, MarketDiscoveryOptions } from '../packages/core/src/types';
import { filterMarkets } from '../packages/core/src/discovery/filters';

// Mock discoverMarkets for L2 convenience tests
vi.mock('../packages/core/src/discovery/markets', () => ({
  discoverMarkets: vi.fn().mockResolvedValue([]),
}));

import { discoverMarkets } from '../packages/core/src/discovery/markets';
import {
  discoverPopularMarkets,
  discoverActiveMarkets,
  discoverMarketsByCategory,
} from '../packages/core/src/discovery/convenience';

// ── Fixtures ──

function createMockMarket(overrides: Partial<MarketState> & { marketId: number }): MarketState {
  return {
    alpha: [1, 1],
    consensus: [0.5, 0.5],
    totalMass: 2,
    poolBalance: 1000,
    participantCount: 10,
    totalVolume: 5000,
    positionsOpen: 3,
    config: {
      numBuckets: 60,
      lowerBound: 0,
      upperBound: 100,
      K: 60,
      L: 0,
      H: 100,
      P0: 1,
      mu: 0.5,
      epsAlpha: 0.01,
      tau: 1,
      gamma: 0.1,
      lambdaS: 0.01,
      lambdaD: 0.01,
    },
    title: 'Test Market',
    xAxisUnits: 'USD',
    decimals: 2,
    resolutionState: 'open',
    resolvedOutcome: null,
    createdAt: '2025-01-01T00:00:00Z',
    expiresAt: null,
    resolvedAt: null,
    marketType: 'standard',
    marketSubtype: null,
    metadata: {},
    consensusMean: 50,
    ...overrides,
  };
}

const mockMarkets: MarketState[] = [
  createMockMarket({
    marketId: 1,
    title: 'Bitcoin Price End of Year',
    resolutionState: 'open',
    totalVolume: 50000,
    poolBalance: 10000,
    metadata: { categories: ['crypto', 'finance'] },
    createdAt: '2025-01-15T00:00:00Z',
  }),
  createMockMarket({
    marketId: 2,
    title: 'US Election Winner',
    resolutionState: 'resolved',
    totalVolume: 100000,
    poolBalance: 25000,
    resolvedOutcome: 3,
    metadata: { categories: ['politics'] },
    createdAt: '2024-11-01T00:00:00Z',
  }),
  createMockMarket({
    marketId: 3,
    title: 'Super Bowl Champion',
    resolutionState: 'open',
    totalVolume: 30000,
    poolBalance: 8000,
    metadata: { categories: ['sports', 'entertainment'] },
    createdAt: '2025-02-01T00:00:00Z',
  }),
  createMockMarket({
    marketId: 4,
    title: 'Federal Reserve Rate Decision',
    resolutionState: 'voided',
    totalVolume: 15000,
    poolBalance: 3000,
    metadata: { categories: ['finance', 'politics'] },
    createdAt: '2025-03-01T00:00:00Z',
  }),
  createMockMarket({
    marketId: 5,
    title: 'Oscar Best Picture',
    resolutionState: 'open',
    totalVolume: 20000,
    poolBalance: 6000,
    metadata: { categories: ['entertainment'] },
    createdAt: '2025-01-20T00:00:00Z',
  }),
];

// ============================================================================
// filterMarkets unit tests
// ============================================================================

describe('filterMarkets', () => {
  describe('typed convenience filters', () => {
    it('state filter returns only matching resolutionState', () => {
      const result = filterMarkets(mockMarkets, { state: 'open' });
      expect(result).toHaveLength(3);
      expect(result.map((m) => m.marketId)).toEqual([1, 3, 5]);
    });

    it('titleContains filter matches case-insensitive substring', () => {
      const result = filterMarkets(mockMarkets, { titleContains: 'bitcoin' });
      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe(1);
    });

    it('titleContains filter matches partial case-insensitive substring', () => {
      const result = filterMarkets(mockMarkets, { titleContains: 'CHAMPION' });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Super Bowl Champion');
    });

    it('categories filter matches markets with overlapping metadata.categories', () => {
      const result = filterMarkets(mockMarkets, { categories: ['finance'] });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([1, 4]);
    });
  });

  describe('FilterAction evaluation', () => {
    it('equals matches exact value', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'marketId', value: 3, action: 'equals' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Super Bowl Champion');
    });

    it('notEquals excludes matching value', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'resolutionState', value: 'open', action: 'notEquals' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.resolutionState)).toEqual(['resolved', 'voided']);
    });

    it('greaterThan filters numeric field', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'totalVolume', value: 30000, action: 'greaterThan' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([1, 2]);
    });

    it('greaterThanOrEqual filters numeric field', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'totalVolume', value: 30000, action: 'greaterThanOrEqual' }],
      });
      expect(result).toHaveLength(3);
      expect(result.map((m) => m.marketId)).toEqual([1, 2, 3]);
    });

    it('lessThan filters numeric field', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'totalVolume', value: 20000, action: 'lessThan' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe(4);
    });

    it('lessThanOrEqual filters numeric field', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'totalVolume', value: 20000, action: 'lessThanOrEqual' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([4, 5]);
    });

    it('contains matches case-insensitive string substring', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'title', value: 'rate', action: 'contains' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Federal Reserve Rate Decision');
    });

    it('between filters numeric field inclusively', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'totalVolume', value: [20000, 50000], action: 'between' }],
      });
      expect(result).toHaveLength(3);
      expect(result.map((m) => m.marketId)).toEqual([1, 3, 5]);
    });
  });

  describe('in action -- bidirectional', () => {
    it('scalar value in array field', () => {
      // Filter value is a scalar, field value (metadata.categories) is an array
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'categories', value: 'politics', action: 'in' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([2, 4]);
    });

    it('field value in filter array', () => {
      // Field value (resolutionState) is a scalar, filter value is an array
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'resolutionState', value: ['resolved', 'voided'], action: 'in' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([2, 4]);
    });

    it('both arrays -- intersection', () => {
      // Both field value (metadata.categories) and filter value are arrays
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'categories', value: ['sports', 'entertainment'], action: 'in' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([3, 5]);
    });
  });

  describe('field resolution', () => {
    it('resolves top-level field first', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'title', value: 'Bitcoin Price End of Year', action: 'equals' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe(1);
    });

    it('falls back to metadata for unknown top-level field', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'categories', value: 'crypto', action: 'in' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].marketId).toBe(1);
    });
  });

  describe('AND logic', () => {
    it('multiple filters all must match', () => {
      const result = filterMarkets(mockMarkets, {
        state: 'open',
        filters: [{ field: 'totalVolume', value: 25000, action: 'greaterThan' }],
      });
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.marketId)).toEqual([1, 3]);
    });
  });

  describe('sorting', () => {
    it('sorts ascending', () => {
      const result = filterMarkets(mockMarkets, { sortBy: 'totalVolume', sortOrder: 'asc' });
      expect(result.map((m) => m.totalVolume)).toEqual([15000, 20000, 30000, 50000, 100000]);
    });

    it('sorts descending', () => {
      const result = filterMarkets(mockMarkets, { sortBy: 'totalVolume', sortOrder: 'desc' });
      expect(result.map((m) => m.totalVolume)).toEqual([100000, 50000, 30000, 20000, 15000]);
    });

    it('default sort order is descending', () => {
      const result = filterMarkets(mockMarkets, { sortBy: 'totalVolume' });
      expect(result.map((m) => m.totalVolume)).toEqual([100000, 50000, 30000, 20000, 15000]);
    });
  });

  describe('limit', () => {
    it('truncates results to limit', () => {
      const result = filterMarkets(mockMarkets, { sortBy: 'totalVolume', sortOrder: 'desc', limit: 3 });
      expect(result).toHaveLength(3);
      expect(result.map((m) => m.totalVolume)).toEqual([100000, 50000, 30000]);
    });
  });

  describe('edge cases', () => {
    it('empty filters returns all markets', () => {
      const result = filterMarkets(mockMarkets, {});
      expect(result).toHaveLength(5);
    });

    it('empty markets returns empty array', () => {
      const result = filterMarkets([], { state: 'open' });
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('unknown field does not match any market', () => {
      const result = filterMarkets(mockMarkets, {
        filters: [{ field: 'nonexistentField', value: 'anything', action: 'equals' }],
      });
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// L2 convenience function tests
// ============================================================================

describe('L2 discovery convenience functions', () => {
  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverPopularMarkets', () => {
    it('calls discoverMarkets with preset sortBy/sortOrder/limit', async () => {
      await discoverPopularMarkets(mockClient);
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        sortBy: 'totalVolume',
        sortOrder: 'desc',
        limit: 10,
      });
    });

    it('caller option merge: override limit', async () => {
      await discoverPopularMarkets(mockClient, { limit: 5 });
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        sortBy: 'totalVolume',
        sortOrder: 'desc',
        limit: 5,
      });
    });

    it('caller option merge: add filters', async () => {
      const extraFilter = { field: 'poolBalance', value: 5000, action: 'greaterThan' as const };
      await discoverPopularMarkets(mockClient, { filters: [extraFilter] });
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        sortBy: 'totalVolume',
        sortOrder: 'desc',
        limit: 10,
        filters: [extraFilter],
      });
    });
  });

  describe('discoverActiveMarkets', () => {
    it('calls discoverMarkets with state: open', async () => {
      await discoverActiveMarkets(mockClient);
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        state: 'open',
      });
    });

    it('caller option merge: override state not possible, add limit', async () => {
      await discoverActiveMarkets(mockClient, { limit: 20 });
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        state: 'open',
        limit: 20,
      });
    });
  });

  describe('discoverMarketsByCategory', () => {
    it('calls discoverMarkets with categories', async () => {
      await discoverMarketsByCategory(mockClient, ['crypto']);
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        categories: ['crypto'],
      });
    });

    it('caller option merge: add filters and override limit', async () => {
      const extraFilter = { field: 'totalVolume', value: 10000, action: 'greaterThan' as const };
      await discoverMarketsByCategory(mockClient, ['sports'], { limit: 5, filters: [extraFilter] });
      expect(discoverMarkets).toHaveBeenCalledWith(mockClient, {
        categories: ['sports'],
        limit: 5,
        filters: [extraFilter],
      });
    });
  });
});
