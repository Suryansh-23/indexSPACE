---
title: "evaluateDensityPiecewise"
sidebar_position: 2
description: "Evaluate the probability density at a single point using piecewise-linear interpolation."
---

# evaluateDensityPiecewise

**`evaluateDensityPiecewise(coefficients, x, L, H)`**

**Layer:** L0. Evaluates the density PDF at a single point `x`. Same interpolation logic as `evaluateDensityCurve`, but for one value. Used internally by `computeStatistics` and `computePercentiles` for numerical integration. Also useful for tooltip readouts.

```typescript
function evaluateDensityPiecewise(
  coefficients: number[],
  x: number,
  L: number,
  H: number,
): number  // probability density at x
```

Values outside `[L, H]` are clamped to the edge density values (the edge coefficient scaled by `(K+1)/(H-L)`). The return value is a density (can be > 1), not a probability. To get the probability of a range, integrate the density over that range (or use `calculateBucketDistribution`).

**Example:**

```typescript
// Show the density value at a specific outcome (e.g., for a tooltip)
const density = evaluateDensityPiecewise(market.consensus, 75, L, H);
console.log(`Density at 75: ${density.toFixed(4)}`);

// Compare density of your belief vs consensus at the same point
const beliefDensity = evaluateDensityPiecewise(belief, 75, L, H);
console.log(`Your belief is ${(beliefDensity / density).toFixed(1)}x the consensus at 75`);
```
