---
title: "Composition and Usage"
sidebar_position: 2
description: "How UI components communicate through context and compose together without prop wiring."
---

# Composition and Usage

The SDK is designed around **composition through context**. Any combination of UI components works together automatically when placed inside the same `FunctionSpaceProvider`  -- no prop-passing, no manual wiring, no event bus.

#### How Components Communicate

```
FunctionSpaceProvider
├── ctx.previewBelief    ← written by any trading widget
│                         → read by ConsensusChart (shows preview overlay)
├── ctx.previewPayout    ← written by any trading widget (debounced)
│                         → read by ConsensusChart tooltip (shows payout data)
├── ctx.selectedPosition ← written by PositionTable (row click)
│                         → read by ConsensusChart / CustomShapeEditor (shows position overlay)
└── ctx.invalidate(marketId) ← called after buy/sell
                          → triggers all data hooks to re-fetch
```

#### Composability Rules

1. **Any chart + any trade panel = working preview.** Place a `ConsensusChart` and a `TradePanel` in the same provider tree. Moving sliders on the trade panel instantly shows a dashed preview curve on the chart.
2. **Any chart + `PositionTable` = position visualization.** Clicking a position row highlights that position's belief on the chart.
3. **Any trade panel can stand alone.** Each trading widget handles its own loading, error states, and submission. You can use a `ShapeCutter` without any chart.
4. **Charts can stand alone.** A `ConsensusChart` without a trade panel simply shows the market consensus  -- no preview overlay.
5. **`DistributionState` syncs chart and selector.** Pass the same `useDistributionState()` result to both `MarketCharts` (or `DistributionChart`) and `BucketRangeSelector`. Changing the bucket count in one updates the other.
6. **Mix and match freely  -- with one constraint.** Want a `TimelineChart` above a `BinaryPanel`? A `ConsensusChart` next to a `CustomShapeEditor`? A `MarketStats` bar above a `BucketTradePanel`? All valid. All automatic. **However, only one trading component should be mounted at a time.** Mounting multiple trading components simultaneously causes conflicting `previewBelief` and `previewPayout` writes to context, resulting in flickering previews.

#### Composition Examples

**Minimal: Chart only**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <ConsensusChart marketId={1} height={400} />
</FunctionSpaceProvider>
```

**Standard: Chart + Trade Panel**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  
    <ConsensusChart marketId={1} height={500} zoomable />
    <TradePanel marketId={1} />
  
</FunctionSpaceProvider>
```

**Full: Stats + Chart + Trade + Positions**

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketStats marketId={1} />
  <AuthWidget />
  
    <MarketCharts marketId={1} views={['consensus', 'distribution', 'timeline']} zoomable />
    <ShapeCutter marketId={1} />
  
  <PositionTable marketId={1} />
</FunctionSpaceProvider>
```

**Distribution Trading: Synced chart + bucket selector**

```tsx
function DistRangeLayout({ marketId }) {
  const distState = useDistributionState(marketId);
  return (
    <FunctionSpaceProvider config={config} theme="fs-dark">
      <MarketCharts marketId={marketId} views={['consensus', 'distribution']} distributionState={distState} />
      <BucketRangeSelector marketId={marketId} distributionState={distState} />
    </FunctionSpaceProvider>
  );
}
```

#### Market Discovery Patterns

`MarketCard` and `MarketCardGrid` are presentational components -- they receive `MarketState` data and fire an `onSelect(marketId)` callback. The consumer decides what happens on selection. Two patterns exist depending on your app architecture.

**Pattern 1: State-Driven Navigation (no router)**

Use this when building single-page apps, embedded widgets, or when the host app already has a router. This pattern is also the starting point for overlay/modal market selectors.

```tsx
import { useState } from 'react';
import { FunctionSpaceProvider, useMarkets } from '@functionspace/react';
import { MarketCardGrid, MarketCharts, TradePanel, PositionTable } from '@functionspace/ui';

const config = { apiBase: 'https://api.example.com' };

function MarketDiscoveryLayout() {
  const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null);
  const { markets, loading, error } = useMarkets({ state: 'open', sortBy: 'totalVolume' });

  if (selectedMarketId !== null) {
    return (
      <>
        <button onClick={() => setSelectedMarketId(null)}>Back to Markets</button>
        <MarketCharts marketId={selectedMarketId} />
        <TradePanel marketId={selectedMarketId} />
        <PositionTable marketId={selectedMarketId} />
      </>
    );
  }

  return <MarketCardGrid markets={markets} loading={loading} error={error} onSelect={setSelectedMarketId} />;
}

export default function App() {
  return (
    <FunctionSpaceProvider config={config} theme="fs-dark">
      <MarketDiscoveryLayout />
    </FunctionSpaceProvider>
  );
}
```

- **Pros:** Zero extra dependencies, simpler, embeddable in existing apps, no URL conflicts, ready for overlay/modal variant.
- **Cons:** No shareable URLs, no browser back/forward, no bookmarking.

**Pattern 2: Route-Driven Navigation (React Router)**

Use this for standalone multi-page apps where you need shareable/bookmarkable URLs and browser back/forward navigation.

```tsx
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { FunctionSpaceProvider, useMarkets } from '@functionspace/react';
import { MarketCardGrid, MarketCharts, TradePanel, PositionTable } from '@functionspace/ui';

const config = { apiBase: 'https://api.example.com' };

