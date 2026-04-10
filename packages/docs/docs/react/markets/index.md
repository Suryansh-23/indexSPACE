---
title: "Markets - React"
sidebar_label: "Markets"
sidebar_position: 1
description: "Data-fetching hooks for market state, consensus curves, distributions, and trade history."
---

# Markets - React

Data-fetching hooks for market state, consensus curves, distribution analysis, and trade history. Primary hooks return `{ named, loading, isFetching, error, refetch }`. Composite hooks (`useBucketDistribution`, `useDistributionState`) return `{ named, loading, error, refetch }` without `isFetching`. All require `FunctionSpaceProvider`.

| Hook | Returns | Description |
|------|---------|-------------|
| **useMarket** | `market` | Complete market state (config, consensus coefficients, metadata) |
| **useMarkets** | `markets` | Market listing with optional filtering, sorting, limiting, and polling |
| **useConsensus** | `consensus` | Consensus density curve as chart-ready `{ x, y }[]` points |
| **useMarketHistory** | `history` | Historical market snapshots with fan chart transform support |
| **useBucketDistribution** | `buckets` | Pre-computed outcome buckets with probability percentages |
| **useDistributionState** | full `DistributionState` | Feature-rich hook combining market, consensus, buckets, percentiles, and sub-range computation |
| **useTradeHistory** | `trades` | Trade entries with optional polling for live updates |

