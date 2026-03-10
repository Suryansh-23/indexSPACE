---
title: "rechartsPlotArea"
sidebar_position: 2
---

# rechartsPlotArea

**`rechartsPlotArea(margin, yAxisWidth?)`**

Factory function that creates a `getPlotArea` callback compatible with `useChartZoom`. Accounts for Recharts chart margins and Y-axis width to compute the correct pixel boundaries for zoom/pan coordinate conversion.

```typescript
function rechartsPlotArea(
  margin: { left: number; right: number },
  yAxisWidth?: number,  // default: 60
): (rect: DOMRect) => { left: number; right: number }
```

| Parameter    | Type                              | Description                                              |
| ------------ | --------------------------------- | -------------------------------------------------------- |
| `margin`     | `{ left: number; right: number }` | The `margin` prop passed to the Recharts chart component |
| `yAxisWidth` | `number?`                         | Width of the Y-axis in pixels. Default: `60`.            |

**Returns:** A function that takes a container's `DOMRect` and returns `{ left, right }` pixel positions of the plot area. Computed as `left = rect.left + margin.left + yAxisWidth`, `right = rect.right - margin.right`.

**Example:**

```tsx
const MARGIN = { top: 10, right: 20, bottom: 30, left: 10 };
const getPlotArea = rechartsPlotArea(MARGIN, 60);
// getPlotArea(containerRect) => { left: containerRect.left + 10 + 60, right: containerRect.right - 20 }
```
