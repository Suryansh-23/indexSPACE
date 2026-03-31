import { useContext, useCallback, useMemo } from 'react';
import { queryMarketState } from '@functionspace/core';
import type { MarketState } from '@functionspace/core';
import type { QueryOptions, CacheKey } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';
import { useCacheSubscription } from './useCacheSubscription.js';

export function useMarket(marketId: string | number, options?: QueryOptions) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarket must be used within FunctionSpaceProvider');

  const cache = useQueryCache();
  const normalizedId = String(marketId);
  const key: CacheKey = useMemo(() => ['marketState', normalizedId], [normalizedId]);

  const queryFn = useCallback(
    (signal: AbortSignal) => queryMarketState(ctx.client, marketId, { signal }),
    [ctx.client, marketId],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<MarketState>(cache, key, queryFn, options);

  return { market: data, loading, isFetching, error, refetch };
}
