---
title: "Buy"
sidebar_position: 1
description: "Open a new position by posting a validated belief vector and collateral to a market."
---

# Buy

**`buy(client, marketId, belief, collateral, numBuckets, options?)`**

**Layer:** L1. Opens a new position by posting a belief vector and collateral amount to the market.

```typescript
async function buy(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
  numBuckets: number,
  options?: { prediction?: number },
): Promise<BuyResult>
```

**Parameters:**

| Parameter            | Type               | Description                                                                                                                                    |
| -------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `client`             | `FSClient`         | Authenticated API client. In React, access via `useContext(FunctionSpaceContext).client` or use a trading widget that handles this internally. |
| `marketId`           | `string \| number` | The market to trade in.                                                                                                                        |
| `belief`             | `BeliefVector`     | The probability distribution to trade on. Generated with `generateBelief` or any convenience generator.                                        |
| `collateral`         | `number`           | Amount of currency to put up. Minimum is typically 1.                                                                                          |
| `numBuckets`         | `number`           | Number of outcome buckets (from `market.config.numBuckets`). Must equal `belief.length - 1`.                                                          |
| `options.prediction` | `number?`          | Optional center-of-mass hint. Accepted for backward compatibility but no longer sent to the server. |

**Returns `BuyResult`:**

```typescript
interface BuyResult {
  positionId: string | number;              // Unique ID for the new position
  belief: number[];                         // The belief vector as stored server-side
  claims: number;                           // Number of claim tokens minted
  collateral: number;                       // Collateral amount locked
  positionType?: string;                    // Position type ("raw", "normal", etc.)
  positionParams?: Record<string, unknown>; // Type-specific parameters
}
```

**Example (standalone core usage):**

```typescript
import { FSClient, loginUser, buy, generateGaussian, queryMarketState } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
await loginUser(client, 'user', 'pass');

const market = await queryMarketState(client, 42);
const { numBuckets, lowerBound, upperBound } = market.config;
const belief = generateGaussian(75, 5, numBuckets, lowerBound, upperBound);

const result = await buy(client, 42, belief, 100, numBuckets);
console.log(`Opened position ${result.positionId}, claims: ${result.claims}`);
```

**Example (inside a React component):**

```typescript
const ctx = useContext(FunctionSpaceContext);
const { market } = useMarket(marketId);
const { numBuckets, lowerBound, upperBound } = market.config;

const belief = generateGaussian(75, 5, numBuckets, lowerBound, upperBound);
const result = await buy(ctx.client, marketId, belief, 100, numBuckets, { prediction: 75 });

// After a successful buy, invalidate so other components (charts, position tables) refetch
ctx.invalidate(marketId);
```

**Error handling:**

`buy()` throws on failure. The error message varies by cause:

| Cause                                | Error message pattern                                                          | Stage |
| ------------------------------------ | ------------------------------------------------------------------------------ | ----- |
| Invalid belief vector                | `"Belief vector length X does not match expected numBuckets+1 = Y"`            | Client-side, before network request |
| Non-finite values                    | `"Belief vector contains non-finite values (NaN or Infinity)"`                 | Client-side |
| Negative values                      | `"Belief vector contains negative values"`                                     | Client-side |
| Sum != 1.0                           | `"Belief vector does not sum to 1.0 (sum = X)"`                               | Client-side |
| Not authenticated (guest mode)       | `"Authentication required. Please sign in to perform this action."`            | Client-side |
| HTTP error (e.g., 400, 500)          | `"API error: {status} {statusText} on POST /api/market/trading/buy/{marketId}"` | Server response |
| API-level failure (`success: false`) | `"API error: {message}"` (message from server response)                        | Server response |
| 401 (expired token)                  | Auto-retries once by re-authenticating. If retry fails, throws the HTTP error. | Server response |

Always wrap `buy()` in a try/catch. The SDK's trading UI widgets handle this internally -- they catch errors, display them inline, and reset state.
