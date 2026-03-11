import type { FSClient } from '../client.js';
import type { MarketState, ConsensusSummary, ConsensusCurve } from '../types.js';
import { evaluateDensityPiecewise, evaluateDensityCurve, computeStatistics } from '../math/density.js';

/**
 * Returns complete market state.
 * Wraps: GET /api/market/state?market_id=X
 */
export async function queryMarketState(
  client: FSClient,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<MarketState> {
  const data = await client.get<any>('/api/market/state', {
    market_id: String(marketId),
  }, options?.signal);

  const alphaVector: number[] = data.alpha_vector;
  const totalMass = alphaVector.reduce((a: number, b: number) => a + b, 0);
  const consensus = alphaVector.map((a: number) => a / totalMass);
  const mp = data.market_params;

  return {
    alpha: alphaVector,
    consensus,
    totalMass,
    poolBalance: data.current_pool,
    participantCount: data.num_positions,
    totalVolume: data.total_volume,
    positionsOpen: data.positions_currently_open,
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
    title: data.title,
    xAxisUnits: data.x_axis_units,
    decimals: data.decimals,
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
