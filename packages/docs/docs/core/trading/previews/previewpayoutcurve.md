---
title: "previewPayoutCurve"
sidebar_position: 1
description: "Preview settlement payouts for every possible outcome given a hypothetical belief and collateral."
---

# previewPayoutCurve

**`previewPayoutCurve(client, marketId, belief, collateral, numBuckets, numOutcomes?, options?)`**

**Layer:** L2. Given a hypothetical belief and collateral, previews what the settlement payout would be for every possible outcome. This is how the SDK shows "if the market resolves at X, you'd get Y" curves.

```typescript
async function previewPayoutCurve(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  numBuckets: number,
  numOutcomes?: number,
  options?: { signal?: AbortSignal },
): Promise<PayoutCurve>
```

**Parameters:**

| Parameter     | Type               | Description                                                                     |
| ------------- | ------------------ | ------------------------------------------------------------------------------- |
| `client`      | `FSClient`         | Authenticated API client.                                                       |
| `marketId`    | `string \| number` | The market to preview against.                                                  |
| `belief`      | `BeliefVector`     | The belief vector to simulate. Same format as what you'd pass to `buy`.         |
| `collateral`  | `number`           | The collateral amount to simulate.                                              |
| `numBuckets`  | `number`           | Number of outcome buckets (from `market.config.numBuckets`). Must equal `belief.length - 2`. |
| `numOutcomes` | `number?`          | Number of outcome points to sample. Defaults to server-side default if omitted. |

**Returns `PayoutCurve`:**

```typescript
interface PayoutCurve {
  previews: Array<{
    outcome: number;     // A possible settlement value
    payout: number;      // What you'd receive if the market resolved here
    profitLoss: number;  // payout - collateral (positive = profit, negative = loss)
  }>;
  maxPayout: number;         // Best-case payout across all outcomes
  maxPayoutOutcome: number;  // The outcome value that produces the best payout
  inputCollateral: number;   // Echo of the collateral you passed in
}
```

**Error handling:**

`previewPayoutCurve()` throws on failure. Belief vector validation runs client-side before the network request:

| Cause                                | Error message pattern                                                              | Stage |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ----- |
| Invalid belief vector                | `"Belief vector length X does not match expected numBuckets+2 = Y"`                | Client-side, before network request |
| Non-finite values                    | `"Belief vector contains non-finite values (NaN or Infinity)"`                     | Client-side |
| Negative values                      | `"Belief vector contains negative values"`                                         | Client-side |
| Sum != numBuckets+2                  | `"Belief vector does not sum to numBuckets+2 (sum = X)"`                          | Client-side |
| HTTP error (e.g., 400, 500)          | `"API error: {status} {statusText} on POST /api/views/preview/payout/{marketId}"`  | Server response |
| API-level failure (`success: false`) | `"API error: {message}"` (message from server response)                            | Server response |
| Missing response fields              | `"Missing max_payout in payout curve response"` (or `max_payout_outcome`, `collateral`) | Response parsing |

**How UI components use this:** Every trade panel calls `previewPayoutCurve` on a 500ms debounce after the trader adjusts any input (prediction slider, confidence, collateral amount). The result is written to `ctx.setPreviewPayout(result)`, which the `ConsensusChart` reads to render a payout overlay in its tooltip.

**Example:**

```typescript
const belief = generateGaussian(75, 5, numBuckets, lowerBound, upperBound);
const curve = await previewPayoutCurve(ctx.client, marketId, belief, 100, numBuckets);

console.log(`Best case: $${curve.maxPayout} if outcome = ${curve.maxPayoutOutcome}`);
console.log(`Worst case: $${Math.min(...curve.previews.map(p => p.payout))}`);

// Write to context so the chart renders the payout overlay
ctx.setPreviewPayout(curve);
```
