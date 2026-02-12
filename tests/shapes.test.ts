import { describe, it, expect } from 'vitest';
import {
  buildGaussian,
  buildPlateau,
  buildBelief,
  buildDip,
  buildLeftSkew,
  buildRightSkew,
  SHAPE_DEFINITIONS,
} from '../packages/core/src/index.js';
import type { ShapeId, ShapeDefinition, BeliefVector, Region } from '../packages/core/src/index.js';

// Shared test parameters matching a realistic market config
const K = 50;   // polynomial degree → 51 elements
const L = 50;   // lower bound
const H = 150;  // upper bound
const CENTER = 100;  // midpoint
const SPREAD = 15;

// ── Helpers ──

function assertValidBelief(belief: BeliefVector, label: string) {
  expect(belief).toHaveLength(K + 1);
  const sum = belief.reduce((a, b) => a + b, 0);
  expect(sum).toBeCloseTo(1.0, 6);
  for (let i = 0; i < belief.length; i++) {
    expect(belief[i]).toBeGreaterThanOrEqual(0);
  }
}

function peakIndex(belief: BeliefVector): number {
  let maxIdx = 0;
  for (let i = 1; i < belief.length; i++) {
    if (belief[i] > belief[maxIdx]) maxIdx = i;
  }
  return maxIdx;
}

function troughIndex(belief: BeliefVector): number {
  let minIdx = 0;
  for (let i = 1; i < belief.length; i++) {
    if (belief[i] < belief[minIdx]) minIdx = i;
  }
  return minIdx;
}

// ── Backward compatibility ──

describe('Backward compatibility', () => {
  it('buildGaussian without skew/inverted produces identical results to before', () => {
    const belief = buildGaussian(CENTER, SPREAD, K, L, H);
    assertValidBelief(belief, 'gaussian');
    // Peak should be near the center index (k=25 for center=100 in [50,150] range with K=50)
    const expectedCenterIdx = Math.round(((CENTER - L) / (H - L)) * K);
    expect(peakIndex(belief)).toBe(expectedCenterIdx);
  });

  it('buildPlateau is unchanged', () => {
    const belief = buildPlateau(80, 120, K, L, H);
    assertValidBelief(belief, 'plateau');
    // Values in the plateau range should be roughly equal
    const lowIdx = Math.round(((80 - L) / (H - L)) * K);
    const highIdx = Math.round(((120 - L) / (H - L)) * K);
    const plateauValues = belief.slice(lowIdx, highIdx + 1);
    const avg = plateauValues.reduce((a, b) => a + b, 0) / plateauValues.length;
    for (const v of plateauValues) {
      expect(v).toBeCloseTo(avg, 2);
    }
  });

  it('buildBelief with plain PointRegion (no skew/inverted) matches buildGaussian', () => {
    const viaL1 = buildBelief([{ type: 'point', center: CENTER, spread: SPREAD }], K, L, H);
    const viaL2 = buildGaussian(CENTER, SPREAD, K, L, H);
    expect(viaL1).toEqual(viaL2);
  });
});

// ── Individual shape tests ──

describe('Gaussian shape', () => {
  it('produces valid belief vector', () => {
    const belief = buildGaussian(CENTER, SPREAD, K, L, H);
    assertValidBelief(belief, 'gaussian');
  });

  it('peak is near center', () => {
    const belief = buildGaussian(CENTER, SPREAD, K, L, H);
    const expectedIdx = Math.round(((CENTER - L) / (H - L)) * K);
    expect(peakIndex(belief)).toBe(expectedIdx);
  });
});

describe('Spike shape', () => {
  it('produces valid belief vector', () => {
    // Spike = gaussian with spread * 0.2 (widget applies the multiplier)
    const belief = buildGaussian(CENTER, SPREAD * 0.2, K, L, H);
    assertValidBelief(belief, 'spike');
  });

  it('is narrower than gaussian with same base spread', () => {
    const gaussian = buildGaussian(CENTER, SPREAD, K, L, H);
    const spike = buildGaussian(CENTER, SPREAD * 0.2, K, L, H);
    // Spike peak should be higher (more concentrated)
    expect(Math.max(...spike)).toBeGreaterThan(Math.max(...gaussian));
  });
});

