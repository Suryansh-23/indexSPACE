---
title: "Markets - Core"
sidebar_position: 1
sidebar_label: "Markets"
description: "Query functions for market state, consensus data, density evaluation, and history."
---

# Markets - Core

Functions for discovering markets, fetching market state, and reading consensus data. `discoverMarkets` lists all markets with optional filtering and sorting. `queryMarketState` is the foundational call for a single market. The others build on top of these by running client-side math on the returned consensus vector.

| Function | Layer | Description |
|----------|-------|-------------|
| **discoverMarkets** | L1 | List markets with optional filtering, sorting, and limiting |
| **filterMarkets** | L1 | Pure client-side filtering/sorting of MarketState arrays |
| **discoverPopularMarkets** | L2 | Preset: sort by totalVolume desc, limit 10 |
| **discoverActiveMarkets** | L2 | Preset: state = open |
| **discoverMarketsByCategory** | L2 | Preset: filter by categories |
| **queryMarketState** | L1 | Fetch complete state for a single market |
| **getConsensusCurve** | L1 | Evaluate consensus PDF into chart-ready points |
