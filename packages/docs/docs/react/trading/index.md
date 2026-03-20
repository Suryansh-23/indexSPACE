---
title: "Trading - React"
sidebar_label: "Trading"
sidebar_position: 1
description: "Mutation hooks for trade execution and previews, plus state management for custom shape editing."
---

# Trading - React

Mutation hooks for executing trades and previewing outcomes, plus state management for custom shape editing. All hooks require `FunctionSpaceProvider`.

| Hook | Category | Description |
|------|----------|-------------|
| **[useBuy](./usebuy)** | Mutation | Executes a buy trade. Auto-invalidates market cache on success. |
| **[useSell](./usesell)** | Mutation | Executes a sell (close position). Auto-invalidates market cache on success. |
| **[usePreviewPayout](./usepreviewpayout)** | Preview | Previews payout curve for a hypothetical trade. Manages its own AbortController. |
| **[usePreviewSell](./usepreviewsell)** | Preview | Previews collateral returned for selling a position. Accepts optional AbortSignal for cancellation. |
| **[useCustomShape](./usecustomshape)** | State | Manages control point values, locks, and drag state for the interactive shape editor. Derives a normalized `BeliefVector` from current control values. |

