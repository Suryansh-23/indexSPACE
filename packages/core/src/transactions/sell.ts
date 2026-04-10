import type { FSClient } from '../client.js';
import type { SellResult } from '../types.js';

/**
 * Close a position, receive collateral back.
 * Wraps: POST /api/market/trading/sell/{marketId}/{positionId}
 */
export async function sell(
  client: FSClient,
  positionId: string | number,
  marketId: string | number,
): Promise<SellResult> {
  const data = await client.post<any>(
    `/api/market/trading/sell/${marketId}/${positionId}`,
    undefined,
  );

  if (data.payout == null) throw new Error('Missing payout in sell response');
  if (data.position_id == null) throw new Error('Missing position_id in sell response');

  return {
    positionId: data.position_id,
    collateralReturned: data.payout,
    creditedTo: data.credited_to,
  };
}
