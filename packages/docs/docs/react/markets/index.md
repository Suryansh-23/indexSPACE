---
title: "Markets"
sidebar_position: 1
---

# Markets

Data-fetching hooks for market state, consensus curves, distribution analysis, and trade history. All follow the `{ named, loading, error, refetch }` return pattern and require `FunctionSpaceProvider`.

| Hook | Returns | Description |
|------|---------|-------------|
| **useMarket** | `market` | Complete market state (config, consensus coefficients, metadata) |
| **useConsensus** | `consensus` | Consensus density curve as chart-ready `{ x, y }[]` points |
| **useMarketHistory** | `history` | Historical market snapshots with fan chart transform support |
| **useBucketDistribution** | `buckets` | Pre-computed outcome buckets with probability percentages |
| **useDistributionState** | full `DistributionState` | Feature-rich hook combining market, consensus, buckets, percentiles, and sub-range computation |
| **useTradeHistory** | `trades` | Trade entries with optional polling for live updates |

