---
title: "useDistributionState"
sidebar_position: 6
---

# useDistributionState

**`useDistributionState(marketId, config?)`**

The most feature-rich data hook. Combines market and consensus data, manages a controllable bucket count with clamping, pre-computes full-range buckets and consensus percentiles, and provides a `getBucketsForRange` helper for on-demand sub-range computation.

```typescript
function useDistributionState(
  marketId: string | number,
  config?: DistributionStateConfig,
): DistributionState
```

| Parameter                   | Type               | Description                                                |
| --------------------------- | ------------------ | ---------------------------------------------------------- |
| `marketId`                  | `string \| number` | Market identifier                                          |
| `config.defaultBucketCount` | `number?`          | Initial bucket count. Default: `12`. Clamped to `[2, 50]`. |

**Returns `DistributionState`:**

| Field                | Type                                         | Description                                                                                                                                       |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `market`             | `MarketState \| null`                        | Pass-through from `useMarket`                                                                                                                     |
| `loading`            | `boolean`                                    | `true` if either market or consensus is still loading                                                                                             |
| `error`              | `Error \| null`                              | First error from either inner hook                                                                                                                |
| `refetch`            | `() => void`                                 | Re-fetches both market and consensus data                                                                                                         |
| `bucketCount`        | `number`                                     | Current bucket count (2 to 50)                                                                                                                    |
| `setBucketCount`     | `(n: number) => void`                        | Update bucket count. Value is clamped to `[2, 50]`.                                                                                               |
| `buckets`            | `BucketData[] \| null`                       | Pre-computed buckets over the full range `[L, H]`. Recomputes when consensus, market, bucketCount, or invalidation changes.                       |
| `percentiles`        | `PercentileSet \| null`                      | 9-point percentile set (p2\_5 through p97\_5) computed from `market.consensus` (via `useMarket`), not from the separately-fetched consensus curve |
| `getBucketsForRange` | `(min: number, max: number) => BucketData[]` | Compute buckets over a custom sub-range using the current `bucketCount`. Returns empty array if consensus or market data is not yet loaded.       |

**Behavior:** This hook is designed for sharing state between components. Pass the returned object to both a chart and a selector to keep bucket configuration synchronized. Buckets and percentiles recompute reactively when the underlying market or consensus data changes, when `bucketCount` is updated, or when a cache invalidation is triggered via context.

**Delegates to:** `useMarket` + `useConsensus` (hooks), `calculateBucketDistribution` + `computePercentiles` (core math).

**Example:**

```tsx
function DistributionView({ marketId }: { marketId: number }) {
  const dist = useDistributionState(marketId, { defaultBucketCount: 10 });

  // Share the same state object with both chart and selector
  return (
    <>
      <DistributionChart marketId={marketId} distributionState={dist} />
      <BucketRangeSelector marketId={marketId} distributionState={dist} />
      <button onClick={() => dist.setBucketCount(dist.bucketCount + 1)}>
        More buckets ({dist.bucketCount})
      </button>
    </>
  );
}
```
