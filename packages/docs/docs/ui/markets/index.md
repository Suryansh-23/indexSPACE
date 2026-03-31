---
title: "Markets - UI Components"
sidebar_label: "Markets"
sidebar_position: 1
description: "Market data display widgets including MarketStats, MarketCard, MarketCardGrid, and MarketExplorer for volume, liquidity, status, and market browsing."
---

# Markets - UI Components

Display widgets for market data. All require `FunctionSpaceProvider`.

| Widget | Description |
|--------|-------------|
| **MarketStats** | Horizontal stats bar showing total volume, liquidity, open positions, and market status |
| **MarketCard** | Presentational card displaying a single market summary with title, consensus mean, volume, pool, positions, status badge, and resolution date |
| **MarketCardGrid** | Responsive grid of MarketCard components with loading, error, and empty states |
| **MarketExplorer** | Multi-view market discovery widget with tabbed views (cards, pulse, compact, gauge, split, table, heatmap, charts), integrated filter bar, and optional overlay panel for inline trading |

Use `useMarkets` from `@functionspace/react` to fetch market data, render with `MarketCardGrid`, and handle `onSelect` to navigate to a trading view. Use `MarketExplorer` for a self-contained browse-and-trade experience with multiple view modes and an optional overlay panel. See [Composition and Usage](../composition-and-usage#market-discovery-patterns) for navigation patterns.
