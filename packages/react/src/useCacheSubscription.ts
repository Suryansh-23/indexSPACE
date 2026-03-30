import { useSyncExternalStore, useEffect, useCallback, useRef } from 'react';
import type { QueryCache, CacheKey, CacheSnapshot, QueryFn, QueryOptions } from './cache/index.js';

const SERVER_SNAPSHOT: CacheSnapshot = Object.freeze({
  data: null,
  error: null,
  status: 'idle' as const,
});

// Overload: with select transform, data type is U
export function useCacheSubscription<T, U>(
  cache: QueryCache,
  key: CacheKey,
  queryFn: QueryFn<T>,
  options: QueryOptions | undefined,
  select: (data: T) => U,
): { data: U | null; loading: boolean; isFetching: boolean; error: Error | null; refetch: () => Promise<void> };

// Overload: without select, data type is T
export function useCacheSubscription<T>(
  cache: QueryCache,
  key: CacheKey,
  queryFn: QueryFn<T>,
  options?: QueryOptions,
): { data: T | null; loading: boolean; isFetching: boolean; error: Error | null; refetch: () => Promise<void> };

// Implementation
export function useCacheSubscription<T, U = T>(
  cache: QueryCache,
  key: CacheKey,
  queryFn: QueryFn<T>,
  options?: QueryOptions,
  select?: (data: T) => U,
): { data: (T | U) | null; loading: boolean; isFetching: boolean; error: Error | null; refetch: () => Promise<void> } {
  const serializedKey = JSON.stringify(key);

  // Register query function (idempotent -- cache deduplicates internally)
  useEffect(() => {
    cache.registerQueryFn(key, queryFn);
  }, [cache, serializedKey, queryFn]);

  // Set poll interval from options (0 = no polling)
  useEffect(() => {
    cache.setPollInterval(key, options?.pollInterval ?? 0);
  }, [cache, serializedKey, options?.pollInterval]);

  // Set retry config from options (uses cache defaults when not specified)
  useEffect(() => {
    cache.registerRetryConfig(key, options?.retry, options?.retryDelay);
  }, [cache, serializedKey, options?.retry, options?.retryDelay]);

  // Memoization ref for select transform result stability
  const lastRawDataRef = useRef<T | null>(null);
  const lastSelectedRef = useRef<U | null>(null);

  // Track the current subscriber callback for activity management
  const subscriberRef = useRef<(() => void) | null>(null);

  // Subscribe to cache entry via useSyncExternalStore
  const subscribe = useCallback(
    (cb: () => void) => {
      subscriberRef.current = cb;
      const unsub = cache.subscribe(key, cb);
      return () => {
        subscriberRef.current = null;
        unsub();
      };
    },
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

  // Activity tracking: mark subscriber inactive on tab hide, active on tab show
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      const cb = subscriberRef.current;
      if (!cb) return;
      cache.setSubscriberActive(key, cb, document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [cache, serializedKey]);

  const loading = snapshot.data === null && snapshot.status === 'fetching';
  const isFetching = snapshot.status === 'fetching';
  const refetch = useCallback(() => cache.refetch(key), [cache, serializedKey]);

  // Apply select transform with null-data handling and error safety
  let data: (T | U) | null;
  if (select && snapshot.data !== null) {
    // Only recompute if raw data changed referentially
    if (snapshot.data !== lastRawDataRef.current) {
      try {
        lastSelectedRef.current = select(snapshot.data);
      } catch {
        // Select transform threw (e.g., evaluateDensityCurve on bad coefficients).
        // Return null rather than crashing React rendering.
        lastSelectedRef.current = null;
      }
      lastRawDataRef.current = snapshot.data;
    }
    data = lastSelectedRef.current;
  } else if (select) {
    // snapshot.data is null (idle/fetching) -- skip select, return null
    data = null;
  } else {
    data = snapshot.data;
  }

  return { data, loading, isFetching, error: snapshot.error, refetch };
}
