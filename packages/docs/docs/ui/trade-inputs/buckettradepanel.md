---
title: "BucketTradePanel"
sidebar_position: 6
---

# BucketTradePanel

**`BucketTradePanel`**

A composite component stacking `DistributionChart` on top of `BucketRangeSelector` with a **shared `DistributionState`**. Adjusting the bucket count slider in the chart automatically updates the selector grid.

```tsx
import { BucketTradePanel } from '@functionspace/ui';
```




**CSS class:** `fs-bucket-trade-panel`

**Props:**

| Prop                 | Type                          | Default  | Description                         |
| -------------------- | ----------------------------- | -------- | ----------------------------------- |
| `marketId`           | `string \| number`            | required | Market to trade on                  |
| `defaultBucketCount` | `number`                      | `12`     | Shared initial bucket count         |
| `chartHeight`        | `number`                      | `300`    | Distribution chart height in pixels |
| `maxSelections`      | `number`                      | --       | Forwarded to `BucketRangeSelector`  |
| `defaultAutoMode`    | `boolean`                     | --       | Forwarded to `BucketRangeSelector`  |
| `showCustomRange`    | `boolean`                     | --       | Forwarded to `BucketRangeSelector`  |
| `onBuy`              | `(result: BuyResult) => void` | --       | Forwarded to `BucketRangeSelector`  |

**Behavior:**

* **Composition only:** Creates a `useDistributionState` and passes it to both children. Has no internal loading/error handling — both children manage their own states independently.
* **State sharing:** Bucket count changes in the chart's slider propagate to the selector grid through the shared `DistributionState`.

**Context interactions:** None directly. All context interaction is delegated to `DistributionChart` and `BucketRangeSelector`.

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <BucketTradePanel marketId={42} defaultBucketCount={8} chartHeight={250} />
</FunctionSpaceProvider>
```

**Related:** `DistributionChart`, `BucketRangeSelector`, `useDistributionState`

---
