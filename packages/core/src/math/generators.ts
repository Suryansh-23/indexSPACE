import type { BeliefVector } from '../types.js';

// ── Region types ──

export type Region = PointRegion | RangeRegion | SplineRegion;

export interface PointRegion {
  type: 'point';
  center: number;
  spread: number;
  weight?: number;
  skew?: number;       // Asymmetry: -1 = wider left tail, 1 = wider right tail, 0/undefined = symmetric
  inverted?: boolean;  // true = dip shape (high at edges, low at center)
}

export interface RangeRegion {
  type: 'range';
  low: number;
  high: number;
  weight?: number;
  sharpness?: number;  // Edge sharpness: 0 = smooth cosine taper, 1 = hard cliff edges (default for single-range generateRange)
}

export interface SplineRegion {
  type: 'spline';
  controlX: number[];  // X positions in outcome space [lowerBound..upperBound], must be sorted ascending
  controlY: number[];  // Y values (unnormalized, e.g. [0, 25])
  weight?: number;
}

// ── Internal helpers ──

function normalize(raw: number[]): BeliefVector {
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return raw.map(() => 1);
  }
  const target = raw.length;
  return raw.map((v) => v * target / sum);
}

function pointKernel(
  region: PointRegion,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): number[] {
  const uCenter = (region.center - lowerBound) / (upperBound - lowerBound);
  const uSpread = region.spread / (upperBound - lowerBound);
  const raw = new Array<number>(numBuckets + 2);

  for (let k = 0; k <= numBuckets + 1; k++) {
    const u = k / (numBuckets + 1);

    // Skew: use different effective spread on each side of center
    // |skew| controls intensity (0=symmetric, 1=full asymmetry)
    // Sign controls direction: negative=wider left, positive=wider right
    let effectiveSpread = uSpread;
    if (region.skew) {
      const intensity = Math.abs(region.skew);
      const widerMul = 1 + 2.0 * intensity;    // 1.0 → 3.0
      const narrowMul = 1 - 0.7 * intensity;   // 1.0 → 0.3
      if (u < uCenter) {
        effectiveSpread = uSpread * (region.skew < 0 ? widerMul : narrowMul);
      } else {
        effectiveSpread = uSpread * (region.skew > 0 ? widerMul : narrowMul);
      }
    }

    const diff = (u - uCenter) / effectiveSpread;
    let value = Math.exp(-0.5 * diff * diff);

    // Inversion: flip the gaussian to create a dip (high edges, low center)
    if (region.inverted) {
      value = Math.max(1 - value, 0.02);
    }

    raw[k] = value;
  }

  return raw;
}

function rangeKernel(
  region: RangeRegion,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): number[] {
  const uLow = (region.low - lowerBound) / (upperBound - lowerBound);
  const uHigh = (region.high - lowerBound) / (upperBound - lowerBound);
  const sharpness = region.sharpness ?? 0;

  // Interpolate EPS: 0.001 (smooth) → 0.0001 (sharp)
  const EPS = 0.001 - sharpness * 0.0009;
  // Interpolate taper width: 2/numBuckets (smooth) → 0 (sharp)
  const taperWidth = (2 / numBuckets) * (1 - sharpness);

  const raw = new Array<number>(numBuckets + 2);
  for (let k = 0; k <= numBuckets + 1; k++) {
    const u = k / (numBuckets + 1);
    if (u >= uLow && u <= uHigh) {
      raw[k] = 1.0;
    } else if (taperWidth > 0 && u < uLow && u >= uLow - taperWidth) {
      const t = (uLow - u) / taperWidth;
      raw[k] = 0.5 * (1 + Math.cos(Math.PI * t));
    } else if (taperWidth > 0 && u > uHigh && u <= uHigh + taperWidth) {
      const t = (u - uHigh) / taperWidth;
      raw[k] = 0.5 * (1 + Math.cos(Math.PI * t));
    } else {
      raw[k] = EPS;
    }
  }
  return raw;
}

