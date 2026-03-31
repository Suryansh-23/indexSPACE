---
title: "Position Generators"
sidebar_position: 1
description: "generateBelief and convenience generators for creating belief vectors from regions and shapes."
---

# Position Generators

**`generateBelief(regions, numBuckets, lowerBound, upperBound)`: Universal Belief Generator**

**Layer:** L1 (Core). Every other generator (`generateGaussian`, `generateRange`, `generateDip`, etc.) delegates to this function. Use the convenience generators for common single-shape beliefs. Use `generateBelief` directly when you need multi-region composition or fine-grained control.

```typescript
function generateBelief(
  regions: Region[],
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): BeliefVector  // number[] of length numBuckets+2, sums to numBuckets+2
```

**Parameters:**

| Parameter    | Type       | Description                                                                                                                                                                                                                                  |
| ------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regions`    | `Region[]` | One or more regions describing where probability mass should be concentrated. Regions are **additive**: their weighted kernels are summed before normalization. Can mix any combination of `PointRegion`, `RangeRegion`, and `SplineRegion`. |
| `numBuckets`  | `number`   | Number of outcome buckets (the vector will have `numBuckets + 2` elements). From `market.config.numBuckets`.                                                                                                                                  |
| `lowerBound`  | `number`   | Lower bound of the outcome space. From `market.config.lowerBound`.                                                                                                                                                                           |
| `upperBound`  | `number`   | Upper bound of the outcome space. From `market.config.upperBound`.                                                                                                                                                                           |

**Where do numBuckets, lowerBound, upperBound come from?** Every market has a `config` object with these values. You never hardcode them. Always destructure from the market:

```typescript
const { numBuckets, lowerBound, upperBound } = market.config;
```

For example, a market asking "What will the temperature be?" might have `numBuckets = 100`, `lowerBound = 50`, `upperBound = 120`, meaning 102 coefficients spanning 50°F to 120°F.

**Return value:** A `BeliefVector` (`number[]`) of length `numBuckets + 2` where every element is >= 0 and the array sums to `numBuckets + 2`. Each element is a B-spline coefficient. Element `[0]` corresponds to the boundary before `lowerBound`, element `[numBuckets + 1]` corresponds to the boundary after `upperBound`, with the interior coefficients spanning the outcome range.

**Region Types**

Regions are the building blocks. Each describes a shape of probability mass in outcome space.

**`PointRegion`** (Gaussian peak):

```typescript
interface PointRegion {
  type: 'point';
  center: number;    // Peak location in outcome space (e.g., 75 for 75°F)
  spread: number;    // Width of the bell curve in outcome-space units
  weight?: number;   // Relative weight when combining with other regions (default: 1)
  skew?: number;     // Asymmetry: -1 = wider left tail, +1 = wider right tail, 0 = symmetric
  inverted?: boolean; // true = dip shape (high at edges, low at center)
}
```

The kernel is a Gaussian: `exp(-0.5 * ((u - center) / spread)²)`. When `skew` is set, the effective spread differs on each side of center. A skew of `-1` makes the left tail \~3x wider and the right tail \~0.3x narrower. When `inverted: true`, the Gaussian is flipped: `max(1 - gaussian, 0.02)`, creating a "dip" with high probability everywhere _except_ near center.

**`RangeRegion`** (Flat range):

```typescript
interface RangeRegion {
  type: 'range';
  low: number;       // Start of the range in outcome space
  high: number;      // End of the range in outcome space
  weight?: number;   // Relative weight (default: 1)
  sharpness?: number; // Edge transition: 0 = smooth cosine taper, 1 = hard cliff (default: 0)
}
```

Produces a flat-top shape: full probability within `[low, high]`, tapering to near-zero outside. At `sharpness: 0`, edges use a smooth cosine rolloff over 2 buckets. At `sharpness: 1`, edges are vertical cliffs.

**`SplineRegion`** (Arbitrary freeform curve):

```typescript
interface SplineRegion {
  type: 'spline';
  controlX: number[]; // X positions in outcome space [lowerBound..upperBound], must be sorted ascending
  controlY: number[]; // Y values (unnormalized heights, e.g., [0, 10, 25, 10, 0])
  weight?: number;    // Relative weight (default: 1)
}
```

Uses quadratic B-spline evaluation to produce a smooth curve approximating the control points. The curve does not pass exactly through control points (approximating, not interpolating). Negative outputs are clamped to 0. This is what powers the `CustomShapeEditor` UI widget.

**`RangeInput`** (For multi-range `generateRange` overload):

```typescript
interface RangeInput {
  low: number;
  high: number;
  weight?: number;
  sharpness?: number;
}
```

Used by the `generateRange(ranges[], numBuckets, lowerBound, upperBound)` overload to pass multiple range specifications. Each `RangeInput` becomes a `RangeRegion` internally.

**How Composition Works**

When you pass multiple regions, `generateBelief` processes each into a raw kernel array, scales by `weight`, sums them element-wise, then normalizes the combined array to sum to numBuckets+2:

```
for each region:
    kernel = computeKernel(region, numBuckets, lowerBound, upperBound)
    combined[k] += kernel[k] * region.weight

