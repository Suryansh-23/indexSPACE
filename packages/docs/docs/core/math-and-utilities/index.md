---
title: "Math & Utilities"
sidebar_position: 1
description: "Pure math functions (L0) for density evaluation, statistics, and chart operations."
---

# Math & Utilities

Pure math functions with no network dependency. All are L0 (Pure Math) unless noted. These operate on coefficient vectors (belief vectors, consensus vectors, alpha vectors) and return computed results. They have no awareness of markets, clients, or React.

The `coefficients` parameter in these functions accepts any coefficient vector, meaning you can pass `market.consensus`, a belief vector from `generateBelief`, or `position.belief`. They all share the same shape: a `number[]` of length `numBuckets + 2`. Generator output sums to `numBuckets + 2`; API consensus vectors are normalized to sum to 1. The math functions handle both conventions transparently.

## Categories

- **Density Evaluation** -- evaluate density curves from coefficient vectors
- **Statistical Analysis** -- compute statistics, percentiles, and bucket distributions
- **Chart Zoom Math** -- zoom/pan domain computation for interactive charts
- **Discovery** -- layout algorithms for market discovery visualizations (e.g., `treemapLayout` for heatmap views)
