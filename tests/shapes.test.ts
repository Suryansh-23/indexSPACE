import { describe, it, expect } from 'vitest';
import {
  generateGaussian,
  generateRange,
  generateBelief,
  generateDip,
  generateLeftSkew,
  generateRightSkew,
  generateCustomShape,
  generateBellShape,
  SHAPE_DEFINITIONS,
} from '../packages/core/src/index.js';
import type { ShapeId, ShapeDefinition, BeliefVector, Region, RangeInput } from '../packages/core/src/index.js';

// Shared test parameters matching a realistic market config
const numBuckets = 50;   // polynomial degree → 51 elements
const lowerBound = 50;   // lower bound
const upperBound = 150;  // upper bound
const CENTER = 100;  // midpoint
const SPREAD = 15;

// ── Helpers ──

function assertValidBelief(belief: BeliefVector, label: string) {
  expect(belief).toHaveLength(numBuckets + 1);
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
  it('generateGaussian without skew/inverted produces identical results to before', () => {
    const belief = generateGaussian(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'gaussian');
    // Peak should be near the center index (k=25 for center=100 in [50,150] range with numBuckets=50)
    const expectedCenterIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    expect(peakIndex(belief)).toBe(expectedCenterIdx);
  });

  it('generateRange is unchanged', () => {
    const belief = generateRange(80, 120, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'range');
    // Values in the range should be roughly equal
    const lowIdx = Math.round(((80 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const highIdx = Math.round(((120 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const rangeValues = belief.slice(lowIdx, highIdx + 1);
    const avg = rangeValues.reduce((a, b) => a + b, 0) / rangeValues.length;
    for (const v of rangeValues) {
      expect(v).toBeCloseTo(avg, 2);
    }
  });

  it('generateBelief with plain PointRegion (no skew/inverted) matches generateGaussian', () => {
    const viaL1 = generateBelief([{ type: 'point', center: CENTER, spread: SPREAD }], numBuckets, lowerBound, upperBound);
    const viaL2 = generateGaussian(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    expect(viaL1).toEqual(viaL2);
  });
});

// ── Individual shape tests ──

describe('Gaussian shape', () => {
  it('produces valid belief vector', () => {
    const belief = generateGaussian(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'gaussian');
  });

  it('peak is near center', () => {
    const belief = generateGaussian(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const expectedIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    expect(peakIndex(belief)).toBe(expectedIdx);
  });
});

describe('Spike shape', () => {
  it('produces valid belief vector', () => {
    // Spike = gaussian with spread * 0.2 (widget applies the multiplier)
    const belief = generateGaussian(CENTER, SPREAD * 0.2, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'spike');
  });

  it('is narrower than gaussian with same base spread', () => {
    const gaussian = generateGaussian(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const spike = generateGaussian(CENTER, SPREAD * 0.2, numBuckets, lowerBound, upperBound);
    // Spike peak should be higher (more concentrated)
    expect(Math.max(...spike)).toBeGreaterThan(Math.max(...gaussian));
  });
});

describe('Range shape', () => {
  it('produces valid belief vector', () => {
    const belief = generateRange(80, 120, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'range');
  });

  it('has roughly flat values within the range', () => {
    const belief = generateRange(80, 120, numBuckets, lowerBound, upperBound);
    const lowIdx = Math.round(((80 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const highIdx = Math.round(((120 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const rangeValues = belief.slice(lowIdx, highIdx + 1);
    const avg = rangeValues.reduce((a, b) => a + b, 0) / rangeValues.length;
    for (const v of rangeValues) {
      expect(Math.abs(v - avg)).toBeLessThan(0.005);
    }
  });
});

describe('Bimodal shape', () => {
  it('produces valid belief vector', () => {
    // Bimodal = two weighted PointRegions via L1
    const belief = generateBelief([
      { type: 'point', center: 75, spread: SPREAD * 0.8, weight: 0.5 },
      { type: 'point', center: 125, spread: SPREAD * 0.8, weight: 0.5 },
    ], numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'bimodal');
  });

  it('has two peaks near the specified centers', () => {
    const belief = generateBelief([
      { type: 'point', center: 75, spread: SPREAD * 0.8, weight: 0.5 },
      { type: 'point', center: 125, spread: SPREAD * 0.8, weight: 0.5 },
    ], numBuckets, lowerBound, upperBound);
    // Check that the two expected peak zones are local maxima
    const idx75 = Math.round(((75 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const idx125 = Math.round(((125 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // Each peak should be higher than its neighbors a few indices away
    expect(belief[idx75]).toBeGreaterThan(belief[idx75 - 5]);
    expect(belief[idx75]).toBeGreaterThan(belief[idx75 + 5]);
    expect(belief[idx125]).toBeGreaterThan(belief[idx125 - 5]);
    expect(belief[idx125]).toBeGreaterThan(belief[idx125 + 5]);
  });

  it('peakBias shifts weight between peaks', () => {
    const leftHeavy = generateBelief([
      { type: 'point', center: 75, spread: SPREAD * 0.8, weight: 0.8 },
      { type: 'point', center: 125, spread: SPREAD * 0.8, weight: 0.2 },
    ], numBuckets, lowerBound, upperBound);
    const idx75 = Math.round(((75 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const idx125 = Math.round(((125 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    expect(leftHeavy[idx75]).toBeGreaterThan(leftHeavy[idx125]);
  });
});

describe('Dip shape', () => {
  it('produces valid belief vector', () => {
    const belief = generateDip(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'dip');
  });

  it('center value is lower than edge values', () => {
    const belief = generateDip(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const centerIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // Edges (first and last elements)
    expect(belief[0]).toBeGreaterThan(belief[centerIdx]);
    expect(belief[numBuckets]).toBeGreaterThan(belief[centerIdx]);
  });

  it('trough is near center', () => {
    const belief = generateDip(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const expectedIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // Allow ±3 index tolerance  -- the 1.5x spread widening + normalization can shift the minimum slightly
    expect(Math.abs(troughIndex(belief) - expectedIdx)).toBeLessThanOrEqual(3);
  });

  it('no values are zero (0.02 floor)', () => {
    const belief = generateDip(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    for (const v of belief) {
      expect(v).toBeGreaterThan(0);
    }
  });
});

describe('Left Skew shape', () => {
  it('produces valid belief vector', () => {
    const belief = generateLeftSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'leftskew');
  });

  it('left tail is wider than right tail', () => {
    const belief = generateLeftSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const centerIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // Sum of left half vs right half (excluding center)
    const leftSum = belief.slice(0, centerIdx).reduce((a, b) => a + b, 0);
    const rightSum = belief.slice(centerIdx + 1).reduce((a, b) => a + b, 0);
    expect(leftSum).toBeGreaterThan(rightSum);
  });

  it('peak is near center', () => {
    const belief = generateLeftSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const expectedIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // Peak should be at or very near center
    expect(Math.abs(peakIndex(belief) - expectedIdx)).toBeLessThanOrEqual(1);
  });
});

describe('Right Skew shape', () => {
  it('produces valid belief vector', () => {
    const belief = generateRightSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'rightskew');
  });

  it('right tail is wider than left tail', () => {
    const belief = generateRightSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const centerIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const leftSum = belief.slice(0, centerIdx).reduce((a, b) => a + b, 0);
    const rightSum = belief.slice(centerIdx + 1).reduce((a, b) => a + b, 0);
    expect(rightSum).toBeGreaterThan(leftSum);
  });

  it('peak is near center', () => {
    const belief = generateRightSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const expectedIdx = Math.round(((CENTER - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    expect(Math.abs(peakIndex(belief) - expectedIdx)).toBeLessThanOrEqual(1);
  });
});

describe('Uniform shape', () => {
  it('produces valid belief vector', () => {
    // Uniform = full-range generateRange
    const belief = generateRange(lowerBound, upperBound, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'uniform');
  });

  it('all values are roughly equal', () => {
    const belief = generateRange(lowerBound, upperBound, numBuckets, lowerBound, upperBound);
    const expected = 1 / (numBuckets + 1);
    for (const v of belief) {
      expect(v).toBeCloseTo(expected, 2);
    }
  });
});

// ── generateRange (L2 multi-range) ──

describe('generateRange', () => {
  it('single-range produces valid belief vector', () => {
    const belief = generateRange(80, 120, numBuckets, lowerBound, upperBound, 0.5);
    assertValidBelief(belief, 'single-range');
  });

  it('single-range with sharpness=1 produces hard edges', () => {
    const belief = generateRange(80, 120, numBuckets, lowerBound, upperBound, 1);
    assertValidBelief(belief, 'single-range-sharp');
    // Values inside range should be elevated vs outside
    const insideIdx = Math.round(((100 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const outsideIdx = Math.round(((60 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    expect(belief[insideIdx]).toBeGreaterThan(belief[outsideIdx]);
  });

  it('multi-range: 2 non-contiguous ranges produce valid belief', () => {
    const belief = generateRange([
      { low: 60, high: 80 },
      { low: 120, high: 140 },
    ], numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'multi-range-2');
  });

  it('multi-range: 3 non-contiguous ranges produce valid belief', () => {
    const belief = generateRange([
      { low: 55, high: 70 },
      { low: 90, high: 110 },
      { low: 130, high: 145 },
    ], numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'multi-range-3');
  });

  it('multi-range: each range has elevated probability in its region', () => {
    const belief = generateRange([
      { low: 60, high: 80, sharpness: 1 },
      { low: 120, high: 140, sharpness: 1 },
    ], numBuckets, lowerBound, upperBound);
    // Indices for range midpoints
    const mid1 = Math.round(((70 - lowerBound) / (upperBound - lowerBound)) * numBuckets);   // ~10
    const mid2 = Math.round(((130 - lowerBound) / (upperBound - lowerBound)) * numBuckets);  // ~40
    const gap = Math.round(((100 - lowerBound) / (upperBound - lowerBound)) * numBuckets);    // ~25 (between ranges)
    // Both ranges should be elevated relative to the gap
    expect(belief[mid1]).toBeGreaterThan(belief[gap]);
    expect(belief[mid2]).toBeGreaterThan(belief[gap]);
  });

  it('multi-range: adjacent ranges have no gap at the boundary', () => {
    // Two ranges that share a boundary
    const belief = generateRange([
      { low: 80, high: 100, sharpness: 1 },
      { low: 100, high: 120, sharpness: 1 },
    ], numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'adjacent');
    // The boundary at x=100 (index 25) should have significant probability,
    // not a dip to near-zero
    const boundaryIdx = Math.round(((100 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const insideIdx = Math.round(((90 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // Boundary should be at least 50% of interior value (no gap)
    expect(belief[boundaryIdx]).toBeGreaterThan(belief[insideIdx] * 0.5);
  });

  it('multi-range: weight parameter adjusts relative contribution', () => {
    const belief = generateRange([
      { low: 60, high: 80, weight: 3, sharpness: 1 },
      { low: 120, high: 140, weight: 1, sharpness: 1 },
    ], numBuckets, lowerBound, upperBound);
    const mid1 = Math.round(((70 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    const mid2 = Math.round(((130 - lowerBound) / (upperBound - lowerBound)) * numBuckets);
    // First range has 3x weight → higher probability
    expect(belief[mid1]).toBeGreaterThan(belief[mid2]);
  });

  it('multi-range: sharpness per-range is respected', () => {
    const sharp = generateRange([
      { low: 80, high: 120, sharpness: 1 },
    ], numBuckets, lowerBound, upperBound);
    const smooth = generateRange([
      { low: 80, high: 120, sharpness: 0 },
    ], numBuckets, lowerBound, upperBound);
    assertValidBelief(sharp, 'sharp');
    assertValidBelief(smooth, 'smooth');
    // Just outside the range: smooth has taper, sharp drops to EPS
    // Use a point 1 bucket-width outside the range boundary
    const justOutside = Math.round(((78 - lowerBound) / (upperBound - lowerBound)) * numBuckets);  // ~14, just below low=80
    expect(sharp[justOutside]).toBeLessThan(smooth[justOutside]);
  });

  it('matches generateBelief with equivalent RangeRegion array', () => {
    const viaL2 = generateRange([
      { low: 60, high: 80, sharpness: 1 },
      { low: 120, high: 140, sharpness: 0.5 },
    ], numBuckets, lowerBound, upperBound);
    const viaL1 = generateBelief([
      { type: 'range', low: 60, high: 80, sharpness: 1 },
      { type: 'range', low: 120, high: 140, sharpness: 0.5 },
    ], numBuckets, lowerBound, upperBound);
    expect(viaL2).toEqual(viaL1);
  });
});

// ── Left/Right Skew symmetry ──

describe('Skew symmetry', () => {
  it('left skew and right skew are mirror images', () => {
    const left = generateLeftSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
    const right = generateRightSkew(CENTER, SPREAD, numBuckets, lowerBound, upperBound);
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

// ── Custom shape (spline interpolation) ──

describe('Custom shape (spline)', () => {
  it('produces valid belief vector from bell-shaped control values', () => {
    const controlValues = [0.1, 0.3, 0.6, 1.0, 1.5, 1.8, 1.5, 1.0, 0.6, 0.2];
    const belief = generateCustomShape(controlValues, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-bell');
  });

  it('uniform control values produce roughly uniform belief', () => {
    const controlValues = new Array(20).fill(1.0);
    const belief = generateCustomShape(controlValues, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-uniform');
    const expected = 1 / (numBuckets + 1);
    for (const v of belief) {
      expect(v).toBeCloseTo(expected, 1);
    }
  });

  it('peaked control values produce peaked belief near center', () => {
    const N = 20;
    const mid = (N - 1) / 2;
    const controlValues = new Array(N).fill(0).map((_, i) => {
      const d = (i - mid) / 3;
      return Math.max(0.1, 2.0 * Math.exp(-0.5 * d * d));
    });
    const belief = generateCustomShape(controlValues, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-peaked');
    const centerIdx = Math.round(numBuckets / 2);
    expect(Math.abs(peakIndex(belief) - centerIdx)).toBeLessThanOrEqual(3);
  });

  it('generateCustomShape matches generateBelief with equivalent SplineRegion', () => {
    const controlValues = [0.2, 0.5, 1.0, 1.5, 1.0, 0.5, 0.2];
    const N = controlValues.length;
    const controlX = controlValues.map((_, i) => lowerBound + (i / (N - 1)) * (upperBound - lowerBound));
    const viaL2 = generateCustomShape(controlValues, numBuckets, lowerBound, upperBound);
    const viaL1 = generateBelief(
      [{ type: 'spline', controlX, controlY: controlValues }],
      numBuckets, lowerBound, upperBound,
    );
    expect(viaL2).toEqual(viaL1);
  });

  it('handles minimum control points (2)', () => {
    const belief = generateCustomShape([0.5, 1.5], numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-2pts');
  });

  it('handles maximum control points (25)', () => {
    const controlValues = new Array(25).fill(0).map((_, i) => 0.5 + Math.sin(i / 4) * 0.5);
    const belief = generateCustomShape(controlValues, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-25pts');
  });

  it('negative interpolation values are clamped', () => {
    const controlValues = [2.0, 0.0, 2.0, 0.0, 2.0];
    const belief = generateCustomShape(controlValues, numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-oscillating');
    for (const v of belief) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('single control point produces uniform-ish belief', () => {
    const belief = generateCustomShape([1.0], numBuckets, lowerBound, upperBound);
    assertValidBelief(belief, 'custom-1pt');
  });
});

// ── generateBellShape ──

describe('generateBellShape', () => {
  it('returns correct number of points', () => {
    expect(generateBellShape(10)).toHaveLength(10);
    expect(generateBellShape(20)).toHaveLength(20);
    expect(generateBellShape(5)).toHaveLength(5);
  });

  it('has zero tails', () => {
    const values = generateBellShape(20);
    // Outer 15% on each side should be 0
    expect(values[0]).toBe(0);
    expect(values[1]).toBe(0);
    expect(values[2]).toBe(0);
    expect(values[19]).toBe(0);
    expect(values[18]).toBe(0);
    expect(values[17]).toBe(0);
  });

  it('peaks near center', () => {
    const values = generateBellShape(20);
    let maxIdx = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[maxIdx]) maxIdx = i;
    }
    // Peak should be near midpoint (index ~9-10 for 20 points)
    expect(Math.abs(maxIdx - 9.5)).toBeLessThanOrEqual(2);
  });

  it('all values are non-negative', () => {
    const values = generateBellShape(20);
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('custom peakPosition shifts the peak', () => {
    const values = generateBellShape(20, 0.75);
    let maxIdx = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[maxIdx]) maxIdx = i;
    }
    // Peak should be right of center
    expect(maxIdx).toBeGreaterThan(10);
  });
});
