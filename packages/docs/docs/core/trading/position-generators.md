---
title: "Position Generators"
sidebar_position: 1
---

# Position Generators

**`generateBelief(regions, K, L, H)`: Universal Belief Generator**

**Layer:** L1 (Core). Every other generator (`generateGaussian`, `generateRange`, `generateDip`, etc.) delegates to this function. Use the convenience generators for common single-shape beliefs. Use `generateBelief` directly when you need multi-region composition or fine-grained control.

```typescript
function generateBelief(
  regions: Region[],
  K: number,
  L: number,
  H: number,
): BeliefVector  // number[] that sums to 1, length K+1
```

**Parameters:**

| Parameter | Type       | Description                                                                                                                                                                                                                                  |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `regions` | `Region[]` | One or more regions describing where probability mass should be concentrated. Regions are **additive**: their weighted kernels are summed before normalization. Can mix any combination of `PointRegion`, `RangeRegion`, and `SplineRegion`. |
| `K`       | `number`   | Number of outcome buckets (the vector will have `K + 1` elements). From `market.config.K`.                                                                                                                                                   |
| `L`       | `number`   | Lower bound of the outcome space. From `market.config.L`.                                                                                                                                                                                    |
| `H`       | `number`   | Upper bound of the outcome space. From `market.config.H`.                                                                                                                                                                                    |

**Where do K, L, H come from?** Every market has a `config` object with these values. You never hardcode them. Always destructure from the market:

```typescript
const { K, L, H } = market.config;
```

For example, a market asking "What will the temperature be?" might have `K = 100`, `L = 50`, `H = 120`, meaning 101 buckets spanning 50°F to 120°F.

**Return value:** A `BeliefVector` (`number[]`) of length `K + 1` where every element is ≥ 0 and the array sums to exactly 1. Each element represents the probability mass assigned to one outcome bucket. Element `[0]` corresponds to outcome `L`, element `[K]` corresponds to outcome `H`, with linear interpolation between.

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

**`RangeRegion`** (Flat plateau):

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
  controlX: number[]; // X positions in outcome space [L..H], must be sorted ascending
  controlY: number[]; // Y values (unnormalized heights, e.g., [0, 10, 25, 10, 0])
  weight?: number;    // Relative weight (default: 1)
}
```

Uses Fritsch-Carlson monotonic cubic Hermite interpolation to produce a smooth, overshoot-free curve through the control points. Negative outputs are clamped to 0. This is what powers the `CustomShapeEditor` UI widget.

**`RangeInput`** (For multi-range `generateRange` overload):

```typescript
interface RangeInput {
  low: number;
  high: number;
  weight?: number;
  sharpness?: number;
}
```

Used by the `generateRange(ranges[], K, L, H)` overload to pass multiple range specifications. Each `RangeInput` becomes a `RangeRegion` internally.

**How Composition Works**

When you pass multiple regions, `generateBelief` processes each into a raw kernel array, scales by `weight`, sums them element-wise, then normalizes the combined array to sum to 1:

```
for each region:
    kernel = computeKernel(region, K, L, H)
    combined[k] += kernel[k] * region.weight

return normalize(combined)  // divide by sum → sums to 1 (if sum ≤ 0, returns uniform distribution)
```

Regions are **additive, not multiplicative**. Two peaks at different locations create a bimodal distribution. A peak with `weight: 2` gets twice the probability mass of a peak with `weight: 1` (before normalization).

**Examples**

**Single Gaussian, "I think the outcome will be around 75":**

```typescript
const { K, L, H } = market.config;

