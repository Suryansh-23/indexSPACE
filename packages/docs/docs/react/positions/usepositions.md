---
title: "usePositions"
sidebar_position: 1
description: "Fetches all positions for a market and optionally filters client-side by username."
---

# usePositions

**`usePositions(marketId, username?)`**

Fetches all positions for a market. When `username` is provided, filters the results client-side to only positions owned by that user.

```typescript
function usePositions(
  marketId: string | number,
  username?: string,
  options?: QueryOptions,
): {
  positions: Position[] | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter  | Type               | Description                                                                                                             |
| ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `marketId` | `string \| number` | Market identifier                                                                                                       |
| `username` | `string?`          | If provided, filters to positions where `position.owner === username`. If omitted, returns all positions in the market. |
| `options.pollInterval` | `number?` | Polling interval in milliseconds. Default: `0` (no polling). |
| `options.enabled` | `boolean?` | When `false`, suppresses fetching. Default: `true`. |

**Behavior:**

* Filtering by `username` happens client-side after the cache returns data. The API call always fetches all market positions regardless of the `username` parameter. This means multiple `usePositions` calls with different usernames for the same market share one cache entry and one API request.
* Re-fetches automatically when `marketId` changes or when the market's cache entry is invalidated via `ctx.invalidate(marketId)`.
* `loading` is `true` only on the first fetch. Background refetches set `isFetching` to `true`.
* Throws `"usePositions must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Delegates to:** `queryMarketPositions(client, marketId)` from core.

**Example:**

```tsx
function MyPositions({ marketId }: { marketId: number }) {
  const { user } = useAuth();
  const { positions, loading } = usePositions(marketId, user?.username);

  if (loading || !positions) return Loading positions...;

  return (
    <ul>
      {positions.map(p => (
        <li key={p.positionId}>
          Position #{p.positionId}: ${p.collateral.toFixed(2)} at {p.prediction}
        </li>
      ))}
    </ul>
  );
}
```
