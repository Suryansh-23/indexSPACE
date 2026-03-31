---
title: "useTradeHistory"
sidebar_position: 4
description: "Fetches trade history for a market with optional polling interval for live updates."
---

# useTradeHistory

**`useTradeHistory(marketId, options?)`**

Fetches trade history for a market with optional polling for live updates.

```typescript
function useTradeHistory(
  marketId: string | number,
  options?: {
    limit?: number;
    pollInterval?: number;
    enabled?: boolean;
  },
): {
  trades: TradeEntry[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter              | Type               | Description                                                                                                 |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| `marketId`             | `string \| number` | Market identifier.                                                                                          |
| `options.limit`        | `number?`          | Maximum number of trade entries to return. Default: `100`.                                                  |
| `options.pollInterval` | `number?`          | Polling interval in milliseconds. Default: `0` (no polling). When > 0, the cache entry refetches on a timer (visibility-aware, deduplicated). |
| `options.enabled` | `boolean?` | When `false`, suppresses fetching. Default: `true`. |

**Behavior:**

* Requires `FunctionSpaceProvider`. Throws if called outside one.
* `trades` starts as `null` and becomes a `TradeEntry[]` after the first successful fetch; check for `null` before rendering.
* Re-fetches automatically when `marketId` or `limit` changes, or when the market's cache entry is invalidated.
* `loading` is `true` only on the first fetch (no cached data). Background refetches (polling, invalidation) set `isFetching` to `true` without changing `loading`.
* Polling is cache-based: visibility-aware (pauses when the tab is hidden) and deduplicated (multiple hook instances with the same cache key share one timer). Cleanup is automatic on unmount.
* Each `TradeEntry` contains: `id`, `timestamp`, `side` (`'buy' | 'sell'`), `prediction` (`number | null`), `amount`, `username`, and `positionId`.

**Delegates to:** `queryTradeHistory` from core.

**Example:**

```tsx
import { useTradeHistory } from '@functionspace/react';

function TradeFeed({ marketId }: { marketId: string }) {
  const { trades, loading, error, refetch } = useTradeHistory(marketId, {
    limit: 50,
    pollInterval: 5000,
  });

  if (loading && !trades) return <p>Loading trades...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!trades || trades.length === 0) return <p>No trades yet.</p>;

  return (
    
      <button onClick={refetch}>Refresh</button>
      <ul>
        {trades.map((t) => (
          <li key={t.id}>
            {t.timestamp}  -- {t.username} {t.side} {t.amount.toFixed(2)}
            {t.prediction !== null && ` @ ${t.prediction.toFixed(1)}`}
          </li>
        ))}
      </ul>
    
  );
}
```
