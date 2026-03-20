---
title: "useConsensus"
sidebar_position: 2
description: "Fetches the consensus probability density curve as chart-ready { x, y } point arrays."
---

# useConsensus

**`useConsensus(marketId, numPoints?)`**

Fetches the consensus probability density curve as chart-ready `{ x, y }[]` points by wrapping `getConsensusCurve` from core.

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

**Behavior:**

* Throws if rendered outside `FunctionSpaceProvider`.
* Passes `numPoints` through to `getConsensusCurve`, which evaluates the consensus coefficients into `numPoints` evenly-spaced `{ x, y }` samples between `config.L` and `config.H`.
* Re-fetches automatically when `marketId`, `numPoints`, or the market's cache entry is invalidated via `ctx.invalidate(marketId)`.
* `loading` is `true` only on the first fetch. Background refetches set `isFetching` to `true` without changing `loading`.
* `refetch()` can be called imperatively to force a background refetch at any time.
* `consensus` is `null` until the first successful fetch completes.

**Delegates to:** `getConsensusCurve(client, marketId, numPoints)` (see Core > Markets).

**Example:**

```tsx
import { useConsensus } from '@functionspace/react';

function ConsensusSummary({ marketId }: { marketId: number }) {
  const { consensus, loading, error } = useConsensus(marketId, 300);

  if (loading) return Loading consensus...;
  if (error) return Error: {error.message};
  if (!consensus) return null;

  const { L, H } = consensus.config;
  const peak = consensus.points.reduce((max, p) => (p.y > max.y ? p : max), consensus.points[0]);

  return (
    
      <p>Range: {L} to {H}</p>
      <p>Peak density at {peak.x.toFixed(1)} ({consensus.points.length} points)</p>
    
  );
}
```