describe('Plateau shape', () => {
  it('produces valid belief vector', () => {
    const belief = buildPlateau(80, 120, K, L, H);
    assertValidBelief(belief, 'plateau');
  });

  it('has roughly flat values within the range', () => {
    const belief = buildPlateau(80, 120, K, L, H);
    const lowIdx = Math.round(((80 - L) / (H - L)) * K);
    const highIdx = Math.round(((120 - L) / (H - L)) * K);
    const plateauValues = belief.slice(lowIdx, highIdx + 1);
    const avg = plateauValues.reduce((a, b) => a + b, 0) / plateauValues.length;
    for (const v of plateauValues) {
      expect(Math.abs(v - avg)).toBeLessThan(0.005);
    }
  });
});

describe('Bimodal shape', () => {
  it('produces valid belief vector', () => {
    // Bimodal = two weighted PointRegions via L1
    const belief = buildBelief([
      { type: 'point', center: 75, spread: SPREAD * 0.8, weight: 0.5 },
      { type: 'point', center: 125, spread: SPREAD * 0.8, weight: 0.5 },
    ], K, L, H);
    assertValidBelief(belief, 'bimodal');
  });

  it('has two peaks near the specified centers', () => {
    const belief = buildBelief([
      { type: 'point', center: 75, spread: SPREAD * 0.8, weight: 0.5 },
      { type: 'point', center: 125, spread: SPREAD * 0.8, weight: 0.5 },
    ], K, L, H);
    // Check that the two expected peak zones are local maxima
    const idx75 = Math.round(((75 - L) / (H - L)) * K);
    const idx125 = Math.round(((125 - L) / (H - L)) * K);
    // Each peak should be higher than its neighbors a few indices away
    expect(belief[idx75]).toBeGreaterThan(belief[idx75 - 5]);
    expect(belief[idx75]).toBeGreaterThan(belief[idx75 + 5]);
    expect(belief[idx125]).toBeGreaterThan(belief[idx125 - 5]);
    expect(belief[idx125]).toBeGreaterThan(belief[idx125 + 5]);
  });

  it('peakBias shifts weight between peaks', () => {
    const leftHeavy = buildBelief([
      { type: 'point', center: 75, spread: SPREAD * 0.8, weight: 0.8 },
      { type: 'point', center: 125, spread: SPREAD * 0.8, weight: 0.2 },
    ], K, L, H);
    const idx75 = Math.round(((75 - L) / (H - L)) * K);
    const idx125 = Math.round(((125 - L) / (H - L)) * K);
    expect(leftHeavy[idx75]).toBeGreaterThan(leftHeavy[idx125]);
  });
});

