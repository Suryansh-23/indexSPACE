import type { ConsensusSummary, PercentileSet } from '../types.js';

/**
 * Evaluate the density PDF at a single point via quadratic B-spline evaluation.
 * Uses the three-basis quadratic B-spline kernel, scaled by (numBuckets+1)/(upperBound-lowerBound).
 */
export function evaluateDensityPiecewise(
  coefficients: number[],
  x: number,
  lowerBound: number,
  upperBound: number,
): number {
  const numBuckets = coefficients.length - 1;
  if (numBuckets < 0) return 0;
  const scale = (numBuckets + 1) / (upperBound - lowerBound);
  const u = (x - lowerBound) / (upperBound - lowerBound);
  if (u <= 0) return coefficients[0] * 0.5 * scale;
  if (u >= 1) return coefficients[numBuckets] * 0.5 * scale;
  const h = 1 / numBuckets;
  const k = Math.min(Math.floor(u / h), numBuckets - 1);
  const tau = u - k * h;
  const cPrev = k > 0 ? coefficients[k - 1] : 0;
  const cCurr = coefficients[k];
  const cNext = k + 1 < coefficients.length ? coefficients[k + 1] : 0;
  return (cPrev * (h - tau) * (h - tau) / (2 * h * h)
        + cCurr * (0.5 + tau / h - (tau * tau) / (h * h))
        + cNext * (tau * tau) / (2 * h * h)) * scale;
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
  const numBuckets = coefficients.length - 1;
  if (numBuckets < 0) return points;

  const scale = (numBuckets + 1) / (upperBound - lowerBound);

  for (let i = 0; i < numPoints; i++) {
    const x = lowerBound + (upperBound - lowerBound) * i / (numPoints - 1);
    const u = (x - lowerBound) / (upperBound - lowerBound);
    let y: number;
    if (u <= 0) {
      y = coefficients[0] * 0.5 * scale;
    } else if (u >= 1) {
      y = coefficients[numBuckets] * 0.5 * scale;
    } else {
      const h = 1 / numBuckets;
      const k = Math.min(Math.floor(u / h), numBuckets - 1);
      const tau = u - k * h;
      const cPrev = k > 0 ? coefficients[k - 1] : 0;
      const cCurr = coefficients[k];
      const cNext = k + 1 < coefficients.length ? coefficients[k + 1] : 0;
      y = (cPrev * (h - tau) * (h - tau) / (2 * h * h)
            + cCurr * (0.5 + tau / h - (tau * tau) / (h * h))
            + cNext * (tau * tau) / (2 * h * h)) * scale;
    }
    points.push({ x, y });
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
  const numBuckets = coefficients.length - 1;

  // Mean (closed form): mean = lowerBound + (upperBound-lowerBound) * Σ (k/numBuckets) * p_k
  let mean = 0;
  for (let k = 0; k <= numBuckets; k++) {
    mean += (k / numBuckets) * coefficients[k];
  }
  mean = lowerBound + (upperBound - lowerBound) * mean;

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
