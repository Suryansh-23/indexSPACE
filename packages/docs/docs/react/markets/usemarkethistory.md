---
title: "useMarketHistory"
sidebar_position: 3
description: "Fetches time-series consensus snapshots for fan chart rendering and historical analysis."
---

# useMarketHistory

**`useMarketHistory(marketId, options?)`**

Fetches time-series history of consensus snapshots, used for fan chart rendering and historical analysis.

```typescript
function useMarketHistory(
  marketId: string | number,
  options?: { limit?: number; pollInterval?: number; enabled?: boolean },
): {
  history: MarketHistory | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter       | Type               | Description                                                                                                                               |
| --------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `marketId`      | `string \| number` | Market identifier                                                                                                                         |
| `options.limit` | `number?`          | Maximum number of historical snapshots to fetch. Passed through to `queryMarketHistory`; when omitted the server applies its own default. |
| `options.pollInterval` | `number?` | Polling interval in milliseconds. Default: `0` (no polling). |
| `options.enabled` | `boolean?` | When `false`, suppresses fetching. Default: `true`. |

**Behavior:**

* Returns a `MarketHistory` object containing `marketId`, `totalSnapshots`, and a `snapshots` array of `MarketSnapshot` records ordered by timestamp.
* Re-fetches automatically when `marketId` or `options.limit` changes, or when the market's cache entry is invalidated.
* `loading` is `true` only on the first fetch. Background refetches set `isFetching` to `true`.
* Throws if rendered outside `FunctionSpaceProvider`.

**Delegates to:** `queryMarketHistory(client, marketId, limit)` from core.

**Example:**

```tsx
import { useMarketHistory, useMarket } from '@functionspace/react';
import { transformHistoryToFanChart } from '@functionspace/core';

function MarketTimeline({ marketId }: { marketId: number }) {
  const { market } = useMarket(marketId);
  const { history, loading, error } = useMarketHistory(marketId, { limit: 500 });

  if (loading) return Loading...;
  if (error) return Error: {error.message};
  if (!market || !history) return null;

  const { lowerBound, upperBound } = market.config;
  const fanData = transformHistoryToFanChart(history.snapshots, lowerBound, upperBound);

  return (
    
      <p>{history.totalSnapshots} total snapshots, showing {fanData.length} points</p>
      {fanData.map(pt => (
        <p key={pt.tradeId}>
          {new Date(pt.timestamp).toLocaleDateString()}  -- mean: {pt.mean.toFixed(2)}
        </p>
      ))}
    
  );
}
```
