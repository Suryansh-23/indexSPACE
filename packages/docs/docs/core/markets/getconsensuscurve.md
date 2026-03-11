---
title: "getConsensusCurve"
sidebar_position: 3
---

# getConsensusCurve

**`getConsensusCurve(client, marketId, numPoints?)`**

**Layer:** L1. Fetches market state, then evaluates the consensus PDF into chart-ready `{ x, y }[]` points using `evaluateDensityCurve`. This is a convenience wrapper. If you already have the market state, call `evaluateDensityCurve(market.consensus, L, H)` directly instead of making another API round-trip.

```typescript
async function getConsensusCurve(
  client: FSClient,
  marketId: string | number,
  numPoints?: number,  // default: 200
): Promise<ConsensusCurve>
```

**Returns `ConsensusCurve`:**

```typescript
interface ConsensusCurve {
  points: Array<{ x: number; y: number }>;  // x = outcome value, y = probability density
  config: MarketConfig;                      // The market's config for reference
}
```

**Example:**

```typescript
const curve = await getConsensusCurve(ctx.client, marketId, 200);
// curve.points = [{ x: 50, y: 0.001 }, { x: 50.35, y: 0.003 }, ...]
// Pass directly to a Recharts <Line> or to calculateBucketDistribution
const buckets = calculateBucketDistribution(curve.points, curve.config.L, curve.config.H, 12);
```


