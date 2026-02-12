import { describe, it, expect } from 'vitest';
import { buildPlateau } from '@functionspace/core';

const K = 20;
const L = 80;
const H = 100;

describe('Binary Option (buildPlateau for binary use case)', () => {
  describe('Yes side (threshold → H)', () => {
    it('produces K+1 elements summing to ~1.0', () => {
      const threshold = 90;
      const belief = buildPlateau(threshold, H, K, L, H, 1);
      expect(belief).toHaveLength(K + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('concentrates mass in upper coefficients', () => {
      const threshold = 90;
      const belief = buildPlateau(threshold, H, K, L, H, 1);

      // Normalized threshold position: (90-80)/(100-80) = 0.5
      const thresholdIdx = Math.round(((threshold - L) / (H - L)) * K);
      const upperMass = belief.slice(thresholdIdx).reduce((a, b) => a + b, 0);
      const lowerMass = belief.slice(0, thresholdIdx).reduce((a, b) => a + b, 0);
      expect(upperMass).toBeGreaterThan(lowerMass);
    });
  });

  describe('No side (L → threshold)', () => {
    it('produces K+1 elements summing to ~1.0', () => {
      const threshold = 90;
      const belief = buildPlateau(L, threshold, K, L, H, 1);
      expect(belief).toHaveLength(K + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('concentrates mass in lower coefficients', () => {
      const threshold = 90;
      const belief = buildPlateau(L, threshold, K, L, H, 1);

      const thresholdIdx = Math.round(((threshold - L) / (H - L)) * K);
      const upperMass = belief.slice(thresholdIdx).reduce((a, b) => a + b, 0);
      const lowerMass = belief.slice(0, thresholdIdx).reduce((a, b) => a + b, 0);
      expect(lowerMass).toBeGreaterThan(upperMass);
    });
  });

  describe('Midpoint threshold symmetry', () => {
    it('yes and no at midpoint are approximate mirrors', () => {
      const mid = (L + H) / 2;
      const yes = buildPlateau(mid, H, K, L, H, 1);
      const no = buildPlateau(L, mid, K, L, H, 1);

      // Mirror: yes[k] should approximately equal no[K-k]
      for (let k = 0; k <= K; k++) {
        expect(yes[k]).toBeCloseTo(no[K - k], 3);
      }
    });
  });

  describe('Edge cases', () => {
    it('threshold at L: yes covers entire range', () => {
      const belief = buildPlateau(L, H, K, L, H, 1);
      expect(belief).toHaveLength(K + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      // All coefficients should be roughly equal (uniform)
      const avg = 1 / (K + 1);
      for (let k = 0; k <= K; k++) {
        expect(belief[k]).toBeCloseTo(avg, 1);
      }
    });

    it('threshold near H: yes side narrows to top of range', () => {
      const nearH = H - 1; // 99
      const belief = buildPlateau(nearH, H, K, L, H, 1);
      expect(belief).toHaveLength(K + 1);
      const sum = belief.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
      // Narrow yes range near top: mass concentrates in final coefficients
      const topMass = belief.slice(-3).reduce((a, b) => a + b, 0);
      expect(topMass).toBeGreaterThan(0.5);
    });

    it('sharpness=1 produces hard cliff edges', () => {
      const threshold = 90;
      const belief = buildPlateau(threshold, H, K, L, H, 1);

      // Coefficients well inside the plateau should be much larger
      // than coefficients well outside
      const thresholdIdx = Math.round(((threshold - L) / (H - L)) * K);
      const insideCoeff = belief[Math.min(thresholdIdx + 2, K)];
      const outsideCoeff = belief[Math.max(thresholdIdx - 2, 0)];
      expect(insideCoeff).toBeGreaterThan(outsideCoeff * 5);
    });
  });
});
