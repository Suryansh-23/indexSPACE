---
title: "useChartZoom"
sidebar_position: 1
description: "Manages scroll-wheel zoom, cursor-anchored panning, and auto-reset for Recharts containers."
---

# useChartZoom

**`useChartZoom(options)`**

Complete chart zoom-and-pan state machine. Handles scroll-wheel zoom (cursor-anchored), mouse-drag panning, double-click reset, and automatic Y-domain recomputation for visible data. Uses `requestAnimationFrame` coalescing for smooth scroll performance.

This hook has **no context dependency** -- it does not call `useContext` and has no `FunctionSpaceContext` requirement. It is a pure interaction utility, portable to any Recharts chart.

```typescript
function useChartZoom(options: ChartZoomOptions): ChartZoomResult
```

**Options (`ChartZoomOptions`):**

| Field                 | Type                                                          | Description                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                | `any[]`                                                       | The chart's data array                                                                                                                                                                    |
| `xKey`                | `string`                                                      | Property name for the X-axis value in each data item                                                                                                                                      |
| `fullXDomain`         | `[number, number]`                                            | The complete (unzoomed) X domain range                                                                                                                                                    |
| `getPlotArea`         | `(containerRect: DOMRect) => { left: number; right: number }` | Callback that computes the plot area pixel boundaries from the container's bounding rect. Use `rechartsPlotArea()` for standard Recharts layouts.                                         |
| `computeYDomain`      | `(visibleData: any[], fullData: any[]) => [number, number]`   | Optional callback to recompute Y-axis bounds when the visible data range changes. Receives visible slice and full data array. If omitted, `yDomain` returns `undefined`.                  |
| `resetTrigger`        | `any`                                                         | When this value changes, zoom state resets to full domain. Useful for market switches.                                                                                                    |
| `maxZoomFactor`       | `number?`                                                     | Maximum zoom depth as a divisor of full range. Default: `50` (can zoom to 1/50th of full range).                                                                                          |
| `zoomFactor`          | `number?`                                                     | Per-scroll zoom step size. Default: `0.15` (15% per scroll tick).                                                                                                                         |
| `panExcludeSelectors` | `string[]?`                                                   | CSS selectors for elements that should not initiate pan. Each selector is tested via `target.closest(sel)` on mouse-down. Example: `['.control-dot']` to exclude draggable chart handles. |
| `enabled`             | `boolean?`                                                    | Master enable/disable. Default: `true`. When `false`, all `containerProps` event handlers become no-ops and `style` is `{}`.                                                              |

**Returns (`ChartZoomResult`):**

| Field            | Type                                             | Description                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `containerRef`   | `React.MutableRefObject<HTMLDivElement \| null>` | Ref to attach to the chart's container div. Required for imperative wheel event listening.                                                                                                                                                             |
| `xDomain`        | `[number, number]`                               | Current visible X domain. Equals `fullXDomain` when not zoomed.                                                                                                                                                                                        |
| `yDomain`        | `[number, number] \| undefined`                  | Recomputed Y domain for the visible data slice. `undefined` if `computeYDomain` was not provided. When not zoomed, calls `computeYDomain(data, data)`.                                                                                                 |
| `isZoomed`       | `boolean`                                        | `true` when the view is zoomed in from the full domain                                                                                                                                                                                                 |
| `isPanning`      | `boolean`                                        | `true` when a mouse-drag pan is in progress                                                                                                                                                                                                            |
| `containerProps` | `object`                                         | Spread onto the container div. Contains `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`, `onDoubleClick`, and `style`. Cursor shows `grab` when zoomed, `grabbing` (with `userSelect: none`) when panning, and no cursor override otherwise. |
| `reset`          | `() => void`                                     | Programmatic zoom reset to full domain                                                                                                                                                                                                                 |

**Behavior:**

* **Wheel zoom** -- Uses `{ passive: false }` to call `preventDefault` (prevents page scrolling while zooming the chart). Zoom is cursor-anchored: the data value under the mouse pointer stays fixed during zoom.
* **rAF coalescing** -- Multiple wheel events within a single animation frame are batched into one state update. Only the latest computed domain is applied.
* **Pan** -- Only activates when already zoomed (cannot pan the full domain). Left mouse button only. Checks `panExcludeSelectors` via `target.closest(sel)` before initiating.
* **Auto-reset** -- Zoom resets to full domain when: `resetTrigger` value changes, `fullXDomain` values change (e.g., switching markets), the user double-clicks, or when zooming out past 99% of full range.
* **Y recomputation** -- When `computeYDomain` is provided, it is called with `(visibleSlice, fullData)` whenever the visible data changes. Falls back to `(fullData, fullData)` when not zoomed or when the visible slice is empty.
* **Disabled mode** -- When `enabled=false`, all `containerProps` handlers are no-ops, `style` is `{}`, and the wheel listener is not attached.

**Delegates to:** `pixelToDataX`, `computeZoomedDomain`, `computePannedDomain`, `filterVisibleData` from `@functionspace/core` (L0 chart zoom math).

**Example:**

```tsx
import { useChartZoom, rechartsPlotArea } from '@functionspace/react';

const MARGIN = { top: 10, right: 20, bottom: 30, left: 10 };

function ZoomableChart({ data, marketId }) {
  const zoom = useChartZoom({
    data,
    xKey: 'x',
    fullXDomain: [data[0].x, data[data.length - 1].x],
    getPlotArea: rechartsPlotArea(MARGIN, 60),
    computeYDomain: (visible) => [0, Math.max(...visible.map(d => d.y)) * 1.1],
    resetTrigger: marketId,
  });

  return (
    
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={MARGIN}>
          <XAxis dataKey="x" domain={zoom.xDomain} type="number" />
          <YAxis domain={zoom.yDomain} />
          <Area dataKey="y" />
        </AreaChart>
      </ResponsiveContainer>
    
  );
}
```
