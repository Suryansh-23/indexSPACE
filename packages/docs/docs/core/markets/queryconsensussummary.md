---
title: "queryConsensusSummary"
sidebar_position: 4
---

# queryConsensusSummary

**`queryConsensusSummary(client, marketId)`**

**Layer:** L1. Returns summary statistics of the consensus distribution: mean, median, mode, variance, and standard deviation. Computed client-side from the consensus coefficients via `computeStatistics`.

```typescript
async function queryConsensusSummary(
  client: FSClient,
  marketId: string | number,
): Promise<ConsensusSummary>
```

**Returns `ConsensusSummary`:**

```typescript
interface ConsensusSummary {
  mean: number;      // Expected value
  median: number;    // 50th percentile
  mode: number;      // Most likely outcome
  variance: number;  // Spread of the distribution
  stdDev: number;    // Square root of variance
}
```

**Example:**

```typescript
const summary = await queryConsensusSummary(ctx.client, marketId);
console.log(`Expected: ${summary.mean.toFixed(1)}${market.xAxisUnits}`);
console.log(`Most likely: ${summary.mode.toFixed(1)}${market.xAxisUnits}`);
console.log(`Spread: +/-${summary.stdDev.toFixed(1)}`);
```
