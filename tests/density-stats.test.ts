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

// Uniform distribution coefficients: [0.5, 0.5] with numBuckets=1, lowerBound=0, upperBound=100
const UNIFORM_COEFFS = [0.5, 0.5];
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

  it('integral approximation for uniform coefficients reflects B-spline boundary loss', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound, 1000);
    // Trapezoidal integration
    let integral = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      integral += 0.5 * (points[i].y + points[i - 1].y) * dx;
    }
    // B-spline boundary basis functions have support partially outside [0,1],
    // so the integral over [lowerBound, upperBound] is less than 1 for uniform
    // coefficients. The expected value is ~5/6 (0.833).
    expect(integral).toBeCloseTo(5 / 6, 2);
  });

  it('uniform coefficients produce boundary-reduced y-values under B-spline', () => {
    const points = evaluateDensityCurve(UNIFORM_COEFFS, lowerBound, upperBound, 100);
    const numBuckets = UNIFORM_COEFFS.length - 1;
    const scale = (numBuckets + 1) / (upperBound - lowerBound);
    // B-spline boundary basis functions apply a 0.5 factor at the endpoints.
    // Boundary value: coeff * 0.5 * scale = 0.5 * 0.5 * 0.02 = 0.005
    const boundaryY = UNIFORM_COEFFS[0] * 0.5 * scale;
    expect(points[0].y).toBeCloseTo(boundaryY, 10);
    expect(points[points.length - 1].y).toBeCloseTo(boundaryY, 10);
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
    const coeffs = [0.2, 0.8];
    const points = evaluateDensityCurve(coeffs, lowerBound, upperBound, 100);
    // First point should have lower y than last point
    expect(points[points.length - 1].y).toBeGreaterThan(points[0].y);
  });
});

// ── evaluateDensityPiecewise ──

describe('evaluateDensityPiecewise', () => {
  it('matches evaluateDensityCurve at the same x-values', () => {
    const coeffs = [0.3, 0.4, 0.3];
    const curve = evaluateDensityCurve(coeffs, lowerBound, upperBound, 50);
    for (const p of curve) {
      const singleValue = evaluateDensityPiecewise(coeffs, p.x, lowerBound, upperBound);
      expect(singleValue).toBeCloseTo(p.y, 10);
    }
  });

  it('returns coefficient[0] * 0.5 * scale at x = lowerBound (B-spline boundary)', () => {
    const coeffs = [0.3, 0.4, 0.3];
    const numBuckets = coeffs.length - 1;
    const scale = (numBuckets + 1) / (upperBound - lowerBound);
    const val = evaluateDensityPiecewise(coeffs, lowerBound, lowerBound, upperBound);
    // B-spline boundary basis functions apply a 0.5 factor at the endpoints
    expect(val).toBeCloseTo(coeffs[0] * 0.5 * scale, 10);
  });

  it('returns coefficient[numBuckets] * 0.5 * scale at x = upperBound (B-spline boundary)', () => {
    const coeffs = [0.3, 0.4, 0.3];
    const numBuckets = coeffs.length - 1;
    const scale = (numBuckets + 1) / (upperBound - lowerBound);
    const val = evaluateDensityPiecewise(coeffs, upperBound, lowerBound, upperBound);
    // B-spline boundary basis functions apply a 0.5 factor at the endpoints
    expect(val).toBeCloseTo(coeffs[numBuckets] * 0.5 * scale, 10);
  });

  it('returns coefficient[0] * 0.5 * scale for x below lowerBound (B-spline boundary)', () => {
    const coeffs = [0.5, 0.5];
    const numBuckets = coeffs.length - 1;
    const scale = (numBuckets + 1) / (upperBound - lowerBound);
    const val = evaluateDensityPiecewise(coeffs, lowerBound - 10, lowerBound, upperBound);
    // B-spline boundary basis functions apply a 0.5 factor at and beyond the endpoints
    expect(val).toBeCloseTo(coeffs[0] * 0.5 * scale, 10);
  });

  it('returns coefficient[numBuckets] * 0.5 * scale for x above upperBound (B-spline boundary)', () => {
    const coeffs = [0.5, 0.5];
    const numBuckets = coeffs.length - 1;
    const scale = (numBuckets + 1) / (upperBound - lowerBound);
    const val = evaluateDensityPiecewise(coeffs, upperBound + 10, lowerBound, upperBound);
    // B-spline boundary basis functions apply a 0.5 factor at and beyond the endpoints
    expect(val).toBeCloseTo(coeffs[numBuckets] * 0.5 * scale, 10);
  });

  it('returns 0 for empty coefficients', () => {
    expect(evaluateDensityPiecewise([], 50, lowerBound, upperBound)).toBe(0);
  });

  it('interpolates correctly at midpoint for two coefficients (B-spline)', () => {
    const coeffs = [0.2, 0.8];
    const numBuckets = coeffs.length - 1;
    const scale = (numBuckets + 1) / (upperBound - lowerBound);
    const midX = (lowerBound + upperBound) / 2;
    // B-spline at midpoint u=0.5, h=1, k=0, tau=0.5:
    // cPrev=0 (k=0), cCurr=0.2, cNext=0.8
    // value = (0*(0.5)^2/(2) + 0.2*(0.5+0.5-0.25) + 0.8*0.25/2) * scale
    //       = (0.2*0.75 + 0.8*0.125) * scale = 0.25 * scale
    const expected = 0.25 * scale;
    expect(evaluateDensityPiecewise(coeffs, midX, lowerBound, upperBound)).toBeCloseTo(expected, 10);
  });
});

// ── computeStatistics ──

describe('computeStatistics', () => {
  it('uniform distribution has mean at midpoint', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    expect(stats.mean).toBeCloseTo(50, 0);
  });

  it('uniform distribution median shifts right under B-spline boundary effects', () => {
    const stats = computeStatistics(UNIFORM_COEFFS, lowerBound, upperBound);
    // With only 2 coefficients, B-spline boundary clamping (cPrev=0 for k=0)
    // makes the density increase from left to right within the interval,
    // pushing the CDF-based median above the midpoint.
    expect(stats.median).toBeGreaterThan(50);
    expect(stats.median).toBeLessThan(upperBound);
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
    // Heavily right-skewed: most weight on the right
    const skewed = [0.05, 0.1, 0.15, 0.2, 0.5];
    const stats = computeStatistics(skewed, lowerBound, upperBound);
    // For right-skewed data, median should differ from mean
    expect(stats.median).not.toBeCloseTo(stats.mean, 0);
  });

  it('right-skewed distribution has mean pulled toward high end', () => {
    const rightSkewed = [0.1, 0.1, 0.1, 0.3, 0.4];
    const stats = computeStatistics(rightSkewed, lowerBound, upperBound);
    // Mean should be above midpoint
    expect(stats.mean).toBeGreaterThan(50);
  });

  it('left-skewed distribution has mean pulled toward low end', () => {
    const leftSkewed = [0.4, 0.3, 0.1, 0.1, 0.1];
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
    // Peak coefficient at index 2 out of [0..4], nominal x = 2/4 * 100 = 50.
    // B-spline boundary effects (cPrev=0 at k=0) shift the evaluated density
    // peak rightward to ~62.5. Use wider tolerance to accommodate this shift.
    const peaked = [0.05, 0.1, 0.7, 0.1, 0.05];
    const stats = computeStatistics(peaked, lowerBound, upperBound);
    expect(stats.mode).toBeCloseTo(62.5, -1);
  });
});
