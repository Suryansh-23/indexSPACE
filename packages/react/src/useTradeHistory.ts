import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { queryTradeHistory } from '@functionspace/core';
import type { TradeEntry } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export function useTradeHistory(
  marketId: string | number,
  options?: { limit?: number; pollInterval?: number },
) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useTradeHistory must be used within FunctionSpaceProvider');

  const limit = options?.limit ?? 100;
  const pollInterval = options?.pollInterval ?? 0;

  const [trades, setTrades] = useState<TradeEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryTradeHistory(ctx.client, marketId, { limit });
      if (!mountedRef.current) return;
      setTrades(result);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [ctx.client, marketId, limit]);

  // Fetch on mount and when invalidationCount changes
  useEffect(() => {
    fetch();
  }, [fetch, ctx.invalidationCount]);

  // Optional polling
  useEffect(() => {
    if (pollInterval <= 0) return;
    const interval = setInterval(fetch, pollInterval);
    return () => clearInterval(interval);
  }, [fetch, pollInterval]);

  return { trades, loading, error, refetch: fetch };
}
