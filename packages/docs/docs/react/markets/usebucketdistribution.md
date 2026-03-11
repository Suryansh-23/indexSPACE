---
title: "useBucketDistribution"
sidebar_position: 5
---

# useBucketDistribution

**`useBucketDistribution(marketId, numBuckets?, numPoints?)`**

Composite hook that combines `useMarket` + `useConsensus` internally and derives a `BucketData[]` array via `calculateBucketDistribution`. Makes no additional API calls beyond what the inner hooks fetch.

```typescript
function useBucketDistribution(
  marketId: string | number,
  numBuckets: number = 12,
  numPoints: number = 200,
): {
  buckets: BucketData[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter    | Type               | Description                                                                             |
| ------------ | ------------------ | --------------------------------------------------------------------------------------- |
| `marketId`   | `string \| number` | Market identifier                                                                       |
| `numBuckets` | `number`           | Number of equal-width outcome buckets to divide the range `[L, H]` into. Default: `12`. |
| `numPoints`  | `number`           | Number of evaluation points for the consensus density curve. Default: `200`.            |

**Behavior:**

* Requires `FunctionSpaceProvider`. Throws if called outside one.
* Calls `useMarket(marketId)` to obtain market config (`L`, `H`, `decimals`) and `useConsensus(marketId, numPoints)` to fetch the consensus density curve. No additional API calls are made.
* Returns `loading` and `error` from `useConsensus` only; `useMarket` data is consumed silently.
* The `buckets` array is memoized and recomputes when `consensus`, `market`, `numBuckets`, or the provider's `invalidationCount` changes. Returns `null` until both market and consensus data are available.
* Each `BucketData` contains `range` (formatted string), `min`/`max` (numeric bounds), `probability` (0-1 mass), and `percentage` (0-100).
* For more control over bucket configuration (settable count, sub-range computation, percentiles), use `useDistributionState` instead.

**Delegates to:** `useMarket` + `useConsensus` (hooks), `calculateBucketDistribution` (core math).

**Example:**

```tsx
import { useBucketDistribution } from '@functionspace/react';

function OutcomeBuckets({ marketId }: { marketId: number }) {
  const { buckets, loading, error, refetch } = useBucketDistribution(marketId, 8);

  if (loading) return <p>Loading distribution...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!buckets) return null;

  return (
    
      <h3>Outcome Distribution</h3>
      <ul>
        {buckets.map((b) => (
          <li key={b.range}>
            {b.range}: {b.percentage.toFixed(1)}%
          </li>
        ))}
      </ul>
      {/* buckets[0] = { range: "40-45", min: 40, max: 45, probability: 0.12, percentage: 12 } */}
      <button onClick={refetch}>Refresh</button>
    
  );
}
```
