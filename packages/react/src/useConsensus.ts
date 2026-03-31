import { useContext, useCallback, useMemo } from 'react';
import { getConsensusCurve } from '@functionspace/core';
import type { ConsensusCurve } from '@functionspace/core';
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
  const key: CacheKey = useMemo(
    () => ['consensusCurve', normalizedId, String(normalizedPoints)],
    [normalizedId, normalizedPoints],
  );

  const queryFn = useCallback(
    (signal: AbortSignal) => getConsensusCurve(ctx.client, marketId, normalizedPoints, { signal }),
    [ctx.client, marketId, normalizedPoints],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<ConsensusCurve>(cache, key, queryFn, options);

  return { consensus: data, loading, isFetching, error, refetch };
}
