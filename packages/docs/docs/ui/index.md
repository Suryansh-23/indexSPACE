---
title: "UI"
sidebar_position: 1
description: "Overview of @functionspace/ui components, the TradeInputBaseProps contract, and three-phase trade pattern."
---

# UI

`@functionspace/ui` — Ready-to-use React components. Requires `@functionspace/react` and `@functionspace/core` as peer dependencies.

All UI components must be rendered inside a `FunctionSpaceProvider`. They handle their own loading and error states, communicate through context (not props), and inherit theming automatically.

#### Trading

Trading components that support error callbacks implement the `TradeInputBaseProps` contract:

```typescript
interface TradeInputBaseProps {
  marketId: string | number;
  onBuy?: (result: BuyResult) => void;
  onError?: (error: Error) => void;
}
```

`BinaryPanel`, `ShapeCutter`, and `CustomShapeEditor` implement the full contract. `TradePanel` and `BucketRangeSelector` accept `marketId` and `onBuy` but not `onError` (trade errors display inline only). `BucketTradePanel` delegates trading to its child `BucketRangeSelector`.

Every trading component follows the **three-phase trade pattern**:

| Phase          | Timing                                    | What Happens                                                                                             | Chart Effect                             |
| -------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **1. Preview** | Instant (on every input change)           | Generates belief via `generateBelief()` or convenience generator → writes `ctx.setPreviewBelief(belief)` | Dashed overlay appears on ConsensusChart |
| **2. Payout**  | Debounced (500ms after last input change) | Calls `previewPayoutCurve()` → writes `ctx.setPreviewPayout(result)`                                     | Payout column appears in chart tooltip   |
| **3. Submit**  | On button click                           | Calls `buy()` → resets inputs to defaults → clears preview state → calls `ctx.invalidate(marketId)`      | Preview clears, all data hooks refetch   |

All trading components clear `ctx.setPreviewBelief(null)` and `ctx.setPreviewPayout(null)` on unmount, ensuring charts never show stale previews.

**Exclusivity:** Only one trading component should be mounted at a time. Mounting multiple trading components simultaneously causes conflicting `previewBelief` and `previewPayout` writes to context.

---
