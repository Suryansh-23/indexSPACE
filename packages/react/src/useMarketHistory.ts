import { useState, useEffect, useCallback, useContext } from 'react';
import { queryMarketHistory } from '@functionspace/core';
import type { MarketHistory } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export function useMarketHistory(marketId: string | number, options?: { limit?: number }) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarketHistory must be used within FunctionSpaceProvider');

  const [history, setHistory] = useState<MarketHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await queryMarketHistory(ctx.client, marketId, options?.limit);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [ctx.client, marketId, options?.limit]);

  useEffect(() => {
    fetch();
  }, [fetch, ctx.invalidationCount]);

  return { history, loading, error, refetch: fetch };
}
