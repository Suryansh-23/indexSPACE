import type { FSClient } from '../client.js';
import type { BeliefVector, BuyResult } from '../types.js';
import { validateBeliefVector } from '../validation.js';

/**
 * Create a new position.
 * Wraps: POST /api/market/trading/buy/{marketId}
 * Body: { collateral, position_type, position_params }
 *
 * Note: options.prediction is accepted for backward compatibility but is no
 * longer sent to the server.
 */
export async function buy(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  numBuckets: number,
  options?: { prediction?: number },
): Promise<BuyResult> {
  validateBeliefVector(belief, numBuckets);

  const body: Record<string, unknown> = {
    collateral,
    position_type: 'raw',
    position_params: { position_vector: belief },
  };

  const data = await client.post<any>(
    `/api/market/trading/buy/${marketId}`,
    body,
  );

  const pos = data.position;
  if (!pos) throw new Error('Missing position in buy response');
  return {
    positionId: pos.position_id,
    belief: pos.position_vector,
    claims: pos.minted_claims,
    collateral: pos.collateral,
    positionType: pos.position_type,
    positionParams: pos.position_params ?? {},
  };
}
