import type { FSClient } from '../client.js';
import type { PreviewSellResult } from '../types.js';

/**
 * Preview sell payout without executing.
 * Wraps: GET /api/sell/simulate/{positionId}?market_id=X
 */
export async function previewSell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<PreviewSellResult> {
  const data = await client.get<any>(
    `/api/sell/simulate/${positionId}`,
    { market_id: String(marketId) },
    options?.signal,
  );

  return {
    collateralReturned: data.current_value_t_star,
    iterations: data.iterations,
  };
}
