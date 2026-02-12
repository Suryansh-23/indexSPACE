import { useContext, useMemo } from 'react';
import { calculateBucketDistribution } from '@functionspace/core';
import type { BucketData } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';
import { useConsensus } from './useConsensus.js';
import { useMarket } from './useMarket.js';

/**
 * Hook that computes probability bucket distribution from consensus data.
 * Derives from useConsensus + useMarket — no additional API calls.
 */
export function useBucketDistribution(
  marketId: string | number,
  numBuckets: number = 12,
  numPoints: number = 200,
) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useBucketDistribution must be used within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { consensus, loading, error, refetch } = useConsensus(marketId, numPoints);

  const buckets = useMemo<BucketData[] | null>(() => {
    if (!consensus || !market) return null;
    const { L, H } = market.config;
    return calculateBucketDistribution(
      consensus.points,
      L,
      H,
      numBuckets,
      market.decimals,
    );
  }, [consensus, market, numBuckets, ctx.invalidationCount]);

  return { buckets, loading, error, refetch };
}
