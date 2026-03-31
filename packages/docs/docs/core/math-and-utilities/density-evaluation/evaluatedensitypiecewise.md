---
title: "evaluateDensityPiecewise"
sidebar_position: 2
description: "Evaluate the probability density at a single point using quadratic B-spline evaluation."
---

# evaluateDensityPiecewise

**`evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound)`**

**Layer:** L0. Evaluates the density PDF at a single point `x`. Same quadratic B-spline evaluation as `evaluateDensityCurve`, but for one value. Used internally by `computeStatistics` and `computePercentiles` for numerical integration. Also useful for tooltip readouts.

```typescript
function evaluateDensityPiecewise(
  coefficients: number[],
  x: number,
  lowerBound: number,
  upperBound: number,
): number  // probability density at x
```

Values outside `[lowerBound, upperBound]` are clamped to the edge density values (the edge coefficient scaled by normalization-agnostic factor `n/(coeffSum*range)` where n = coefficients.length). The return value is a density (can be > 1), not a probability. To get the probability of a range, integrate the density over that range (or use `calculateBucketDistribution`).

**Example:**

```typescript
// Show the density value at a specific outcome (e.g., for a tooltip)
const density = evaluateDensityPiecewise(market.consensus, 75, lowerBound, upperBound);
console.log(`Density at 75: ${density.toFixed(4)}`);

// Compare density of your belief vs consensus at the same point
const beliefDensity = evaluateDensityPiecewise(belief, 75, lowerBound, upperBound);
console.log(`Your belief is ${(beliefDensity / density).toFixed(1)}x the consensus at 75`);
```
