---
title: "transformHistoryToFanChart"
sidebar_position: 4
---

# transformHistoryToFanChart

**`transformHistoryToFanChart(snapshots, L, H, maxPoints?)`**

**Layer:** L0. Transforms raw `MarketSnapshot[]` (from `queryMarketHistory`) into chart-ready `FanChartPoint[]` for rendering timeline/fan charts. For each snapshot, it normalizes the alpha vector to a consensus, then computes statistics and all 9 percentile bands. Automatically downsamples to `maxPoints` using evenly-spaced index sampling (preserving first and last) if the input is too large. Filters out snapshots with invalid alpha vectors (all zeros).

```typescript
function transformHistoryToFanChart(
  snapshots: MarketSnapshot[],
  L: number,
  H: number,
  maxPoints?: number,  // default: 200
): FanChartPoint[]
```

**Returns `FanChartPoint[]`:**

```typescript
interface FanChartPoint {
  timestamp: number;          // Epoch milliseconds (for x-axis)
  createdAt: string;          // Original ISO 8601 string
  tradeId: number;            // The trade that produced this snapshot
  mean: number;               // Consensus mean at this point in time
  mode: number;               // Consensus mode
  stdDev: number;             // Consensus standard deviation
  percentiles: PercentileSet; // All 9 percentile bands
}
```

**Example:**

```typescript
const history = await queryMarketHistory(ctx.client, marketId, 500);
const fanData = transformHistoryToFanChart(history.snapshots, L, H, 200);

// fanData[0].percentiles.p25 = lower quartile at the first snapshot
// fanData[0].percentiles.p75 = upper quartile at the first snapshot
// The TimelineChart renders nested area bands from p2_5..p97_5
```
