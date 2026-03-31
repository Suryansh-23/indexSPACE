import type { CacheKey, CacheSnapshot, CacheEntry, QueryFn, CacheConfig } from './types.js';

const IDLE_SNAPSHOT: CacheSnapshot = Object.freeze({
  data: null,
  error: null,
  status: 'idle',
});

function serializeKey(key: CacheKey): string {
  return JSON.stringify(key);
}

export class QueryCache {
  private entries = new Map<string, CacheEntry>();
  private config: Required<CacheConfig>;
  private visible = true;

  constructor(config: CacheConfig = {}) {
    this.config = {
      staleTime: config.staleTime ?? 0,
      gcTime: config.gcTime ?? 300_000,
      defaultPollInterval: config.defaultPollInterval ?? 0,
      revalidateOnFocus: config.revalidateOnFocus ?? true,
      revalidateOnReconnect: config.revalidateOnReconnect ?? true,
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleReconnectEvent);
      window.addEventListener('focus', this.handleFocusEvent);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  subscribe(key: CacheKey, callback: () => void): () => void {
    const serialized = serializeKey(key);
    const entry = this.getOrCreateEntry(serialized);

    // Cancel any pending GC -- a subscriber arrived
    if (entry.gcTimer !== null) {
      clearTimeout(entry.gcTimer);
      entry.gcTimer = null;
    }

    entry.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      entry.subscribers.delete(callback);

      if (entry.subscribers.size === 0) {
        // Last subscriber left -- clear poll timer immediately
        this.clearPollTimer(entry);

        // Abort in-flight request if nobody is listening
        if (entry.abortController !== null) {
          entry.abortController.abort();
          entry.abortController = null;
        }

        // Start GC countdown
        entry.gcTimer = setTimeout(() => {
          this.entries.delete(serialized);
        }, this.config.gcTime);
      }
    };
  }

