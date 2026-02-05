import type { BeliefVector } from '../types.js';

// ── Region types ──

export type Region = PointRegion | RangeRegion;

export interface PointRegion {
  type: 'point';
  center: number;
  spread: number;
  weight?: number;
}

export interface RangeRegion {
  type: 'range';
  low: number;
  high: number;
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
  center: number,
  spread: number,
  K: number,
  L: number,
  H: number,
): number[] {
  const uCenter = (center - L) / (H - L);
  const uSpread = spread / (H - L);
  const raw = new Array<number>(K + 1);
  for (let k = 0; k <= K; k++) {
    const u = k / K;
    const diff = (u - uCenter) / uSpread;
    raw[k] = Math.exp(-0.5 * diff * diff);
  }
  return raw;
}

function rangeKernel(
  low: number,
  high: number,
  K: number,
  L: number,
  H: number,
): number[] {
  const uLow = (low - L) / (H - L);
  const uHigh = (high - L) / (H - L);
  const EPS = 0.001;
  const taperWidth = 2 / K;
  const raw = new Array<number>(K + 1);
  for (let k = 0; k <= K; k++) {
    const u = k / K;
    if (u >= uLow && u <= uHigh) {
      raw[k] = 1.0;
    } else if (u < uLow && u >= uLow - taperWidth) {
      const t = (uLow - u) / taperWidth;
      raw[k] = 0.5 * (1 + Math.cos(Math.PI * t));
    } else if (u > uHigh && u <= uHigh + taperWidth) {
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
      ? pointKernel(region.center, region.spread, K, L, H)
      : rangeKernel(region.low, region.high, K, L, H);

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
): BeliefVector {
  return buildBelief([{ type: 'range', low, high }], K, L, H);
}
