import type { FSClient } from '../client.js';
import type { MarketState } from '../types.js';

/**
 * List available markets.
 * Wraps: GET /api/views/markets/list
 */
export async function discoverMarkets(
  client: FSClient,
  options?: { signal?: AbortSignal },
): Promise<MarketState[]> {
  const data = await client.get<any>('/api/views/markets/list', undefined, options?.signal);
  const items = Array.isArray(data.markets) ? data.markets : [];

  return items.map((item: any) => {
    if (item.alpha_vector == null) throw new Error('Missing alpha_vector in market list item');
    const alphaVector: number[] = item.alpha_vector;
    const totalMass = alphaVector.reduce((a: number, b: number) => a + b, 0);
    if (totalMass === 0) throw new Error('alpha_vector sums to zero in market list item');
    const consensus = alphaVector.map((a: number) => a / totalMass);
    const mp = item.market_model_params;
    if (!mp) throw new Error('Missing market_model_params in market list item');

    const numBuckets = item.num_buckets;
    if (numBuckets == null) throw new Error('Missing num_buckets in market list item');
    const lowerBound = item.lower_bound;
    if (lowerBound == null) throw new Error('Missing lower_bound in market list item');
    const upperBound = item.upper_bound;
    if (upperBound == null) throw new Error('Missing upper_bound in market list item');

    return {
      alpha: alphaVector,
      consensus,
      totalMass,
      poolBalance: item.current_pool,
      participantCount: item.total_positions,
      totalVolume: item.total_volume ?? 0,
      positionsOpen: item.open_positions,
      config: {
        numBuckets,
        lowerBound,
        upperBound,
        K: numBuckets,      // deprecated alias
        L: lowerBound,      // deprecated alias
        H: upperBound,      // deprecated alias
        P0: mp.P0,
        mu: mp.mu,
        epsAlpha: mp.eps_alpha,
        tau: mp.tau,
        gamma: mp.gamma,
        lambdaS: mp.lambda_s,
        lambdaD: mp.lambda_d,
      },
      title: item.title,
      xAxisUnits: item.metadata?.x_axis_units ?? '',
      decimals: item.metadata?.decimals ?? 0,
      resolutionState: item.is_settled ? 'resolved' : 'open',
      resolvedOutcome: item.settlement_outcome ?? null,
    };
  });
}
