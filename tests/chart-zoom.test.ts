import { describe, it, expect } from 'vitest';
import {
  pixelToDataX,
  computeZoomedDomain,
  computePannedDomain,
  filterVisibleData,
  generateEvenTicks,
} from '../packages/core/src/chart/zoom.js';

describe('pixelToDataX', () => {
  const domain: [number, number] = [0, 100];

  it('returns domain min when cursor is at plot left edge', () => {
    expect(pixelToDataX(100, 100, 500, domain)).toBe(0);
  });

  it('returns domain max when cursor is at plot right edge', () => {
    expect(pixelToDataX(500, 100, 500, domain)).toBe(100);
  });

  it('returns midpoint for cursor at center', () => {
    expect(pixelToDataX(300, 100, 500, domain)).toBe(50);
  });

  it('clamps to domain min when cursor is left of plot area', () => {
    expect(pixelToDataX(50, 100, 500, domain)).toBe(0);
  });

  it('clamps to domain max when cursor is right of plot area', () => {
    expect(pixelToDataX(600, 100, 500, domain)).toBe(100);
  });

  it('returns domain min for zero-width plot area', () => {
    expect(pixelToDataX(100, 100, 100, domain)).toBe(0);
  });

  it('works with non-zero domain start', () => {
    const offsetDomain: [number, number] = [50, 150];
    // midpoint of plot (300) should map to midpoint of domain (100)
    expect(pixelToDataX(300, 100, 500, offsetDomain)).toBe(100);
  });
});

describe('computeZoomedDomain', () => {
  const fullDomain: [number, number] = [0, 100];

  it('zoom in reduces range', () => {
    const result = computeZoomedDomain({
      currentDomain: [0, 100],
      fullDomain,
      cursorDataX: 50,
      direction: -1,
    });
    expect(result).not.toBeNull();
    expect(result![1] - result![0]).toBeLessThan(100);
  });

  it('preserves cursor position proportionally', () => {
    // Cursor at 25% of the current range [0, 100] → cursorDataX = 25
    const result = computeZoomedDomain({
      currentDomain: [0, 100],
      fullDomain,
      cursorDataX: 25,
      direction: -1,
      zoomFactor: 0.15,
    });
    expect(result).not.toBeNull();
    const [newMin, newMax] = result!;
    const newRange = newMax - newMin;
    // cursorDataX should still be at ~25% of the new range
    const cursorRatio = (25 - newMin) / newRange;
    expect(cursorRatio).toBeCloseTo(0.25, 1);
  });

  it('zoom out increases range', () => {
    const result = computeZoomedDomain({
      currentDomain: [20, 80],
      fullDomain,
      cursorDataX: 50,
      direction: 1,
    });
    expect(result).not.toBeNull();
    expect(result![1] - result![0]).toBeGreaterThan(60);
  });

  it('returns null when range reaches 99% of full range (reset threshold)', () => {
    const result = computeZoomedDomain({
      currentDomain: [1, 99],
      fullDomain,
      cursorDataX: 50,
      direction: 1,
      zoomFactor: 0.15,
    });
    expect(result).toBeNull();
  });

  it('enforces minimum span (fullRange / maxZoomFactor)', () => {
    const result = computeZoomedDomain({
      currentDomain: [49, 51], // range = 2
      fullDomain,
      cursorDataX: 50,
      direction: -1,
      maxZoomFactor: 50, // min span = 100/50 = 2
    });
    expect(result).not.toBeNull();
    expect(result![1] - result![0]).toBeGreaterThanOrEqual(2);
  });

  it('clamps to full domain boundaries', () => {
    const result = computeZoomedDomain({
      currentDomain: [0, 10],
      fullDomain,
      cursorDataX: 2,
      direction: -1,
    });
    expect(result).not.toBeNull();
    expect(result![0]).toBeGreaterThanOrEqual(0);
    expect(result![1]).toBeLessThanOrEqual(100);
  });

  it('uses default zoomFactor and maxZoomFactor', () => {
    const result = computeZoomedDomain({
      currentDomain: [0, 100],
      fullDomain,
      cursorDataX: 50,
      direction: -1,
    });
    expect(result).not.toBeNull();
    // With default 0.15 factor: range = 100 * (1 - 0.15) = 85
    expect(result![1] - result![0]).toBeCloseTo(85, 0);
  });
});

