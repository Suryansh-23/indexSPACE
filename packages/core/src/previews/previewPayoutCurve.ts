import type { FSClient } from '../client.js';
import type { BeliefVector, PayoutCurve } from '../types.js';
import { validateBeliefVector } from '../validation.js';

/**
 * Preview payouts across all possible outcomes for a hypothetical position.
 * Wraps: POST /api/views/preview/payout/{marketId}
 * Body: { collateral, position_type, position_params, num_outcomes? }
 *
 * @param client - The FSClient instance for API communication
 * @param marketId - The market identifier
 * @param belief - Probability distribution across buckets (length numBuckets+1)
 * @param collateral - Amount of collateral to use for the hypothetical position
 * @param numBuckets - The market's num_buckets; belief vector must have length numBuckets+1
 * @param numOutcomes - Optional number of outcome points to compute in the payout curve
 * @param options - Optional request options (e.g. AbortSignal)
 */
export async function previewPayoutCurve(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  numBuckets: number,
  numOutcomes?: number,
  options?: { signal?: AbortSignal },
): Promise<PayoutCurve> {
  validateBeliefVector(belief, numBuckets);

  const body: Record<string, unknown> = {
    collateral,
    position_type: 'raw',
    position_params: { position_vector: belief },
  };
  if (numOutcomes !== undefined) {
    body.num_outcomes = numOutcomes;
  }

  const data = await client.post<any>(
    `/api/views/preview/payout/${marketId}`,
    body,
    undefined,
    options?.signal,
  );

  if (data.max_payout == null) throw new Error('Missing max_payout in payout curve response');
  if (data.max_payout_outcome == null) throw new Error('Missing max_payout_outcome in payout curve response');
  if (data.collateral == null) throw new Error('Missing collateral in payout curve response');

  const projections = data.projections ?? [];
  return {
    // API response uses "projections" -- remapped to "previews" in SDK types
    previews: projections.map((p: any) => ({
      outcome: p.outcome,
      payout: p.payout,
      profitLoss: p.profit_loss,
    })),
    maxPayout: data.max_payout,
    maxPayoutOutcome: data.max_payout_outcome,
    inputCollateral: data.collateral,
  };
}
