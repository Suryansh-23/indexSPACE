import type { FSClient } from '../client.js';
import type { Position } from '../types.js';

/**
 * Map a raw API position object to the Position type.
 */
export function mapPosition(raw: any): Position {
  return {
    positionId: raw.position_id,
    belief: raw.position_vector,
    collateral: raw.collateral,
    claims: raw.minted_claims,
    owner: raw.username,
    status: raw.status,
    prediction: null,
    stdDev: raw.position_params?.std_dev ?? null,
    positionType: raw.position_type,
    positionParams: raw.position_params ?? {},
    createdAt: raw.created_at,
    closedAt: raw.position_closed_at ?? null,
    soldPrice: raw.sold_price ?? null,
    settlementPayout: raw.settlement_payout ?? null,
  };
}

/**
 * Returns all positions for a market.
 * Wraps: GET /api/views/positions/{market_id}
 */
export async function queryMarketPositions(
  client: FSClient,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<Position[]> {
  const data = await client.get<any>(`/api/views/positions/${marketId}`, undefined, options?.signal);
  return (data.positions || []).map(mapPosition);
}

/**
 * Returns state of a single position.
 * Delegates to queryMarketPositions (L1) and filters by positionId.
 */
export async function queryPositionState(
  client: FSClient,
  positionId: string | number,
  marketId: string | number,
  options?: { signal?: AbortSignal },
): Promise<Position> {
  const positions = await queryMarketPositions(client, marketId, options);
  const match = positions.find(
    (p) => p.positionId === positionId || String(p.positionId) === String(positionId),
  );

  if (!match) {
    throw new Error(`Position ${positionId} not found in market ${marketId}`);
  }

  return match;
}
