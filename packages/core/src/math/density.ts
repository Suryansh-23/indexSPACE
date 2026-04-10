import type { ConsensusSummary, PercentileSet } from '../types.js';

/**
 * Evaluate a single quadratic B-spline basis function.
 * Basis i is centered at (i - 2) * h, with support width 3h.
 */
function evalBasis(x: number, i: number, h: number): number {
  const u = x - (i - 2) * h;
  if (u <= 0 || u >= 3 * h) return 0;
  const h2 = 2 * h * h;
  if (u < h) return (u * u) / h2;
  if (u < 2 * h) return (-2 * u * u + 6 * h * u - 3 * h * h) / h2;
  return (3 * h - u) ** 2 / h2;
}

/**
 * Evaluate the density PDF at a single point via quadratic B-spline evaluation.
 * Uses K+2 coefficient vectors with the backend's B-spline basis functions.
 * Scale factor: n / (coeffSum * range) where n = coefficients.length.
 */
export function evaluateDensityPiecewise(
  coefficients: number[],
  x: number,
  lowerBound: number,
  upperBound: number,
): number {
  const n = coefficients.length;
  const K = n - 2;
  if (K < 0) return 0;

  const range = upperBound - lowerBound;
  if (range <= 0) return 0;

  const coeffSum = coefficients.reduce((a, b) => a + b, 0);
  if (coeffSum <= 0) return 0;
  const scale = n / (coeffSum * range);

  // K=0 guard: single bucket, uniform density = 1/range
  if (K === 0) return 1 / range;

  const u = (x - lowerBound) / range;
  const h = 1 / K;

  let val = 0;
  for (let i = 0; i < n; i++) {
    val += coefficients[i] * evalBasis(u, i, h);
  }

  return Math.max(0, val * scale);
}

/**
 * Evaluate the density PDF at multiple points via quadratic B-spline evaluation.
 * Returns array of {x, y} for charting. Produces smooth curves from coefficient vectors.
 */
export function evaluateDensityCurve(
  coefficients: number[],
  lowerBound: number,
  upperBound: number,
  numPoints: number = 200,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const n = coefficients.length;
  const K = n - 2;
  if (K < 0) return points;

  const range = upperBound - lowerBound;
  if (range <= 0) return points;
  if (numPoints <= 1) {
    const mid = (lowerBound + upperBound) / 2;
    return numPoints === 1 ? [{ x: mid, y: evaluateDensityPiecewise(coefficients, mid, lowerBound, upperBound) }] : points;
  }

  const coeffSum = coefficients.reduce((a, b) => a + b, 0);
  if (coeffSum <= 0) {
    // All-zero coefficients: return flat zero curve
    for (let i = 0; i < numPoints; i++) {
      const x = lowerBound + range * i / (numPoints - 1);
      points.push({ x, y: 0 });
    }
    return points;
  }
  const scale = n / (coeffSum * range);

  // K=0 guard: single bucket, uniform density = 1/range
  if (K === 0) {
    const y = 1 / range;
    for (let i = 0; i < numPoints; i++) {
      const x = lowerBound + range * i / (numPoints - 1);
      points.push({ x, y });
    }
    return points;
  }

  const h = 1 / K;

  for (let i = 0; i < numPoints; i++) {
    const x = lowerBound + range * i / (numPoints - 1);
    const u = (x - lowerBound) / range;

    let val = 0;
    for (let j = 0; j < n; j++) {
      val += coefficients[j] * evalBasis(u, j, h);
    }

    points.push({ x, y: Math.max(0, val * scale) });
  }

  return points;
}

/**
 * Compute statistics from a coefficient vector.
 */
export function computeStatistics(
  coefficients: number[],
  lowerBound: number,
  upperBound: number,
): { mean: number; median: number; mode: number; variance: number; stdDev: number } {
  const numBuckets = coefficients.length - 2;

  // Mean (closed form): normalized by coefficient sum
  const totalC = coefficients.reduce((a, b) => a + b, 0);
  let meanU = 0;
  for (let k = 0; k <= numBuckets + 1; k++) {
    meanU += (k / (numBuckets + 1)) * coefficients[k];
  }
  meanU = totalC > 0 ? meanU / totalC : 0.5;
  const mean = lowerBound + (upperBound - lowerBound) * meanU;

  // Variance: numerical integration
  const numPointsVar = 500;
  let varianceSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < numPointsVar; i++) {
    const x = lowerBound + (upperBound - lowerBound) * (i + 0.5) / numPointsVar;
    const density = evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound);
    const dx = (upperBound - lowerBound) / numPointsVar;
    const diff = x - mean;
    varianceSum += diff * diff * density * dx;
    totalWeight += density * dx;
  }
  const variance = totalWeight > 0 ? varianceSum / totalWeight : 0;
  const stdDev = Math.sqrt(variance);

  // Mode: evaluate density on a fine grid and take argmax
  const modePoints = 500;
  let maxDensity = -Infinity;
  let mode = mean;
  for (let i = 0; i < modePoints; i++) {
    const x = lowerBound + (upperBound - lowerBound) * (i + 0.5) / modePoints;
    const d = evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound);
    if (d > maxDensity) {
      maxDensity = d;
      mode = x;
    }
  }

  // Median: numerically integrate from lowerBound until cumulative reaches 0.5
  const medianPoints = 500;
  let cumulative = 0;
  let median = mean;
  const dx = (upperBound - lowerBound) / medianPoints;
  for (let i = 0; i < medianPoints; i++) {
    const x = lowerBound + (upperBound - lowerBound) * (i + 0.5) / medianPoints;
    const d = evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound);
    cumulative += d * dx;
    if (cumulative >= 0.5) {
      median = x;
      break;
    }
  }

  return { mean, median, mode, variance, stdDev };
}

/**
 * Compute 9 percentiles from a coefficient vector via CDF integration.
 * Walks a 500-point grid from lowerBound to upperBound, accumulates probability mass,
 * and records x-value when each threshold is crossed.
 */
export function computePercentiles(
  coefficients: number[],
  lowerBound: number,
  upperBound: number,
): PercentileSet {
  const thresholds = [0.025, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 0.975];
  const results = new Array<number>(thresholds.length).fill(upperBound);

  const numPoints = 500;
  const dx = (upperBound - lowerBound) / numPoints;
  let cumulative = 0;
  let thresholdIdx = 0;

  for (let i = 0; i < numPoints && thresholdIdx < thresholds.length; i++) {
    const x = lowerBound + dx * (i + 0.5);
    const d = evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound);
    cumulative += d * dx;

    while (thresholdIdx < thresholds.length && cumulative >= thresholds[thresholdIdx]) {
      results[thresholdIdx] = Math.max(lowerBound, Math.min(upperBound, x));
      thresholdIdx++;
    }
  }

  return {
    p2_5: results[0],
    p12_5: results[1],
    p25: results[2],
    p37_5: results[3],
    p50: results[4],
    p62_5: results[5],
    p75: results[6],
    p87_5: results[7],
    p97_5: results[8],
  };
}
