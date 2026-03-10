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
  sharpness?: number;  // 0 = smooth cosine taper (default), 1 = hard cliff edges
}

export interface SplineRegion {
  type: 'spline';
  controlX: number[];  // X positions in outcome space [L..H], must be sorted ascending
  controlY: number[];  // Y values (unnormalized, e.g. [0, 25])
  weight?: number;
}

// ── Internal helpers ──

function normalize(raw: number[]): BeliefVector {
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const len = raw.length;
    return raw.map(() => 1 / len);
  }
  return raw.map((v) => v / sum);
}

function pointKernel(
  region: PointRegion,
  K: number,
  L: number,
  H: number,
): number[] {
  const uCenter = (region.center - L) / (H - L);
  const uSpread = region.spread / (H - L);
  const raw = new Array<number>(K + 1);

  for (let k = 0; k <= K; k++) {
    const u = k / K;

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
  K: number,
  L: number,
  H: number,
): number[] {
  const uLow = (region.low - L) / (H - L);
  const uHigh = (region.high - L) / (H - L);
  const sharpness = region.sharpness ?? 0;

  // Interpolate EPS: 0.001 (smooth) → 0.0001 (sharp)
  const EPS = 0.001 - sharpness * 0.0009;
  // Interpolate taper width: 2/K (smooth) → 0 (sharp)
  const taperWidth = (2 / K) * (1 - sharpness);

  const raw = new Array<number>(K + 1);
  for (let k = 0; k <= K; k++) {
    const u = k / K;
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
 * Fritsch-Carlson monotonic piecewise cubic Hermite spline interpolation.
 * Produces a smooth, overshoot-free curve through the control points.
 * Negative output values are clamped to 0.
 */
function splineKernel(
  region: SplineRegion,
  K: number,
  L: number,
  H: number,
): number[] {
  const { controlX, controlY } = region;
  const n = controlX.length;

  // Degenerate: single point → flat
  if (n <= 1) {
    const val = n === 1 ? Math.max(0, controlY[0]) : 0;
    return new Array<number>(K + 1).fill(val);
  }

  // Step 1: Compute interval widths (h) and slopes (delta)
  const h = new Array<number>(n - 1);
  const delta = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = controlX[i + 1] - controlX[i];
    delta[i] = h[i] > 0 ? (controlY[i + 1] - controlY[i]) / h[i] : 0;
  }

  // Step 2: Compute initial tangents
  const m = new Array<number>(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = (delta[i - 1] + delta[i]) / 2;
  }

  // Step 3: Fritsch-Carlson monotonicity correction
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(delta[i]) < 1e-10) {
      // Flat segment — zero tangents at both endpoints
      m[i] = 0;
      m[i + 1] = 0;
    } else {
      const alpha = m[i] / delta[i];
      const beta = m[i + 1] / delta[i];
      const tau = alpha * alpha + beta * beta;
      if (tau > 9) {
        const tauScale = 3 / Math.sqrt(tau);
        m[i] = tauScale * alpha * delta[i];
        m[i + 1] = tauScale * beta * delta[i];
      }
    }
  }

  // Step 4: Zero tangents at local extrema
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      m[i] = 0;
    }
  }

  // Step 5: Evaluate at K+1 uniformly spaced output points
  const raw = new Array<number>(K + 1);
  for (let k = 0; k <= K; k++) {
    const x = L + (k / K) * (H - L);

    // Clamp to control range — flat extension outside
    if (x <= controlX[0]) {
      raw[k] = Math.max(0, controlY[0]);
      continue;
    }
    if (x >= controlX[n - 1]) {
      raw[k] = Math.max(0, controlY[n - 1]);
      continue;
    }

    // Find interval: controlX[seg] <= x < controlX[seg+1]
    let seg = 0;
    for (let i = n - 2; i >= 0; i--) {
      if (x >= controlX[i]) { seg = i; break; }
    }

    // Hermite basis interpolation
    const t = (x - controlX[seg]) / h[seg];
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const value = h00 * controlY[seg]
      + h10 * h[seg] * m[seg]
      + h01 * controlY[seg + 1]
      + h11 * h[seg] * m[seg + 1];

    raw[k] = Math.max(0, value);
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
  K: number,
  L: number,
  H: number,
): BeliefVector {
  const combined = new Array<number>(K + 1).fill(0);

  for (const region of regions) {
    const weight = region.weight ?? 1;
    let raw: number[];
    if (region.type === 'point') raw = pointKernel(region, K, L, H);
    else if (region.type === 'range') raw = rangeKernel(region, K, L, H);
    else raw = splineKernel(region, K, L, H);

    for (let k = 0; k <= K; k++) {
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
  K: number,
  L: number,
  H: number,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread }], K, L, H);
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
 * Multiple ranges are composed into one belief vector — e.g., three non-contiguous
 * bucket selections become three range regions in a single normalized vector.
 * Resolves through generateBelief with RangeRegion[].
 */
export function generateRange(low: number, high: number, K: number, L: number, H: number, sharpness?: number): BeliefVector;
export function generateRange(ranges: RangeInput[], K: number, L: number, H: number): BeliefVector;
export function generateRange(
  lowOrRanges: number | RangeInput[],
  highOrK: number,
  KOrL: number,
  LOrH: number,
  HOrUndefined?: number,
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
    return generateBelief(regions, highOrK, KOrL, LOrH);
  }
  return generateBelief(
    [{ type: 'range', low: lowOrRanges, high: highOrK, sharpness: sharpness ?? 0.5 }],
    KOrL, LOrH, HOrUndefined!,
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
  K: number,
  L: number,
  H: number,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread: spread * 1.5, inverted: true }], K, L, H);
}

/**
 * L2: Left-skewed distribution generator.
 * Asymmetric: wider tail on the left, sharper drop on the right.
 * Resolves through generateBelief with a negatively-skewed PointRegion.
 */
export function generateLeftSkew(
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
  skewAmount: number = 1,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread, skew: -skewAmount }], K, L, H);
}

/**
 * L2: Right-skewed distribution generator.
 * Asymmetric: sharper drop on the left, wider tail on the right.
 * Resolves through generateBelief with a positively-skewed PointRegion.
 */
export function generateRightSkew(
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
  skewAmount: number = 1,
): BeliefVector {
  return generateBelief([{ type: 'point', center, spread, skew: skewAmount }], K, L, H);
}

/**
 * L2: Custom shape generator using cubic spline interpolation.
 * Converts N control point values into a belief vector via Fritsch-Carlson spline.
 * Control points are uniformly spaced from L to H.
 * Resolves through generateBelief with a single SplineRegion.
 */
export function generateCustomShape(
  controlValues: number[],
  K: number,
  L: number,
  H: number,
): BeliefVector {
  const N = controlValues.length;
  const controlX = controlValues.map((_, i) =>
    N === 1 ? (L + H) / 2 : L + (i / (N - 1)) * (H - L),
  );
  return generateBelief(
    [{ type: 'spline', controlX, controlY: controlValues }],
    K, L, H,
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
