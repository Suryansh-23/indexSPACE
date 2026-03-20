---
title: "useBuy"
sidebar_position: 2
description: "Mutation hook that wraps buy() from core with managed loading/error state and automatic cache invalidation."
---

# useBuy

**`useBuy(marketId)`**

Mutation hook that wraps `buy()` from `@functionspace/core`. Manages loading and error state, and automatically invalidates the market's cache entries on success so that data hooks (positions, consensus, market state) refetch.

```typescript
function useBuy(
  marketId: string | number,
): {
  execute: (belief: BeliefVector, collateral: number) => Promise<BuyResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

| Parameter  | Type               | Description       |
| ---------- | ------------------ | ----------------- |
| `marketId` | `string \| number` | Market to trade on |

**Return shape:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `execute` | `(belief: BeliefVector, collateral: number) => Promise<BuyResult>` | Call to submit a buy trade. Resolves with the `BuyResult` on success. Throws on failure. |
| `loading` | `boolean` | `true` while the trade request is in flight |
| `error` | `Error \| null` | Most recent error from a failed trade, or `null` |
| `reset` | `() => void` | Clears the `error` state back to `null` |

**Behavior:**

* `execute` reads `numBuckets` from the market cache snapshot automatically -- the caller does not need to pass it.
* On success, the hook calls `ctx.invalidate(marketId)` to trigger targeted cache invalidation. All data hooks subscribed to that market refetch, and the wallet balance refreshes.
* On failure, the hook sets `error` and re-throws the error so the caller can also handle it.
* `loading` resets to `false` in a `finally` block regardless of success or failure.
* Errors auto-clear after 5 seconds. Call `reset()` to clear immediately.
* Throws `"Market data not loaded. Cannot determine numBuckets for validation."` if `useMarket` has not yet loaded market data for this `marketId`.
* Throws `"useBuy must be used within FunctionSpaceProvider"` if rendered outside the provider.
* No `prediction` parameter -- intentionally omitted. If needed in the future, it can be added to the `execute` signature.

**Delegates to:** `buy(client, marketId, belief, collateral, numBuckets)` from `@functionspace/core`.

**Example:**

```tsx
import { useContext, useState } from 'react';
import { FunctionSpaceContext, useMarket, useBuy } from '@functionspace/react';
import { generateGaussian } from '@functionspace/core';

function TradeButton({ marketId }: { marketId: string }) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('Must be within FunctionSpaceProvider');

  const { market } = useMarket(marketId);
  const { execute, loading, error, reset } = useBuy(marketId);

  const handleTrade = async () => {
    if (!market) return;
    const { K, L, H } = market.config;
    const belief = generateGaussian(75, 5, K, L, H);
    try {
      const result = await execute(belief, 10);
      console.log('Trade successful, position:', result.positionId);
    } catch (err) {
      // error is also available via the `error` field
      console.error('Trade failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleTrade} disabled={loading || !market}>
        {loading ? 'Submitting...' : 'Buy'}
      </button>
      {error && (
        <p>
          Error: {error.message}
          <button onClick={reset}>Dismiss</button>
        </p>
      )}
    </div>
  );
}
```
