---
title: "calculateBucketDistribution"
sidebar_position: 3
description: "Integrate a density curve into equal-width histogram buckets."
---

# calculateBucketDistribution

**`calculateBucketDistribution(points, L, H, numBuckets?, decimals?)`**

**Layer:** L0. Integrates a density curve into equal-width histogram buckets using trapezoidal integration with linear interpolation at bucket boundaries. This is how continuous PDF curves get turned into the discrete bar charts used by `DistributionChart` and `BucketRangeSelector`.

```typescript
function calculateBucketDistribution(
  points: Array<{ x: number; y: number }>,  // from evaluateDensityCurve or ConsensusCurve.points
  L: number,
  H: number,
  numBuckets?: number,   // default: 12, clamped to [1, 200]
  decimals?: number,     // default: 0 (for range label formatting)
): BucketData[]
```

**Note:** The `points` parameter takes `{ x, y }[]` density curve points, not a raw coefficient vector. Call `evaluateDensityCurve` first if you have coefficients.

**Returns `BucketData[]`:**

```typescript
interface BucketData {
  range: string;       // Formatted label, e.g., "70-75" or "70.5-75.5"
  min: number;         // Bucket lower bound
  max: number;         // Bucket upper bound
  probability: number; // Integrated probability mass (0 to 1)
  percentage: number;  // probability * 100
}
```

**Example:**

```typescript
const curve = evaluateDensityCurve(market.consensus, L, H, 200);
const buckets = calculateBucketDistribution(curve, L, H, 12);

// buckets = [
//   { range: "50-56", min: 50, max: 56, probability: 0.02, percentage: 2.0 },
//   { range: "56-62", min: 56, max: 62, probability: 0.08, percentage: 8.0 },
//   ...
// ]
```
