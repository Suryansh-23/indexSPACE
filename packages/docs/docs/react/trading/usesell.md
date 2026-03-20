---
title: "useSell"
sidebar_position: 3
description: "Mutation hook that wraps sell() from core with managed loading/error state and automatic cache invalidation."
---

# useSell

**`useSell(marketId)`**

Mutation hook that wraps `sell()` from `@functionspace/core`. Manages loading and error state, and automatically invalidates the market's cache entries on success so that data hooks (positions, consensus, market state) refetch.

```typescript
function useSell(
  marketId: string | number,
): {
  execute: (positionId: number) => Promise<SellResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

| Parameter  | Type               | Description       |
| ---------- | ------------------ | ----------------- |
| `marketId` | `string \| number` | Market the position belongs to |

**Return shape:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `execute` | `(positionId: number) => Promise<SellResult>` | Call to close a position. Resolves with the `SellResult` on success. Throws on failure. |
| `loading` | `boolean` | `true` while the sell request is in flight |
| `error` | `Error \| null` | Most recent error from a failed sell, or `null` |
| `reset` | `() => void` | Clears the `error` state back to `null` |

**Behavior:**

* On success, the hook calls `ctx.invalidate(marketId)` to trigger targeted cache invalidation. All data hooks subscribed to that market refetch, and the wallet balance refreshes.
* On failure, the hook sets `error` and re-throws the error so the caller can also handle it.
* `loading` resets to `false` in a `finally` block regardless of success or failure.
* Errors auto-clear after 5 seconds. Call `reset()` to clear immediately.
* Throws `"useSell must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Delegates to:** `sell(client, positionId, marketId)` from `@functionspace/core`.

**Example:**

```tsx
import { useSell } from '@functionspace/react';

function SellButton({ marketId, positionId }: { marketId: string; positionId: number }) {
  const { execute, loading, error, reset } = useSell(marketId);

  const handleSell = async () => {
    try {
      const result = await execute(positionId);
      console.log('Sold position, returned:', result.collateralReturned);
    } catch (err) {
      console.error('Sell failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleSell} disabled={loading}>
        {loading ? 'Selling...' : 'Sell'}
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
