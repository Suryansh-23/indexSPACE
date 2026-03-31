/**
 * Density math function tests -- unit tests for evaluateDensityCurve,
 * evaluateDensityPiecewise, and computeStatistics.
 *
 * These are pure functions with no side effects, so no mocking is needed.
 * Coefficient vectors have length K+2 where K = numBuckets.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateDensityCurve,
  evaluateDensityPiecewise,
  computeStatistics,
} from '../packages/core/src/index.js';

// K=1 uniform distribution: 3 coefficients, numBuckets=1, lowerBound=0, upperBound=100
const UNIFORM_COEFFS = [1.0, 1.0, 1.0];
const lowerBound = 0;
const upperBound = 100;

// ── evaluateDensityCurve ──

describe('evaluateDensityCurve', () => {
  it('returns 200 points by default', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(points).toHaveLength(200);
  });

  it('respects custom numPoints', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound, 50);
    expect(points).toHaveLength(50);
  });

  it('x-values span [lowerBound, upperBound]', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(points[0].x).toBeCloseTo(lowerBound, 10);
    expect(points[points.length - 1].x).toBeCloseTo(upperBound, 10);
  });

  it('all y-values are non-negative', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound);
    for (const p of points) {
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('integral approximation for uniform coefficients is close to 1', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound, 1000);
    // Trapezoidal integration
    let integral = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      integral += 0.5 * (points[i].y + points[i - 1].y) * dx;
    }
    // With normalization-agnostic scale, integral should be close to 1
    expect(integral).toBeCloseTo(1.0, 1);
  });

  it('uniform coefficients produce positive y-values', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound, 100);
    // All y-values should be positive
    for (const p of points) {
      expect(p.y).toBeGreaterThan(0);
    }
  });

  it('returns empty array for empty coefficients', () => {
    const points = evaluateDensityCurve([], lowerBound, upperBound);
    expect(points).toHaveLength(0);
  });

  it('non-uniform coefficients produce varying y-values', () => {
    // Right-heavy: more density toward upperBound
    const coeffs = [0.5, 1.0, 2.0];
    const points = evaluateDensityCurve(coeffs, lowerBound, upperBound, 100);
    // Last point should have higher y than first point
    expect(points[points.length - 1].y).toBeGreaterThan(points[0].y);
  });

  it('K=0 edge case: two coefficients produce uniform density', () => {
    // K=0: 2 coefficients, single bucket
    const coeffs = [1.0, 1.0];
    const points = evaluateDensityCurve(coeffs, lowerBound, upperBound, 100);
    expect(points).toHaveLength(100);
    // All y-values should be equal (uniform)
    const y0 = points[0].y;
    for (const p of points) {
      expect(p.y).toBeCloseTo(y0, 10);
    }
    // Integral should be close to 1
    let integral = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      integral += 0.5 * (points[i].y + points[i - 1].y) * dx;
    }
    expect(integral).toBeCloseTo(1.0, 1);
  });

  it('returns empty array when range <= 0', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, 50, 50);
    expect(points).toHaveLength(0);
    const inverted = evaluateDensityCurve(UNIFORM_COEFFS, 100, 0);
    expect(inverted).toHaveLength(0);
  });

  it('handles numPoints = 1 without NaN', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound, 1);
    expect(points).toHaveLength(1);
    expect(points[0].x).toBe(50);
    expect(Number.isFinite(points[0].y)).toBe(true);
    expect(points[0].y).toBeGreaterThan(0);
  });

  it('returns correct PDF for sum=1 consensus vectors', () => {
    // API consensus vectors sum to 1 (alpha / totalMass)
    const consensus = [1/3, 1/3, 1/3]; // K=1 uniform, sum=1
    const points = evaluateDensityCurve(consensus, lowerBound, upperBound, 200);
    // Integral should still be ~1 due to normalization-agnostic scale
    let integral = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      integral += 0.5 * (points[i].y + points[i - 1].y) * dx;
    }
    expect(integral).toBeCloseTo(1.0, 1);
  });
});

// ── evaluateDensityPiecewise ──

describe('evaluateDensityPiecewise', () => {
  it('matches evaluateDensityCurve at the same x-values', () => {
    const coeffs = [1.0, 1.5, 1.0, 0.5];
    const curve = evaluateDensityCurve(coeffs, lowerBound, upperBound, 50);
    for (const p of curve) {
      const singleValue = evaluateDensityPiecewise(coeffs, p.x, lowerBound, upperBound);
      expect(singleValue).toBeCloseTo(p.y, 10);
    }
  });

  it('returns 0 for empty coefficients', () => {
    expect(evaluateDensityPiecewise([], 50, lowerBound, upperBound)).toBe(0);
  });

  it('returns 0 when range <= 0', () => {
    expect(evaluateDensityPiecewise(UNIFORM_COEFFS, 50, 50, 50)).toBe(0);
    expect(evaluateDensityPiecewise(UNIFORM_COEFFS, 50, 100, 0)).toBe(0);
  });

  it('K=0 edge case: returns uniform density', () => {
    // K=0: 2 coefficients
    const coeffs = [1.0, 1.0];
    const val1 = evaluateDensityPiecewise(coeffs, 25, lowerBound, upperBound);
    const val2 = evaluateDensityPiecewise(coeffs, 75, lowerBound, upperBound);
    expect(val1).toBeCloseTo(val2, 10);
    expect(val1).toBeGreaterThan(0);
  });

  it('evaluates smoothly across the domain', () => {
    const coeffs = [1.0, 1.5, 1.0, 0.5];
    // Sample several points and verify they are non-negative
    for (let x = lowerBound; x <= upperBound; x += 10) {
      const val = evaluateDensityPiecewise(coeffs, x, lowerBound, upperBound);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  it('higher coefficient produces higher density near its position', () => {
    // coeffs = [0.5, 2.0, 0.5, 0.5] -- peak near position of coefficient index 1
    const coeffs = [0.5, 2.0, 0.5, 0.5];
    const midVal = evaluateDensityPiecewise(coeffs, 30, lowerBound, upperBound);
    const edgeVal = evaluateDensityPiecewise(coeffs, 90, lowerBound, upperBound);
    expect(midVal).toBeGreaterThan(edgeVal);
  });
});

// ── computeStatistics ──

describe('computeStatistics', () => {
  it('uniform distribution has mean at midpoint', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats.mean).toBeCloseTo(50, 0);
  });

  it('uniform distribution median is near midpoint', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats.median).toBeCloseTo(50, -1);
  });

  it('returns all expected properties', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats).toHaveProperty('mean');
    expect(stats).toHaveProperty('median');
    expect(stats).toHaveProperty('mode');
    expect(stats).toHaveProperty('variance');
    expect(stats).toHaveProperty('stdDev');
  });

  it('stdDev is sqrt of variance', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(stats.variance), 6);
  });

  it('variance is positive for a non-degenerate distribution', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats.variance).toBeGreaterThan(0);
  });

  it('skewed distribution has median != mean', () => {
    // Heavily right-skewed: K=4, 6 coefficients
    const skewed = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];
    const stats = computeStatistics(skewed, lowerBound, upperBound);
    // For right-skewed data, median should differ from mean
    expect(stats.median).not.toBeCloseTo(stats.mean, 0);
  });

  it('right-skewed distribution has mean pulled toward high end', () => {
    // K=4, 6 coefficients, more weight on right
    const rightSkewed = [0.5, 0.5, 0.5, 1.5, 2.0, 2.5];
    const stats = computeStatistics(rightSkewed, lowerBound, upperBound);
    // Mean should be above midpoint
    expect(stats.mean).toBeGreaterThan(50);
  });

  it('left-skewed distribution has mean pulled toward low end', () => {
    // K=4, 6 coefficients, more weight on left
    const leftSkewed = [2.5, 2.0, 1.5, 0.5, 0.5, 0.5];
    const stats = computeStatistics(leftSkewed, lowerBound, upperBound);
    // Mean should be below midpoint
    expect(stats.mean).toBeLessThan(50);
  });

  it('mode is within [lowerBound, upperBound]', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats.mode).toBeGreaterThanOrEqual(lowerBound);
    expect(stats.mode).toBeLessThanOrEqual(upperBound);
  });

  it('peaked distribution mode is near the peak', () => {
    // K=4, 6 coefficients, peak at index 3 -> nominal position k/(K+1) = 3/5 = 0.6 -> x = 60
    const peaked = [0.5, 0.5, 0.8, 3.0, 0.8, 0.5];
    const stats = computeStatistics(peaked, lowerBound, upperBound);
    expect(stats.mode).toBeCloseTo(60, -1);
  });
});
