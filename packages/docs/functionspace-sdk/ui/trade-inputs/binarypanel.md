# BinaryPanel

**`BinaryPanel`**

A simplified Yes/No trading interface. Users bet whether the outcome will be above or below a threshold value X. Renders a natural-language question: "Will {title} be more than {X}{units}?"

```tsx
import { BinaryPanel } from '@functionspace/ui';
```

<figure><img src="../../../.gitbook/assets/BinaryPanel (1).png" alt="" width="375"><figcaption></figcaption></figure>

**CSS class:** `fs-binary-panel`

**Props:**

| Prop       | Type                          | Default                | Description                                 |
| ---------- | ----------------------------- | ---------------------- | ------------------------------------------- |
| `marketId` | `string \| number`            | required               | Market to trade on                          |
| `xPoint`   | `XPointMode`                  | `{ mode: 'variable' }` | How the threshold is determined (see below) |
| `yesColor` | `string`                      | `'#10b981'`            | CSS color for the Yes button                |
| `noColor`  | `string`                      | `'#f43f5e'`            | CSS color for the No button                 |
| `onBuy`    | `(result: BuyResult) => void` | --                     | Called after successful trade               |
| `onError`  | `(error: Error) => void`      | --                     | Called on trade failure                     |

**`XPointMode`:**

```typescript
type XPointMode =
  | { mode: 'static'; value: number }
  | { mode: 'variable'; initial?: number }
  | { mode: 'dynamic-mode'; allowOverride?: boolean }
  | { mode: 'dynamic-mean'; allowOverride?: boolean };
```

| Mode           | Threshold Source                                          | Editable?                     | Fallback      |
| -------------- | --------------------------------------------------------- | ----------------------------- | ------------- |
| `static`       | `value` (fixed)                                           | Never                         | --            |
| `variable`     | `initial` or market midpoint                              | Always                        | `(L + H) / 2` |
| `dynamic-mode` | Consensus mode (peak probability) via `computeStatistics` | Only if `allowOverride: true` | `(L + H) / 2` |
| `dynamic-mean` | Consensus mean via `computeStatistics`                    | Only if `allowOverride: true` | `(L + H) / 2` |

All resolved thresholds are clamped to `[L, H]`.

**Behavior:**

* **Yes:** Builds `generatePlateau(X, H, K, L, H, 1)` — a hard-edged plateau from the threshold to the market high.
* **No:** Builds `generatePlateau(L, X, K, L, H, 1)` — a hard-edged plateau from the market low to the threshold.
* **Side toggle:** Clicking an already-selected side deselects it. The amount input and submit button only appear after a side is chosen.
* **Default amount:** Hardcoded `'100'` USDC.
* **Post-trade reset:** Side resets to `null` (no selection), amount resets to `'100'`. Threshold persists.
* **Threshold formatting:** Displays with `market.decimals` precision, followed by `market.xAxisUnits`.
* **Loading/error states:** Renders "Loading..." or "Error: {message}" when market data is unavailable.

**Context interactions:**

* **Reads:** `ctx.client`
* **Writes:** `ctx.setPreviewBelief(belief)` on side/threshold change, `ctx.setPreviewPayout(result)` after debounced projection, clears both on unmount
* **Triggers:** `ctx.invalidate(marketId)` after successful buy

**Internal calls:** `useMarket`, `generatePlateau`, `computeStatistics`, `projectPayoutCurve`, `buy`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <BinaryPanel marketId={42} />
</FunctionSpaceProvider>
```

```tsx
<BinaryPanel
  marketId={42}
  xPoint={{ mode: 'dynamic-mean', allowOverride: true }}
  onBuy={(result) => console.log('Position:', result.positionId)}
/>
```

**Related:** `ConsensusChart` (renders preview overlay) | `computeStatistics` (powers dynamic threshold tracking) | `XPointMode` (exported type)
