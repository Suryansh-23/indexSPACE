# Basic Trading Layout

<figure><img src="../../../.gitbook/assets/StarterKit_BasicTrading (1).png" alt=""><figcaption></figcaption></figure>

**File:** `demo-app/src/App_BasicTradingLayout.tsx`

The canonical full-featured layout. Side-by-side chart and trade panel with position management below.

**Components:** `MarketStats` + `AuthWidget` (header row) → `ConsensusChart` + `TradePanel` (7:3 split) → `PositionTable`

**What it enables:** Users read the article, see the aggregate market forecast on the consensus chart, form a view using Gaussian or Range shapes, watch their preview overlay in real-time, submit a trade, then manage positions in the table below. Clicking a position row highlights it on the chart.

**Target audience:** General-purpose. The recommended default for most integrations.

