# FunctionSpace SDK Developer Playbook

## Overview

This playbook documents how to add new widgets and expand the SDK. All widgets must integrate with the theme system and follow established patterns.

---

## Quick Reference: Adding a New Widget

### 1. Create the Component File

Choose the appropriate folder:
- `charts/` — for visualizations
- `trading/` — for user input/actions
- `market/` — for read-only market info

```typescript
// packages/ui/src/{category}/MyWidget.tsx
import React, { useContext } from 'react';
import { FunctionSpaceContext, useMarket } from '@functionspace/react';
import './styles/base.css';

export interface MyWidgetProps {
  marketId: string | number;
  // Add widget-specific props
}

export function MyWidget({ marketId }: MyWidgetProps) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('MyWidget must be used within FunctionSpaceProvider');

  const { market, loading, error } = useMarket(marketId);

  if (loading) {
    return <div className="fs-mywidget"><span style={{ color: 'var(--fs-text-secondary)' }}>Loading...</span></div>;
  }

  if (error) {
    return <div className="fs-mywidget"><span style={{ color: 'var(--fs-negative)' }}>Error: {error.message}</span></div>;
  }

  return (
    <div className="fs-mywidget">
      {/* Widget content using theme variables */}
    </div>
  );
}
```

### 2. Add Styles to base.css

```css
/* packages/ui/src/styles/base.css */

.fs-mywidget {
  background: linear-gradient(to bottom right, var(--fs-background), var(--fs-background-dark));
  border: 1px solid var(--fs-border);
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.fs-mywidget-title {
  color: var(--fs-text);
  font-weight: 600;
}

.fs-mywidget-value {
  color: var(--fs-primary);
}
```

### 3. Export from index.ts

First, add to the category's index:
```typescript
// packages/ui/src/{category}/index.ts
export { MyWidget } from './MyWidget.js';
export type { MyWidgetProps } from './MyWidget.js';
```

Then re-export from the root:
```typescript
// packages/ui/src/index.ts
export { MyWidget } from './{category}/index.js';
export type { MyWidgetProps } from './{category}/index.js';
```

---

## Theme Integration Rules

### Always Use CSS Variables

| Variable | Purpose |
|----------|---------|
| `--fs-primary` | Main accent (buttons, links, highlights) |
| `--fs-accent` | Secondary accent (previews, warnings) |
| `--fs-positive` | Success/profit states |
| `--fs-negative` | Error/loss states |
| `--fs-background` | Widget background |
| `--fs-surface` | Elevated surfaces (cards, modals) |
| `--fs-text` | Primary text |
| `--fs-text-secondary` | Muted/secondary text |
| `--fs-border` | Borders and dividers |

### Theme Props → CSS Variables

When passing custom colors to `FunctionSpaceProvider`, these theme props become CSS variables:

| Theme Prop | CSS Variable |
|------------|--------------|
| `primary` | `--fs-primary` |
| `accent` | `--fs-accent` |
| `positive` | `--fs-positive` |
| `negative` | `--fs-negative` |
| `background` | `--fs-background` |
| `surface` | `--fs-surface` |
| `text` | `--fs-text` |
| `textSecondary` | `--fs-text-secondary` |
| `border` | `--fs-border` |

Example:
```tsx
<FunctionSpaceProvider theme={{ preset: "dark", primary: "#ff6b6b" }}>
  {/* --fs-primary is now #ff6b6b, other vars from dark preset */}
</FunctionSpaceProvider>
```

### Derived Variables (set in base.css)

```css
--fs-background-dark    /* Darker bg for gradients */
--fs-input-bg           /* Input field backgrounds */
--fs-primary-glow       /* Focus rings, shadows */
--fs-primary-light      /* Hover states */
--fs-header-gradient    /* Header accent gradients */
```

**CRITICAL:** These derived variables are computed via a shared CSS selector near the top of `base.css`. When adding a new widget that uses gradient backgrounds, input fields, or any derived variable, you **MUST** add its root class to this selector:

```css
/* base.css — shared derived-variables selector */
.fs-chart-container,
.fs-trade-panel,
.fs-shape-cutter,
.fs-stats-bar,
.fs-table-container,
.fs-time-sales,
.fs-binary-panel,
.fs-bucket-range,
.fs-bucket-trade-panel,
.fs-auth-widget {          /* ← add new widget roots here */
  --fs-background-dark: color-mix(in srgb, var(--fs-background) 70%, black);
  --fs-input-bg: ...
  /* etc */
}
```

Without this, the widget's `var(--fs-background-dark)` etc. will resolve to nothing and all gradient backgrounds / input styling will break silently.

### Never Hardcode Colors

```css
/* BAD */
.my-element { color: #3b82f6; }

/* GOOD */
.my-element { color: var(--fs-primary); }
```

### Recharts Color Constants (theme.ts)

