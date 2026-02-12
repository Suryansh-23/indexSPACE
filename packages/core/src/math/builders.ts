import type { BeliefVector } from '../types.js';

// ── Region types ──

export type Region = PointRegion | RangeRegion;

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

// ── Public API ──

/**
 * L1: Universal constructor. Accepts array of regions, combines and normalizes.
 * All other builders resolve through this function.
 */
export function buildBelief(
  regions: Region[],
  K: number,
  L: number,
  H: number,
): BeliefVector {
  const combined = new Array<number>(K + 1).fill(0);

  for (const region of regions) {
    const weight = region.weight ?? 1;
    const raw = region.type === 'point'
      ? pointKernel(region, K, L, H)
      : rangeKernel(region, K, L, H);

    for (let k = 0; k <= K; k++) {
      combined[k] += raw[k] * weight;
    }
  }

  return normalize(combined);
}

/**
 * L2: Gaussian (bell curve) builder.
 * Resolves through buildBelief with a single PointRegion.
 */
export function buildGaussian(
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
): BeliefVector {
  return buildBelief([{ type: 'point', center, spread }], K, L, H);
}

/**
 * L2: Plateau (flat range) builder.
 * Resolves through buildBelief with a single RangeRegion.
 */
export function buildPlateau(
  low: number,
  high: number,
  K: number,
  L: number,
  H: number,
  sharpness: number = 0.5,
): BeliefVector {
  return buildBelief([{ type: 'range', low, high, sharpness }], K, L, H);
}

/**
 * L2: Dip (inverted gaussian) builder.
 * High probability at edges, low at center.
 * Resolves through buildBelief with an inverted PointRegion.
 */
export function buildDip(
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
): BeliefVector {
  return buildBelief([{ type: 'point', center, spread: spread * 1.5, inverted: true }], K, L, H);
}

/**
 * L2: Left-skewed distribution builder.
 * Asymmetric: wider tail on the left, sharper drop on the right.
 * Resolves through buildBelief with a negatively-skewed PointRegion.
 */
export function buildLeftSkew(
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
  skewAmount: number = 1,
): BeliefVector {
  return buildBelief([{ type: 'point', center, spread, skew: -skewAmount }], K, L, H);
}

/**
 * L2: Right-skewed distribution builder.
 * Asymmetric: sharper drop on the left, wider tail on the right.
 * Resolves through buildBelief with a positively-skewed PointRegion.
 */
export function buildRightSkew(
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
  skewAmount: number = 1,
): BeliefVector {
  return buildBelief([{ type: 'point', center, spread, skew: skewAmount }], K, L, H);
}
