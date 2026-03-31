import { useContext, useCallback, useMemo } from 'react';
import { queryMarketPositions } from '@functionspace/core';
import type { Position } from '@functionspace/core';
import type { QueryOptions, CacheKey } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';
import { useCacheSubscription } from './useCacheSubscription.js';

export function usePositions(marketId: string | number, username?: string, options?: QueryOptions) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('usePositions must be used within FunctionSpaceProvider');

  const cache = useQueryCache();
  const normalizedId = String(marketId);
  const key: CacheKey = useMemo(() => ['marketPositions', normalizedId], [normalizedId]);

  const queryFn = useCallback(
    (signal: AbortSignal) => queryMarketPositions(ctx.client, marketId, { signal }),
    [ctx.client, marketId],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<Position[]>(cache, key, queryFn, options);

  const positions = useMemo(
    () => data && username ? data.filter(p => p.owner === username) : data,
    [data, username],
  );

  return { positions, loading, isFetching, error, refetch };
}
