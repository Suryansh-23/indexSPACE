---
title: "evaluateDensityCurve"
sidebar_position: 1
description: "Evaluate a coefficient vector into chart-ready { x, y } density points across the outcome range."
---

# evaluateDensityCurve

**`evaluateDensityCurve(coefficients, lowerBound, upperBound, numPoints?)`**

**Layer:** L0. Evaluates a coefficient vector as a continuous probability density function across the full outcome range, returning chart-ready `{ x, y }[]` points. Uses quadratic B-spline evaluation over adjacent coefficients, scaled by `(numBuckets+1)/(upperBound-lowerBound)` to produce a proper PDF (integrates to 1). Boundary values are 0.5x interior values because the B-spline basis function support extends outside [0,1].

```typescript
function evaluateDensityCurve(
  coefficients: number[],
  lowerBound: number,
  upperBound: number,
  numPoints?: number,  // default: 200
): Array<{ x: number; y: number }>
```

This is the function that turns raw probability vectors into renderable curves. `ConsensusChart` uses it directly for the preview belief overlay and selected position overlay. For the main consensus line, `ConsensusChart` calls `useConsensus` which internally uses `getConsensusCurve` (which delegates to `evaluateDensityCurve`).

**Example:**

```typescript
// Render the market consensus as a chart curve
const { consensus, config: { lowerBound, upperBound } } = market;
const curvePoints = evaluateDensityCurve(consensus, lowerBound, upperBound, 200);
// curvePoints = [{ x: 50, y: 0.001 }, { x: 50.35, y: 0.003 }, ..., { x: 120, y: 0.0 }]

// Render a belief preview with the same resolution
const belief = generateGaussian(75, 5, numBuckets, lowerBound, upperBound);
const beliefCurve = evaluateDensityCurve(belief, lowerBound, upperBound, curvePoints.length);
```
