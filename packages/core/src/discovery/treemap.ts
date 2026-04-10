// Treemap layout pure math function (L0 Pure Math)
// Protocol-agnostic -- no awareness of markets, positions, or charting libraries.

/**
 * Minimum input shape for treemap items.
 * Consumers extend this with additional properties (e.g., market data).
 */
export interface TreemapItem {
  value: number;
}

/**
 * Output rectangle produced by treemapLayout.
 * Preserves the original item data via the `item` property.
 */
export interface TreemapRect<T extends TreemapItem> {
  x: number;
  y: number;
  w: number;
  h: number;
  item: T;
}

/**
 * Compute a squarified treemap layout for a list of weighted items.
 *
 * Uses a recursive binary-split algorithm:
 * - Finds the midpoint where cumulative value reaches ~50% of total
 * - Splits the container horizontally (landscape) or vertically (portrait)
 * - Recurses on both halves
 *
 * All output coordinates are normalized within the provided container bounds.
 *
 * Category: Discovery | Layer: L0
 *
 * @param items - Array of items with a `value` property
 * @param x0 - Container left edge (default 0)
 * @param y0 - Container top edge (default 0)
 * @param w0 - Container width (default 1)
 * @param h0 - Container height (default 1)
 * @returns Array of rectangles with position, size, and original item reference
 */
export function treemapLayout<T extends TreemapItem>(
  items: T[],
  x0 = 0,
  y0 = 0,
  w0 = 1,
  h0 = 1,
): TreemapRect<T>[] {
  // Base case: empty array
  if (items.length === 0) return [];

  // Base case: single item fills the container
  if (items.length === 1) {
    return [{ x: x0, y: y0, w: w0, h: h0, item: items[0] }];
  }

  const total = items.reduce((sum, it) => sum + it.value, 0);

  // Zero total value: distribute items equally along height axis
  if (total === 0) {
    const sliceH = h0 / items.length;
    return items.map((item, i) => ({
      x: x0,
      y: y0 + i * sliceH,
      w: w0,
      h: sliceH,
      item,
    }));
  }

  // Find split index where cumulative value >= 50% of total
  let cumulative = 0;
  let splitIndex = 0;
  const halfTotal = total / 2;

  for (let i = 0; i < items.length; i++) {
    cumulative += items[i].value;
    if (cumulative >= halfTotal) {
      splitIndex = i;
      break;
    }
  }

  // Clamp split index to [0, items.length - 2] so both groups are non-empty
  splitIndex = Math.max(0, Math.min(splitIndex, items.length - 2));

  // Partition into left/right groups
  const left = items.slice(0, splitIndex + 1);
  const right = items.slice(splitIndex + 1);

  const leftSum = left.reduce((sum, it) => sum + it.value, 0);
  const ratio = leftSum / total;

  // Landscape (w0 >= h0): split horizontally
  if (w0 >= h0) {
    const leftW = w0 * ratio;
    const rightW = w0 - leftW;
    return [
      ...treemapLayout(left, x0, y0, leftW, h0),
      ...treemapLayout(right, x0 + leftW, y0, rightW, h0),
    ];
  }

  // Portrait (h0 > w0): split vertically
  const leftH = h0 * ratio;
  const rightH = h0 - leftH;
  return [
    ...treemapLayout(left, x0, y0, w0, leftH),
    ...treemapLayout(right, x0, y0 + leftH, w0, rightH),
  ];
}
