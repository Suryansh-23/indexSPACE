// Chart zoom/pan pure math functions (L0 Pure Math)
// Protocol-agnostic  -- no awareness of markets, positions, or charting libraries.

export interface ZoomParams {
  currentDomain: [number, number];
  fullDomain: [number, number];
  cursorDataX: number;
  direction: 1 | -1; // 1 = zoom out, -1 = zoom in
  zoomFactor?: number; // default 0.15
  maxZoomFactor?: number; // default 50
}

export interface PanParams {
  startDomain: [number, number];
  fullDomain: [number, number];
  pixelDelta: number;
  plotAreaWidth: number;
}

/**
 * Convert a pixel X coordinate to a data-space X value via linear interpolation.
 * Clamps the ratio to [0, 1] so positions outside the plot area map to domain edges.
 */
export function pixelToDataX(
  clientX: number,
  plotAreaLeft: number,
  plotAreaRight: number,
  xDomain: [number, number],
): number {
  const plotWidth = plotAreaRight - plotAreaLeft;
  if (plotWidth <= 0) return xDomain[0];

  const ratio = Math.max(0, Math.min(1, (clientX - plotAreaLeft) / plotWidth));
  return xDomain[0] + ratio * (xDomain[1] - xDomain[0]);
}

/**
 * Compute a new X domain after a scroll-wheel zoom event.
 * Zoom is centered on the cursor position so the data value under the cursor stays fixed.
 * Returns null when the zoomed range reaches >= 99% of full range (reset threshold).
 */
export function computeZoomedDomain(params: ZoomParams): [number, number] | null {
  const {
    currentDomain,
    fullDomain,
    cursorDataX,
    direction,
    zoomFactor = 0.15,
    maxZoomFactor = 50,
  } = params;

  const [xMin, xMax] = currentDomain;
  const [fullMin, fullMax] = fullDomain;
  const range = xMax - xMin;
  const fullRange = fullMax - fullMin;

  // Compute new range
  const factor = 1 + direction * zoomFactor;
  const newRange = range * factor;

  // Clamp range
  const minSpan = fullRange / maxZoomFactor;
  const clampedRange = Math.max(minSpan, Math.min(fullRange, newRange));

  // 99% reset threshold  -- avoids near-full-range jitter
  if (clampedRange >= fullRange * 0.99) return null;

  // Preserve cursor position proportionally
  const cursorRatio = range > 0 ? (cursorDataX - xMin) / range : 0.5;
  let newMin = cursorDataX - cursorRatio * clampedRange;
  let newMax = cursorDataX + (1 - cursorRatio) * clampedRange;

  // Clamp to full domain boundaries
  if (newMin < fullMin) {
    newMin = fullMin;
    newMax = newMin + clampedRange;
  }
  if (newMax > fullMax) {
    newMax = fullMax;
    newMin = newMax - clampedRange;
  }

  return [newMin, newMax];
}

/**
 * Compute a new X domain after a drag-to-pan operation.
 * Negative pixelDelta (drag right) shifts the domain left, positive shifts right.
 * Range is preserved  -- only the position changes.
 */
export function computePannedDomain(params: PanParams): [number, number] {
  const { startDomain, fullDomain, pixelDelta, plotAreaWidth } = params;
  const [startMin, startMax] = startDomain;
  const [fullMin, fullMax] = fullDomain;
  const range = startMax - startMin;

  if (plotAreaWidth <= 0) return startDomain;

  // Negative because drag-right = shift-left in data space
  const dataDelta = -(pixelDelta / plotAreaWidth) * range;
  let newMin = startMin + dataDelta;
  let newMax = startMax + dataDelta;

  // Clamp to full domain boundaries without changing range
  if (newMin < fullMin) {
    newMin = fullMin;
    newMax = newMin + range;
  }
  if (newMax > fullMax) {
    newMax = fullMax;
    newMin = newMax - range;
  }

  return [newMin, newMax];
}

/**
 * Filter a data array to items whose X-key value falls within the given domain (inclusive).
 */
export function filterVisibleData<T>(
  data: T[],
  xKey: keyof T & string,
  domain: [number, number],
): T[] {
  const [min, max] = domain;
  return data.filter((d) => {
    const val = d[xKey] as number;
    return val >= min && val <= max;
  });
}

/**
 * Generate evenly-spaced tick values across a domain.
 * Returns exactly `count` values from domain[0] to domain[1].
 */
export function generateEvenTicks(
  domain: [number, number],
  count: number,
): number[] {
  if (count < 1) return [];
  if (count === 1) return [(domain[0] + domain[1]) / 2];

  const step = (domain[1] - domain[0]) / (count - 1);
  return Array.from({ length: count }, (_, i) => domain[0] + i * step);
}