const belief = generateBelief([
  { type: 'point', center: 75, spread: 5 }
], K, L, H);
```

**Bimodal, "I think it'll be either 60 or 90, leaning toward 90":**

```typescript
const belief = generateBelief([
  { type: 'point', center: 60, spread: 4, weight: 0.3 },
  { type: 'point', center: 90, spread: 4, weight: 0.7 },
], K, L, H);
```

**Range, "I think it'll land somewhere between 70 and 85":**

```typescript
const belief = generateBelief([
  { type: 'range', low: 70, high: 85, sharpness: 0.5 }
], K, L, H);
```

**Non-contiguous ranges, "Either 50-60 or 80-90, but not the middle":**

```typescript
const belief = generateBelief([
  { type: 'range', low: 50, high: 60 },
  { type: 'range', low: 80, high: 90 },
], K, L, H);
```

**Skewed peak, "Around 75 but could be higher":**

```typescript
const belief = generateBelief([
  { type: 'point', center: 75, spread: 5, skew: 0.8 }
], K, L, H);
```

**Dip, "Anything but 75":**

```typescript
const belief = generateBelief([
  { type: 'point', center: 75, spread: 5, inverted: true }
], K, L, H);
```

**Custom shape, freeform from control points:**

```typescript
const belief = generateBelief([
  { type: 'spline', controlX: [50, 65, 75, 85, 100], controlY: [0, 10, 25, 10, 0] }
], K, L, H);
```

**Mixed, Gaussian peak + range floor:**

```typescript
const belief = generateBelief([
  { type: 'point', center: 80, spread: 3, weight: 2 },
  { type: 'range', low: 60, high: 100, weight: 0.5 },
], K, L, H);
```

**How the Belief Flows into a Trade**

The belief vector is the input to two critical operations:

**1. Preview.** Pass to `ctx.setPreviewBelief(belief)` for instant chart overlay, and to `projectPayoutCurve()` for potential payout visualization:

```typescript
ctx.setPreviewBelief(belief);  // shows dashed overlay on consensus chart

const payout = await projectPayoutCurve(client, marketId, belief, collateral);
// payout.outcomes[i] = { outcome, payout, profitLoss }
```

**2. Execution.** Pass to `buy()` to open a real position:

```typescript
const result = await buy(client, marketId, belief, collateral);
// result = { positionId, belief, claims, collateral }
```

**Convenience Generators**

All L2 generators are thin wrappers around `generateBelief`. Use them for common single-shape beliefs:

| Function                                                                 | Equivalent `generateBelief` Call                                                                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generateGaussian(center, spread, K, L, H)`                              | `generateBelief([{ type: 'point', center, spread }], K, L, H)`                                                                                       |
| `generateRange(low, high, K, L, H, sharpness?)`                          | `generateBelief([{ type: 'range', low, high, sharpness: sharpness ?? 0.5 }], K, L, H)` — note: defaults to `0.5`, not `0`                            |
| `generateRange(ranges: RangeInput[], K, L, H)`                           | `generateBelief(ranges.map(r => ({ type: 'range', ...r })), K, L, H)` — uses each range's own `sharpness` (defaults to `0` at kernel level)          |
| `generatePlateau(low, high, K, L, H, sharpness?)`                        | Deprecated alias for `generateRange` (single-range form). `sharpness` defaults to `0.5`.                                                             |
| `generateDip(center, spread, K, L, H)`                                   | `generateBelief([{ type: 'point', center, spread: spread * 1.5, inverted: true }], K, L, H)`                                                         |
| `generateLeftSkew(center, spread, K, L, H, skewAmount?)`                 | `generateBelief([{ type: 'point', center, spread, skew: -skewAmount }], K, L, H)` — `skewAmount` defaults to `1`                                     |
| `generateRightSkew(center, spread, K, L, H, skewAmount?)`                | `generateBelief([{ type: 'point', center, spread, skew: skewAmount }], K, L, H)` — `skewAmount` defaults to `1`                                      |
| `generateCustomShape(controlValues, K, L, H)`                            | `generateBelief([{ type: 'spline', controlX: [evenly spaced L..H], controlY: controlValues }], K, L, H)`                                             |
| `generateBellShape(numPoints, peakPosition?, spread?, zeroTailPercent?)` | Not a belief. Generates raw Y-values for `CustomShapeEditor` initialization. Defaults: `peakPosition = 0.5`, `spread = 4`, `zeroTailPercent = 0.30`. |
