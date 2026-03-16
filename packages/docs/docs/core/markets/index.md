---
title: "Markets - Core"
sidebar_position: 1
sidebar_label: "Markets"
description: "Query functions for market state, consensus data, density evaluation, and history."
---

# Markets - Core

Functions for discovering markets, fetching market state, and reading consensus data. `queryMarketState` is the foundational call. The others build on top of it by running client-side math on the returned consensus vector.
