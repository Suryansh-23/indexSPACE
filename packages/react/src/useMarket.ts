import { useState, useEffect, useCallback, useContext } from 'react';
import { queryMarketState } from '@functionspace/core';
import type { MarketState } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export function useMarket(marketId: string | number) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarket must be used within FunctionSpaceProvider');

  const [market, setMarket] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await queryMarketState(ctx.client, marketId);
      setMarket(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [ctx.client, marketId]);

  useEffect(() => {
    fetch();
  }, [fetch, ctx.invalidationCount]);

  return { market, loading, error, refetch: fetch };
}