/**
 * Quadratic B-spline evaluation matching the fs_core backend.
 * This is an approximating spline -- the curve does NOT pass through control
 * points. Control Y values are treated as B-spline control point weights.
 * Negative output values are clamped to 0 as a safety measure.
 */
function splineKernel(
  region: SplineRegion,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): number[] {
  const { controlX, controlY } = region;
  const n = controlX.length;

  // Degenerate: single point or empty -- flat
  if (n <= 1) {
    const val = n === 1 ? Math.max(0, controlY[0]) : 0;
    return new Array<number>(numBuckets + 2).fill(val);
  }

  // Normalize control X positions to [0, 1]
  const range = upperBound - lowerBound;
  const xMin = controlX[0];
  const xMax = controlX[n - 1];
  const normalizedXMin = (xMin - lowerBound) / range;
  const normalizedXMax = (xMax - lowerBound) / range;

  // B-spline parameters: N cells between n control points
  const N = n - 1; // number of cells in control point space
  const h = 1 / N; // uniform knot spacing in control point space

  // Evaluate at numBuckets+2 uniformly spaced output points
  const raw = new Array<number>(numBuckets + 2);
  for (let i = 0; i <= numBuckets + 1; i++) {
    const u = i / (numBuckets + 1); // output position in [0, 1]

    // Flat extension outside control point range
    // At boundaries, B-spline evaluates to c * 0.5 for the edge control point
    if (u <= normalizedXMin) {
      raw[i] = Math.max(0, controlY[0] * 0.5);
      continue;
    }
    if (u >= normalizedXMax) {
      raw[i] = Math.max(0, controlY[N] * 0.5);
      continue;
    }

    // Map u from [normalizedXMin, normalizedXMax] to control point space [0, 1]
    const x = (u - normalizedXMin) / (normalizedXMax - normalizedXMin);

    // Find which control point cell x falls in
    const k = Math.min(Math.floor(x / h), N - 1);
    const tau = x - k * h;

    // Look up three control point Y values with boundary handling
    const cPrev = k > 0 ? controlY[k - 1] : 0;
    const cCurr = controlY[k];
    const cNext = k + 1 < controlY.length ? controlY[k + 1] : 0;

    // Quadratic B-spline evaluation
    const value =
      cPrev * (h - tau) * (h - tau) / (2 * h * h) +
      cCurr * (0.5 + tau / h - (tau * tau) / (h * h)) +
      cNext * (tau * tau) / (2 * h * h);

    raw[i] = Math.max(0, value);
  }

  return raw;
}

// ── Public API ──

/**
 * L1: Universal constructor. Accepts array of regions, combines and normalizes.
 * All other generators resolve through this function.
 */
export function generateBelief(
  regions: Region[],
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): BeliefVector {
  const combined = new Array<number>(numBuckets + 2).fill(0);

  for (const region of regions) {
    const weight = region.weight ?? 1;
    let raw: number[];
    if (region.type === 'point') raw = pointKernel(region, numBuckets, lowerBound, upperBound);
    else if (region.type === 'range') raw = rangeKernel(region, numBuckets, lowerBound, upperBound);
    else raw = splineKernel(region, numBuckets, lowerBound, upperBound);

    for (let k = 0; k <= numBuckets + 1; k++) {
      combined[k] += raw[k] * weight;
    }
  }

  return normalize(combined);
}

/**
 * L2: Gaussian (bell curve) generator.
 * Resolves through generateBelief with a single PointRegion.
 */
export function generateGaussian(
  center: number,
  spread: number,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread }], numBuckets, lowerBound, upperBound);
}

// ── Range input type (for multi-range L2 convenience) ──

export interface RangeInput {
  low: number;
  high: number;
  weight?: number;
  sharpness?: number;
}

/**
 * L2: Range belief generator. Supports single or multiple outcome ranges.
 * Each range becomes a RangeRegion with configurable sharpness (0 = smooth taper, 1 = hard cliff).
 * Multiple ranges are composed into one belief vector  -- e.g., three non-contiguous
 * bucket selections become three range regions in a single normalized vector.
 * Resolves through generateBelief with RangeRegion[].
 */
