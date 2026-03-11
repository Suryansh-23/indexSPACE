---
title: "Charts"
sidebar_position: 1
---

# Charts

All chart components use a two-tier internal architecture: a **Content** sub-component (used by `MarketCharts`) and a **Standalone** wrapper (handles its own loading/error states and renders a header). Content components receive pre-fetched market and consensus data from their parent, though some fetch additional data independently (e.g., `TimelineChartContent` fetches history via `useMarketHistory` only when its tab is active). Chart colors are always read from `ctx.chartColors` (concrete hex values for Recharts SVG rendering), never from CSS variables.