return normalize(combined)  // scales so sum = numBuckets+2 (if sum <= 0, returns uniform distribution)
```

Regions are **additive, not multiplicative**. Two peaks at different locations create a bimodal distribution. A peak with `weight: 2` gets twice the probability mass of a peak with `weight: 1` (before normalization).

**Examples**

**Single Gaussian, "I think the outcome will be around 75":**

```typescript
const { numBuckets, lowerBound, upperBound } = market.config;

const belief = generateBelief([
  { type: 'point', center: 75, spread: 5 }
], numBuckets, lowerBound, upperBound);
```

**Bimodal, "I think it'll be either 60 or 90, leaning toward 90":**

```typescript
const belief = generateBelief([
  { type: 'point', center: 60, spread: 4, weight: 0.3 },
  { type: 'point', center: 90, spread: 4, weight: 0.7 },
], numBuckets, lowerBound, upperBound);
```

**Range, "I think it'll land somewhere between 70 and 85":**

```typescript
const belief = generateBelief([
  { type: 'range', low: 70, high: 85, sharpness: 1 }
], numBuckets, lowerBound, upperBound);
```

**Non-contiguous ranges, "Either 50-60 or 80-90, but not the middle":**

```typescript
const belief = generateBelief([
  { type: 'range', low: 50, high: 60 },
  { type: 'range', low: 80, high: 90 },
], numBuckets, lowerBound, upperBound);
```

**Skewed peak, "Around 75 but could be higher":**

```typescript
const belief = generateBelief([
  { type: 'point', center: 75, spread: 5, skew: 0.8 }
], numBuckets, lowerBound, upperBound);
```

**Dip, "Anything but 75":**

```typescript
const belief = generateBelief([
  { type: 'point', center: 75, spread: 5, inverted: true }
], numBuckets, lowerBound, upperBound);
```

**Custom shape, freeform from control points:**

```typescript
const belief = generateBelief([
  { type: 'spline', controlX: [50, 65, 75, 85, 100], controlY: [0, 10, 25, 10, 0] }
], numBuckets, lowerBound, upperBound);
```

**Mixed, Gaussian peak + range floor:**

```typescript
const belief = generateBelief([
  { type: 'point', center: 80, spread: 3, weight: 2 },
  { type: 'range', low: 60, high: 100, weight: 0.5 },
], numBuckets, lowerBound, upperBound);
```

**How the Belief Flows into a Trade**

The belief vector is the input to two critical operations:

**1. Preview.** Pass to `ctx.setPreviewBelief(belief)` for instant chart overlay, and to `previewPayoutCurve()` for potential payout visualization:

```typescript
ctx.setPreviewBelief(belief);  // shows dashed overlay on consensus chart

const payout = await previewPayoutCurve(client, marketId, belief, collateral, numBuckets);
// payout.previews[i] = { outcome, payout, profitLoss }
```

**2. Execution.** Pass to `buy()` to open a real position:

```typescript
const result = await buy(client, marketId, belief, collateral, numBuckets);
// result = { positionId, belief, claims, collateral }
```

**Convenience Generators**

All L2 generators are thin wrappers around `generateBelief`. Use them for common single-shape beliefs:

| Function                                                                 | Equivalent `generateBelief` Call                                                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateGaussian(center, spread, numBuckets, lowerBound, upperBound)`                              | `generateBelief([{ type: 'point', center, spread }], numBuckets, lowerBound, upperBound)`                                                                                       |
| `generateRange(low, high, numBuckets, lowerBound, upperBound, sharpness?)`                          | `generateBelief([{ type: 'range', low, high, sharpness: sharpness ?? 1 }], numBuckets, lowerBound, upperBound)`  -- note: defaults to `1`, not `0`                            |
| `generateRange(ranges: RangeInput[], numBuckets, lowerBound, upperBound)`                           | `generateBelief(ranges.map(r => ({ type: 'range', ...r })), numBuckets, lowerBound, upperBound)`  -- uses each range's own `sharpness` (defaults to `0` at kernel level)          |
| `generateDip(center, spread, numBuckets, lowerBound, upperBound)`                                   | `generateBelief([{ type: 'point', center, spread: spread * 1.5, inverted: true }], numBuckets, lowerBound, upperBound)`                                                         |
| `generateLeftSkew(center, spread, numBuckets, lowerBound, upperBound, skewAmount?)`                 | `generateBelief([{ type: 'point', center, spread, skew: -skewAmount }], numBuckets, lowerBound, upperBound)`  -- `skewAmount` defaults to `1`                                     |
| `generateRightSkew(center, spread, numBuckets, lowerBound, upperBound, skewAmount?)`                | `generateBelief([{ type: 'point', center, spread, skew: skewAmount }], numBuckets, lowerBound, upperBound)`  -- `skewAmount` defaults to `1`                                      |
| `generateCustomShape(controlValues, numBuckets, lowerBound, upperBound)`                            | `generateBelief([{ type: 'spline', controlX: [evenly spaced lowerBound..upperBound], controlY: controlValues }], numBuckets, lowerBound, upperBound)`                                             |
| `generateBellShape(numPoints, peakPosition?, spread?, zeroTailPercent?)` | Not a belief. Generates raw Y-values for `CustomShapeEditor` initialization. Defaults: `peakPosition = 0.5`, `spread = 4`, `zeroTailPercent = 0.30`. |
