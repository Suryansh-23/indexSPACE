import type { MarketSnapshot, FanChartPoint } from '../types.js';
import { computePercentiles, computeStatistics } from './density.js';

/**
 * Transform raw market history snapshots into charting-ready fan chart data.
 * Pure function: no side effects, no React imports.
 *
 * 1. Downsamples if >maxPoints (evenly spaced, preserving first+last)
 * 2. Per snapshot: normalize alpha → compute percentiles + statistics → build FanChartPoint
 * 3. Filters out snapshots with bad alpha vectors (all zeros)
 */
export function transformHistoryToFanChart(
  snapshots: MarketSnapshot[],
  L: number,
  H: number,
  maxPoints: number = 200,
): FanChartPoint[] {
  if (snapshots.length === 0) return [];

  // Downsample if needed (evenly spaced index sampling, preserve first+last)
  let sampled = snapshots;
  if (snapshots.length > maxPoints && maxPoints >= 2) {
    sampled = [];
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.round(i * (snapshots.length - 1) / (maxPoints - 1));
      sampled.push(snapshots[idx]);
    }
  }

  const results: FanChartPoint[] = [];

  for (const snap of sampled) {
    const alpha = snap.alphaVector;
    if (!alpha || alpha.length === 0) continue;

    // Check for bad alpha (all zeros)
    const totalMass = alpha.reduce((a, b) => a + b, 0);
    if (totalMass === 0) continue;

    // Normalize to probability vector
    const consensus = alpha.map(a => a / totalMass);

    const percentiles = computePercentiles(consensus, L, H);
    const stats = computeStatistics(consensus, L, H);

    results.push({
      timestamp: new Date(snap.createdAt).getTime(),
      createdAt: snap.createdAt,
      tradeId: snap.tradeId,
      mean: stats.mean,
      mode: stats.mode,
      stdDev: stats.stdDev,
      percentiles,
    });
  }

  return results;
}
