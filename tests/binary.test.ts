import { describe, it, expect } from 'vitest';
import { generateRange } from '@functionspace/core';

const numBuckets = 20;
const lowerBound = 80;
const upperBound = 100;

describe('Binary Option (generateRange for binary use case)', () => {
  describe('Yes side (threshold → upperBound)', () => {
    it('produces numBuckets+1 elements summing to ~1.0', () => {
      const threshold = 90;
      const belief = generateRange(threshold, upperBound, numBuckets, lowerBound, upperBound, 1);
      expect(belief).toHaveLength(numBuckets + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('concentrates mass in upper coefficients', () => {
      const threshold = 90;
      const belief = generateRange(threshold, upperBound, numBuckets, lowerBound, upperBound, 1);

      // Normalized threshold position: (90-80)/(100-80) = 0.5
      const thresholdIdx = Math.round(((threshold - lowerBound) / (upperBound - lowerBound)) * numBuckets);
      const upperMass = belief.slice(thresholdIdx).reduce((a, b) => a + b, 0);
      const lowerMass = belief.slice(0, thresholdIdx).reduce((a, b) => a + b, 0);
      expect(upperMass).toBeGreaterThan(lowerMass);
    });
  });

  describe('No side (lowerBound → threshold)', () => {
    it('produces numBuckets+1 elements summing to ~1.0', () => {
      const threshold = 90;
      const belief = generateRange(lowerBound, threshold, numBuckets, lowerBound, upperBound, 1);
      expect(belief).toHaveLength(numBuckets + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('concentrates mass in lower coefficients', () => {
      const threshold = 90;
      const belief = generateRange(lowerBound, threshold, numBuckets, lowerBound, upperBound, 1);

      const thresholdIdx = Math.round(((threshold - lowerBound) / (upperBound - lowerBound)) * numBuckets);
      const upperMass = belief.slice(thresholdIdx).reduce((a, b) => a + b, 0);
      const lowerMass = belief.slice(0, thresholdIdx).reduce((a, b) => a + b, 0);
      expect(lowerMass).toBeGreaterThan(upperMass);
    });
  });

  describe('Midpoint threshold symmetry', () => {
    it('yes and no at midpoint are approximate mirrors', () => {
      const mid = (lowerBound + upperBound) / 2;
      const yes = generateRange(mid, upperBound, numBuckets, lowerBound, upperBound, 1);
      const no = generateRange(lowerBound, mid, numBuckets, lowerBound, upperBound, 1);

      // Mirror: yes[k] should approximately equal no[numBuckets-k]
      for (let k = 0; k <= numBuckets; k++) {
        expect(yes[k]).toBeCloseTo(no[numBuckets - k], 3);
      }
    });
  });

  describe('Edge cases', () => {
    it('threshold at lowerBound: yes covers entire range', () => {
      const belief = generateRange(lowerBound, upperBound, numBuckets, lowerBound, upperBound, 1);
      expect(belief).toHaveLength(numBuckets + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      // All coefficients should be roughly equal (uniform)
      const avg = 1 / (numBuckets + 1);
      for (let k = 0; k <= numBuckets; k++) {
        expect(belief[k]).toBeCloseTo(avg, 1);
      }
    });

    it('threshold near upperBound: yes side narrows to top of range', () => {
      const nearUpper = upperBound - 1; // 99
      const belief = generateRange(nearUpper, upperBound, numBuckets, lowerBound, upperBound, 1);
      expect(belief).toHaveLength(numBuckets + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      // Narrow yes range near top: mass concentrates in final coefficients
      const topMass = belief.slice(-3).reduce((a, b) => a + b, 0);
      expect(topMass).toBeGreaterThan(0.5);
    });

    it('sharpness=1 produces hard cliff edges', () => {
      const threshold = 90;
      const belief = generateRange(threshold, upperBound, numBuckets, lowerBound, upperBound, 1);

      // Coefficients well inside the range should be much larger
      // than coefficients well outside
      const thresholdIdx = Math.round(((threshold - lowerBound) / (upperBound - lowerBound)) * numBuckets);
      const insideCoeff = belief[Math.min(thresholdIdx + 2, numBuckets)];
      const outsideCoeff = belief[Math.max(thresholdIdx - 2, 0)];
      expect(insideCoeff).toBeGreaterThan(outsideCoeff * 5);
    });
  });
});
