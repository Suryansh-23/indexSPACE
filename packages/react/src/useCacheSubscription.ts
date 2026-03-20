import { useSyncExternalStore, useEffect, useCallback } from 'react';
import type { QueryCache, CacheKey, CacheSnapshot, QueryFn, QueryOptions } from './cache/index.js';

const SERVER_SNAPSHOT: CacheSnapshot = Object.freeze({
  data: null,
  error: null,
  status: 'idle' as const,
});

export function useCacheSubscription<T>(
  cache: QueryCache,
  key: CacheKey,
  queryFn: QueryFn<T>,
  options?: QueryOptions,
): { data: T | null; loading: boolean; isFetching: boolean; error: Error | null; refetch: () => Promise<void> } {
  const serializedKey = JSON.stringify(key);

  // Register query function (idempotent -- cache deduplicates internally)
  useEffect(() => {
    cache.registerQueryFn(key, queryFn);
  }, [cache, serializedKey, queryFn]);

  // Set poll interval from options (0 = no polling)
  useEffect(() => {
    cache.setPollInterval(key, options?.pollInterval ?? 0);
  }, [cache, serializedKey, options?.pollInterval]);

  // Subscribe to cache entry via useSyncExternalStore
  const subscribe = useCallback(
    (cb: () => void) => cache.subscribe(key, cb),
    [cache, serializedKey],
  );
  const getSnapshot = useCallback(
    () => cache.getSnapshot<T>(key),
    [cache, serializedKey],
  );
  const getServerSnapshot = useCallback(() => SERVER_SNAPSHOT as CacheSnapshot<T>, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Trigger initial fetch (skipped when enabled === false)
  useEffect(() => {
    if (options?.enabled === false) return;
    cache.ensureFetching(key);
  }, [cache, serializedKey, options?.enabled]);

  const loading = snapshot.data === null && snapshot.status === 'fetching';
  const isFetching = snapshot.status === 'fetching';
  const refetch = useCallback(() => cache.refetch(key), [cache, serializedKey]);

  return { data: snapshot.data as T | null, loading, isFetching, error: snapshot.error, refetch };
}
