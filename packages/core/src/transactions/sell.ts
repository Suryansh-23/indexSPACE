import type { FSClient } from '../client.js';
import type { SellResult } from '../types.js';

/**
 * Close a position, receive collateral back.
 * Wraps: POST /api/sell/execute/{positionId}?market_id=X
 */
export async function sell(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<SellResult> {
  const data = await client.post<any>(
    `/api/sell/execute/${positionId}`,
    undefined,
    { market_id: String(marketId) },
  );

  return {
    positionId: data.position_id,
    collateralReturned: data.collateral_paid_t_star,
  };
}
