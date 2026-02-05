import { useState, useEffect, useCallback, useContext } from 'react';
import { getConsensusCurve } from '@functionspace/core';
import type { ConsensusCurve } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export function useConsensus(marketId: string | number, numPoints?: number) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useConsensus must be used within FunctionSpaceProvider');

  const [consensus, setConsensus] = useState<ConsensusCurve | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConsensusCurve(ctx.client, marketId, numPoints);
      setConsensus(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [ctx.client, marketId, numPoints]);

  useEffect(() => {
    fetch();
  }, [fetch, ctx.invalidationCount]);

  return { consensus, loading, error, refetch: fetch };
}
