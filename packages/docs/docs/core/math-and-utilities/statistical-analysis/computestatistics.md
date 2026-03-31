---
title: "computeStatistics"
sidebar_position: 1
description: "Compute mean, median, mode, variance, and stdDev from a coefficient vector."
---

# computeStatistics

**`computeStatistics(coefficients, lowerBound, upperBound)`**

**Layer:** L0. Computes summary statistics from a coefficient vector. Mean is computed in closed form; variance, mode, and median use numerical integration over a 500-point grid.

```typescript
function computeStatistics(
  coefficients: number[],
  lowerBound: number,
  upperBound: number,
): { mean: number; median: number; mode: number; variance: number; stdDev: number }
```

**Returns:**

```typescript
{
  mean: number;      // Expected value: lowerBound + (upperBound-lowerBound) * sum(k/(n-1) * c_k) / coeffSum, where n = coefficients.length
  median: number;    // CDF integration to 0.5
  mode: number;      // Argmax of density on a 500-point grid
  variance: number;  // Numerical integration of (x - mean)^2 * density, normalized by total integrated weight
  stdDev: number;    // sqrt(variance)
}
```

**Example:**

```typescript
const stats = computeStatistics(market.consensus, lowerBound, upperBound);
console.log(`Market expects ~${stats.mean.toFixed(1)} (±${stats.stdDev.toFixed(1)})`);
console.log(`Most likely outcome: ${stats.mode.toFixed(1)}`);
```
