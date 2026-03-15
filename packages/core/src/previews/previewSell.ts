import type { FSClient } from '../client.js';
import type { PreviewSellResult } from '../types.js';

/**
 * Preview sell payout without executing.
 * Wraps: GET /api/views/preview/sell/{marketId}/{positionId}
 */
export async function previewSell(
  client: FSClient,
  positionId: string | number,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<PreviewSellResult> {
  const data = await client.get<any>(
    `/api/views/preview/sell/${marketId}/${positionId}`,
    undefined,
    options?.signal,
  );

  if (data.payout == null) throw new Error('Missing payout in previewSell response');
  if (data.position_id == null) throw new Error('Missing position_id in previewSell response');

  return {
    collateralReturned: data.payout,
    positionId: data.position_id,
  };
}
