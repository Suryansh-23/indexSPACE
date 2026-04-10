import { useContext, useCallback, useMemo } from 'react';
import { discoverMarkets } from '@functionspace/core';
import type { MarketState, MarketDiscoveryOptions } from '@functionspace/core';
import type { QueryOptions, CacheKey } from './cache/index.js';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';
import { useCacheSubscription } from './useCacheSubscription.js';

export function useMarkets(options?: MarketDiscoveryOptions & QueryOptions) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarkets must be used within FunctionSpaceProvider');

  const cache = useQueryCache();

  // Stable options serialization: extract discovery-specific fields in FIXED ORDER
  // Strip signal, pollInterval, enabled (not serializable or not relevant to cache identity)
  const stableOptionsKey = useMemo(() => {
    if (!options) return '';
    const parts: string[] = [];
    if (options.state !== undefined) parts.push(`state:${options.state}`);
    if (options.titleContains !== undefined) parts.push(`titleContains:${options.titleContains}`);
    if (options.categories !== undefined) parts.push(`categories:${JSON.stringify(options.categories)}`);
    if (options.filters !== undefined) parts.push(`filters:${JSON.stringify(options.filters)}`);
    if (options.sortBy !== undefined) parts.push(`sortBy:${options.sortBy}`);
    if (options.sortOrder !== undefined) parts.push(`sortOrder:${options.sortOrder}`);
    if (options.limit !== undefined) parts.push(`limit:${options.limit}`);
    return parts.join('|');
  }, [
    options?.state,
    options?.titleContains,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    options?.categories && JSON.stringify(options.categories),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    options?.filters && JSON.stringify(options.filters),
    options?.sortBy,
    options?.sortOrder,
    options?.limit,
  ]);

  const key: CacheKey = useMemo(() => ['discoverMarkets', stableOptionsKey], [stableOptionsKey]);

  const queryFn = useCallback(
    (signal: AbortSignal) => {
      // Build discovery options: strip pollInterval and enabled, replace signal with cache-managed one
      const { pollInterval: _poll, enabled: _enabled, signal: _signal, ...discoveryOpts } = options ?? {};
      return discoverMarkets(ctx.client, { ...discoveryOpts, signal });
    },
    [ctx.client, stableOptionsKey],
  );

  const { data, loading, isFetching, error, refetch } = useCacheSubscription<MarketState[]>(cache, key, queryFn, options);

  return { markets: data ?? [], loading, isFetching, error, refetch };
}
