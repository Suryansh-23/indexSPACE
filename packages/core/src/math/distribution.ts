import type { BucketData } from '../types.js';

/**
 * Calculate probability distribution across equal-width outcome buckets.
 * Uses trapezoidal integration with linear interpolation at boundaries.
 *
 * @param points - Density curve points as {x, y}[] (from evaluateDensityCurve or ConsensusCurve.points)
 * @param L - Lower bound of market outcome range
 * @param H - Upper bound of market outcome range
 * @param numBuckets - Number of equal-width buckets (default 12, clamped to [1, 200])
 * @param decimals - Decimal places for range label formatting (default 0)
 * @returns Array of BucketData with probability mass per bucket
 */
export function calculateBucketDistribution(
  points: Array<{ x: number; y: number }>,
  L: number,
  H: number,
  numBuckets: number = 12,
  decimals: number = 0,
): BucketData[] {
  if (!points || points.length < 2 || H <= L) return [];

  const n = Math.max(1, Math.min(200, Math.round(numBuckets)));
  const bucketWidth = (H - L) / n;
  const buckets: BucketData[] = [];

  for (let i = 0; i < n; i++) {
    const bucketMin = L + i * bucketWidth;
    const bucketMax = L + (i + 1) * bucketWidth;

    let probability = 0;

    for (let j = 0; j < points.length - 1; j++) {
      const x1 = points[j].x;
      const x2 = points[j + 1].x;

      if (x2 > bucketMin && x1 < bucketMax) {
        const overlapMin = Math.max(x1, bucketMin);
        const overlapMax = Math.min(x2, bucketMax);

        const segmentWidth = x2 - x1;
        if (segmentWidth > 0) {
          const t1 = (overlapMin - x1) / segmentWidth;
          const t2 = (overlapMax - x1) / segmentWidth;
          const y1 = points[j].y + t1 * (points[j + 1].y - points[j].y);
          const y2 = points[j].y + t2 * (points[j + 1].y - points[j].y);

          probability += (y1 + y2) / 2 * (overlapMax - overlapMin);
        }
      }
    }

    const rangeStr = decimals > 0
      ? `${bucketMin.toFixed(decimals)}-${bucketMax.toFixed(decimals)}`
      : `${Math.round(bucketMin)}-${Math.round(bucketMax)}`;

    buckets.push({
      range: rangeStr,
      min: bucketMin,
      max: bucketMax,
      probability,
      percentage: probability * 100,
    });
  }

  return buckets;
}
