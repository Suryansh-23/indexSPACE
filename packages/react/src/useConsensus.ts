import { useContext, useCallback, useMemo } from 'react';
import { queryMarketState, evaluateDensityCurve } from '@functionspace/core';
import type { MarketState, ConsensusCurve } from '@functionspace/core';
import type { QueryOptions, CacheKey } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';
import { useCacheSubscription } from './useCacheSubscription.js';

export function useConsensus(marketId: string | number, numPoints?: number, options?: QueryOptions) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useConsensus must be used within FunctionSpaceProvider');

  const cache = useQueryCache();
  const normalizedId = String(marketId);
  const normalizedPoints = numPoints ?? 200;

  // Subscribe to the same cache key as useMarket -- shares the cache entry
  const key: CacheKey = useMemo(() => ['marketState', normalizedId], [normalizedId]);

  // Register queryMarketState as the queryFn (idempotent -- if useMarket already
  // registered it, the cache deduplicates)
  const queryFn = useCallback(
    (signal: AbortSignal) => queryMarketState(ctx.client, marketId, { signal }),
    [ctx.client, marketId],
  );

  // Select transform: derive ConsensusCurve from MarketState client-side
  const select = useCallback(
    (market: MarketState): ConsensusCurve => {
      const points = evaluateDensityCurve(
        market.consensus,
        market.config.lowerBound,
        market.config.upperBound,
        normalizedPoints,
      );
      return { points, config: market.config };
    },
    [normalizedPoints],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<MarketState, ConsensusCurve>(
    cache, key, queryFn, options, select,
  );

  return { consensus: data, loading, isFetching, error, refetch };
}
