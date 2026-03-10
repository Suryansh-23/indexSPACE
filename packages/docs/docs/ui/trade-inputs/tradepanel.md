---
title: "TradePanel"
sidebar_position: 1
---

# TradePanel

The simplest parametric trading panel. Offers two belief shapes — Gaussian (bell curve) and Range (flat plateau) — with slider-based inputs.

```tsx
import { TradePanel } from '@functionspace/ui';
```

**CSS class:** `fs-trade-panel`

**Props:**

| Prop       | Type                          | Default                   | Description                                                    |
| ---------- | ----------------------------- | ------------------------- | -------------------------------------------------------------- |
| `marketId` | `string \| number`            | required                  | Market to trade on                                             |
| `modes`    | `('gaussian' \| 'plateau')[]` | `['gaussian', 'plateau']` | Which shape modes to offer. Tab bar hidden when only one mode. |
| `onBuy`    | `(result: BuyResult) => void` | --                        | Called after successful trade                                  |

**Behavior:**

* **Gaussian mode:** "My Prediction" slider (L to H, step = range/100) + "Confidence" slider (0–100%). Confidence inversely maps to spread width: 0% = 20% of range (wide), 100% = 1% of range (narrow). Generates belief via `generateGaussian`.
* **Range mode:** Two-handle range slider for selecting an outcome range. Initializes to the middle 50% of the market range. Generates belief via `generatePlateau` with sharpness `1` (hard edges). Tab label displays "Range" (not "Plateau").
* **Amount input:** USDC input (minimum $1), default `'100'`. Displays debounced potential payout as `$X.XX`.
* **Post-trade reset:** All inputs revert to defaults (prediction to midpoint, confidence to 50, range to 25–75%, amount to '100').
* **Prediction passed to `buy()`:** In Gaussian mode, the slider value. In Range mode, the midpoint of the selected range.

**Context interactions:**

* **Reads:** `ctx.client`
* **Writes:** `ctx.setPreviewBelief(belief)` on input change, `ctx.setPreviewPayout(result)` after debounced projection, clears both on unmount
* **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useMarket`, `generateGaussian`, `generatePlateau`, `projectPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <TradePanel marketId={42} />
</FunctionSpaceProvider>
```

```tsx
<TradePanel
  marketId={42}
  modes={['gaussian']}
  onBuy={(result) => console.log('Position opened:', result.positionId)}
/>
```

**Related:** `ConsensusChart` (renders preview from this component's context writes) | `generateGaussian`, `generatePlateau` (core generators)
