import { useContext, useCallback, useMemo } from 'react';
import { queryTradeHistory } from '@functionspace/core';
import type { TradeEntry } from '@functionspace/core';
import type { CacheKey } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';
import { useCacheSubscription } from './useCacheSubscription.js';

export function useTradeHistory(
  marketId: string | number,
  options?: { limit?: number; pollInterval?: number; enabled?: boolean },
) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useTradeHistory must be used within FunctionSpaceProvider');

  const cache = useQueryCache();
  const normalizedId = String(marketId);
  const limit = options?.limit ?? 100;
  const key: CacheKey = useMemo(
    () => ['tradeHistory', normalizedId, String(limit)],
    [normalizedId, limit],
  );

  const queryFn = useCallback(
    (signal: AbortSignal) => queryTradeHistory(ctx.client, marketId, { limit, signal }),
    [ctx.client, marketId, limit],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<TradeEntry[]>(cache, key, queryFn, options);

  return { trades: data, loading, isFetching, error, refetch };
}
