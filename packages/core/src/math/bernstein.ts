import type { ConsensusSummary } from '../types.js';

/**
 * Precompute log(C(K, k)) for all k in [0, K].
 */
function logBinomialCoefficients(K: number): number[] {
  const logFact = new Float64Array(K + 1);
  logFact[0] = 0;
  for (let i = 1; i <= K; i++) {
    logFact[i] = logFact[i - 1] + Math.log(i);
  }
  const result = new Array<number>(K + 1);
  for (let k = 0; k <= K; k++) {
    result[k] = logFact[K] - logFact[k] - logFact[K - k];
  }
  return result;
}

/**
 * Evaluate a PDF defined by Bernstein coefficients at a specific point.
 *
 * f(x) = (K+1)/(H-L) * Σ p_k * B_{k,K}(u(x))
 * where u(x) = (x - L) / (H - L)
 * and B_{k,K}(u) = C(K,k) * u^k * (1-u)^(K-k)
 */
export function evaluateDensity(
  coefficients: number[],
  x: number,
  L: number,
  H: number,
): number {
  const K = coefficients.length - 1;
  if (K < 0) return 0;

  const u = (x - L) / (H - L);

  // Boundary cases
  if (u <= 0) return coefficients[0] * (K + 1) / (H - L);
  if (u >= 1) return coefficients[K] * (K + 1) / (H - L);

  const logBinom = logBinomialCoefficients(K);
  const logU = Math.log(u);
  const log1mU = Math.log(1 - u);

  let sum = 0;
  for (let k = 0; k <= K; k++) {
    const logB = logBinom[k] + k * logU + (K - k) * log1mU;
    sum += coefficients[k] * Math.exp(logB);
  }

  return sum * (K + 1) / (H - L);
}

/**
 * Evaluate a PDF at multiple points. Returns array of {x, y} for charting.
 * Composes through evaluateDensity for each point.
 */
export function evaluateDensityCurve(
  coefficients: number[],
  L: number,
  H: number,
  numPoints: number = 200,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  if (coefficients.length === 0) return points;

  for (let i = 0; i < numPoints; i++) {
    const x = L + (H - L) * i / (numPoints - 1);
    const y = evaluateDensity(coefficients, x, L, H);
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

  // Variance via second moment
  // E[X^2] using Bernstein second moment formula
  let secondMoment = 0;
  for (let k = 0; k <= K; k++) {
    // E[(k/K)^2] contribution, accounting for Bernstein second moment
    // For Bernstein: E[u^2] = (1/K) * Σ(k/K)*p_k + ((K-1)/K) * Σ(k(k-1))/(K(K-1))*p_k
    const uK = k / K;
    secondMoment += uK * uK * coefficients[k];
  }
  // Correct Bernstein second moment: E[u^2] = (1/K)*E[u] + ((K-1)/K)*Σ k(k-1)/(K(K-1)) p_k
  // Simpler: compute numerically
  // Actually let's use the direct formula properly
  // E[u] = Σ (k/K) p_k
  // E[u^2] = Σ (k/K)^2 p_k  ... but this isn't quite right for Bernstein
  // The correct formula: for Bernstein PDF, the moments are:
  // E[u] = Σ (k/K) p_k
  // Var[u] = Σ (k/K - E[u])^2 p_k  ... this is the coefficient variance, not the PDF variance
  // For the actual PDF: Var = (1/(K+2)) * [Σ k(k+1)/(K*(K+1)) * p_k - (Σ k/K * p_k)^2 * (K+2)/(K+1)]
  // Simplest correct approach: numerical integration
  const numPointsVar = 500;
  let varianceSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < numPointsVar; i++) {
    const x = L + (H - L) * (i + 0.5) / numPointsVar;
    const density = evaluateDensity(coefficients, x, L, H);
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
    const d = evaluateDensity(coefficients, x, L, H);
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
    const d = evaluateDensity(coefficients, x, L, H);
    cumulative += d * dx;
    if (cumulative >= 0.5) {
      median = x;
      break;
    }
  }

  return { mean, median, mode, variance, stdDev };
}
