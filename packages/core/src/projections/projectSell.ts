import type { FSClient } from '../client.js';
import type { ProjectSellResult } from '../types.js';

/**
 * Preview sell payout without executing.
 * Wraps: GET /api/sell/simulate/{positionId}?market_id=X
 */
export async function projectSell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<ProjectSellResult> {
  const data = await client.get<any>(
    `/api/sell/simulate/${positionId}`,
    { market_id: String(marketId) },
  );

  return {
    collateralReturned: data.current_value_t_star,
    iterations: data.iterations,
  };
}
