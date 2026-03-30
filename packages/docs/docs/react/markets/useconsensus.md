---
title: "useConsensus"
sidebar_position: 2
description: "Fetches the consensus probability density curve as chart-ready { x, y } point arrays."
---

# useConsensus

**`useConsensus(marketId, numPoints?)`**

Derives the consensus probability density curve as chart-ready `{ x, y }[]` points from the market cache entry via `evaluateDensityCurve`. When `useMarket` and `useConsensus` are mounted for the same market, only one API call is made.

```typescript
function useConsensus(
  marketId: string | number,
  numPoints?: number,
  options?: QueryOptions,
): {
  consensus: ConsensusCurve | null;
  loading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

| Parameter   | Type               | Description                                                                                                                      |
| ----------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `marketId`  | `string \| number` | Market identifier                                                                                                                |
| `numPoints` | `number?`          | Evaluation points for the density curve. Defaults to `200`. Higher values produce smoother curves at the cost of a larger array. |
| `options.pollInterval` | `number?` | Polling interval in milliseconds. Default: `0` (no polling). |
| `options.enabled` | `boolean?` | When `false`, suppresses fetching. Default: `true`. |
| `options.retry` | `number?` | Number of retry attempts for transient errors. Default: `0` (no retry). Set via `cache={{ defaultRetry: 3 }}` on Provider for global default. |
| `options.retryDelay` | `number \| ((attempt: number) => number)?` | Retry delay in ms, or a function receiving the attempt index (0-based). Default: exponential backoff `min(1000 * 2^attempt, 30000)`. |

**Behavior:**

* Throws if rendered outside `FunctionSpaceProvider`.
* Uses `numPoints` as the resolution for `evaluateDensityCurve`, which evaluates the consensus coefficients into `numPoints` evenly-spaced `{ x, y }` samples between `config.lowerBound` and `config.upperBound`. The evaluation runs client-side on cached market data.
* Re-fetches automatically when `marketId`, `numPoints`, or the market's cache entry is invalidated via `ctx.invalidate(marketId)`.
* `loading` is `true` only on the first fetch. Background refetches set `isFetching` to `true` without changing `loading`.
* `refetch()` can be called imperatively to force a background refetch at any time.
* `consensus` is `null` until the first successful fetch completes.

**Derives from:** Market cache entry (same data as `useMarket`), transformed via `evaluateDensityCurve(consensus, lowerBound, upperBound, numPoints)`. No separate API call is made when `useMarket` is already mounted for the same market.

**Example:**

```tsx
import { useConsensus } from '@functionspace/react';

function ConsensusSummary({ marketId }: { marketId: number }) {
  const { consensus, loading, error } = useConsensus(marketId, 300);

  if (loading) return Loading consensus...;
  if (error) return Error: {error.message};
  if (!consensus) return null;

  const { lowerBound, upperBound } = consensus.config;
  const peak = consensus.points.reduce((max, p) => (p.y > max.y ? p : max), consensus.points[0]);

  return (

      <p>Range: {lowerBound} to {upperBound}</p>
      <p>Peak density at {peak.x.toFixed(1)} ({consensus.points.length} points)</p>
    
  );
}
```
