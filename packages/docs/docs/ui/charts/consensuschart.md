---
title: "ConsensusChart"
sidebar_position: 2
---

# ConsensusChart

**`ConsensusChart`**

Standalone probability density chart. Automatically overlays trade preview and selected position curves from context — no prop wiring needed.

```tsx
import { ConsensusChart } from '@functionspace/ui';
```


**CSS class:** `fs-chart-container`

**Props:**

| Prop            | Type               | Default  | Description                                             |
| --------------- | ------------------ | -------- | ------------------------------------------------------- |
| `marketId`      | `string \| number` | required | Market to visualize                                     |
| `height`        | `number`           | `300`    | Chart height in pixels                                  |
| `overlayCurves` | `OverlayCurve[]`   | --       | Additional density curves (same type as `MarketCharts`) |
| `zoomable`      | `boolean`          | --       | Enable scroll-wheel zoom and drag-to-pan                |

**Renders (bottom to top):**

1. **Consensus area** — `type="monotone"`, solid stroke, gradient fill (40% → 5% opacity). No animation.
2. **Trade preview area** — `type="linear"` (sharp edges for shape accuracy), dashed stroke (5 5), gradient fill, 300ms animation. Appears when any trading component writes `ctx.previewBelief`.
3. **Selected position area** — `type="monotone"`, solid stroke, gradient fill, 300ms animation. Appears when a `PositionTable` row is clicked.
4. **Payout data** — Invisible area on a hidden right Y-axis (tooltip only). Shows "Potential Payout: $X.XX" in tooltip when payout data exists.
5. **Overlay curves** — `type="monotone"`, custom colors, gradient fills, 300ms animation.

**Behavior:**

* **Y-axis capping:** When preview or position overlay curves exceed the consensus maximum, the Y-domain caps overlay influence at 4x the consensus max to prevent the consensus curve from being visually squished.
* **Payout matching:** Payout projection data is matched to chart X points via nearest-neighbor within 2 steps. Points outside this range show no payout value.
* **Custom tooltip:** Color-coded rows for each active data series (consensus, preview, selected position, payout, overlays). Cursor renders as a dashed crosshair.
* **Legend:** Auto-generated from active data series with matching colors. The payout series is excluded from the legend (`legendType="none"`) even when payout data exists.
* **Loading/error:** Renders "Loading consensus data..." or "Error: {message}" inline.

**Context interactions:**

* **Reads:** `ctx.previewBelief` (preview curve), `ctx.selectedPosition` (position curve), `ctx.previewPayout` (tooltip data), `ctx.chartColors` (all rendering colors)
* **Writes:** None

**Internal calls:** `useMarket`, `useConsensus`, `evaluateDensityCurve`, `useChartZoom`, `rechartsPlotArea`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <ConsensusChart marketId={42} height={400} zoomable />
</FunctionSpaceProvider>
```

**Related:** Any trading component (writes `previewBelief`/`previewPayout` that this chart reads) | `PositionTable` (writes `selectedPosition`) | `useChartZoom` (zoom/pan hook)

---
