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
    closedAt: raw.position_closed_at ?? null,
    soldPrice: raw.sold_price ?? null,
    settlementPayout: raw.settlement_payout ?? null,
  };
}

/**
 * Returns all positions for a market.
 * Wraps: GET /api/market/positions?market_id=X
 */
export async function queryMarketPositions(
  client: FSClient,
  marketId: string | number,
): Promise<Position[]> {
  const data = await client.get<any>('/api/market/positions', {
    market_id: String(marketId),
  });
  return (data.positions || []).map(mapPosition);
}

/**
 * Returns state of a single position.
 * Delegates to queryMarketPositions (L1) and filters by positionId.
 */
export async function queryPositionState(
  client: FSClient,
  positionId: number,
  marketId: string | number,
): Promise<Position> {
  const positions = await queryMarketPositions(client, marketId);
  const match = positions.find(
    (p) => p.positionId === positionId || String(p.positionId) === String(positionId),
  );

  if (!match) {
    throw new Error(`Position ${positionId} not found in market ${marketId}`);
  }

  return match;
}
