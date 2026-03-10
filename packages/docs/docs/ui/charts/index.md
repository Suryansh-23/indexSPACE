---
title: "Charts"
sidebar_position: 1
---

# Charts

All chart components use a two-tier internal architecture: a **Content** sub-component (receives pre-fetched data, used by `MarketCharts`) and a **Standalone** wrapper (handles its own loading/error states and renders a header). Chart colors are always read from `ctx.chartColors` (concrete hex values for Recharts SVG rendering), never from CSS variables.

