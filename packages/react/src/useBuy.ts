import { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { buy } from '@functionspace/core';
import type { BeliefVector, BuyResult, MarketState } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';
import { useQueryCache } from './QueryCacheContext.js';

export interface UseBuyReturn {
  execute: (belief: BeliefVector, collateral: number) => Promise<BuyResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useBuy(marketId: string | number): UseBuyReturn {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useBuy must be used within FunctionSpaceProvider');

  const cache = useQueryCache();
  const { client, invalidate } = ctx;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const clearErrorTimer = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (belief: BeliefVector, collateral: number): Promise<BuyResult> => {
    setLoading(true);
    setError(null);
    clearErrorTimer();
    try {
      const marketSnapshot = cache.getSnapshot<MarketState>(['marketState', String(marketId)]);
      const numBuckets = marketSnapshot.data?.config?.K;
      if (!numBuckets) throw new Error('Market data not loaded. Cannot determine numBuckets for validation.');

      const result = await buy(client, marketId, belief, collateral, numBuckets);
      invalidate(marketId);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      errorTimerRef.current = setTimeout(() => {
        setError(null);
        errorTimerRef.current = null;
      }, 5000);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [client, marketId, cache, invalidate, clearErrorTimer]);

  const reset = useCallback(() => {
    setError(null);
    clearErrorTimer();
  }, [clearErrorTimer]);

  return { execute, loading, error, reset };
}
