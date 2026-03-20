---
title: "useMarket"
sidebar_position: 1
description: "Fetches complete market state including config, consensus coefficients, and resolution status."
---

# useMarket

**`useMarket(marketId)`**

Fetches complete market state -- configuration, consensus coefficients, metadata, and resolution status -- and re-fetches when the market ID changes or the market's cache entry is invalidated.

```typescript
function useMarket(
  marketId: string | number,
  options?: QueryOptions,
): {
  market: MarketState | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter  | Type               | Description       |
| ---------- | ------------------ | ----------------- |
| `marketId` | `string \| number` | Market identifier |
| `options.pollInterval` | `number?` | Polling interval in milliseconds. When > 0, the cache entry refetches on a timer (visibility-aware). Default: `0` (no polling). |
| `options.enabled` | `boolean?` | When `false`, suppresses fetching entirely. Default: `true`. |

**Behavior:**

* `market` is `null` until the first successful fetch; `loading` starts as `true`.
* `loading` is `true` only on the first fetch (no cached data). On background refetches (polling, invalidation), `loading` stays `false` and `isFetching` is `true`. This prevents UI flicker during polling.
* Re-fetches automatically when `marketId` changes or when the market's cache entry is invalidated via `ctx.invalidate(marketId)`.
* `refetch` returns a `Promise<void>`. It triggers a background refetch without resetting `loading`.
* Throws `"useMarket must be used within FunctionSpaceProvider"` if rendered outside the provider.

**`loading` vs `isFetching`:**

| Field | When true | Use for |
| ----- | --------- | ------- |
| `loading` | First fetch only (no cached data yet) | Showing loading spinners or skeletons |
| `isFetching` | Any in-flight request (first fetch or background refetch) | Showing subtle "refreshing" indicators |

On the initial mount, both `loading` and `isFetching` are `true`. Once data is cached, subsequent refetches only set `isFetching` to `true` while the stale data remains displayed.

**Delegates to:** `queryMarketState(client, marketId)` (see Core > Markets).

**Example:**

```tsx
import { useMarket } from '@functionspace/react';

function MarketHeader({ marketId }: { marketId: number }) {
  const { market, loading, error, refetch } = useMarket(marketId);

  if (loading) return <p>Loading market...</p>;
  if (error)  return <p>Error: {error.message}</p>;
  if (!market) return null;

  return (
    
      <h2>{market.title}</h2>
      <p>
        Range: {market.config.L} to {market.config.H} {market.xAxisUnits}
      </p>
      <p>Status: {market.resolutionState}</p>
      <p>Participants: {market.participantCount}</p>
      <button onClick={() => refetch()}>Refresh</button>
    
  );
}
```
