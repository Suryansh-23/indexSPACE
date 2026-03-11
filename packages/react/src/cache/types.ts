// Cache key: tuple of strings, always normalized before construction
export type CacheKey = readonly string[];

// What React sees (referentially stable, only replaced when visible fields change)
export interface CacheSnapshot<T = unknown> {
  data: T | null;
  error: Error | null;
  status: 'idle' | 'fetching' | 'fresh' | 'stale' | 'error';
}

// Internal bookkeeping (never exposed to React)
export interface CacheEntry<T = unknown> {
  snapshot: CacheSnapshot<T>;
  dataUpdatedAt: number | null;
  fetchCount: number;
  subscribers: Set<() => void>;
  queryFn: QueryFn<T> | null;
  abortController: AbortController | null;
  pollInterval: number;
  pollTimer: ReturnType<typeof setInterval> | null;
  gcTimer: ReturnType<typeof setTimeout> | null;
}

// Query function signature: receives AbortSignal, returns data
export type QueryFn<T> = (signal: AbortSignal) => Promise<T>;

// Per-hook options (used in Step 2, but type defined here)
export interface QueryOptions {
  pollInterval?: number;
  staleTime?: number;
  enabled?: boolean;
}

// Provider-level configuration
export interface CacheConfig {
  staleTime?: number;
  gcTime?: number;
  defaultPollInterval?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}
