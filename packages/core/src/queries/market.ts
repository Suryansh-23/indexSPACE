import type { FSClient } from '../client.js';
import type { MarketState, ConsensusSummary, ConsensusCurve } from '../types.js';
import { evaluateDensityPiecewise, evaluateDensityCurve, computeStatistics } from '../math/density.js';

/**
 * Returns complete market state.
 * Wraps: GET /api/views/markets/{market_id}
 */
export async function queryMarketState(
  client: FSClient,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<MarketState> {
  const data = await client.get<any>(`/api/views/markets/${marketId}`, undefined, options?.signal);

  const alphaVector: number[] = data.alpha_vector;
  const totalMass = alphaVector.reduce((a: number, b: number) => a + b, 0);
  const consensus = alphaVector.map((a: number) => a / totalMass);
  const mp = data.market_model_params;

  const K = data.num_buckets;
  if (K == null) throw new Error('Missing num_buckets (K) in market response');
  const L = data.metadata?.lower_bound ?? data.lower_bound;
  if (L == null) throw new Error('Missing lower_bound (L) in market response');
  const H = data.metadata?.upper_bound ?? data.upper_bound;
  if (H == null) throw new Error('Missing upper_bound (H) in market response');

  return {
    alpha: alphaVector,
    consensus,
    totalMass,
    poolBalance: data.current_pool,
    participantCount: data.num_positions,
    totalVolume: data.total_volume,
    positionsOpen: data.positions_currently_open,
    config: {
      K,
      L,
      H,
      P0: mp.P0,
      mu: mp.mu,
      epsAlpha: mp.eps_alpha,
      tau: mp.tau,
      gamma: mp.gamma,
      lambdaS: mp.lambda_s,
      lambdaD: mp.lambda_d,
    },
    title: data.metadata?.title ?? data.title,
    xAxisUnits: data.metadata?.x_axis_units ?? data.x_axis_units ?? '',
    decimals: data.metadata?.decimals ?? data.decimals ?? 0,
    resolutionState: data.is_settled ? 'resolved' : 'open',
    resolvedOutcome: data.settlement_outcome ?? null,
  };
}

/**
 * Returns the consensus PDF as a renderable curve.
 * Routes through queryMarketState, then evaluates client-side.
 */
export async function getConsensusCurve(
  client: FSClient,
  marketId: string | number,
  numPoints: number = 200,
  options?: { signal?: AbortSignal },
): Promise<ConsensusCurve> {
  const market = await queryMarketState(client, marketId, options);
  const points = evaluateDensityCurve(
    market.consensus,
    market.config.L,
    market.config.H,
    numPoints,
  );
  return { points, config: market.config };
}

/**
 * Returns statistical summary of consensus distribution.
 * Computed client-side from consensus coefficients.
 */
export async function queryConsensusSummary(
  client: FSClient,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<ConsensusSummary> {
  const market = await queryMarketState(client, marketId, options);
  return computeStatistics(market.consensus, market.config.L, market.config.H);
}

/**
 * Returns probability density at a specific point on the consensus PDF.
 */
export async function queryDensityAt(
  client: FSClient,
  marketId: string | number,
  x: number,
  options?: { signal?: AbortSignal },
): Promise<{ x: number; density: number }> {
  const market = await queryMarketState(client, marketId, options);
  const density = evaluateDensityPiecewise(
    market.consensus,
    x,
    market.config.L,
    market.config.H,
  );
  return { x, density };
}