function MarketBrowsePage() {
  const navigate = useNavigate();
  const { markets, loading, error } = useMarkets({ state: 'open', sortBy: 'totalVolume' });
  return <MarketCardGrid markets={markets} loading={loading} error={error} onSelect={(id) => navigate(`/trade/${id}`)} />;
}

function TradingPage() {
  const { marketId } = useParams<{ marketId: string }>();
  const navigate = useNavigate();
  const numericId = Number(marketId);
  if (isNaN(numericId)) return <p>Invalid market ID. <button onClick={() => navigate('/')}>Back</button></p>;

  return (
    <>
      <button onClick={() => navigate('/')}>Back to Markets</button>
      <MarketCharts marketId={numericId} />
      <TradePanel marketId={numericId} />
      <PositionTable marketId={numericId} />
    </>
  );
}

export default function App() {
  return (
    <FunctionSpaceProvider config={config} theme="fs-dark">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketBrowsePage />} />
          <Route path="/trade/:marketId" element={<TradingPage />} />
        </Routes>
      </BrowserRouter>
    </FunctionSpaceProvider>
  );
}
```

- **Pros:** Shareable URLs, browser back/forward navigation, bookmarkable.
- **Cons:** Requires `react-router-dom`, can conflict with host router, more setup.

**Trade-off comparison**

| Consideration | State-Driven | Route-Driven |
|---|---|---|
| Shareable URLs | No | Yes |
| Browser back/forward | No | Yes |
| Bookmarking | No | Yes |
| Extra dependencies | None | react-router-dom |
| Embeddable in existing apps | Yes -- no router conflicts | May conflict with host router |
| Overlay/modal ready | Yes -- swap view toggle for modal | Less applicable |

**Provider Placement Rule**

`FunctionSpaceProvider` MUST wrap above the navigation boundary -- above the router or above the `useState`. This ensures auth, cache, and theme persist across navigation.

```tsx
// Correct: provider outside navigation
<FunctionSpaceProvider config={config} theme="fs-dark">
  {/* State-driven or Router-driven navigation inside */}
</FunctionSpaceProvider>
```

Never create a second provider for nested routes.

See [MarketCard](./markets/marketcard) and [MarketCardGrid](./markets/marketcardgrid) for props reference.

#### Embedded Market Discovery

`MarketExplorer` provides a self-contained browse-and-trade flow with multiple view modes and an optional overlay panel. It manages search, category, and sort state internally via `useMarketFilters`, renders a `MarketFilterBar` and the active view, and opens a slide-over panel when a card is clicked (when a `children` render prop is provided). You supply the trading UI via a render prop:

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketExplorer state="open" featuredCategories={['sports', 'crypto']} views={['cards', 'pulse', 'compact', 'gauge', 'split', 'table', 'heatmap', 'charts']}>
    {(marketId) => (
      <>
        <MarketCharts marketId={marketId} />
        <TradePanel marketId={marketId} />
      </>
    )}
  </MarketExplorer>
</FunctionSpaceProvider>
```

If you need full-page navigation instead of an overlay, use the state-driven or route-driven patterns above with `MarketCardGrid` directly.

See [MarketExplorer](./markets/marketexplorer) for props reference.

#### Market Filter Bar

`MarketFilterBar` is a presentational filter component providing search, category chips, and sort controls. It is driven by the `useMarketFilters` hook, which manages all filter state and returns a `filterBarProps` bundle that can be spread directly onto the component.

This pattern is useful when you want filter controls without the `MarketExplorer` wrapper -- for example, in a custom page layout or alongside your own list rendering.

```tsx
import { useMarketFilters } from '@functionspace/react';
import { MarketFilterBar, MarketCardGrid } from '@functionspace/ui';

function CustomMarketBrowser() {
  const { markets, loading, error, filterBarProps } = useMarketFilters({
    state: 'open',
    featuredCategories: ['sports', 'crypto', 'politics'],
    pollInterval: 10000,
  });

  return (
    <div>
      <MarketFilterBar {...filterBarProps} searchPlaceholder="Find a market..." />
      <MarketCardGrid
        markets={markets}
        loading={loading}
        error={error}
        onSelect={(id) => console.log('Selected:', id)}
      />
    </div>
  );
}
```

The hook also exposes individual filter actions (`setSearchText`, `toggleCategory`, `setSortField`, etc.) for building fully custom filter UIs without `MarketFilterBar`. See [useMarketFilters](../react/markets/usemarketfilters) and [MarketFilterBar](./markets/marketfilterbar) for full API reference.

#### Three-Phase Trade Pattern

Every trading widget follows the same execution pattern:

| Phase          | Timing                              | What Happens                                            | Chart Effect                              |
| -------------- | ----------------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| **1. Preview** | Instant (on every input change)     | `generateBelief()` → `ctx.setPreviewBelief(belief)`     | Dashed overlay appears on consensus chart |
| **2. Payout**  | Debounced (500ms after last change) | `usePreviewPayout`'s `execute()` → `ctx.setPreviewPayout(result)` | Payout column appears in chart tooltip    |
| **3. Submit**  | On button click                     | `useBuy`'s `execute()` → auto-invalidates cache                   | Preview clears, all data refreshes        |

This pattern ensures responsive feedback (phase 1 is synchronous) while avoiding excessive API calls (phase 2 is debounced).

---
