---
title: "usePositions"
sidebar_position: 1
---

# usePositions

**`usePositions(marketId, username?)`**

Fetches all positions for a market. When `username` is provided, filters the results client-side to only positions owned by that user.

```typescript
function usePositions(
  marketId: string | number,
  username?: string,
): {
  positions: Position[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

| Parameter  | Type               | Description                                                                                                             |
| ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `marketId` | `string \| number` | Market identifier                                                                                                       |
| `username` | `string?`          | If provided, filters to positions where `position.owner === username`. If omitted, returns all positions in the market. |

**Behavior:**

* Filtering by `username` happens client-side after the full fetch. The API call always fetches all market positions regardless of the `username` parameter.
* Re-fetches automatically when `marketId`, `username`, or the provider's `invalidationCount` changes.
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
