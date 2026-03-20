import { useContext, useState, useMemo, useCallback } from 'react';
import { calculateBucketDistribution, computePercentiles } from '@functionspace/core';
import type { BucketData, MarketState, PercentileSet } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';
import { useMarket } from './useMarket.js';
import { useConsensus } from './useConsensus.js';

// ── Config ──

export interface DistributionStateConfig {
  defaultBucketCount?: number;  // Default 12, clamped to [2, 50]
}

// ── Return type ──

export interface DistributionState {
  // Market data (pass-through from useMarket)
  market: MarketState | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;

  // Bucket configuration (shared, settable)
  bucketCount: number;
  setBucketCount: (n: number) => void;

  // Pre-computed: full-range [L, H] buckets with consensus probabilities
  buckets: BucketData[] | null;

  // Consensus percentiles (for auto mode, fan charts, etc.)
  percentiles: PercentileSet | null;

  // Helper: compute buckets over a custom sub-range
  getBucketsForRange: (min: number, max: number) => BucketData[];
}

// ── Hook ──

export function useDistributionState(
  marketId: string | number,
  config?: DistributionStateConfig,
): DistributionState {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useDistributionState must be used within FunctionSpaceProvider');

  const defaultCount = Math.max(2, Math.min(50, config?.defaultBucketCount ?? 12));
  const [bucketCount, setBucketCountRaw] = useState(defaultCount);

  const setBucketCount = useCallback((n: number) => {
    setBucketCountRaw(Math.max(2, Math.min(50, n)));
  }, []);

  const { market, loading: marketLoading, error: marketError, refetch: marketRefetch } = useMarket(marketId);
  const { consensus, loading: consensusLoading, error: consensusError, refetch: consensusRefetch } = useConsensus(marketId);

  const loading = marketLoading || consensusLoading;
  const error = marketError || consensusError;

  const refetch = useCallback(async () => {
    await Promise.all([marketRefetch(), consensusRefetch()]);
  }, [marketRefetch, consensusRefetch]);

  // Full-range buckets [L, H]
  const buckets = useMemo<BucketData[] | null>(() => {
    if (!consensus || !market) return null;
    const { L, H } = market.config;
    return calculateBucketDistribution(
      consensus.points,
      L,
      H,
      bucketCount,
      market.decimals,
    );
  }, [consensus, market, bucketCount]);

  // Percentiles from coefficient vector
  const percentiles = useMemo<PercentileSet | null>(() => {
    if (!market || !market.consensus) return null;
    const { L, H } = market.config;
    return computePercentiles(market.consensus, L, H);
  }, [market]);

  // Helper: compute buckets over a custom sub-range
  const getBucketsForRange = useCallback((min: number, max: number): BucketData[] => {
    if (!consensus || !market) return [];
    return calculateBucketDistribution(
      consensus.points,
      min,
      max,
      bucketCount,
      market.decimals,
    );
  }, [consensus, market, bucketCount]);

  return {
    market,
    loading,
    error,
    refetch,
    bucketCount,
    setBucketCount,
    buckets,
    percentiles,
    getBucketsForRange,
  };
}
