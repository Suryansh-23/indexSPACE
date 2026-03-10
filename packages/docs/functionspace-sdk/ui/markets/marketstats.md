# MarketStats

**`MarketStats`**

Horizontal stats bar showing key market metrics. Display-only with no user interactions.

```tsx
import { MarketStats } from '@functionspace/ui';
```

<figure><img src="../../../.gitbook/assets/MarketStats.png" alt=""><figcaption></figcaption></figure>

**CSS class:** `fs-stats-bar`

**Props:**

| Prop       | Type               | Default  | Description                 |
| ---------- | ------------------ | -------- | --------------------------- |
| `marketId` | `string \| number` | required | Market to display stats for |

**Displays:**

| Stat              | Source                   | Format                                       |
| ----------------- | ------------------------ | -------------------------------------------- |
| Total Volume      | `market.totalVolume`     | `$` + locale-formatted integer               |
| Current Liquidity | `market.poolBalance`     | `$` + locale-formatted integer               |
| Open Positions    | `market.positionsOpen`   | Integer                                      |
| Market Status     | `market.resolutionState` | `'open'` → "Active", all others → "Resolved" |

**Behavior:**

* **Loading state:** Per-stat skeleton placeholders (labels still visible, only values show shimmer).
* **Error state:** Per-stat inline "Error" text in the negative color.
* **Status CSS classes:** Market status value receives `status-active` (when state is `'open'`) or `status-resolved` (all other states, including when market data is undefined) class for conditional styling. Note: when market data is null (briefly during loading), the displayed text falls back to "Active" while the CSS class is `status-resolved` , this mismatch is cosmetic since skeleton placeholders hide the text during loading.

**Context interactions:** None directly. All context access is delegated to `useMarket`.

**Internal calls:** `useMarket`

**Example:**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketStats marketId={42} />
</FunctionSpaceProvider>
```

**Related:** `useMarket` (data hook)

***
