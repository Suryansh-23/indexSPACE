---
title: "Markets - UI Components"
sidebar_label: "Markets"
sidebar_position: 1
description: "Market data display widgets including MarketStats, MarketCard, and MarketList for volume, liquidity, status, and market browsing."
---

# Markets - UI Components

Display widgets for market data. All require `FunctionSpaceProvider`.

| Widget | Description |
|--------|-------------|
| **MarketStats** | Horizontal stats bar showing total volume, liquidity, open positions, and market status |
| **MarketCard** | Presentational card displaying a single market summary with title, consensus mean, volume, pool, positions, status badge, and resolution date |
| **MarketList** | Responsive grid of MarketCard components with loading, error, and empty states |

Use `useMarkets` from `@functionspace/react` to fetch market data, render with `MarketList`, and handle `onSelect` to navigate to a trading view. See [Composition and Usage](../composition-and-usage#market-discovery-patterns) for navigation patterns.