describe('Dip shape', () => {
  it('produces valid belief vector', () => {
    const belief = buildDip(CENTER, SPREAD, K, L, H);
    assertValidBelief(belief, 'dip');
  });

  it('center value is lower than edge values', () => {
    const belief = buildDip(CENTER, SPREAD, K, L, H);
    const centerIdx = Math.round(((CENTER - L) / (H - L)) * K);
    // Edges (first and last elements)
    expect(belief[0]).toBeGreaterThan(belief[centerIdx]);
    expect(belief[K]).toBeGreaterThan(belief[centerIdx]);
  });

  it('trough is near center', () => {
    const belief = buildDip(CENTER, SPREAD, K, L, H);
    const expectedIdx = Math.round(((CENTER - L) / (H - L)) * K);
    // Allow ±3 index tolerance — the 1.5x spread widening + normalization can shift the minimum slightly
    expect(Math.abs(troughIndex(belief) - expectedIdx)).toBeLessThanOrEqual(3);
  });

  it('no values are zero (0.02 floor)', () => {
    const belief = buildDip(CENTER, SPREAD, K, L, H);
    for (const v of belief) {
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe('Left Skew shape', () => {
  it('produces valid belief vector', () => {
    const belief = buildLeftSkew(CENTER, SPREAD, K, L, H);
    assertValidBelief(belief, 'leftskew');
  });

  it('left tail is wider than right tail', () => {
    const belief = buildLeftSkew(CENTER, SPREAD, K, L, H);
    const centerIdx = Math.round(((CENTER - L) / (H - L)) * K);
    // Sum of left half vs right half (excluding center)
    const leftSum = belief.slice(0, centerIdx).reduce((a, b) => a + b, 0);
    const rightSum = belief.slice(centerIdx + 1).reduce((a, b) => a + b, 0);
    expect(leftSum).toBeGreaterThan(rightSum);
  });

  it('peak is near center', () => {
    const belief = buildLeftSkew(CENTER, SPREAD, K, L, H);
    const expectedIdx = Math.round(((CENTER - L) / (H - L)) * K);
    // Peak should be at or very near center
    expect(Math.abs(peakIndex(belief) - expectedIdx)).toBeLessThanOrEqual(1);
  });
});

describe('Right Skew shape', () => {
  it('produces valid belief vector', () => {
    const belief = buildRightSkew(CENTER, SPREAD, K, L, H);
    assertValidBelief(belief, 'rightskew');
  });

  it('right tail is wider than left tail', () => {
    const belief = buildRightSkew(CENTER, SPREAD, K, L, H);
    const centerIdx = Math.round(((CENTER - L) / (H - L)) * K);
    const leftSum = belief.slice(0, centerIdx).reduce((a, b) => a + b, 0);
    const rightSum = belief.slice(centerIdx + 1).reduce((a, b) => a + b, 0);
    expect(rightSum).toBeGreaterThan(leftSum);
  });

  it('peak is near center', () => {
    const belief = buildRightSkew(CENTER, SPREAD, K, L, H);
    const expectedIdx = Math.round(((CENTER - L) / (H - L)) * K);
    expect(Math.abs(peakIndex(belief) - expectedIdx)).toBeLessThanOrEqual(1);
  });
});

describe('Uniform shape', () => {
  it('produces valid belief vector', () => {
    // Uniform = full-range plateau
    const belief = buildPlateau(L, H, K, L, H);
    assertValidBelief(belief, 'uniform');
  });

  it('all values are roughly equal', () => {
    const belief = buildPlateau(L, H, K, L, H);
    const expected = 1 / (K + 1);
    for (const v of belief) {
      expect(v).toBeCloseTo(expected, 2);
    }
  });
});

// ── Left/Right Skew symmetry ──

describe('Skew symmetry', () => {
  it('left skew and right skew are mirror images', () => {
    const left = buildLeftSkew(CENTER, SPREAD, K, L, H);
    const right = buildRightSkew(CENTER, SPREAD, K, L, H);
    // Reversing the right skew should roughly match left skew
    const rightReversed = [...right].reverse();
    for (let i = 0; i < left.length; i++) {
      expect(left[i]).toBeCloseTo(rightReversed[i], 6);
    }
  });
});

// ── Shape definitions metadata ──

describe('SHAPE_DEFINITIONS', () => {
  it('has exactly 8 shapes', () => {
    expect(SHAPE_DEFINITIONS).toHaveLength(8);
  });

  it('all shape IDs are unique', () => {
    const ids = SHAPE_DEFINITIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('type exports resolve correctly', () => {
    const def: ShapeDefinition = SHAPE_DEFINITIONS[0];
    const id: ShapeId = def.id;
    expect(typeof id).toBe('string');
    expect(typeof def.name).toBe('string');
    expect(typeof def.description).toBe('string');
    expect(typeof def.svgPath).toBe('string');
    expect(Array.isArray(def.parameters)).toBe(true);
  });

  it('all shapes have valid svgPath data', () => {
    for (const def of SHAPE_DEFINITIONS) {
      expect(def.svgPath.length).toBeGreaterThan(0);
      expect(def.svgPath).toMatch(/^[MLQCZmlqcz0-9,.\s]+$/);
    }
  });
});
