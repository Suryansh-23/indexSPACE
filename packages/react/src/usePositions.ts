import { useState, useEffect, useCallback, useContext } from 'react';
import { mapPosition } from '@functionspace/core';
import type { Position } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export function usePositions(marketId: string | number, username: string) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('usePositions must be used within FunctionSpaceProvider');

  const [positions, setPositions] = useState<Position[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ctx.client.get<any>('/api/market/positions', {
        market_id: String(marketId),
      });
      const all: Position[] = (data.positions || []).map(mapPosition);
      const filtered = all.filter((p) => p.owner === username);
      setPositions(filtered);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [ctx.client, marketId, username]);

  useEffect(() => {
    fetch();
  }, [fetch, ctx.invalidationCount]);

  return { positions, loading, error, refetch: fetch };
}
