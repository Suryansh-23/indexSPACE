import type { FSClient } from '../client.js';
import type { BeliefVector, BuyResult } from '../types.js';

/**
 * Create a new position.
 * Wraps: POST /api/market/buy?market_id=X
 * Body: { C: collateral, p_vector: belief, prediction: center }
 */
export async function buy(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  options?: { prediction?: number },
): Promise<BuyResult> {
  const body: Record<string, unknown> = {
    C: collateral,
    p_vector: belief,
  };
  if (options?.prediction !== undefined) {
    body.prediction = options.prediction;
  }

  const data = await client.post<any>('/api/market/buy', body, {
    market_id: String(marketId),
  });

  const pos = data.position;
  return {
    positionId: pos.position_id,
    belief: pos.belief_p,
    claims: pos.minted_claims_m,
    collateral: pos.input_collateral_C,
  };
}
