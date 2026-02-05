import type { FSClient } from '../client.js';
import type { BeliefVector, PayoutCurve } from '../types.js';

/**
 * Project payouts across all possible outcomes for a hypothetical position.
 * Wraps: POST /api/projection/project_settlement?market_id=X
 */
export async function projectPayoutCurve(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  numOutcomes?: number,
): Promise<PayoutCurve> {
  const body: Record<string, unknown> = {
    belief_vector: belief,
    collateral,
  };
  if (numOutcomes !== undefined) {
    body.num_outcomes = numOutcomes;
  }

  const data = await client.post<any>(
    '/api/projection/project_settlement',
    body,
    { market_id: String(marketId) },
  );

  return {
    projections: data.projections.map((p: any) => ({
      outcome: p.outcome,
      payout: p.payout,
      profitLoss: p.profit_loss,
    })),
    maxPayout: data.max_payout,
    maxPayoutOutcome: data.max_payout_outcome,
    inputCollateral: data.input_collateral,
  };
}
