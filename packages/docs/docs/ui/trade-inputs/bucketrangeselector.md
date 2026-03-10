---
title: "BucketRangeSelector"
sidebar_position: 5
---

# BucketRangeSelector

**`BucketRangeSelector`**

A bucket-click trading interface. Displays outcome ranges as a grid of selectable buttons with probability percentages.

```tsx
import { BucketRangeSelector } from '@functionspace/ui';
```


**CSS class:** `fs-bucket-range`

**Props:**


| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `marketId` | `string \| number` | required | Market to trade on |
| `distributionState` | `DistributionState` | -- | External shared state (for syncing with `DistributionChart`). When omitted, creates its own via `useDistributionState`. |
| `defaultBucketCount` | `number` | `12` | Initial number of outcome buckets |
| `maxSelections` | `number` | `3` | Maximum simultaneously selected items (buckets + custom range combined) |
| `defaultAutoMode` | `boolean` | `false` | Start in auto mode (crops to 95% CI) |
| `showCustomRange` | `boolean` | `true` | Show custom min/max range input toggle |
| `onBuy` | `(result: BuyResult) => void` | -- | Called after successful trade |


**Behavior:**

* **Bucket grid:** Adaptive column layout — 3 columns for ≤9, 4 for ≤16, 5 for ≤25, 6 for >25. Each button shows the outcome range label and probability percentage. Clicking a selected bucket deselects it (toggle).
* **FIFO selection:** When `maxSelections` is reached, clicking a new bucket drops the oldest. Custom range selections count toward the max, reducing available bucket slots.
* **Auto mode:** Filters the grid to buckets within the 95% confidence interval (p2.5 to p97.5), focusing on active probability mass.
* **Custom range panel:** Collapsible inputs for min/max values with apply/clear buttons. Ranges are validated — out-of-bounds values are silently rejected (not clamped). Invalid inputs (NaN, min ≥ max, values outside the effective range) cause the apply action to do nothing.
* **Custom range panel:** Collapsible inputs for min/max values with apply/clear buttons. Ranges are validated — out-of-bounds values are rejected (not clamped), displaying an inline error.
* **Selection clearing:** Bucket selections reset automatically when bucket count or auto mode changes (because bucket boundaries shift).
* **Belief construction:** Builds via `generateRange` from the selected bucket and custom range boundaries.
* **Belief construction:** Generates belief via `generateRange` from the selected bucket and custom range boundaries.
* **Prediction:** The average midpoint of all selected ranges is passed to `buy()`.
* **Loading/error states:** Renders "Loading market data..." or "Error: {message}" when data is unavailable.

**Context interactions:**

* **Reads:** `ctx.client`
* **Writes:** `ctx.setPreviewBelief(belief)` on selection change, `ctx.setPreviewPayout(result)` after debounced projection, clears both on unmount
* **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useDistributionState`, `generateRange`, `projectPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <BucketRangeSelector marketId={42} />
</FunctionSpaceProvider>
```

```tsx
// Shared state with a DistributionChart
const distState = useDistributionState(marketId, { defaultBucketCount: 8 });
<DistributionChart marketId={42} distributionState={distState} />
<BucketRangeSelector marketId={42} distributionState={distState} maxSelections={4} />
```

**Related:** `DistributionChart` (sync via shared `DistributionState`) | `BucketTradePanel` (composite of both) | `useDistributionState` (hook)

---
