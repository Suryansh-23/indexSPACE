import type { FSClient } from '../client.js';
import type { Position } from '../types.js';

/**
 * Map a raw API position object to the Position type.
 */
export function mapPosition(raw: any): Position {
  return {
    positionId: raw.position_id,
    belief: raw.belief_p,
    collateral: raw.input_collateral_C,
    claims: raw.minted_claims_m,
    owner: raw.username,
    status: raw.status,
    prediction: raw.prediction,
    stdDev: raw.std_dev,
    createdAt: raw.created_at,
    soldPrice: raw.sold_price ?? null,
    settlementPayout: raw.settlement_payout ?? null,
  };
}

/**
 * Returns state of a single position.
 * Wraps: GET /api/market/positions?market_id=X, filtered by positionId
 */
export async function queryPositionState(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<Position> {
  const data = await client.get<any>('/api/market/positions', {
    market_id: String(marketId),
  });

  const raw = data.positions?.find(
    (p: any) => p.position_id === positionId || p.position_id === String(positionId),
  );

  if (!raw) {
    throw new Error(`Position ${positionId} not found in market ${marketId}`);
  }

  return mapPosition(raw);
}