  getSnapshot<T>(key: CacheKey): CacheSnapshot<T> {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry) return IDLE_SNAPSHOT as CacheSnapshot<T>;
    return entry.snapshot as CacheSnapshot<T>;
  }

  registerQueryFn<T>(key: CacheKey, queryFn: QueryFn<T>): void {
    const serialized = serializeKey(key);
    const entry = this.getOrCreateEntry(serialized);
    entry.queryFn = queryFn as QueryFn<unknown>;
  }

  ensureFetching(key: CacheKey): void {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry) return;

    // No queryFn registered -- no-op
    if (!entry.queryFn) return;

    // Already in-flight -- deduplicate
    if (entry.abortController !== null) return;

    this.executeFetch(serialized, entry);
  }

  async refetch(key: CacheKey): Promise<void> {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry || !entry.queryFn) return;

    // Abort current request if any
    if (entry.abortController !== null) {
      entry.abortController.abort();
      entry.abortController = null;
    }

    await this.executeFetch(serialized, entry);
  }

  setPollInterval(key: CacheKey, interval: number): void {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry) return;

    entry.pollInterval = interval;
    this.clearPollTimer(entry);

    if (interval > 0 && entry.subscribers.size > 0 && this.visible) {
      this.startPollTimer(serialized, entry);
    }
  }

  invalidate(marketId: string): void {
    for (const [serialized, entry] of this.entries) {
      const key: CacheKey = JSON.parse(serialized);
      if (key.length > 1 && key[1] === marketId) {
        // Abort in-flight request
        if (entry.abortController !== null) {
          entry.abortController.abort();
          entry.abortController = null;
        }
        // Mark stale and refetch
        this.updateSnapshot(entry, { ...entry.snapshot, status: 'stale' });
        if (entry.subscribers.size > 0) {
          this.ensureFetchingInternal(serialized, entry);
        }
      }
    }
  }

  invalidateAll(): void {
    for (const [serialized, entry] of this.entries) {
      // Abort in-flight request
      if (entry.abortController !== null) {
        entry.abortController.abort();
        entry.abortController = null;
      }
      // Mark stale and refetch
      this.updateSnapshot(entry, { ...entry.snapshot, status: 'stale' });
      if (entry.subscribers.size > 0) {
        this.ensureFetchingInternal(serialized, entry);
      }
    }
  }

  handleFocus(): void {
    if (!this.config.revalidateOnFocus) return;

    for (const [serialized, entry] of this.entries) {
      if (entry.subscribers.size > 0 && this.isStale(entry)) {
        this.ensureFetchingInternal(serialized, entry);
      }
    }
  }

  handleReconnect(): void {
    if (!this.config.revalidateOnReconnect) return;

    for (const [serialized, entry] of this.entries) {
      if (entry.subscribers.size > 0) {
        if (entry.abortController !== null) {
          entry.abortController.abort();
          entry.abortController = null;
        }
        this.ensureFetchingInternal(serialized, entry);
      }
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;

    if (visible) {
      // Resume poll timers for entries with subscribers
      for (const [serialized, entry] of this.entries) {
        if (entry.pollInterval > 0 && entry.subscribers.size > 0 && entry.pollTimer === null) {
          this.startPollTimer(serialized, entry);
        }
      }
    } else {
      // Pause all poll timers (but don't abort in-flight requests)
      for (const [, entry] of this.entries) {
        this.clearPollTimer(entry);
      }
    }
  }

  /**
   * Re-register event listeners after destroy(). Handles React StrictMode
   * which runs effect cleanup (destroy) then re-runs effects (init).
   * Safe to call multiple times -- addEventListener deduplicates.
   */
  init(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleReconnectEvent);
      window.addEventListener('focus', this.handleFocusEvent);
    }
  }

  /**
   * Clean up event listeners, timers, and in-flight requests.
   * Does NOT prevent future operations -- after destroy(), the cache
   * still works if re-used (entries, queryFns, subscribers persist).
   * This is intentional for React StrictMode compatibility where
   * child effects re-register before the parent calls init().
   */
  destroy(): void {
    // Clear all timers and abort all controllers
    for (const [, entry] of this.entries) {
      this.clearPollTimer(entry);
      if (entry.gcTimer !== null) {
        clearTimeout(entry.gcTimer);
        entry.gcTimer = null;
      }
      if (entry.abortController !== null) {
        entry.abortController.abort();
        entry.abortController = null;
      }
    }

    // Remove event listeners with SSR guards
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleReconnectEvent);
      window.removeEventListener('focus', this.handleFocusEvent);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getOrCreateEntry(serialized: string): CacheEntry {
    let entry = this.entries.get(serialized);
    if (!entry) {
      entry = {
        snapshot: { data: null, error: null, status: 'idle' },
        dataUpdatedAt: null,
        fetchCount: 0,
        subscribers: new Set(),
        queryFn: null,
        abortController: null,
        pollInterval: this.config.defaultPollInterval,
        pollTimer: null,
        gcTimer: null,
      };
      this.entries.set(serialized, entry);
    }
    return entry;
  }

  private isStale(entry: CacheEntry): boolean {
    if (entry.dataUpdatedAt === null) return true;
    return Date.now() - entry.dataUpdatedAt > this.config.staleTime;
  }

  private updateSnapshot<T>(entry: CacheEntry<T>, next: CacheSnapshot<T>): void {
    const prev = entry.snapshot;
    // Only replace if visible fields changed (referential stability)
    if (prev.data === next.data && prev.error === next.error && prev.status === next.status) {
      return;
    }
    entry.snapshot = next;
    this.notify(entry);
  }

  private notify(entry: CacheEntry): void {
    for (const cb of entry.subscribers) {
      try { cb(); } catch { /* subscriber error should not break cache */ }
    }
  }

  private async executeFetch(serialized: string, entry: CacheEntry): Promise<void> {
    if (!entry.queryFn) return;

    const controller = new AbortController();
    entry.abortController = controller;
    entry.fetchCount++;

    // Set status to fetching
    this.updateSnapshot(entry, {
      data: entry.snapshot.data,
      error: null,
      status: 'fetching',
    });

    try {
      const data = await entry.queryFn(controller.signal);

      // Guard: if this controller was aborted (replaced or cancelled), ignore result
      if (controller.signal.aborted) return;

      entry.abortController = null;
      entry.dataUpdatedAt = Date.now();

      this.updateSnapshot(entry, {
        data,
        error: null,
        status: 'fresh',
      });

      // Start poll timer if configured and has subscribers
      if (entry.pollInterval > 0 && entry.subscribers.size > 0 && this.visible && entry.pollTimer === null) {
        this.startPollTimer(serialized, entry);
      }
    } catch (err: unknown) {
      // Guard: if this controller was aborted, ignore the error
      if (controller.signal.aborted) return;

      // Check if this is an AbortError -- never store as error state
      if (err instanceof DOMException && err.name === 'AbortError') return;

      entry.abortController = null;

      const error = err instanceof Error ? err : new Error(String(err));
      this.updateSnapshot(entry, {
        data: entry.snapshot.data, // preserve previous data
        error,
        status: 'error',
      });

      // Continue poll timer in error state
      if (entry.pollInterval > 0 && entry.subscribers.size > 0 && this.visible && entry.pollTimer === null) {
        this.startPollTimer(serialized, entry);
      }
    }
  }

  private ensureFetchingInternal(serialized: string, entry: CacheEntry): void {
    if (!entry.queryFn) return;
    if (entry.abortController !== null) return;
    this.executeFetch(serialized, entry);
  }

  private startPollTimer(serialized: string, entry: CacheEntry): void {
    entry.pollTimer = setInterval(() => {
      this.ensureFetchingInternal(serialized, entry);
    }, entry.pollInterval);
  }

  private clearPollTimer(entry: CacheEntry): void {
    if (entry.pollTimer !== null) {
      clearInterval(entry.pollTimer);
      entry.pollTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers (bound as arrow functions for correct `this` context)
  // ---------------------------------------------------------------------------

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;

    if (document.visibilityState === 'hidden') {
      this.setVisible(false);
    } else if (document.visibilityState === 'visible') {
      this.setVisible(true);
      this.handleFocus();
    }
  };

  private handleFocusEvent = (): void => {
    this.handleFocus();
  };

  private handleReconnectEvent = (): void => {
    this.handleReconnect();
  };
}