export function generateRange(low: number, high: number, numBuckets: number, lowerBound: number, upperBound: number, sharpness?: number): BeliefVector;
export function generateRange(ranges: RangeInput[], numBuckets: number, lowerBound: number, upperBound: number): BeliefVector;
export function generateRange(
  lowOrRanges: number | RangeInput[],
  highOrNumBuckets: number,
  numBucketsOrLowerBound: number,
  lowerBoundOrUpperBound: number,
  upperBoundOrUndefined?: number,
  sharpness?: number,
): BeliefVector {
  if (Array.isArray(lowOrRanges)) {
    const regions: RangeRegion[] = lowOrRanges.map((r) => ({
      type: 'range' as const,
      low: r.low,
      high: r.high,
      weight: r.weight,
      sharpness: r.sharpness,
    }));
    return generateBelief(regions, highOrNumBuckets, numBucketsOrLowerBound, lowerBoundOrUpperBound);
  }
  return generateBelief(
    [{ type: 'range', low: lowOrRanges, high: highOrNumBuckets, sharpness: sharpness ?? 1 }],
    numBucketsOrLowerBound, lowerBoundOrUpperBound, upperBoundOrUndefined!,
  );
}


/**
 * L2: Dip (inverted gaussian) generator.
 * High probability at edges, low at center.
 * Resolves through generateBelief with an inverted PointRegion.
 */
export function generateDip(
  center: number,
  spread: number,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread: spread * 1.5, inverted: true }], numBuckets, lowerBound, upperBound);
}

/**
 * L2: Left-skewed distribution generator.
 * Asymmetric: wider tail on the left, sharper drop on the right.
 * Resolves through generateBelief with a negatively-skewed PointRegion.
 */
export function generateLeftSkew(
  center: number,
  spread: number,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
  skewAmount: number = 1,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread, skew: -skewAmount }], numBuckets, lowerBound, upperBound);
}

/**
 * L2: Right-skewed distribution generator.
 * Asymmetric: sharper drop on the left, wider tail on the right.
 * Resolves through generateBelief with a positively-skewed PointRegion.
 */
export function generateRightSkew(
  center: number,
  spread: number,
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
  skewAmount: number = 1,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread, skew: skewAmount }], numBuckets, lowerBound, upperBound);
}

/**
 * L2: Custom shape generator using quadratic B-spline evaluation.
 * Converts N control point values into a belief vector via quadratic B-spline,
 * matching the fs_core backend implementation.
 * Control points are uniformly spaced from lowerBound to upperBound.
 * Resolves through generateBelief with a single SplineRegion.
 */
export function generateCustomShape(
  controlValues: number[],
  numBuckets: number,
  lowerBound: number,
  upperBound: number,
): BeliefVector {
  const N = controlValues.length;
  const controlX = controlValues.map((_, i) =>
    N === 1 ? (lowerBound + upperBound) / 2 : lowerBound + (i / (N - 1)) * (upperBound - lowerBound),
  );
  return generateBelief(
    [{ type: 'spline', controlX, controlY: controlValues }],
    numBuckets, lowerBound, upperBound,
  );
}

/**
 * Generate initial bell-shaped control values for the custom shape editor.
 * Outer tails (zeroTailPercent on each end) are set to 0.
 * Inner values follow a Gaussian bell curve centered at peakPosition.
 */
export function generateBellShape(
  numPoints: number,
  peakPosition: number = 0.5,
  spread: number = 4,
  zeroTailPercent: number = 0.30,
): number[] {
  const values: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    const t = numPoints === 1 ? 0.5 : i / (numPoints - 1);
    if (t < zeroTailPercent || t > 1 - zeroTailPercent) {
      values.push(0);
    } else {
      const d = (t - peakPosition) * spread;
      values.push(Math.exp(-(d * d)));
    }
  }
  return values;
}
