---
title: "treemapLayout"
sidebar_position: 1
description: "Compute a squarified treemap layout for a list of weighted items using a recursive binary-split algorithm."
---

# treemapLayout

**`treemapLayout<T extends TreemapItem>(items, x0?, y0?, w0?, h0?)`**

**Category:** Discovery | **Layer:** L0

Computes a squarified treemap layout for a list of weighted items. Uses a recursive binary-split algorithm: finds the midpoint where cumulative value reaches approximately 50% of total, splits the container horizontally (landscape) or vertically (portrait), and recurses on both halves. All output coordinates are normalized within the provided container bounds.

```typescript
import { treemapLayout } from '@functionspace/core';
import type { TreemapItem, TreemapRect } from '@functionspace/core';

function treemapLayout<T extends TreemapItem>(
  items: T[],
  x0?: number, // Container left edge (default 0)
  y0?: number, // Container top edge (default 0)
  w0?: number, // Container width (default 1)
  h0?: number, // Container height (default 1)
): TreemapRect<T>[]
```

**Parameters:**

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `items` | `T[]` | required | Array of items with a `value` property |
| `x0` | `number` | `0` | Container left edge |
| `y0` | `number` | `0` | Container top edge |
| `w0` | `number` | `1` | Container width |
| `h0` | `number` | `1` | Container height |

**Types:**

```typescript
interface TreemapItem {
  value: number;
}

interface TreemapRect<T extends TreemapItem> {
  x: number;  // Left edge of rectangle
  y: number;  // Top edge of rectangle
  w: number;  // Width of rectangle
  h: number;  // Height of rectangle
  item: T;    // Original item reference
}
```

**Return value:** `TreemapRect<T>[]` -- an array of rectangles with position, size, and original item reference. The rectangles tile the container without overlap.

**Algorithm:**

1. **Base case (0 items):** Returns an empty array.
2. **Base case (1 item):** Returns a single rectangle filling the entire container.
3. **Zero total value:** Distributes items equally along the height axis.
4. **Split:** Finds the index where cumulative value reaches >= 50% of total. Clamps to ensure both groups are non-empty.
5. **Landscape (w >= h):** Splits horizontally. Left group gets `width * ratio`, right group gets the remainder.
6. **Portrait (h > w):** Splits vertically. Top group gets `height * ratio`, bottom group gets the remainder.
7. **Recurse:** Applies the same algorithm to both halves.

**Example:**

```typescript
import { treemapLayout } from '@functionspace/core';

const items = [
  { value: 500, label: 'Sports' },
  { value: 300, label: 'Crypto' },
  { value: 200, label: 'Politics' },
];

const rects = treemapLayout(items, 0, 0, 800, 600);
// rects[0] => { x: 0, y: 0, w: 400, h: 600, item: { value: 500, label: 'Sports' } }
// rects[1] => { x: 400, y: 0, w: 400, h: 360, item: { value: 300, label: 'Crypto' } }
// rects[2] => { x: 400, y: 360, w: 400, h: 240, item: { value: 200, label: 'Politics' } }
```

**Usage with MarketState:**

```typescript
import { treemapLayout } from '@functionspace/core';
import type { MarketState } from '@functionspace/core';

// Extend TreemapItem with market data
interface MarketTreemapItem {
  value: number;
  market: MarketState;
}

const items: MarketTreemapItem[] = markets.map(m => ({
  value: m.totalVolume,
  market: m,
}));

const rects = treemapLayout(items, 0, 0, containerWidth, containerHeight);

rects.forEach(rect => {
  console.log(rect.item.market.title, rect.x, rect.y, rect.w, rect.h);
});
```

**Related:** `discoverMarkets` (fetches market data for treemap input), `HeatmapView` (uses `treemapLayout` internally for the heatmap market view)
