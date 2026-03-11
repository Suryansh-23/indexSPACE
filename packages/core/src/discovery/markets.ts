import type { FSClient } from '../client.js';
import type { MarketState } from '../types.js';

/**
 * List available markets.
 * Wraps: GET /api/markets
 */
export async function discoverMarkets(
  client: FSClient,
  options?: { signal?: AbortSignal },
): Promise<MarketState[]> {
  const data = await client.get<any[]>('/api/markets', undefined, options?.signal);

  return data.map((item: any) => {
    const alphaVector: number[] = item.alpha_vector;
    const totalMass = alphaVector.reduce((a: number, b: number) => a + b, 0);
    const consensus = alphaVector.map((a: number) => a / totalMass);
    const mp = item.market_params;

    return {
      alpha: alphaVector,
      consensus,
      totalMass,
      poolBalance: item.current_pool,
      participantCount: item.num_positions,
      totalVolume: item.total_volume,
      positionsOpen: item.positions_currently_open,
      config: {
        K: mp.K,
        L: mp.L,
        H: mp.H,
        P0: mp.P0,
        mu: mp.mu,
        epsAlpha: mp.eps_alpha,
        tau: mp.tau,
        gamma: mp.gamma,
        lambdaS: mp.lambda_s,
        lambdaD: mp.lambda_d,
      },
      title: item.title,
      xAxisUnits: item.x_axis_units,
      decimals: item.decimals,
      resolutionState: item.is_settled ? 'resolved' : 'open',
      resolvedOutcome: item.settlement_outcome ?? null,
    };
  });
}