describe('computePannedDomain', () => {
  const fullDomain: [number, number] = [0, 100];

  it('preserves range during pan', () => {
    const result = computePannedDomain({
      startDomain: [20, 80],
      fullDomain,
      pixelDelta: 50,
      plotAreaWidth: 400,
    });
    expect(result[1] - result[0]).toBeCloseTo(60, 10);
  });

  it('drag-right (positive pixelDelta) shifts domain left', () => {
    const result = computePannedDomain({
      startDomain: [20, 80],
      fullDomain,
      pixelDelta: 50, // drag right
      plotAreaWidth: 400,
    });
    expect(result[0]).toBeLessThan(20);
    expect(result[1]).toBeLessThan(80);
  });

  it('drag-left (negative pixelDelta) shifts domain right', () => {
    const result = computePannedDomain({
      startDomain: [20, 80],
      fullDomain,
      pixelDelta: -50, // drag left
      plotAreaWidth: 400,
    });
    expect(result[0]).toBeGreaterThan(20);
    expect(result[1]).toBeGreaterThan(80);
  });

  it('clamps to full domain boundaries on left', () => {
    const result = computePannedDomain({
      startDomain: [5, 65],
      fullDomain,
      pixelDelta: 100, // drag far right = shift far left
      plotAreaWidth: 400,
    });
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(60);
  });

  it('clamps to full domain boundaries on right', () => {
    const result = computePannedDomain({
      startDomain: [35, 95],
      fullDomain,
      pixelDelta: -100, // drag far left = shift far right
      plotAreaWidth: 400,
    });
    expect(result[1]).toBe(100);
    expect(result[0]).toBe(40);
  });

  it('returns startDomain when plotAreaWidth is zero', () => {
    const startDomain: [number, number] = [20, 80];
    const result = computePannedDomain({
      startDomain,
      fullDomain,
      pixelDelta: 50,
      plotAreaWidth: 0,
    });
    expect(result).toEqual(startDomain);
  });
});

describe('filterVisibleData', () => {
  const data = [
    { x: 0, y: 1 },
    { x: 25, y: 2 },
    { x: 50, y: 3 },
    { x: 75, y: 4 },
    { x: 100, y: 5 },
  ];

  it('filters to items within domain (inclusive boundaries)', () => {
    const result = filterVisibleData(data, 'x', [25, 75]);
    expect(result).toHaveLength(3);
    expect(result[0].x).toBe(25);
    expect(result[2].x).toBe(75);
  });

  it('returns empty array when no items match', () => {
    const result = filterVisibleData(data, 'x', [101, 200]);
    expect(result).toHaveLength(0);
  });

  it('returns all items when domain covers full range', () => {
    const result = filterVisibleData(data, 'x', [0, 100]);
    expect(result).toHaveLength(5);
  });

  it('returns single item when domain is exact point', () => {
    const result = filterVisibleData(data, 'x', [50, 50]);
    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(50);
  });
});

describe('generateEvenTicks', () => {
  it('generates correct count of ticks', () => {
    const result = generateEvenTicks([0, 100], 6);
    expect(result).toHaveLength(6);
  });

  it('includes both endpoints', () => {
    const result = generateEvenTicks([0, 100], 6);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(100);
  });

  it('produces evenly spaced values', () => {
    const result = generateEvenTicks([0, 100], 6);
    // step = 100 / 5 = 20
    expect(result).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it('handles count=1 (returns midpoint)', () => {
    const result = generateEvenTicks([0, 100], 1);
    expect(result).toEqual([50]);
  });

  it('handles count=2 (returns endpoints)', () => {
    const result = generateEvenTicks([0, 100], 2);
    expect(result).toEqual([0, 100]);
  });

  it('handles count=0 (returns empty array)', () => {
    const result = generateEvenTicks([0, 100], 0);
    expect(result).toEqual([]);
  });

  it('works with non-zero start domain', () => {
    const result = generateEvenTicks([50, 150], 3);
    expect(result).toEqual([50, 100, 150]);
  });
});
