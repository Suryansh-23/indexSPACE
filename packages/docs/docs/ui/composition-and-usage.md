---
title: "Composition and Usage"
sidebar_position: 2
---

# Composition and Usage

The SDK is designed around **composition through context**. Any combination of UI components works together automatically when placed inside the same `FunctionSpaceProvider` — no prop-passing, no manual wiring, no event bus.

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
4. **Charts can stand alone.** A `ConsensusChart` without a trade panel simply shows the market consensus — no preview overlay.
5. **`DistributionState` syncs chart and selector.** Pass the same `useDistributionState()` result to both `MarketCharts` (or `DistributionChart`) and `BucketRangeSelector`. Changing the bucket count in one updates the other.
6. **Mix and match freely — with one constraint.** Want a `TimelineChart` above a `BinaryPanel`? A `ConsensusChart` next to a `CustomShapeEditor`? A `MarketStats` bar above a `BucketTradePanel`? All valid. All automatic. **However, only one trading component should be mounted at a time.** Mounting multiple trading components simultaneously causes conflicting `previewBelief` and `previewPayout` writes to context, resulting in flickering previews.

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
  
  <PositionTable marketId={1} username={user.username} />
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

#### Three-Phase Trade Pattern

Every trading widget follows the same execution pattern:

| Phase          | Timing                              | What Happens                                            | Chart Effect                              |
| -------------- | ----------------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| **1. Preview** | Instant (on every input change)     | `generateBelief()` → `ctx.setPreviewBelief(belief)`     | Dashed overlay appears on consensus chart |
| **2. Payout**  | Debounced (500ms after last change) | `projectPayoutCurve()` → `ctx.setPreviewPayout(result)` | Payout column appears in chart tooltip    |
| **3. Submit**  | On button click                     | `buy()` → `ctx.invalidate(marketId)`                    | Preview clears, all data refreshes        |

This pattern ensures responsive feedback (phase 1 is synchronous) while avoiding excessive API calls (phase 2 is debounced).

---
