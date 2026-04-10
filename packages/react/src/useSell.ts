import { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { sell } from '@functionspace/core';
import type { SellResult } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export interface UseSellReturn {
  execute: (positionId: number) => Promise<SellResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSell(marketId: string | number): UseSellReturn {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useSell must be used within FunctionSpaceProvider');

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

  const execute = useCallback(async (positionId: number): Promise<SellResult> => {
    setLoading(true);
    setError(null);
    clearErrorTimer();
    try {
      const result = await sell(client, positionId, marketId);
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
  }, [client, marketId, invalidate, clearErrorTimer]);

  const reset = useCallback(() => {
    setError(null);
    clearErrorTimer();
  }, [clearErrorTimer]);

  return { execute, loading, error, reset };
}
