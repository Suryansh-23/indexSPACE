import type { ConsensusSummary, PercentileSet } from '../types.js';

/**
 * Evaluate the density PDF at a single point via piecewise-linear interpolation.
 * Linearly interpolates between adjacent coefficient values, scaled by (K+1)/(H-L).
 */
export function evaluateDensityPiecewise(
  coefficients: number[],
  x: number,
  L: number,
  H: number,
): number {
  const K = coefficients.length - 1;
  if (K < 0) return 0;
  const scale = (K + 1) / (H - L);
  const u = (x - L) / (H - L);
  if (u <= 0) return coefficients[0] * scale;
  if (u >= 1) return coefficients[K] * scale;
  const kFloat = u * K;
  const kLow = Math.max(0, Math.min(K - 1, Math.floor(kFloat)));
  const frac = kFloat - kLow;
  return (coefficients[kLow] * (1 - frac) + coefficients[kLow + 1] * frac) * scale;
}

/**
 * Evaluate the density PDF at multiple points via piecewise-linear interpolation.
 * Returns array of {x, y} for charting. Preserves sharp transitions faithfully.
 */
export function evaluateDensityCurve(
  coefficients: number[],
  L: number,
  H: number,
  numPoints: number = 200,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const K = coefficients.length - 1;
  if (K < 0) return points;

  const scale = (K + 1) / (H - L);

  for (let i = 0; i < numPoints; i++) {
    const x = L + (H - L) * i / (numPoints - 1);
    const u = (x - L) / (H - L);
    const kFloat = u * K;
    const kLow = Math.max(0, Math.min(K - 1, Math.floor(kFloat)));
    const kHigh = kLow + 1;
    const frac = kFloat - kLow;
    const y = (coefficients[kLow] * (1 - frac) + coefficients[kHigh] * frac) * scale;
    points.push({ x, y });
  }

  return points;
}

/**
 * Compute statistics from a coefficient vector.
 */
export function computeStatistics(
  coefficients: number[],
  L: number,
  H: number,
): { mean: number; median: number; mode: number; variance: number; stdDev: number } {
  const K = coefficients.length - 1;

  // Mean (closed form): mean = L + (H-L) * Σ (k/K) * p_k
  let mean = 0;
  for (let k = 0; k <= K; k++) {
    mean += (k / K) * coefficients[k];
  }
  mean = L + (H - L) * mean;

  // Variance: numerical integration
  const numPointsVar = 500;
  let varianceSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < numPointsVar; i++) {
    const x = L + (H - L) * (i + 0.5) / numPointsVar;
    const density = evaluateDensityPiecewise(coefficients, x, L, H);
    const dx = (H - L) / numPointsVar;
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
    const x = L + (H - L) * (i + 0.5) / modePoints;
    const d = evaluateDensityPiecewise(coefficients, x, L, H);
    if (d > maxDensity) {
      maxDensity = d;
      mode = x;
    }
  }

  // Median: numerically integrate from L until cumulative reaches 0.5
  const medianPoints = 500;
  let cumulative = 0;
  let median = mean;
  const dx = (H - L) / medianPoints;
  for (let i = 0; i < medianPoints; i++) {
    const x = L + (H - L) * (i + 0.5) / medianPoints;
    const d = evaluateDensityPiecewise(coefficients, x, L, H);
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
 * Walks a 500-point grid from L to H, accumulates probability mass,
 * and records x-value when each threshold is crossed.
 */
export function computePercentiles(
  coefficients: number[],
  L: number,
  H: number,
): PercentileSet {
  const thresholds = [0.025, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 0.975];
  const results = new Array<number>(thresholds.length).fill(H);

  const numPoints = 500;
  const dx = (H - L) / numPoints;
  let cumulative = 0;
  let thresholdIdx = 0;

  for (let i = 0; i < numPoints && thresholdIdx < thresholds.length; i++) {
    const x = L + dx * (i + 0.5);
    const d = evaluateDensityPiecewise(coefficients, x, L, H);
    cumulative += d * dx;

    while (thresholdIdx < thresholds.length && cumulative >= thresholds[thresholdIdx]) {
      results[thresholdIdx] = Math.max(L, Math.min(H, x));
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
