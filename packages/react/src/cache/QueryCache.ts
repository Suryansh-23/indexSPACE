import type { CacheKey, CacheSnapshot, CacheEntry, QueryFn, CacheConfig, RetryDelayFn } from './types.js';

const IDLE_SNAPSHOT: CacheSnapshot = Object.freeze({
  data: null,
  error: null,
  status: 'idle',
});

function serializeKey(key: CacheKey): string {
  return JSON.stringify(key);
}

// Default exponential backoff: 1s, 2s, 4s, 8s, ... capped at 30s
const DEFAULT_RETRY_DELAY: RetryDelayFn = (attempt: number) =>
  Math.min(1000 * Math.pow(2, attempt), 30_000);

/**
 * Determine whether an error is transient and should be retried.
 * - AbortError: never retry (request was intentionally cancelled)
 * - HTTP 4xx: never retry (client error, not transient)
 * - HTTP 5xx: retry (server error, likely transient)
 * - Network errors (TypeError from fetch): retry
 * - All other errors: retry (assume transient)
 *
 * FSClient throws plain Error with message "API error: <status> <text> on <method> <path>".
 * We parse the status code from the message to classify HTTP errors.
 */
function isRetryable(error: unknown): boolean {
  // AbortError -- never retry
  if (error instanceof DOMException && error.name === 'AbortError') return false;

  if (error instanceof Error) {
    // Parse HTTP status from FSClient error message pattern: "API error: <status> "
    const statusMatch = error.message.match(/^API error: (\d{3}) /);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      // 4xx = client error, not retryable
      if (status >= 400 && status < 500) return false;
      // 5xx = server error, retryable
      return true;
    }
  }

  // Network errors (TypeError from fetch) and all other errors: retryable
  return true;
}

/**
 * Wait for a given duration, but abort early if the signal fires.
 * Returns a promise that resolves to true if the delay completed,
 * or false if it was aborted.
 */
function abortableDelay(ms: number, signal: AbortSignal): Promise<boolean> {
  // Early check: if already aborted, resolve immediately as cancelled
  if (signal.aborted) return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      resolve(false);
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
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
      defaultRetry: config.defaultRetry ?? 0,
      defaultRetryDelay: config.defaultRetryDelay ?? DEFAULT_RETRY_DELAY,
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
    entry.subscriberActivity.set(callback, true);

    // Return unsubscribe function
    return () => {
      entry.subscribers.delete(callback);
      entry.subscriberActivity.delete(callback);

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
      } else {
        // Check if all remaining subscribers are inactive -- pause poll if so
        this.reconcilePollTimer(serialized, entry);
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

  registerRetryConfig(key: CacheKey, retry?: number, retryDelay?: number | RetryDelayFn): void {
    const serialized = serializeKey(key);
    const entry = this.getOrCreateEntry(serialized);
    entry.retryCount = retry ?? this.config.defaultRetry;
    entry.retryDelay = retryDelay ?? this.config.defaultRetryDelay;
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

    if (interval > 0 && entry.subscribers.size > 0 && this.hasActiveSubscriber(entry) && this.visible) {
      this.startPollTimer(serialized, entry);
    }
  }

  /**
   * Mark a subscriber as active (visible) or inactive (backgrounded/hidden).
   * When all subscribers for an entry become inactive, the poll timer pauses.
   * When any subscriber becomes active again, the poll timer resumes.
   */
  setSubscriberActive(key: CacheKey, callback: () => void, active: boolean): void {
    const serialized = serializeKey(key);
    const entry = this.entries.get(serialized);
    if (!entry) return;
    if (!entry.subscriberActivity.has(callback)) return;

    entry.subscriberActivity.set(callback, active);
    this.reconcilePollTimer(serialized, entry);
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
      // Resume poll timers for entries with active subscribers
      for (const [serialized, entry] of this.entries) {
        if (entry.pollInterval > 0 && entry.subscribers.size > 0 && this.hasActiveSubscriber(entry) && entry.pollTimer === null) {
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
        subscriberActivity: new Map(),
        queryFn: null,
        abortController: null,
        pollInterval: this.config.defaultPollInterval,
        pollTimer: null,
        gcTimer: null,
        retryCount: this.config.defaultRetry,
        retryDelay: this.config.defaultRetryDelay,
      };
      this.entries.set(serialized, entry);
    }
    return entry;
  }

  private hasActiveSubscriber(entry: CacheEntry): boolean {
    for (const active of entry.subscriberActivity.values()) {
      if (active) return true;
    }
    return false;
  }

  /**
   * Start or stop the poll timer based on whether any subscriber is active.
   * Called when subscriber activity changes or on unsubscribe.
   */
  private reconcilePollTimer(serialized: string, entry: CacheEntry): void {
    const shouldPoll = entry.pollInterval > 0 &&
      entry.subscribers.size > 0 &&
      this.hasActiveSubscriber(entry) &&
      this.visible;

    if (shouldPoll && entry.pollTimer === null) {
      this.startPollTimer(serialized, entry);
    } else if (!shouldPoll && entry.pollTimer !== null) {
      this.clearPollTimer(entry);
    }
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

  private resolveDelay(entry: CacheEntry, attempt: number): number {
    const delay = entry.retryDelay;
    return typeof delay === 'function' ? delay(attempt) : delay;
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

    const maxAttempts = entry.retryCount + 1; // retryCount=3 means 1 initial + 3 retries = 4 attempts

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

        // Start poll timer if configured, has active subscribers, and visible
        if (entry.pollInterval > 0 && entry.subscribers.size > 0 && this.hasActiveSubscriber(entry) && this.visible && entry.pollTimer === null) {
          this.startPollTimer(serialized, entry);
        }
        return; // Success -- exit retry loop
      } catch (err: unknown) {
        // Guard: if this controller was aborted, ignore the error
        if (controller.signal.aborted) return;

        // Check if this is an AbortError -- never store as error state
        if (err instanceof DOMException && err.name === 'AbortError') return;

        const isLastAttempt = attempt >= maxAttempts - 1;

        // If not retryable or last attempt, transition to error state
        if (!isRetryable(err) || isLastAttempt) {
          entry.abortController = null;

          const error = err instanceof Error ? err : new Error(String(err));
          this.updateSnapshot(entry, {
            data: entry.snapshot.data, // preserve previous data
            error,
            status: 'error',
          });

          // Continue poll timer in error state
          if (entry.pollInterval > 0 && entry.subscribers.size > 0 && this.hasActiveSubscriber(entry) && this.visible && entry.pollTimer === null) {
            this.startPollTimer(serialized, entry);
          }
          return;
        }

        // Retryable error with attempts remaining -- wait with backoff
        const delayMs = this.resolveDelay(entry, attempt);
        const completed = await abortableDelay(delayMs, controller.signal);

        // If the delay was aborted, stop retrying
        if (!completed) return;
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
