import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryCache } from '../packages/react/src/cache/QueryCache.js';
import type { CacheKey, CacheSnapshot } from '../packages/react/src/cache/types.js';

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cache?.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Helper: create a queryFn that resolves with given data after a microtask
  function createQueryFn<T>(data: T) {
    return vi.fn((_signal: AbortSignal) => Promise.resolve(data));
  }

  // Helper: create a queryFn that rejects with an error
  function createFailingQueryFn(error: Error) {
    return vi.fn((_signal: AbortSignal) => Promise.reject(error));
  }

  // Helper: flush all pending microtasks
  async function flushMicrotasks() {
    await vi.advanceTimersByTimeAsync(0);
  }

  // ---------------------------------------------------------------------------
  // 1. Subscriber registration and notification
  // ---------------------------------------------------------------------------
  it('1. notifies subscribers when snapshot changes', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn({ id: 1 });
    const callback = vi.fn();

    cache.subscribe(key, callback);
    cache.registerQueryFn(key, queryFn);
    cache.ensureFetching(key);

    // Should notify for fetching status
    await flushMicrotasks();

    // Should have been called: once for 'fetching', once for 'fresh'
    expect(callback.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // 2. Request deduplication (same key, multiple subscribers, one fetch)
  // ---------------------------------------------------------------------------
  it('2. deduplicates requests for the same key with multiple subscribers', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn({ id: 1 });

    cache.registerQueryFn(key, queryFn);

    const cb1 = vi.fn();
    const cb2 = vi.fn();
    cache.subscribe(key, cb1);
    cache.subscribe(key, cb2);

    cache.ensureFetching(key);
    cache.ensureFetching(key); // second call should be a no-op

    await flushMicrotasks();

    // queryFn should only have been called once
    expect(queryFn).toHaveBeenCalledTimes(1);
    // Both subscribers should be notified
    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. Snapshot referential stability
  // ---------------------------------------------------------------------------
  it('3. maintains snapshot referential stability when internal state does not change visible fields', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn({ id: 1 });

    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    const snap1 = cache.getSnapshot(key);
    // Calling getSnapshot again without changes should return same reference
    const snap2 = cache.getSnapshot(key);
    expect(snap1).toBe(snap2);
  });

  // ---------------------------------------------------------------------------
  // 4. Staleness tracking (staleTime respected)
  // ---------------------------------------------------------------------------
  it('4. respects staleTime -- data is fresh within staleTime, stale after', async () => {
    cache = new QueryCache({ staleTime: 5000, revalidateOnFocus: true });
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn({ id: 1 });

    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    expect(queryFn).toHaveBeenCalledTimes(1);
    const snap1 = cache.getSnapshot(key);
    expect(snap1.status).toBe('fresh');

    // handleFocus within staleTime -- should NOT refetch (entry is fresh)
    cache.handleFocus();
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(1);

    // Advance past staleTime
    vi.advanceTimersByTime(6000);

    // handleFocus after staleTime -- should refetch (entry is stale)
    cache.handleFocus();
    await flushMicrotasks();

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // 5. GC after last subscriber leaves
  // ---------------------------------------------------------------------------
  it('5. garbage collects entries after gcTime when last subscriber leaves', async () => {
    cache = new QueryCache({ gcTime: 10000 });
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn({ id: 1 });

    cache.registerQueryFn(key, queryFn);
    const unsub = cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    expect(cache.getSnapshot(key).data).toEqual({ id: 1 });

    // Unsubscribe -- GC timer starts
    unsub();

    // Before GC fires, data should still be accessible
    vi.advanceTimersByTime(5000);
    expect(cache.getSnapshot(key).data).toEqual({ id: 1 });

    // After GC fires, entry should be removed
    vi.advanceTimersByTime(6000); // total 11000 > 10000
    expect(cache.getSnapshot(key).status).toBe('idle');
    expect(cache.getSnapshot(key).data).toBe(null);
  });

  // ---------------------------------------------------------------------------
  // 6. Targeted invalidation (only matching keys refetch)
  // ---------------------------------------------------------------------------
  it('6. invalidate(marketId) only refetches entries with matching key[1]', async () => {
    cache = new QueryCache();
    const key1: CacheKey = ['market', '42'];
    const key2: CacheKey = ['market', '99'];
    const qf1 = createQueryFn('data42');
    const qf2 = createQueryFn('data99');

    cache.registerQueryFn(key1, qf1);
    cache.registerQueryFn(key2, qf2);
    cache.subscribe(key1, () => {});
    cache.subscribe(key2, () => {});
    cache.ensureFetching(key1);
    cache.ensureFetching(key2);
    await flushMicrotasks();

    expect(qf1).toHaveBeenCalledTimes(1);
    expect(qf2).toHaveBeenCalledTimes(1);

    // Invalidate only market 42
    cache.invalidate('42');
    await flushMicrotasks();

    expect(qf1).toHaveBeenCalledTimes(2); // refetched
    expect(qf2).toHaveBeenCalledTimes(1); // untouched
  });

  // ---------------------------------------------------------------------------
  // 7. invalidateAll() refetches everything
  // ---------------------------------------------------------------------------
  it('7. invalidateAll() refetches all entries with subscribers', async () => {
    cache = new QueryCache();
    const key1: CacheKey = ['market', '42'];
    const key2: CacheKey = ['market', '99'];
    const qf1 = createQueryFn('data42');
    const qf2 = createQueryFn('data99');

    cache.registerQueryFn(key1, qf1);
    cache.registerQueryFn(key2, qf2);
    cache.subscribe(key1, () => {});
    cache.subscribe(key2, () => {});
    cache.ensureFetching(key1);
    cache.ensureFetching(key2);
    await flushMicrotasks();

    cache.invalidateAll();
    await flushMicrotasks();

    expect(qf1).toHaveBeenCalledTimes(2);
    expect(qf2).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // 8. Poll timer lifecycle
  // ---------------------------------------------------------------------------
  it('8. poll timer starts, pauses on hidden, resumes on visible, clears on unsubscribe', async () => {
    cache = new QueryCache({ defaultPollInterval: 3000 });
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn('data');

    cache.registerQueryFn(key, queryFn);
    const unsub = cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    expect(queryFn).toHaveBeenCalledTimes(1);

    // Poll should fire after interval
    vi.advanceTimersByTime(3000);
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(2);

    // Pause polling (tab hidden)
    cache.setVisible(false);

    // Poll should NOT fire while hidden
    vi.advanceTimersByTime(6000);
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(2);

    // Resume polling (tab visible)
    cache.setVisible(true);
    vi.advanceTimersByTime(3000);
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(3);

    // Clear on unsubscribe
    unsub();
    vi.advanceTimersByTime(6000);
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(3); // no more polls
  });

  // ---------------------------------------------------------------------------
  // 9. AbortController lifecycle
  // ---------------------------------------------------------------------------
  it('9. aborts in-flight request on invalidate, and on last unsubscribe', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const abortSignals: AbortSignal[] = [];
    const queryFn = vi.fn((signal: AbortSignal) => {
      abortSignals.push(signal);
      return new Promise<string>((resolve) => {
        // Simulate a slow request
        setTimeout(() => resolve('data'), 5000);
      });
    });

    cache.registerQueryFn(key, queryFn);
    const unsub = cache.subscribe(key, () => {});
    cache.ensureFetching(key);

    // Request is in-flight
    expect(abortSignals.length).toBe(1);
    expect(abortSignals[0].aborted).toBe(false);

    // Invalidate should abort and start new request
    cache.invalidate('1');
    expect(abortSignals[0].aborted).toBe(true);
    expect(abortSignals.length).toBe(2);
    expect(abortSignals[1].aborted).toBe(false);

    // Unsubscribe should abort in-flight
    unsub();
    expect(abortSignals[1].aborted).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 10. Focus revalidation
  // ---------------------------------------------------------------------------
  it('10. handleFocus revalidates stale entries, skips fresh ones', async () => {
    cache = new QueryCache({ staleTime: 5000, revalidateOnFocus: true });
    const staleKey: CacheKey = ['market', '1'];
    const freshKey: CacheKey = ['market', '2'];
    const staleQf = createQueryFn('stale-data');
    const freshQf = createQueryFn('fresh-data');

    // Set up stale entry
    cache.registerQueryFn(staleKey, staleQf);
    cache.subscribe(staleKey, () => {});
    cache.ensureFetching(staleKey);
    await flushMicrotasks();

    // Set up fresh entry (fetched just now)
    cache.registerQueryFn(freshKey, freshQf);
    cache.subscribe(freshKey, () => {});
    cache.ensureFetching(freshKey);
    await flushMicrotasks();

    expect(staleQf).toHaveBeenCalledTimes(1);
    expect(freshQf).toHaveBeenCalledTimes(1);

    // Advance past staleTime for both entries
    // (both fetched at same time, so advance past staleTime)
    vi.advanceTimersByTime(6000);

    // Both are now stale since staleTime=5000
    cache.handleFocus();
    await flushMicrotasks();

    expect(staleQf).toHaveBeenCalledTimes(2);
    expect(freshQf).toHaveBeenCalledTimes(2);

    // Reset and test that fresh entries are not refetched
    // Re-fetch both to make them fresh
    await cache.refetch(staleKey);
    await cache.refetch(freshKey);
    await flushMicrotasks();

    const callsBefore1 = staleQf.mock.calls.length;
    const callsBefore2 = freshQf.mock.calls.length;

    // handleFocus immediately after fetch -- both fresh
    cache.handleFocus();
    await flushMicrotasks();

    expect(staleQf.mock.calls.length).toBe(callsBefore1);
    expect(freshQf.mock.calls.length).toBe(callsBefore2);
  });

  // ---------------------------------------------------------------------------
  // 11. Reconnect revalidation
  // ---------------------------------------------------------------------------
  it('11. handleReconnect refetches all entries with subscribers', async () => {
    cache = new QueryCache({ staleTime: 60000, revalidateOnReconnect: true });
    const key1: CacheKey = ['market', '1'];
    const key2: CacheKey = ['market', '2'];
    const qf1 = createQueryFn('data1');
    const qf2 = createQueryFn('data2');

    cache.registerQueryFn(key1, qf1);
    cache.registerQueryFn(key2, qf2);
    cache.subscribe(key1, () => {});
    cache.subscribe(key2, () => {});
    cache.ensureFetching(key1);
    cache.ensureFetching(key2);
    await flushMicrotasks();

    expect(qf1).toHaveBeenCalledTimes(1);
    expect(qf2).toHaveBeenCalledTimes(1);

    // Both are fresh (within staleTime=60s), but reconnect refetches ALL
    cache.handleReconnect();
    await flushMicrotasks();

    expect(qf1).toHaveBeenCalledTimes(2);
    expect(qf2).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // 12. Error handling
  // ---------------------------------------------------------------------------
  it('12. fetch failure sets error state, preserves stale data, polling continues', async () => {
    cache = new QueryCache({ defaultPollInterval: 2000 });
    const key: CacheKey = ['market', '1'];
    let callCount = 0;
    const queryFn = vi.fn((_signal: AbortSignal) => {
      callCount++;
      if (callCount === 1) return Promise.resolve('good-data');
      return Promise.reject(new Error('network error'));
    });

    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    // First fetch succeeds
    const snap1 = cache.getSnapshot<string>(key);
    expect(snap1.data).toBe('good-data');
    expect(snap1.error).toBe(null);
    expect(snap1.status).toBe('fresh');

    // Poll fires and fails
    vi.advanceTimersByTime(2000);
    await flushMicrotasks();

    const snap2 = cache.getSnapshot<string>(key);
    expect(snap2.data).toBe('good-data'); // preserved
    expect(snap2.error).toBeInstanceOf(Error);
    expect(snap2.error?.message).toBe('network error');
    expect(snap2.status).toBe('error');

    // Polling should continue in error state
    vi.advanceTimersByTime(2000);
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(3);
  });

  // ---------------------------------------------------------------------------
  // 13. AbortError is not stored as error state
  // ---------------------------------------------------------------------------
  it('13. AbortError is never stored as error state', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = vi.fn((_signal: AbortSignal) => {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    const callback = vi.fn();
    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, callback);
    cache.ensureFetching(key);
    await flushMicrotasks();

    const snap = cache.getSnapshot(key);
    // AbortError should not set error state
    expect(snap.error).toBe(null);
    // Status should not be 'error' -- it will be 'fetching' since the abort
    // happened during the fetch and was ignored
    expect(snap.status).not.toBe('error');
  });

  // ---------------------------------------------------------------------------
  // 14. ensureFetching deduplication
  // ---------------------------------------------------------------------------
  it('14. multiple ensureFetching calls while in-flight produce one request', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = vi.fn((_signal: AbortSignal) => {
      return new Promise<string>((resolve) => {
        setTimeout(() => resolve('data'), 1000);
      });
    });

    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});

    cache.ensureFetching(key);
    cache.ensureFetching(key);
    cache.ensureFetching(key);

    expect(queryFn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(cache.getSnapshot<string>(key).data).toBe('data');
  });

  // ---------------------------------------------------------------------------
  // 15. destroy() clears all timers and listeners, is idempotent
  // ---------------------------------------------------------------------------
  it('15. destroy() clears all timers and is idempotent', async () => {
    cache = new QueryCache({ defaultPollInterval: 1000, gcTime: 5000 });
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn('data');

    cache.registerQueryFn(key, queryFn);
    const unsub = cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    // Calling destroy twice should not throw
    cache.destroy();
    cache.destroy();

    // Poll timer should not fire after destroy
    vi.advanceTimersByTime(5000);
    await flushMicrotasks();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 16. Destroyed-state guard
  // ---------------------------------------------------------------------------
  it('16. destroy() aborts in-flight and removes listeners; cache remains functional for StrictMode', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn('data');

    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    expect(queryFn).toHaveBeenCalledTimes(1);

    cache.destroy();

    // After destroy, operations still work (no destroyed flag) -- this is
    // required for React StrictMode where child effects re-fire before the
    // parent calls init(). The cache is functional but has no event listeners.
    cache.ensureFetching(key);
    await flushMicrotasks();
    // ensureFetching triggers a new fetch (abortController was cleared by destroy)
    expect(queryFn).toHaveBeenCalledTimes(2);

    // init() re-registers event listeners for StrictMode remount
    cache.init();
  });

  // ---------------------------------------------------------------------------
  // 17. React StrictMode lifecycle
  // ---------------------------------------------------------------------------
  it('17. create, destroy, create -- no leaked timers (StrictMode simulation)', async () => {
    // First mount
    const cache1 = new QueryCache({ defaultPollInterval: 1000 });
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn('data');

    cache1.registerQueryFn(key, queryFn);
    cache1.subscribe(key, () => {});
    cache1.ensureFetching(key);
    await flushMicrotasks();

    // Unmount (StrictMode)
    cache1.destroy();

    // Second mount
    cache = new QueryCache({ defaultPollInterval: 1000 });
    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    const callsAfterSecondMount = queryFn.mock.calls.length;

    // Only the second cache's poll timer should fire
    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    // Should be exactly one more call (from second cache's poll)
    expect(queryFn.mock.calls.length).toBe(callsAfterSecondMount + 1);
  });

  // ---------------------------------------------------------------------------
  // 18. refetch() returns a Promise that resolves when fetch completes
  // ---------------------------------------------------------------------------
  it('18. refetch() returns a Promise that resolves when fetch completes', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = vi.fn((_signal: AbortSignal) => {
      return new Promise<string>((resolve) => {
        setTimeout(() => resolve('refetched'), 500);
      });
    });

    cache.registerQueryFn(key, queryFn);
    cache.subscribe(key, () => {});

    const refetchPromise = cache.refetch(key);

    vi.advanceTimersByTime(500);
    await refetchPromise;

    expect(cache.getSnapshot<string>(key).data).toBe('refetched');
    expect(cache.getSnapshot<string>(key).status).toBe('fresh');
  });

  // ---------------------------------------------------------------------------
  // 19. ensureFetching with no registered queryFn is a no-op
  // ---------------------------------------------------------------------------
  it('19. ensureFetching with no registered queryFn does not throw', () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];

    cache.subscribe(key, () => {});

    // Should not throw
    expect(() => cache.ensureFetching(key)).not.toThrow();
    expect(cache.getSnapshot(key).status).toBe('idle');
  });

  // ---------------------------------------------------------------------------
  // 20. registerQueryFn replaces previous queryFn
  // ---------------------------------------------------------------------------
  it('20. registerQueryFn replaces previous -- latest function used on next fetch', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const firstFn = createQueryFn('first');
    const secondFn = createQueryFn('second');

    cache.subscribe(key, () => {});
    cache.registerQueryFn(key, firstFn);
    cache.ensureFetching(key);
    await flushMicrotasks();

    expect(cache.getSnapshot<string>(key).data).toBe('first');
    expect(firstFn).toHaveBeenCalledTimes(1);

    // Replace queryFn
    cache.registerQueryFn(key, secondFn);
    await cache.refetch(key);
    await flushMicrotasks();

    expect(cache.getSnapshot<string>(key).data).toBe('second');
    expect(secondFn).toHaveBeenCalledTimes(1);
    expect(firstFn).toHaveBeenCalledTimes(1); // never called again
  });

  // ---------------------------------------------------------------------------
  // 21. StrictMode sequence: register, subscribe, ensureFetching, unsubscribe,
  //     register, subscribe, ensureFetching -- no duplicate requests
  // ---------------------------------------------------------------------------
  it('21. StrictMode full sequence does not produce duplicate requests', async () => {
    cache = new QueryCache();
    const key: CacheKey = ['market', '1'];
    const queryFn = vi.fn((_signal: AbortSignal) => {
      return new Promise<string>((resolve) => {
        setTimeout(() => resolve('data'), 100);
      });
    });

    // First mount cycle
    cache.registerQueryFn(key, queryFn);
    const unsub1 = cache.subscribe(key, () => {});
    cache.ensureFetching(key);

    // StrictMode unmount -- unsubscribe (aborts in-flight)
    unsub1();

    // Second mount cycle
    cache.registerQueryFn(key, queryFn);
    const unsub2 = cache.subscribe(key, () => {});
    cache.ensureFetching(key);

    // The first call was aborted on unsubscribe, so ensureFetching starts a new one
    // Total calls should be 2 (first aborted, second active)
    vi.advanceTimersByTime(100);
    await flushMicrotasks();

    const snap = cache.getSnapshot<string>(key);
    expect(snap.data).toBe('data');
    expect(snap.status).toBe('fresh');

    // Only 2 calls total (first aborted, second succeeded)
    expect(queryFn).toHaveBeenCalledTimes(2);

    unsub2();
  });

  // ---------------------------------------------------------------------------
  // Additional: GC cancelled when new subscriber arrives
  // ---------------------------------------------------------------------------
  it('GC timer cancelled when new subscriber arrives before gcTime', async () => {
    cache = new QueryCache({ gcTime: 5000 });
    const key: CacheKey = ['market', '1'];
    const queryFn = createQueryFn('data');

    cache.registerQueryFn(key, queryFn);
    const unsub1 = cache.subscribe(key, () => {});
    cache.ensureFetching(key);
    await flushMicrotasks();

    // Unsubscribe -- GC timer starts
    unsub1();

    // New subscriber before GC fires
    vi.advanceTimersByTime(3000);
    const cb2 = vi.fn();
    cache.subscribe(key, cb2);

    // GC should have been cancelled; data preserved
    vi.advanceTimersByTime(5000);
    expect(cache.getSnapshot<string>(key).data).toBe('data');
  });

  // ---------------------------------------------------------------------------
  // Hardening tests
  // ---------------------------------------------------------------------------
  describe('hardening', () => {
    it('subscribe() works after destroy (StrictMode compatibility)', () => {
      cache = new QueryCache();
      cache.destroy();

      // After destroy, subscribe still works -- StrictMode needs this
      const cb = vi.fn();
      const unsub = cache.subscribe(['market', '1'], cb);
      expect(typeof unsub).toBe('function');
      // Entry is created (cache is functional after destroy)
      expect(cache.getSnapshot(['market', '1']).status).toBe('idle');
      expect(() => unsub()).not.toThrow();
    });

    it('registerQueryFn() works after destroy (StrictMode compatibility)', async () => {
      cache = new QueryCache();
      const key: CacheKey = ['market', '1'];
      const queryFn = createQueryFn('data');

      cache.subscribe(key, () => {});
      cache.destroy();

      // registerQueryFn after destroy works -- StrictMode child effects
      // re-fire before parent calls init()
      cache.registerQueryFn(key, queryFn);
      cache.ensureFetching(key);
      await flushMicrotasks();

      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('destroy() clears poll timers so they do not fire', async () => {
      cache = new QueryCache();
      const key: CacheKey = ['market', '1'];
      const queryFn = createQueryFn('data');

      cache.registerQueryFn(key, queryFn);
      cache.subscribe(key, () => {});
      cache.ensureFetching(key);
      await flushMicrotasks();

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Start polling then destroy
      cache.setPollInterval(key, 1000);
      cache.destroy();

      // Poll timer was cleared by destroy -- no additional fetches
      vi.advanceTimersByTime(5000);
      await flushMicrotasks();

      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it('handleReconnect() aborts in-flight requests before refetching', async () => {
      cache = new QueryCache({ revalidateOnReconnect: true });
      const key: CacheKey = ['market', '1'];
      const abortSignals: AbortSignal[] = [];
      const queryFn = vi.fn((signal: AbortSignal) => {
        abortSignals.push(signal);
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve('data'), 5000);
        });
      });

      cache.registerQueryFn(key, queryFn);
      cache.subscribe(key, () => {});
      cache.ensureFetching(key);

      // Request is in-flight
      expect(abortSignals.length).toBe(1);
      expect(abortSignals[0].aborted).toBe(false);

      // handleReconnect should abort the in-flight request and start a new one
      cache.handleReconnect();

      expect(abortSignals[0].aborted).toBe(true);
      expect(abortSignals.length).toBe(2);
      expect(abortSignals[1].aborted).toBe(false);
    });

    it('notify() does not throw when subscriber callback throws', async () => {
      cache = new QueryCache();
      const key: CacheKey = ['market', '1'];
      const queryFn = createQueryFn('data');

      const throwingCb = () => { throw new Error('subscriber boom'); };
      const normalCb = vi.fn();

      cache.subscribe(key, throwingCb);
      cache.subscribe(key, normalCb);
      cache.registerQueryFn(key, queryFn);

      // ensureFetching triggers notify via updateSnapshot -- should not throw
      expect(() => cache.ensureFetching(key)).not.toThrow();
      await flushMicrotasks();

      // The normal callback should still have been called despite the throwing one
      expect(normalCb).toHaveBeenCalled();
    });

    it('window focus event triggers handleFocus()', async () => {
      cache = new QueryCache({ staleTime: 0, revalidateOnFocus: true });
      const key: CacheKey = ['market', '1'];
      const queryFn = createQueryFn('data');

      cache.registerQueryFn(key, queryFn);
      cache.subscribe(key, () => {});
      cache.ensureFetching(key);
      await flushMicrotasks();

      expect(queryFn).toHaveBeenCalledTimes(1);

      // Advance time so the entry becomes stale (staleTime=0, need > 0ms)
      vi.advanceTimersByTime(1);

      // Dispatch a real window focus event to verify the actual listener wiring
      window.dispatchEvent(new Event('focus'));
      await flushMicrotasks();

      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    it('error is cleared when transitioning to fetching status', async () => {
      cache = new QueryCache();
      const key: CacheKey = ['market', '1'];
      let callCount = 0;
      const queryFn = vi.fn((_signal: AbortSignal) => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('fail'));
        return Promise.resolve('recovered');
      });

      const snapshots: { error: Error | null; status: string }[] = [];
      const callback = () => {
        const snap = cache.getSnapshot<string>(key);
        snapshots.push({ error: snap.error, status: snap.status });
      };

      cache.subscribe(key, callback);
      cache.registerQueryFn(key, queryFn);
      cache.ensureFetching(key);
      await flushMicrotasks();

      // After first fetch (failure): should have gone through fetching (error=null) then error
      expect(snapshots.some(s => s.status === 'error')).toBe(true);

      // Now refetch -- the fetching transition should clear the error
      await cache.refetch(key);
      await flushMicrotasks();

      // Find the fetching snapshot after the error
      const errorIndex = snapshots.findIndex(s => s.status === 'error');
      const fetchingAfterError = snapshots.find((s, i) => i > errorIndex && s.status === 'fetching');
      expect(fetchingAfterError).toBeDefined();
      expect(fetchingAfterError!.error).toBe(null);

      // Final state should be fresh with no error
      const finalSnap = cache.getSnapshot<string>(key);
      expect(finalSnap.status).toBe('fresh');
      expect(finalSnap.data).toBe('recovered');
      expect(finalSnap.error).toBe(null);
    });
  });
});
