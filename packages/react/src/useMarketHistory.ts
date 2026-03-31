import { useContext, useCallback, useMemo } from 'react';
import { queryMarketHistory } from '@functionspace/core';
import type { MarketHistory } from '@functionspace/core';
import type { CacheKey } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';
import { useCacheSubscription } from './useCacheSubscription.js';

export function useMarketHistory(
  marketId: string | number,
  options?: { limit?: number; pollInterval?: number; enabled?: boolean },
) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarketHistory must be used within FunctionSpaceProvider');

  const cache = useQueryCache();
  const normalizedId = String(marketId);
  const limit = options?.limit;
  const key: CacheKey = useMemo(
    () => limit !== undefined
      ? ['marketHistory', normalizedId, String(limit)]
      : ['marketHistory', normalizedId],
    [normalizedId, limit],
  );

  const queryFn = useCallback(
    (signal: AbortSignal) => queryMarketHistory(ctx.client, marketId, limit, undefined, { signal }),
    [ctx.client, marketId, limit],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<MarketHistory>(cache, key, queryFn, options);

  return { history: data, loading, isFetching, error, refetch };
}
