/**
 * Density math function tests -- unit tests for evaluateDensityCurve,
 * evaluateDensityPiecewise, and computeStatistics.
 *
 * These are pure functions with no side effects, so no mocking is needed.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateDensityCurve,
  evaluateDensityPiecewise,
  computeStatistics,
} from '../packages/core/src/index.js';

// Uniform distribution coefficients: [0.5, 0.5] with K=1, L=0, H=100
const UNIFORM_COEFFS = [0.5, 0.5];
const L = 0;
const H = 100;

// ── evaluateDensityCurve ──

describe('evaluateDensityCurve', () => {
  it('returns 200 points by default', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, L, H);
    expect(points).toHaveLength(200);
  });

  it('respects custom numPoints', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, L, H, 50);
    expect(points).toHaveLength(50);
  });

  it('x-values span [L, H]', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, L, H);
    expect(points[0].x).toBeCloseTo(L, 10);
    expect(points[points.length - 1].x).toBeCloseTo(H, 10);
  });

  it('all y-values are non-negative', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, L, H);
    for (const p of points) {
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('integral approximation sums to ~1 for uniform coefficients', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, L, H, 1000);
    // Trapezoidal integration
    let integral = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      integral += 0.5 * (points[i].y + points[i - 1].y) * dx;
    }
    expect(integral).toBeCloseTo(1.0, 2);
  });

  it('uniform coefficients produce roughly constant y-values', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, L, H, 100);
    // For uniform [0.5, 0.5] with K=1: scale = 2/100 = 0.02, value = 0.5 * 0.02 = 0.01
    const expectedY = (UNIFORM_COEFFS.length) / (H - L) * 0.5;
    for (const p of points) {
      expect(p.y).toBeCloseTo(expectedY, 5);
    }
  });

  it('returns empty array for empty coefficients', () => {
    const points = evaluateDensityCurve([], L, H);
    expect(points).toHaveLength(0);
  });

  it('non-uniform coefficients produce varying y-values', () => {
    // Right-heavy: more density toward H
    const coeffs = [0.2, 0.8];
    const points = evaluateDensityCurve(coeffs, L, H, 100);
    // First point should have lower y than last point
    expect(points[points.length - 1].y).toBeGreaterThan(points[0].y);
  });
});

// ── evaluateDensityPiecewise ──

describe('evaluateDensityPiecewise', () => {
  it('matches evaluateDensityCurve at the same x-values', () => {
    const coeffs = [0.3, 0.4, 0.3];
    const curve = evaluateDensityCurve(coeffs, L, H, 50);
    for (const p of curve) {
      const singleValue = evaluateDensityPiecewise(coeffs, p.x, L, H);
      expect(singleValue).toBeCloseTo(p.y, 10);
    }
  });

  it('returns coefficient[0] * scale at x = L (boundary)', () => {
    const coeffs = [0.3, 0.4, 0.3];
    const K = coeffs.length - 1;
    const scale = (K + 1) / (H - L);
    const val = evaluateDensityPiecewise(coeffs, L, L, H);
    expect(val).toBeCloseTo(coeffs[0] * scale, 10);
  });

  it('returns coefficient[K] * scale at x = H (boundary)', () => {
    const coeffs = [0.3, 0.4, 0.3];
    const K = coeffs.length - 1;
    const scale = (K + 1) / (H - L);
    const val = evaluateDensityPiecewise(coeffs, H, L, H);
    expect(val).toBeCloseTo(coeffs[K] * scale, 10);
  });

  it('returns coefficient[0] * scale for x below L', () => {
    const coeffs = [0.5, 0.5];
    const K = coeffs.length - 1;
    const scale = (K + 1) / (H - L);
    const val = evaluateDensityPiecewise(coeffs, L - 10, L, H);
    expect(val).toBeCloseTo(coeffs[0] * scale, 10);
  });

  it('returns coefficient[K] * scale for x above H', () => {
    const coeffs = [0.5, 0.5];
    const K = coeffs.length - 1;
    const scale = (K + 1) / (H - L);
    const val = evaluateDensityPiecewise(coeffs, H + 10, L, H);
    expect(val).toBeCloseTo(coeffs[K] * scale, 10);
  });

  it('returns 0 for empty coefficients', () => {
    expect(evaluateDensityPiecewise([], 50, L, H)).toBe(0);
  });

  it('interpolates correctly at midpoint for two coefficients', () => {
    const coeffs = [0.2, 0.8];
    const K = coeffs.length - 1;
    const scale = (K + 1) / (H - L);
    const midX = (L + H) / 2;
    // At midpoint u=0.5, kFloat=0.5, kLow=0, frac=0.5
    // value = (0.2 * 0.5 + 0.8 * 0.5) * scale = 0.5 * scale
    const expected = 0.5 * scale;
    expect(evaluateDensityPiecewise(coeffs, midX, L, H)).toBeCloseTo(expected, 10);
  });
});

// ── computeStatistics ──

describe('computeStatistics', () => {
  it('uniform distribution has mean at midpoint', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, L, H);
    expect(stats.mean).toBeCloseTo(50, 0);
  });

  it('uniform distribution has median near midpoint', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, L, H);
    expect(stats.median).toBeCloseTo(50, 0);
  });

  it('returns all expected properties', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, L, H);
    expect(stats).toHaveProperty('mean');
    expect(stats).toHaveProperty('median');
    expect(stats).toHaveProperty('mode');
    expect(stats).toHaveProperty('variance');
    expect(stats).toHaveProperty('stdDev');
  });

  it('stdDev is sqrt of variance', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, L, H);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(stats.variance), 6);
  });

  it('variance is positive for a non-degenerate distribution', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, L, H);
    expect(stats.variance).toBeGreaterThan(0);
  });

  it('skewed distribution has median != mean', () => {
    // Heavily right-skewed: most weight on the right
    const skewed = [0.05, 0.1, 0.15, 0.2, 0.5];
    const stats = computeStatistics(skewed, L, H);
    // For right-skewed data, median should differ from mean
    expect(stats.median).not.toBeCloseTo(stats.mean, 0);
  });

  it('right-skewed distribution has mean pulled toward high end', () => {
    const rightSkewed = [0.1, 0.1, 0.1, 0.3, 0.4];
    const stats = computeStatistics(rightSkewed, L, H);
    // Mean should be above midpoint
    expect(stats.mean).toBeGreaterThan(50);
  });

  it('left-skewed distribution has mean pulled toward low end', () => {
    const leftSkewed = [0.4, 0.3, 0.1, 0.1, 0.1];
    const stats = computeStatistics(leftSkewed, L, H);
    // Mean should be below midpoint
    expect(stats.mean).toBeLessThan(50);
  });

  it('mode is within [L, H]', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, L, H);
    expect(stats.mode).toBeGreaterThanOrEqual(L);
    expect(stats.mode).toBeLessThanOrEqual(H);
  });

  it('peaked distribution mode is near the peak', () => {
    // Peak at index 2 out of [0..4], so at x = 2/4 * 100 = 50
    const peaked = [0.05, 0.1, 0.7, 0.1, 0.05];
    const stats = computeStatistics(peaked, L, H);
    expect(stats.mode).toBeCloseTo(50, -1);
  });
});
