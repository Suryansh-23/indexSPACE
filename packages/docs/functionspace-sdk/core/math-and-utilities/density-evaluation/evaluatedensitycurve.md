# evaluateDensityCurve

**`evaluateDensityCurve(coefficients, L, H, numPoints?)`**

**Layer:** L0. Evaluates a coefficient vector as a continuous probability density function across the full outcome range, returning chart-ready `{ x, y }[]` points. Uses piecewise-linear interpolation between adjacent coefficients, scaled by `(K+1)/(H-L)` to produce a proper PDF (integrates to 1).

```typescript
function evaluateDensityCurve(
  coefficients: number[],
  L: number,
  H: number,
  numPoints?: number,  // default: 200
): Array<{ x: number; y: number }>
```

This is the function that turns raw probability vectors into renderable curves. `ConsensusChart` uses it directly for the preview belief overlay and selected position overlay. For the main consensus line, `ConsensusChart` calls `useConsensus` which internally uses `getConsensusCurve` (which delegates to `evaluateDensityCurve`).

**Example:**

```typescript
// Render the market consensus as a chart curve
const { consensus, config: { L, H } } = market;
const curvePoints = evaluateDensityCurve(consensus, L, H, 200);
// curvePoints = [{ x: 50, y: 0.001 }, { x: 50.35, y: 0.003 }, ..., { x: 120, y: 0.0 }]

// Render a belief preview with the same resolution
const belief = generateGaussian(75, 5, K, L, H);
const beliefCurve = evaluateDensityCurve(belief, L, H, curvePoints.length);
```
