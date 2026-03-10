---
title: "Buy"
sidebar_position: 1
---

# Buy

**`buy(client, marketId, belief, collateral, options?)`**

**Layer:** L1. Opens a new position by posting a belief vector and collateral amount to the market.

```typescript
async function buy(
  client: FSClient,
  marketId: string | number,
  belief: BeliefVector,
  collateral: number,
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
| `options.prediction` | `number?`          | Optional center-of-mass hint for the API. UI components pass the trader's target outcome value here. Not required for the trade to execute.    |

**Returns `BuyResult`:**

```typescript
interface BuyResult {
  positionId: number;   // Unique ID for the new position
  belief: number[];     // The belief vector as stored server-side
  claims: number;       // Number of claim tokens minted
  collateral: number;   // Collateral amount locked
}
```

**Example (standalone core usage):**

```typescript
import { FSClient, loginUser, buy, generateGaussian, queryMarketState } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com' });
await loginUser(client, 'user', 'pass');

const market = await queryMarketState(client, 42);
const { K, L, H } = market.config;
const belief = generateGaussian(75, 5, K, L, H);

const result = await buy(client, 42, belief, 100);
console.log(`Opened position ${result.positionId}, claims: ${result.claims}`);
```

**Example (inside a React component):**

```typescript
const ctx = useContext(FunctionSpaceContext);
const { market } = useMarket(marketId);
const { K, L, H } = market.config;

const belief = generateGaussian(75, 5, K, L, H);
const result = await buy(ctx.client, marketId, belief, 100, { prediction: 75 });

// After a successful buy, invalidate so other components (charts, position tables) refetch
ctx.invalidate(marketId);
```

**Error handling:**

`buy()` throws on failure. The error message varies by cause:

| Cause                                | Error message pattern                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Not authenticated (guest mode)       | `"Authentication required. Please sign in to perform this action."`            |
| HTTP error (e.g., 400, 500)          | `"API error: {status} {statusText} on POST /api/market/buy"`                   |
| API-level failure (`success: false`) | `"API error: {message}"` (message from server response)                        |
| 401 (expired token)                  | Auto-retries once by re-authenticating. If retry fails, throws the HTTP error. |

Always wrap `buy()` in a try/catch. The SDK's trading UI widgets handle this internally — they catch errors, display them inline, and reset state.