Recharts `fill`/`stroke` props require concrete color values (CSS variables don't work). These are defined as JS constants in `packages/ui/src/theme.ts`:

- `CHART_COLORS` — consensus line, overlay, grid, etc.
- `FAN_BAND_COLORS` — mean line + 4 graduated band fills (band25 darkest → band95 lightest)

When adding new chart colors, add them to the appropriate constant in `theme.ts` rather than inlining hex values in components.

---

## Available Hooks

| Hook | Returns | Use For |
|------|---------|---------|
| `useMarket(marketId)` | `{ market, loading, error, refetch }` | Market metadata, config, state |
| `useConsensus(marketId, points?)` | `{ consensus, loading, error, refetch }` | Probability density curves |
| `usePositions(marketId, username?)` | `{ positions, loading, error, refetch }` | Positions — filtered by `username` when provided, all positions when omitted |
| `useMarketHistory(marketId, options?)` | `{ history, loading, error, refetch }` | Alpha vector snapshots over time (timeline fan chart) |
| `useTradeHistory(marketId, options?)` | `{ trades, loading, error, refetch }` | Trade history entries — supports `pollInterval` for auto-refresh |
| `useBucketDistribution(marketId, numBuckets?, numPoints?)` | `{ buckets, loading, error, refetch }` | Probability distribution across equal-width outcome buckets (derived from market + consensus) |
| `useDistributionState(marketId, config?)` | `{ market, loading, error, refetch, bucketCount, setBucketCount, buckets, percentiles, getBucketsForRange }` | Shared distribution state for bucket-based trading components — state/composition hook |
| `useAuth()` | `{ user, isAuthenticated, loading, error, login, signup, logout, refreshUser }` | Auth state and actions — state/action hook (no `invalidationCount`) |

### Server State vs Preview State

| Type | Source | Example | Updates |
|------|--------|---------|---------|
| **Server State** | Hooks | Market data, positions, consensus | On refetch, after invalidation |
| **Preview State** | Context | previewBelief, previewPayout | Immediately on user input |
| **Coordination State** | Context | selectedPosition | On user action |

**Rule:** Data from the API → use hooks. Ephemeral UI state for coordination → use context.

---

## Context API

```typescript
const ctx = useContext(FunctionSpaceContext);

// Read
ctx.client              // FSClient instance
ctx.previewBelief       // Current trade preview (number[] | null)
ctx.previewPayout       // Current payout preview (PayoutCurve | null)
ctx.selectedPosition    // Currently selected position (Position | null)
ctx.invalidationCount   // Cache bust counter
ctx.user                // Current authenticated user (UserProfile | null)
ctx.isAuthenticated     // Whether user is logged in
ctx.authLoading         // Auth operation in progress
ctx.authError           // Last auth error (Error | null)

// Write
ctx.setPreviewBelief(belief)        // Update preview visualization
ctx.setPreviewPayout(payout)        // Update payout projection
ctx.setSelectedPosition(position)   // Select position (chart/table sync)
ctx.invalidate(marketId)            // Trigger data refetch after mutations
ctx.login(username, password)       // Interactive login
ctx.signup(username, password, options?) // Interactive signup (auto-logs-in)
ctx.logout()                        // Clear auth state
ctx.refreshUser()                   // Refresh wallet balance
```

---

## Market Config Parameters

Every market has a `config` object with three core parameters used throughout the SDK:

| Parameter | Meaning | Example |
|-----------|---------|---------|
| `K` | Polynomial degree — determines belief vector resolution (K+1 elements) | 20 |
| `L` | Lower bound of the market outcome range | 0 |
| `H` | Upper bound of the market outcome range | 100 |

These are accessed via `market.config.K`, `market.config.L`, `market.config.H` from the `useMarket` hook.

---

## Belief Builder Architecture

The belief construction system lives in `packages/core/src/math/builders.ts` and uses a strict two-layer architecture. Understanding this is essential before adding new shapes or modifying trade inputs.

### L1 — `buildBelief(regions, K, L, H)` → `BeliefVector`

The **universal constructor**. ALL belief vector creation MUST route through this function. It:
1. Takes an array of `Region` objects
2. Generates a raw kernel for each region (`pointKernel` for PointRegion, `rangeKernel` for RangeRegion)
3. Combines them with weights
4. Normalizes the result (private `normalize()` function — guarantees output sums to 1)

```
buildBelief(regions, K, L, H)
  for each region:
    if type === 'point' → pointKernel(region, K, L, H)  → raw K+1 array
    if type === 'range' → rangeKernel(region, K, L, H)  → raw K+1 array
    combined[k] += raw[k] * weight
  return normalize(combined)
```

Both kernel functions accept the full `Region` object (not individual scalars), following the same pattern.

**`normalize` is private and stays private.** It is called exclusively by `buildBelief`. Since every shape goes through `buildBelief`, there is exactly one normalization code path — no duplication. Never export it, never duplicate it.

### L2 — Convenience builders

Thin wrappers that construct the correct `Region` array and delegate to `buildBelief`. They contain **zero math** — only shape semantics (what "gaussian" or "dip" means in terms of regions).

| L2 Function | What it passes to `buildBelief` |
|-------------|--------------------------------|
| `buildGaussian(center, spread, K, L, H)` | `[{ type: 'point', center, spread }]` |
| `buildRange(low, high, K, L, H, sharpness?)` | `[{ type: 'range', low, high, sharpness: sharpness ?? 0.5 }]` — single range |
| `buildRange(ranges[], K, L, H)` | Multiple `RangeRegion` entries with per-range sharpness/weight — multi-range composition |
| `buildPlateau(low, high, K, L, H, sharpness?)` | **Deprecated alias** for single-range `buildRange`. Default sharpness = 0.5. |
| `buildDip(center, spread, K, L, H)` | `[{ type: 'point', center, spread: spread*1.5, inverted: true }]` |
| `buildLeftSkew(center, spread, K, L, H, skewAmount?)` | `[{ type: 'point', center, spread, skew: -skewAmount }]` |
| `buildRightSkew(center, spread, K, L, H, skewAmount?)` | `[{ type: 'point', center, spread, skew: skewAmount }]` |

### Region Types

```typescript
type Region = PointRegion | RangeRegion;

interface PointRegion {
  type: 'point';
  center: number;    // Center of the gaussian kernel (in market outcome space)
  spread: number;    // Standard deviation (in market outcome space)
  weight?: number;   // Relative weight when combining multiple regions (default 1)
  skew?: number;     // Asymmetry: -1 = wider left tail, 1 = wider right tail, 0/undefined = symmetric
  inverted?: boolean; // true = dip shape (high at edges, low at center)
}

interface RangeRegion {
  type: 'range';
  low: number;       // Start of flat-top region
  high: number;      // End of flat-top region
  weight?: number;   // Relative weight (default 1)
  sharpness?: number; // Edge sharpness: 0 = smooth cosine taper (default), 1 = hard cliff edges
}
```

**`skew` details:** `|skew|` controls intensity (0 = symmetric, 1 = full asymmetry). Sign controls direction. At the kernel level, two multipliers interpolate based on `|skew|`: the wider side scales `1 + 2.0 * intensity` (up to 3x), the narrower side scales `1 - 0.7 * intensity` (down to 0.3x). Each side of center uses a different effective spread.

**`sharpness` details:** Interpolates two parameters in `rangeKernel`:
- Taper width: `(2/K) * (1 - sharpness)` — at 0, cosine taper over 2 coefficient bins; at 1, no taper (hard step).
- EPS (out-of-range floor): `0.001 - sharpness * 0.0009` — at 0, floor is 0.001; at 1, floor is 0.0001.

When `sharpness = 1`, the coefficient vector has a hard step function at the range boundaries. The actual visual sharpness on the chart depends on the polynomial degree `K` and the density evaluation (piecewise-linear interpolation).

### When to Create a New L2 vs Call L1 Directly

| Scenario | What to do | Example |
|----------|-----------|---------|
| Simple shape with one region | Create L2 if it will be reused | `buildGaussian`, `buildDip` |
| Shape that's just existing L2 with different params | Call existing L2 with modified params — **no new function** | Spike = `buildGaussian(center, spread * 0.2, K, L, H)` |
| Shape with multiple regions | Call `buildBelief` directly from the widget | Bimodal = two PointRegions with different centers/weights |
| Shape that is a special case of existing L2 | Call existing L2 with boundary params | Uniform = `buildPlateau(L, H, K, L, H)` |

**Rule of thumb:** Create a new L2 only when the shape has unique Region parameters that encode a distinct shape concept (like inversion or skew). If it's just "same builder, different numbers," let the widget pass different numbers.

**Multi-range composition:** For non-contiguous range selections (e.g., `BucketRangeSelector`), use `buildRange(ranges[], K, L, H)` which accepts an array of `RangeInput` objects, each with its own `low`, `high`, `weight`, and `sharpness`. This composes multiple range regions into a single belief vector via `buildBelief`.

### End-to-End Belief Flow

```
Widget (e.g. TradePanel, ShapeCutter)
  → L2 builder or buildBelief directly
    → pointKernel / rangeKernel (private, internal)
      → normalize (private, internal)
        → BeliefVector (number[], K+1 elements, sums to 1)

BeliefVector → ctx.setPreviewBelief(belief)     [instant, on every input change]
            → ConsensusChart / MarketCharts reads ctx.previewBelief
              → evaluateDensityCurve(belief, L, H, numPoints)  [piecewise-linear interpolation]
                → rendered as dashed yellow area on chart (type="linear")

BeliefVector + collateral → projectPayoutCurve(client, marketId, belief, collateral)  [debounced 500ms]
                          → ctx.setPreviewPayout(payoutCurve)
                            → ConsensusChart shows payout in tooltip

BeliefVector + collateral + prediction → buy(client, marketId, belief, collateral, { prediction })
                                       → ctx.invalidate(marketId)  [refreshes all hooks]
```

### Density Evaluation

All density rendering uses piecewise-linear interpolation via a single function:

**`evaluateDensityCurve(coefficients, L, H, numPoints)` — Multi-point curve for charting**

- Maps each output point to a position in the coefficient array (`u * K`)
- Linearly interpolates between the two nearest coefficients
- Applies density scaling `(K+1)/(H-L)` for correct PDF normalization
- Preserves sharp transitions faithfully (plateaus have cliff edges, spikes have narrow peaks)
- Used by `ConsensusChart` for previews, consensus, and selected position curves

**`evaluateDensityPiecewise(coefficients, x, L, H)` — Single-point evaluation**

Same math as `evaluateDensityCurve` but for one x value. Used internally by `computeStatistics` and `queryDensityAt`.

**Invariants:**
- Coefficients are non-negative (guaranteed by kernel functions)
- Coefficients sum to 1 (guaranteed by `normalize` in `buildBelief`)
- Density scaling is `(K+1)/(H-L)`
- Preview and consensus use the same evaluation — what the user sees before submitting matches what they see after

---

### Consensus PDF Y-Axis Scaling

The chart's left Y-axis dynamically scales to accommodate both the consensus curve and any preview/overlay curves. To prevent a very tall preview (e.g., high-confidence spike) from squashing the consensus to an invisible flat line, the preview's influence on the Y-axis domain is **capped at 4x the consensus peak**:

```
cappedOverlay = min(overlayMax, consensusMax * 4)
yMax = max(consensusMax, cappedOverlay) * 1.15
```

Peaks beyond 4x are clipped visually but remain in the tooltip data. This ensures the consensus curve is always readable.

---

## Core Functions (from @functionspace/core)

### Math/Belief Building (Builders category)
- `buildBelief(regions, K, L, H)` → belief vector (L1 — universal constructor, see above)
- `buildGaussian(center, spread, K, L, H)` → belief vector (L2)
- `buildRange(low, high, K, L, H, sharpness?)` → belief vector (L2, single range)
- `buildRange(ranges[], K, L, H)` → belief vector (L2, multi-range composition)
- `buildPlateau(low, high, K, L, H, sharpness?)` → belief vector (L2, **deprecated** — alias for single-range `buildRange`)
- `buildDip(center, spread, K, L, H)` → belief vector (L2)
- `buildLeftSkew(center, spread, K, L, H, skewAmount?)` → belief vector (L2)
- `buildRightSkew(center, spread, K, L, H, skewAmount?)` → belief vector (L2)

### Math/Density & Statistics (L0 pure math)
- `evaluateDensityCurve(belief, L, H, numPoints)` → chart points (piecewise-linear interpolation)
- `evaluateDensityPiecewise(coefficients, x, L, H)` → density at single point
- `computeStatistics(coefficients, L, H)` → `{ mean, median, mode, variance, stdDev }`
- `computePercentiles(coefficients, L, H)` → `PercentileSet` (9 percentiles via CDF integration)
- `calculateBucketDistribution(points, L, H, numBuckets?, decimals?)` → `BucketData[]`

### Math/Fan Chart
- `transformHistoryToFanChart(snapshots, L, H, maxPoints?)` → `FanChartPoint[]` (downsample + percentile extraction)

### Queries
- `queryMarketState(client, marketId)` → `MarketState` (wraps `GET /api/market/state`)
- `getConsensusCurve(client, marketId, numPoints?)` → `ConsensusCurve` (market state + client-side density eval)
- `queryConsensusSummary(client, marketId)` → `ConsensusSummary` (client-side stats from consensus coefficients)
- `queryDensityAt(client, marketId, x)` → density value at a single outcome point
- `queryMarketHistory(client, marketId, limit?, offset?)` → `MarketHistory` (wraps `GET /api/market/history`)
- `queryMarketPositions(client, marketId)` → `Position[]` (wraps `GET /api/market/positions`)
- `queryPositionState(client, positionId, marketId)` → `Position` (single position by ID)
- `mapPosition(raw)` → `Position` (raw API response → typed Position)
- `positionsToTradeEntries(positions, options?)` → `TradeEntry[]` (pure transform, sorted by timestamp desc)
- `queryTradeHistory(client, marketId, options?)` → `TradeEntry[]` (composed: queryMarketPositions → positionsToTradeEntries)

### Discovery
- `discoverMarkets(client)` → `MarketState[]`

### Auth
- `loginUser(client, username, password)` → `{ user: UserProfile, token: string }` (raw fetch, bypasses ensureAuth)
- `signupUser(client, username, password, options?)` → `{ user: UserProfile }` (no token — caller must login after)
- `fetchCurrentUser(client)` → `UserProfile` (uses client.get, requires token)
- `validateUsername(name)` → `{ valid: boolean, error?: string }` (3-32 chars, alphanumeric + dots/dashes/underscores)

### Transactions
- `buy(client, marketId, belief, collateral)` → BuyResult
- `sell(client, positionId, marketId)` → SellResult

### Projections
- `projectPayoutCurve(client, marketId, belief, collateral)` → PayoutCurve
- `projectSell(client, positionId, marketId)` → ProjectSellResult

---

## CSS Class Naming Convention

Pattern: `.fs-{widget}-{element}`

Examples:
- `.fs-trade-panel` - Widget root
- `.fs-trade-header` - Widget header section
- `.fs-input-group` - Form input wrapper
- `.fs-submit-btn` - Action button
- `.fs-status-badge.open` - Status with modifier
- `.fs-chart-fan-legend` - Fan chart legend row
- `.fs-chart-time-filter-btn` - Time filter pill button

---

## Common Patterns

### Debouncing User Input
```typescript
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    // Expensive operation (API call, calculation)
  }, 500);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, [inputValue]);
```

### Safe Async Operations
```typescript
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

// In async handlers:
const result = await someAsyncOperation();
if (!mountedRef.current) return; // Component unmounted
setState(result);
```

### After Mutations
```typescript
await buy(ctx.client, marketId, belief, collateral);
ctx.invalidate(marketId);  // Triggers useMarket/usePositions refetch
onSuccess?.(result);       // Notify parent
```

---

## Existing Widget Reference

| Widget | Purpose | Key Pattern |
|--------|---------|-------------|
| `AuthWidget` | Login/signup/user bar | Uses `useAuth` hook, form state, `validateUsername` from core |
| `MarketStats` | Stats display | Minimal, read-only |
| `ConsensusChart` | Consensus PDF visualization | Standalone chart, reads context for overlays |
| `DistributionChart` | Distribution bar chart | Standalone chart with bucket slider |
| `TimelineChart` | Fan chart (percentile bands over time) | Standalone chart, fetches own history data (see note below) |
| `MarketCharts` | Tabbed chart wrapper | Combines ConsensusChart + DistributionChart + TimelineChart with tab switching |
| `TradePanel` | Form input | Debouncing, preview sync, three-phase pattern |
| `ShapeCutter` | Shape-based trade input | Shape definitions, two-column layout, skew/confidence sliders |
| `BinaryPanel` | Binary yes/no trade input | X-point modes (static/variable/dynamic-mode/dynamic-mean), extends `TradeInputBaseProps`, three-phase pattern |
| `BucketRangeSelector` | Bucket-based range selection with trade | Uses `useDistributionState` (shared or own), multi-range `buildRange`, bucket selection UI |
| `BucketTradePanel` | Composed chart + range selector | Composes `DistributionChart` + `BucketRangeSelector` with shared `useDistributionState` (see shared state composition below) |
| `PositionTable` | Data table | Tabbed views (Open Orders / Trade History / Market Positions), per-tab columns, pagination, row selection → chart overlay, sell actions |
| `TimeSales` | Time & sales ticker | Uses `useTradeHistory` with `pollInterval` (default 5s), read-only market activity feed |

**TimelineChart data-fetching pattern:** Unlike Consensus/Distribution (which receive shared `market` + `consensus` data as props from `MarketCharts`), `TimelineChartContent` calls `useMarketHistory` internally. This avoids fetching history data when the timeline tab isn't active. The `timeFilter` state is lifted to `MarketCharts` so it persists across tab switches.

**Developer-configurable tabs pattern:** Both `MarketCharts` and `PositionTable` use the same tab pattern — an optional array prop controls which tabs appear, the first entry is initially active, and a single tab hides the tab bar:
```typescript
// MarketCharts: views?: ChartView[]    (default: ['consensus'])
// PositionTable: tabs?: PositionTabId[] (default: ['open-orders', 'trade-history'])
const effectiveTabs = tabs && tabs.length > 0 ? tabs : DEFAULT_TABS;
const showTabs = effectiveTabs.length > 1;
const [activeTab, setActiveTab] = useState(effectiveTabs[0]);
```
When adding a new tabbed widget, follow this exact pattern — do not invent a different approach.

**PositionTable tab-aware data fetching:** The table uses a single `usePositions` call. When the `market-positions` tab is enabled, `username` is omitted to fetch all positions; client-side filtering derives per-tab data. Market value fetching (`projectSell`) only runs for open positions on the active tab — never for Trade History.

**Shared state composition pattern:** `BucketTradePanel` is a "composed widget" — it renders `DistributionChart` + `BucketRangeSelector` and coordinates them via a shared `useDistributionState` instance passed as a prop. This differs from context-based coordination (used by charts + trade panels). Use this pattern when two public widgets need to share derived state that isn't relevant to the broader SDK context.

---

## SDK Expansion Checklist

> **Every checklist below ends with a doc-update step. This is not optional.** If the implementation added, changed, or improved anything, update CLAUDE.md and this PLAYBOOK to reflect it. If the docs don't match the code, the work is not done. See CLAUDE.md → "Keeping These Docs Current" for the full update matrix.

### Adding a New Widget
- [ ] Component file in `packages/ui/src/{category}/`
- [ ] Props interface exported
- [ ] Uses theme CSS variables (no hardcoded colors)
- [ ] Styles added to `base.css`
- [ ] Exported from category and root `index.ts`
- [ ] Error and loading states handled
- [ ] **Run `npx vitest run` — all tests pass**
- [ ] **Update `architecture.test.ts` if new exports or prop patterns**
- [ ] **Update PLAYBOOK.md** — Widget Reference table, File Locations tree, derived-variables selector if new root class

### Adding a New Hook
- [ ] Hook file in `packages/react/src/`
- [ ] Uses `FunctionSpaceContext` for client access
- [ ] Returns `{ <named>, loading, error, refetch }` pattern (named property matches hook purpose)
- [ ] Reacts to `ctx.invalidationCount` for cache busting
- [ ] Exported from `packages/react/src/index.ts`
- [ ] **Add tests to `hooks.test.tsx` (context check, loading, success, error)**
- [ ] **Run `npx vitest run` — all tests pass**
- [ ] **Update PLAYBOOK.md** — Available Hooks table; **update CLAUDE.md** — test table if new test file

### Adding a New Belief Shape

Before creating anything, decide the correct approach (see "When to Create a New L2" in the Belief Builder Architecture section):

**If the shape needs new Region parameters (e.g., a new kernel behavior):**
- [ ] Extend `PointRegion` or `RangeRegion` with optional fields — do NOT create new region types
- [ ] Update the corresponding kernel function (`pointKernel` or `rangeKernel`) in `builders.ts` to handle new fields
- [ ] Ensure existing callers without the new fields produce identical output (backward compatible)

**If the shape needs a new L2 builder:**
- [ ] Add L2 function to `builders.ts` — one line of logic constructing a Region array and passing to `buildBelief`
- [ ] Export from `packages/core/src/index.ts`
- [ ] Add tests to `tests/shapes.test.ts` — valid vector (K+1 elements, all >= 0, sums to ~1) + shape-specific assertions

**If the shape is just existing builder with different params:**
- [ ] No new function needed — widget passes different params to existing L2 or calls `buildBelief` directly
- [ ] Document the parameter mapping in the widget code (e.g., `spike = buildGaussian with spread * 0.2`)

**For any new shape:**
- [ ] Add shape metadata to `SHAPE_DEFINITIONS` in `packages/core/src/shapes/definitions.ts` (id, name, description, parameters, svgPath)
- [ ] Add routing case in the trade input widget's `buildCurrentBelief` switch
- [ ] Add prediction calculation in the widget's `getPrediction` function
- [ ] **Run `npx vitest run` — all tests pass, no regressions on existing shapes**
- [ ] **Update PLAYBOOK.md** — L2 builders table if new builder, Region Types if new fields, Core Functions list

### Adding a New Core Function
- [ ] Function in appropriate `packages/core/src/` module
- [ ] TypeScript types defined in `types.ts`
- [ ] Exported from `packages/core/src/index.ts`
- [ ] **Add tests to `stage1.test.ts` (math) or `stage2.test.ts` (API)**
- [ ] **Run `npx vitest run` — all tests pass**
- [ ] **Update PLAYBOOK.md** — Core Functions list (correct category + layer)

### Modifying Existing Components
- [ ] **Run `npx vitest run` before making changes**
- [ ] Make changes following existing patterns
- [ ] Update tests if prop interfaces or behavior changed
- [ ] **Run `npx vitest run` after changes — all tests pass**
- [ ] **Run `cd demo-app && npx vite build` — build succeeds**
- [ ] **Update CLAUDE.md and PLAYBOOK.md** if the change introduced new patterns, conventions, or reference data

---

## SDK Design Philosophy

### Simple by Default, Flexible When Needed

UI components work together automatically via shared context. Consumers just place components — no wiring required.

**Simple consumer (90% of use cases):**
```tsx
<FunctionSpaceProvider config={config}>
  <ConsensusChart marketId={ID} />
  <PositionTable marketId={ID} username={user} />
</FunctionSpaceProvider>
// Click row → curve appears on chart. No code needed.
```

**Advanced consumer (override defaults when needed):**
```tsx
<PositionTable
  selectedPositionId={myCustomId}        // Override selection
  onSelectPosition={myCustomHandler}     // Override behavior
/>
<ConsensusChart
  overlayCurves={[myCustomOverlay]}      // Add custom data
/>
```

### Component Swappability

Components are interchangeable because they share a context contract:
- Any chart that reads `ctx.selectedPosition` works
- Any table that writes `ctx.setSelectedPosition` works
- Swap imports freely — behavior stays consistent

### Trade Input Variants

Multiple trade input variants (TradePanel, ShapeCutter, BinaryPanel, BucketRangeSelector, BucketTradePanel) can exist, but **only one should be mounted at a time**.

**Why:** All trade inputs write to the same context fields (`previewBelief`, `previewPayout`). Multiple simultaneous writers would race and overwrite each other.

**Type Contract:** All trade input variants MUST output the same belief format:
```typescript
// All variants write Bernstein coefficient arrays
ctx.setPreviewBelief(belief: number[] | null)
ctx.setPreviewPayout(payout: PayoutCurve | null)
```

**Formal contract:** All trade input variants should extend `TradeInputBaseProps` (defined in `packages/ui/src/trading/types.ts` and exported from the package root). This ensures `marketId`, `onBuy`, and `onError` props are consistent across variants.

**Consumer Pattern:**
```tsx
// Only one trade input mounted at a time
const [inputType, setInputType] = useState<'panel' | 'shape' | 'binary' | 'bucket'>('panel');

<FunctionSpaceProvider config={config}>
  {/* Charts - mount as many as needed (readers) */}
  <ConsensusChart marketId={ID} />
  <MarketCharts marketId={ID} />

  {/* Trade input - only one active (writer) */}
  {inputType === 'panel' && <TradePanel marketId={ID} />}
  {inputType === 'shape' && <ShapeCutter marketId={ID} />}
  {inputType === 'binary' && <BinaryPanel marketId={ID} />}
  {inputType === 'bucket' && <BucketTradePanel marketId={ID} />}
</FunctionSpaceProvider>
```

**Cleanup Requirement:** Trade inputs MUST clear context on unmount:
```typescript
useEffect(() => {
  return () => {
    ctx.setPreviewBelief(null);
    ctx.setPreviewPayout(null);
  };
}, []);
```

### Trade Input Three-Phase Pattern

Every trade input widget follows this exact pattern (see `TradePanel.tsx` as reference):

**Phase 1 — Instant preview (no debounce):**
Build the belief vector on every parameter change and write it to context immediately. The chart updates in real-time.
```typescript
const buildCurrentBelief = useCallback(() => {
  if (!market) return null;
  const { K, L, H } = market.config;
  // Call appropriate builder based on current inputs
  return buildGaussian(prediction, stdDev, K, L, H);
}, [market, prediction, stdDev, /* other deps */]);

useEffect(() => {
  const belief = buildCurrentBelief();
  ctx.setPreviewBelief(belief);
  if (!belief) { setPotentialPayout(null); ctx.setPreviewPayout(null); }
}, [buildCurrentBelief]);
```

**Phase 2 — Debounced payout projection (500ms):**
Project the payout curve via API. Debounced because this hits the server.
```typescript
useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  const belief = buildCurrentBelief();
  const collateral = parseFloat(amount);
  if (!belief || isNaN(collateral) || collateral <= 0) { setPotentialPayout(null); return; }
  debounceRef.current = setTimeout(async () => {
    const result = await projectPayoutCurve(ctx.client, marketId, belief, collateral);
    if (!mountedRef.current) return;
    setPotentialPayout(result.maxPayout);
    ctx.setPreviewPayout(result);
  }, 500);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, [buildCurrentBelief, amount, market, marketId]);
```

**Phase 3 — Trade submission:**
```typescript
const result = await buy(ctx.client, marketId, belief, collateral, { prediction });
resetToDefaults();
ctx.setPreviewBelief(null);
ctx.setPreviewPayout(null);
onBuy?.(result);
ctx.invalidate(marketId);
```

### Confidence → Spread Conversion

Trade input widgets that offer a "confidence" slider (0-100%) convert it to a `spread` value for the builders. This is a UI concern, not a core math concern — each trade input widget owns its own conversion formula:

```typescript
const getSpreadFromConfidence = useCallback((conf: number): number => {
  if (!market) return 4.0;
  const { L, H } = market.config;
  const range = H - L;
  const minSigma = range * 0.01;   // 1% of range (high confidence = narrow)
  const maxSigma = range * 0.20;   // 20% of range (low confidence = wide)
  return maxSigma - ((conf / 100) * (maxSigma - minSigma));
}, [market]);
```

This formula is intentionally owned by each widget — different trade inputs may wish to tune the mapping differently. It is NOT in core because it maps a slider value (UI) to a math parameter.

### What Goes in Context vs Consumer App

| In SDK Context | In Consumer App |
|----------------|-----------------|
| `selectedPosition` (enables chart/table sync) | Custom multi-select logic |
| `previewBelief` (enables trade preview) | Filters, sorts, search |
| `invalidationCount` (cache busting) | UI preferences |

**Rule:** If multiple SDK components need to coordinate, it goes in context.

### Layer Boundaries

| Layer | Can Do | Cannot Do |
|-------|--------|-----------|
| `core` | Pure functions, API client, types | Import React |
| `react` | Hooks, context, state coordination | Import from ui |
| `ui` | Read/write context, call pure core functions, render | Make API calls directly |

**UI components CAN call pure core functions** like `evaluateDensityCurve` and `evaluateDensityPiecewise`. They CANNOT make API calls — use hooks for that.

---

## File Locations

```
packages/
├── core/src/
│   ├── index.ts              # All exports
│   ├── types.ts              # Type definitions
│   ├── client.ts             # FSClient class
│   ├── math/builders.ts      # Belief vector math (buildBelief, buildGaussian, buildRange, etc.)
│   ├── math/density.ts       # Density evaluation, statistics, percentiles
│   ├── math/distribution.ts  # calculateBucketDistribution
│   ├── math/fanChart.ts      # History → FanChartPoint[] transform
│   ├── shapes/definitions.ts # SHAPE_DEFINITIONS (id, name, svgPath, parameters)
│   ├── queries/market.ts     # Market state queries (queryMarketState, getConsensusCurve, etc.)
│   ├── queries/history.ts    # Market history queries (GET /api/market/history)
│   ├── queries/positions.ts  # Position queries (queryMarketPositions, queryPositionState)
│   ├── queries/trades.ts     # Trade history (positionsToTradeEntries, queryTradeHistory)
│   ├── projections/          # projectPayoutCurve, projectSell
│   ├── transactions/         # buy, sell
│   ├── discovery/markets.ts  # discoverMarkets
│   └── auth/auth.ts          # loginUser, signupUser, fetchCurrentUser, validateUsername
├── react/src/
│   ├── index.ts              # All exports
│   ├── context.ts            # FunctionSpaceContext (FSContext interface)
│   ├── FunctionSpaceProvider.tsx  # Provider + themes
│   ├── useAuth.ts            # Auth state/action hook (not data-fetching)
│   ├── useDistributionState.ts  # Shared distribution state for bucket components
│   └── use*.ts               # Data-fetching hooks (useMarket, useConsensus, usePositions, etc.)
└── ui/src/
    ├── index.ts              # Re-exports all public components
    ├── theme.ts              # Chart colors (CHART_COLORS, FAN_BAND_COLORS)
    ├── styles/base.css       # All widget styles
    ├── styles/slider.css     # Slider component styles
    ├── charts/               # Data visualizations
    │   ├── index.ts
    │   ├── types.ts
    │   ├── ConsensusChart.tsx
    │   ├── DistributionChart.tsx
    │   ├── TimelineChart.tsx
    │   └── MarketCharts.tsx
    ├── trading/              # User input/actions
    │   ├── index.ts
    │   ├── types.ts          # TradeInputBaseProps, XPointMode
    │   ├── TradePanel.tsx
    │   ├── ShapeCutter.tsx
    │   ├── BinaryPanel.tsx
    │   ├── BucketRangeSelector.tsx
    │   └── BucketTradePanel.tsx
    ├── auth/                 # Authentication
    │   ├── index.ts
    │   └── AuthWidget.tsx
    ├── market/               # Read-only market info
    │   ├── index.ts
    │   ├── MarketStats.tsx
    │   ├── PositionTable.tsx
    │   └── TimeSales.tsx
    └── components/           # Internal UI primitives (NOT exported from package root)
        ├── index.ts
        ├── Slider.tsx
        └── RangeSlider.tsx

tests/
├── architecture.test.ts  # Layer boundaries, hook patterns, exports
├── hooks.test.tsx        # React hook unit tests (jsdom)
├── shapes.test.ts        # Belief shape validation (vector properties, shape characteristics)
├── binary.test.ts        # Binary panel-specific tests
├── stage1.test.ts        # Core math functions
└── stage2.test.ts        # API/transaction functions
```

## UI Component Categories

| Folder | Purpose | Examples |
|--------|---------|----------|
| `charts/` | Data visualizations | ConsensusChart, DistributionChart, TimelineChart, MarketCharts |
| `trading/` | User input/actions | TradePanel, ShapeCutter, BinaryPanel, BucketRangeSelector, BucketTradePanel |
| `market/` | Read-only market info | MarketStats, PositionTable, TimeSales |
| `auth/` | Authentication | AuthWidget (login/signup forms, authenticated user bar) |
| `components/` | Internal UI primitives (not exported from package root) | Slider, RangeSlider (rc-slider wrappers with consistent styling) |
