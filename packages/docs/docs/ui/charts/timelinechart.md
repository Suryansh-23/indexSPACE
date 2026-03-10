---
title: "TimelineChart"
sidebar_position: 4
---

# TimelineChart

**`TimelineChart`**

Fan chart showing consensus evolution over time with nested confidence interval bands.

```tsx
import { TimelineChart } from '@functionspace/ui';
```


**CSS class:** `fs-chart-container`

**Props:**

| Prop       | Type               | Default  | Description                              |
| ---------- | ------------------ | -------- | ---------------------------------------- |
| `marketId` | `string \| number` | required | Market to display                        |
| `height`   | `number`           | `300`    | Chart height in pixels                   |
| `zoomable` | `boolean`          | --       | Enable scroll-wheel zoom and drag-to-pan |

**Renders:**

* **Four nested confidence bands** (rendered widest first so narrower bands paint on top): 95% CI (p2.5–p97.5), 75% CI (p12.5–p87.5), 50% CI (p25–p75), 25% CI (p37.5–p62.5). All use `chartColors.fanBands.*` colors.
* **Mean line:** Solid stroke on top of all bands, using `chartColors.fanBands.mean`.
* **Time filter buttons:** All / 24h / 7d / 30d. Changing the filter resets any active zoom state.
* **Interactive legend:** Band entries are clickable toggles to show/hide individual bands. The mean line entry is not toggleable.
* **End-of-series annotation:** Displays the most recent mean value, positioned at the chart's right edge.
* **Custom tooltip:** Shows date/time, mean, median (p50), 50% CI range, and 95% CI range, all formatted to `market.decimals` precision.

**Behavior:**

* **Split data fetching:** The standalone wrapper loads market data; the content component (`TimelineChartContent`) always fetches history via `useMarketHistory` when mounted. The "only when visible" optimization is implemented by callers (e.g., `MarketCharts` conditionally renders `TimelineChartContent` only when the timeline tab is active).
* **Synthetic flat-line:** When only 1 history snapshot exists, a synthetic second point at the current timestamp creates a visible flat line.
* **Extend to now:** The last data point is always extended to `Date.now()`, ensuring the chart shows current-time coverage.
* **Zoom Y-domain adaptation:** When zoomed in, the Y-axis recalculates from the visible data's band95 range, providing auto-fitting vertical bounds.
* **X-axis formatting:** Uses time format (HH:MM) for the 24h filter, date format (Mon Day) for longer ranges.
* **Loading/error:** Two-level: "Loading market data..." from the standalone wrapper, then "Loading history data..." from the content component. Empty state shows "No history data available for this time range".

**Context interactions:**

* **Reads:** `ctx.chartColors` (fan band colors, grid, axis, crosshair)
* **Writes:** None

**Internal calls:** `useMarket`, `useMarketHistory`, `transformHistoryToFanChart`, `useChartZoom`, `rechartsPlotArea`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <TimelineChart marketId={42} height={500} zoomable />
</FunctionSpaceProvider>
```

**Related:** `transformHistoryToFanChart` (core math) | `useMarketHistory` (data hook) | `computePercentiles` (powers the band calculations)

---
