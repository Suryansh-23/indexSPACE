---
title: "computePercentiles"
sidebar_position: 2
description: "Compute 9 percentile values (p2.5 through p97.5) from a coefficient vector."
---

# computePercentiles

**`computePercentiles(coefficients, lowerBound, upperBound)`**

**Layer:** L0. Computes 9 percentile values by walking a 500-point CDF integration from `lowerBound` to `upperBound` and recording the outcome value when each cumulative threshold is crossed.

```typescript
function computePercentiles(
  coefficients: number[],
  lowerBound: number,
  upperBound: number,
): PercentileSet
```

**Returns `PercentileSet`:**

```typescript
interface PercentileSet {
  p2_5: number;    // 2.5th percentile
  p12_5: number;   // 12.5th percentile
  p25: number;     // 25th percentile (Q1)
  p37_5: number;   // 37.5th percentile
  p50: number;     // 50th percentile (median)
  p62_5: number;   // 62.5th percentile
  p75: number;     // 75th percentile (Q3)
  p87_5: number;   // 87.5th percentile
  p97_5: number;   // 97.5th percentile
}
```

These 9 percentiles define the bands of the fan chart. The 2.5th-97.5th range covers the 95% confidence interval; the 25th-75th covers the interquartile range.

**Example:**

```typescript
const pct = computePercentiles(market.consensus, lowerBound, upperBound);
console.log(`95% confidence: ${pct.p2_5.toFixed(1)} to ${pct.p97_5.toFixed(1)}`);
console.log(`IQR: ${pct.p25.toFixed(1)} to ${pct.p75.toFixed(1)}`);
console.log(`Median: ${pct.p50.toFixed(1)}`);
```
