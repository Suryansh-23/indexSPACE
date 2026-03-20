import { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { previewSell } from '@functionspace/core';
import type { PreviewSellResult } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export interface UsePreviewSellReturn {
  execute: (positionId: number, options?: { signal?: AbortSignal }) => Promise<PreviewSellResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export function usePreviewSell(marketId: string | number): UsePreviewSellReturn {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('usePreviewSell must be used within FunctionSpaceProvider');

  const { client } = ctx;
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

  const execute = useCallback(async (positionId: number, options?: { signal?: AbortSignal }): Promise<PreviewSellResult> => {
    setLoading(true);
    setError(null);
    clearErrorTimer();
    try {
      const result = await previewSell(client, positionId, marketId, { signal: options?.signal });
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
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
  }, [client, marketId, clearErrorTimer]);

  const reset = useCallback(() => {
    setError(null);
    clearErrorTimer();
  }, [clearErrorTimer]);

  return { execute, loading, error, reset };
}
