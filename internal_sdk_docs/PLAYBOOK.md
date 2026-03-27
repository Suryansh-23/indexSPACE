# FunctionSpace SDK Developer Playbook
**This file and the files references in this document are specific to the developement OF the sdk NOT the consumption**
## Overview

This playbook documents how to add new widgets and expand the SDK. All widgets must integrate with the theme system and follow established patterns.

---

## Quick Reference: Adding a New Widget

### 1. Create the Component File

Choose the appropriate folder:
- `charts/`  -- for visualizations
- `trading/`  -- for user input/actions
- `market/`  -- for read-only market info

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
  background: linear-gradient(to bottom right, var(--fs-background), var(--fs-bg-secondary));
  border: var(--fs-border-width) solid var(--fs-border);
  border-radius: var(--fs-radius-lg);
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
| `--fs-bg-secondary` | Secondary background (e.g., chart areas) |
| `--fs-surface-hover` | Surface hover state |
| `--fs-border-subtle` | Subtle border (lighter weight) |
| `--fs-text-muted` | Muted text (lower contrast than secondary) |
| `--fs-nav-from` | Navigation gradient start |
| `--fs-nav-to` | Navigation gradient end |
| `--fs-overlay` | Overlay background |
| `--fs-input-bg` | Input field background |
| `--fs-code-bg` | Code block background |
| `--fs-chart-bg` | Chart area background |
| `--fs-accent-glow` | Accent glow effect (focus rings) |
| `--fs-badge-bg` | Badge background |
| `--fs-badge-border` | Badge border |
| `--fs-badge-text` | Badge text color |
| `--fs-logo-filter` | Logo CSS filter |
| `--fs-font-family` | Font family |
| `--fs-radius-sm` | Small border radius |
| `--fs-radius-md` | Medium border radius |
| `--fs-radius-lg` | Large border radius |
| `--fs-border-width` | Default border width |
| `--fs-transition-speed` | Default transition duration |

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
| `bgSecondary` | `--fs-bg-secondary` |
| `surfaceHover` | `--fs-surface-hover` |
| `borderSubtle` | `--fs-border-subtle` |
| `textMuted` | `--fs-text-muted` |
| `navFrom` | `--fs-nav-from` |
| `navTo` | `--fs-nav-to` |
| `overlay` | `--fs-overlay` |
| `inputBg` | `--fs-input-bg` |
| `codeBg` | `--fs-code-bg` |
| `chartBg` | `--fs-chart-bg` |
| `accentGlow` | `--fs-accent-glow` |
| `badgeBg` | `--fs-badge-bg` |
| `badgeBorder` | `--fs-badge-border` |
| `badgeText` | `--fs-badge-text` |
| `logoFilter` | `--fs-logo-filter` |
| `fontFamily` | `--fs-font-family` |
| `radiusSm` | `--fs-radius-sm` |
| `radiusMd` | `--fs-radius-md` |
| `radiusLg` | `--fs-radius-lg` |
| `borderWidth` | `--fs-border-width` |
| `transitionSpeed` | `--fs-transition-speed` |

Example:
```tsx
<FunctionSpaceProvider theme={{ preset: "fs-dark", primary: "#ff6b6b" }}>
  {/* --fs-primary is now #ff6b6b, other vars from fs-dark preset */}
</FunctionSpaceProvider>
```

### Derived Variables (set in base.css)

```css
--fs-primary-glow       /* Focus rings, shadows */
--fs-primary-light      /* Hover states */
--fs-header-gradient    /* Header accent gradients */
```

**Note:** `--fs-input-bg` is no longer derived via `color-mix()` in CSS  -- it is now set as an explicit CSS variable via inline styles from the resolved theme (Phase 1A). Each theme preset defines its own `inputBg` token.

**CRITICAL:** These derived variables are computed via a shared CSS selector near the top of `base.css`. When adding a new widget that uses gradient backgrounds or any derived variable, you **MUST** add its root class to this selector:

```css
/* base.css  -- shared derived-variables selector */
.fs-chart-container,
.fs-trade-panel,
.fs-shape-cutter,
.fs-stats-bar,
.fs-table-container,
.fs-time-sales,
.fs-binary-panel,
.fs-bucket-range,
.fs-bucket-trade-panel,
.fs-auth-widget,
.fs-passwordless-auth,
.fs-custom-shape,
.fs-market-card,
.fs-market-list,
.fs-overlay-panel,
.fs-market-filter-bar,
.fs-market-overlay {       /* ← add new widget roots here */
  --fs-primary-glow: color-mix(in srgb, var(--fs-primary) 20%, transparent);
  --fs-primary-light: color-mix(in srgb, var(--fs-primary) 80%, white);
  --fs-header-gradient: color-mix(in srgb, var(--fs-primary) 15%, transparent);
  /* etc */
  font-family: var(--fs-font-family, inherit);
}
```

Without this, the widget's `var(--fs-primary-glow)` etc. will resolve to nothing and all focus rings, header gradients, and hover states will break silently.

### Never Hardcode Colors

```css
/* BAD */
.my-element { color: #3b82f6; }

/* GOOD */
.my-element { color: var(--fs-primary); }
```

### Two Color Systems: CSS Variables vs Chart Colors

The SDK has two parallel color systems because of a Recharts limitation:

| Element Type | Color Source | Why |
|-------------|-------------|-----|
| **HTML/CSS elements** (backgrounds, borders, text, inputs) | CSS variables (`var(--fs-primary)`) | Standard CSS cascade  -- works everywhere |
| **Recharts SVG elements** (line strokes, area fills, grid, axis ticks, tooltips) | `ctx.chartColors.*` (concrete hex values) | SVG `fill`/`stroke` props ignore CSS `var()`  -- they need literal color strings |

**Rule for new widgets:**
- If the element is styled via CSS (`.fs-my-widget { color: ... }`) → use `var(--fs-*)` variables
- If the element is a Recharts prop (`stroke={...}`, `fill={...}`, `tick={{ fill: ... }}`) → use `ctx.chartColors.*`
- If the element is a custom tooltip or legend rendered as HTML inside a chart → use `ctx.chartColors.*` for consistency with the chart it belongs to
- **Never** import from `packages/ui/src/theme.ts`  -- those exports are deprecated and hardcoded to FS Dark

### Dynamic Chart Colors (context-based)

Chart colors are resolved per-theme via `resolveChartColors()` in `packages/react/src/themes.ts` and available on the context:

```typescript
const ctx = useContext(FunctionSpaceContext);

// ── Structural chart elements ──
ctx.chartColors.grid          // CartesianGrid stroke
ctx.chartColors.axisText      // Axis label/tick fill
ctx.chartColors.tooltipBg     // Custom tooltip background
ctx.chartColors.tooltipBorder // Custom tooltip border
ctx.chartColors.tooltipText   // Custom tooltip text
ctx.chartColors.crosshair     // Cursor/crosshair stroke

// ── Data series colors ──
ctx.chartColors.consensus     // Consensus curve stroke/fill
ctx.chartColors.previewLine   // Trade preview line stroke
ctx.chartColors.payout        // Payout curve color (from theme.positive)
ctx.chartColors.positions     // Position curve colors array [positive, negative, purple, orange, ...]

// ── Fan chart bands ──
ctx.chartColors.fanBands.mean   // Mean line color
ctx.chartColors.fanBands.band25 // Narrowest CI band (highest opacity)
ctx.chartColors.fanBands.band50 // ...
ctx.chartColors.fanBands.band75 // ...
ctx.chartColors.fanBands.band95 // Widest CI band (lowest opacity)
```

### How Chart Colors Are Resolved

The resolution pipeline (in `resolveChartColors()`) works in three layers:

1. **Smart defaults**  -- derived from the resolved theme's semantic tokens:
   - `consensus` ← `theme.primary`
   - `previewLine` ← `theme.accent`
   - `payout` ← `theme.positive`
   - `grid` ← `theme.borderSubtle`
   - `axisText` ← `theme.textMuted`
   - `tooltipBg` ← `theme.surface`, `tooltipBorder` ← `theme.border`, `tooltipText` ← `theme.text`
   - `crosshair` ← `theme.textSecondary`

2. **Preset overrides**  -- each named preset can override any field (defined in `PRESET_CHART_COLORS`):
   - FS presets override grid/tooltip values but let consensus/preview derive from theme tokens (stays blue/amber)
   - Native presets explicitly set `consensus: '#6B7280'` and `previewLine: '#9CA3AF'` (gray, de-branded)
   - Fan band colors are provided per preset with matching opacity variants

3. **Custom overrides**  -- consumers can pass additional overrides that take highest precedence

### Adding a New Chart Widget  -- Color Checklist

When building a new Recharts-based widget:

- [ ] Access context: `const ctx = useContext(FunctionSpaceContext)`
- [ ] Use `ctx.chartColors.grid` for `<CartesianGrid stroke={...} />`
- [ ] Use `ctx.chartColors.axisText` for all `<XAxis>` / `<YAxis>` tick fills and label fills
- [ ] Use `ctx.chartColors.crosshair` for `<Tooltip cursor={{ stroke: ... }} />`
- [ ] Build custom tooltips using `ctx.chartColors.tooltipBg`, `tooltipBorder`, `tooltipText`
- [ ] Use `ctx.chartColors.consensus` for any data series representing market consensus
- [ ] Use `ctx.chartColors.previewLine` for trade preview overlays
- [ ] Use `ctx.chartColors.payout` for payout-related series
- [ ] Use `ctx.chartColors.positions[i]` for position overlays (index 0 = positive, 1 = negative, 2+ = accent colors)
- [ ] For SVG gradient `<defs>`, use `ctx.chartColors.*` for `stopColor` values
- [ ] **Never** hardcode hex colors in Recharts props  -- they won't respond to theme changes
- [ ] **Never** use `var(--fs-*)` in Recharts props  -- they resolve to empty strings in SVG

### Template: Themed Chart Component

```typescript
import React, { useContext } from 'react';
import { CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FunctionSpaceContext } from '@functionspace/react';

export function MyChart({ data }: { data: any[] }) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('MyChart must be used within FunctionSpaceProvider');

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: ctx.chartColors.tooltipBg,
        border: `1px solid ${ctx.chartColors.tooltipBorder}`,
        color: ctx.chartColors.tooltipText,
        padding: '8px 12px',
        borderRadius: '6px',
      }}>
        {/* tooltip content */}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={ctx.chartColors.grid} vertical={false} />
        <XAxis tick={{ fill: ctx.chartColors.axisText, fontSize: 12 }} />
        <YAxis tick={{ fill: ctx.chartColors.axisText, fontSize: 10 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: ctx.chartColors.crosshair }} />
        <Area stroke={ctx.chartColors.consensus} fill={ctx.chartColors.consensus} fillOpacity={0.2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

**Deprecated:** `CHART_COLORS` and `FAN_BAND_COLORS` in `packages/ui/src/theme.ts` are still exported for backward compatibility but are hardcoded to FS Dark values. Do not use them in new code.

---

## Available Hooks

| Hook | Returns | Use For |
|------|---------|---------|
| `useMarket(marketId, options?)` | `{ market, loading, isFetching, error, refetch }` | Market metadata, config, state. Accepts `QueryOptions` (`pollInterval`, `enabled`). |
| `useConsensus(marketId, points?, options?)` | `{ consensus, loading, isFetching, error, refetch }` | Probability density curves. Accepts `QueryOptions`. |
| `usePositions(marketId, username?, options?)` | `{ positions, loading, isFetching, error, refetch }` | Positions -- filtered by `username` when provided, all positions when omitted. Client-side filtering after cache. Accepts `QueryOptions`. |
| `useMarketHistory(marketId, options?)` | `{ history, loading, isFetching, error, refetch }` | Alpha vector snapshots over time (timeline fan chart). Options include `limit`, `pollInterval`, `enabled`. |
| `useTradeHistory(marketId, options?)` | `{ trades, loading, isFetching, error, refetch }` | Trade history entries. Options include `limit`, `pollInterval`, `enabled`. |
| `useBucketDistribution(marketId, numBuckets?, numPoints?)` | `{ buckets, loading, error, refetch }` | Probability distribution across equal-width outcome buckets (derived from market + consensus) |
| `useDistributionState(marketId, config?)` | `{ market, loading, error, refetch, bucketCount, setBucketCount, buckets, percentiles, getBucketsForRange }` | Shared distribution state for bucket-based trading components -- state/composition hook |
| `useAuth()` | `{ user, isAuthenticated, loading, error, login, signup, logout, refreshUser, passwordlessLogin, showAdminLogin, pendingAdminUsername, clearAdminLogin }` | Auth state and actions -- state/action hook (no cache subscription) |
| `useCustomShape(market)` | `{ controlValues, lockedPoints, numPoints, pVector, prediction, setControlValue, toggleLock, setNumPoints, resetToDefault, startDrag, handleDrag, endDrag, isDragging, draggingIndex }` | Custom shape editing state -- state/action hook (no cache subscription). Accepts `market` from `useMarket`. |
| `useChartZoom(options)` | `{ containerRef, xDomain, yDomain, isZoomed, isPanning, containerProps, reset }` | Chart zoom/pan state -- state/action hook (no context dependency, no cache subscription). Use with `rechartsPlotArea()` helper for Recharts integration. |
| `useBuy(marketId)` | `{ execute, loading, error, reset }` | Mutation hook -- wraps `buy()` from core. Auto-invalidates market cache and refreshes wallet on success. |
| `useSell(marketId)` | `{ execute, loading, error, reset }` | Mutation hook -- wraps `sell()` from core. Auto-invalidates market cache and refreshes wallet on success. |
| `usePreviewPayout(marketId)` | `{ execute, loading, error, reset }` | Preview hook -- wraps `previewPayoutCurve()` from core. Manages own AbortController. No auto-invalidation. |
| `usePreviewSell(marketId)` | `{ execute, loading, error, reset }` | Preview hook -- wraps `previewSell()` from core. Accepts optional caller-provided `AbortSignal`. No auto-invalidation. |
| `useMarkets(options?)` | `{ markets, loading, isFetching, error, refetch }` | Market listing with optional filtering/sorting. Options combine `MarketDiscoveryOptions` (state, titleContains, categories, filters, sortBy, sortOrder, limit) and `QueryOptions` (pollInterval, enabled). |
| `useMarketFilters(config?)` | `{ markets, loading, isFetching, error, refetch, searchText, selectedCategories, activeSortField, sortOrder, resultCount, setSearchText, clearSearch, toggleCategory, setSortField, toggleSortOrder, resetFilters, availableCategories, sortOptions, filterBarProps, discoveryOptions }` | Search, category, and sort state on top of `useMarkets`. Config: `categories?`, `featuredCategories?`, `sortOptions?`, `defaultSortField?`, `defaultSortOrder?`, `pollInterval?`, `enabled?`, `state?`. Returns a memoized `filterBarProps` bundle for `MarketFilterBar`. |

**useChartZoom invariants:** The hook cancels any pending `requestAnimationFrame` before applying a reset (via `resetTrigger` change, `fullXDomain` value change, `reset()`, or `onDoubleClick`). This prevents a race where a wheel event fired milliseconds before a reset would re-apply the zoomed domain one frame later. Pass a stable (memoized) `fullXDomain`  -- the hook resets zoom when its value changes. When the chart container has a second ref (Pattern B, e.g. `CustomShapeEditor`), create a callback ref that assigns to both refs and spread individual handlers from `containerProps` rather than using `{...containerProps}`.

### Server State vs Preview State

| Type | Source | Example | Updates |
|------|--------|---------|---------|
| **Server State** | Hooks | Market data, positions, consensus | On refetch, after invalidation, on poll interval, on focus/reconnect |
| **Preview State** | Context | previewBelief, previewPayout | Immediately on user input |
| **Coordination State** | Context | selectedPosition | On user action |

**Rule:** Data from the API → use hooks. Ephemeral UI state for coordination → use context.

### Mutation Hooks

Mutation hooks differ from data-fetching hooks. They wrap core transaction/preview functions and return:

```
{ execute: (...args) => Promise<Result>, loading: boolean, error: Error | null, reset: () => void }
```

**Key differences from data-fetching hooks:**
- Use local `useState` for `loading` and `error` -- NOT `useCacheSubscription`. Mutations are imperative (fire on user action), not declarative (fire on mount).
- `execute` is the trigger function. It is wrapped in `useCallback` with the hook's dependencies.
- `reset()` clears the error state. Useful for dismissing error messages.
- No `isFetching` or `refetch` -- those are data-fetching concepts.

**Auto-clear error timer:**
All mutation and preview hooks auto-clear errors after 5 seconds. The timer is cancelled if `execute()` is called again or `reset()` is called manually.

**Auto-invalidation (useBuy, useSell only):**
On success, `useBuy` and `useSell` call `ctx.invalidate(marketId)` to trigger targeted cache invalidation. This causes all data hooks subscribed to that market to refetch. The wallet balance is refreshed as part of the invalidation cycle. Preview hooks (`usePreviewPayout`, `usePreviewSell`) do not invalidate because they are read-only.

**AbortController (usePreviewPayout only):**
`usePreviewPayout` manages its own `AbortController` via `useRef`. Each call to `execute` aborts any in-flight request before starting a new one. This prevents stale preview responses from overwriting newer ones. When `execute` catches an `AbortError`, it re-throws without setting the error state. The `finally` block only clears `loading` if the request was not aborted. `usePreviewSell` does NOT manage an internal AbortController -- it accepts an optional `{ signal?: AbortSignal }` from the caller, allowing batch callers (like `PositionTable`) to control cancellation themselves.

**Cache snapshot for numBuckets (useBuy, usePreviewPayout):**
`useBuy` and `usePreviewPayout` read `numBuckets` from the market cache snapshot via `cache.getSnapshot(['marketState', String(marketId)])`. This avoids requiring the caller to pass `numBuckets` explicitly. If the market data is not loaded, the hook throws `"Market data not loaded. Cannot determine numBuckets for validation."`.

---

## Context API

```typescript
const ctx = useContext(FunctionSpaceContext);

// Read
ctx.client              // FSClient instance
ctx.previewBelief       // Current trade preview (number[] | null)
ctx.previewPayout       // Current payout preview (PayoutCurve | null)
ctx.selectedPosition    // Currently selected position (Position | null)
ctx.user                // Current authenticated user (UserProfile | null)
ctx.isAuthenticated     // Whether user is logged in
ctx.authLoading         // Auth operation in progress
ctx.authError           // Last auth error (Error | null)

// Write
ctx.setPreviewBelief(belief)        // Update preview visualization
ctx.setPreviewPayout(payout)        // Update payout preview
ctx.setSelectedPosition(position)   // Select position (chart/table sync)
ctx.invalidate(marketId)            // Targeted cache invalidation for a market
ctx.invalidateAll()                 // Global cache invalidation (login, logout)
ctx.login(username, password)       // Interactive login (auto-invalidates all)
ctx.signup(username, password, options?) // Interactive signup (auto-invalidates all)
ctx.logout()                        // Clear auth state (auto-invalidates all)
ctx.refreshUser()                   // Refresh wallet balance
ctx.chartColors                     // Resolved chart colors (ChartColors) for Recharts
ctx.passwordlessLogin(username)     // Initiate passwordless login flow -- returns PasswordlessLoginResult
ctx.showAdminLogin                  // Whether the admin login modal should be shown (PASSWORD_REQUIRED response)
ctx.pendingAdminUsername             // Username pending admin login completion (string | null)
ctx.clearAdminLogin()               // Dismiss the admin login state
```

---

## Market Config Parameters

Every market has a `config` object with three core parameters used throughout the SDK:

| Parameter | Meaning | Example |
|-----------|---------|---------|
| `numBuckets` | Polynomial degree  -- determines belief vector resolution (numBuckets+1 elements) | 20 |
| `lowerBound` | Lower bound of the market outcome range | 0 |
| `upperBound` | Upper bound of the market outcome range | 100 |

These are accessed via `market.config.numBuckets`, `market.config.lowerBound`, `market.config.upperBound` from the `useMarket` hook. Deprecated aliases `K`, `L`, `H` still exist on the config object but should not be used in new code.

---

## Position Generator Architecture

The belief construction system lives in `packages/core/src/math/generators.ts` and uses a strict two-layer architecture. Understanding this is essential before adding new shapes or modifying trade inputs.

### L1  -- `generateBelief(regions, numBuckets, lowerBound, upperBound)` → `BeliefVector`

The **universal constructor**. ALL belief vector creation MUST route through this function. It:
1. Takes an array of `Region` objects
2. Generates a raw kernel for each region (`pointKernel` for PointRegion, `rangeKernel` for RangeRegion, `splineKernel` for SplineRegion)
3. Combines them with weights
4. Normalizes the result (private `normalize()` function  -- guarantees output sums to 1)

```
generateBelief(regions, numBuckets, lowerBound, upperBound)
  for each region:
    if type === 'point' → pointKernel(region, numBuckets, lowerBound, upperBound)  → raw numBuckets+1 array
    if type === 'range' → rangeKernel(region, numBuckets, lowerBound, upperBound)  → raw numBuckets+1 array
    if type === 'spline' → splineKernel(region, numBuckets, lowerBound, upperBound) → raw numBuckets+1 array
    combined[k] += raw[k] * weight
  return normalize(combined)
```

Both kernel functions accept the full `Region` object (not individual scalars), following the same pattern.

**`normalize` is private and stays private.** It is called exclusively by `generateBelief`. Since every shape goes through `generateBelief`, there is exactly one normalization code path  -- no duplication. Never export it, never duplicate it.

### L2  -- Convenience generators

Thin wrappers that construct the correct `Region` array and delegate to `generateBelief`. They contain **zero math**  -- only shape semantics (what "gaussian" or "dip" means in terms of regions).

| L2 Function | What it passes to `generateBelief` |
|-------------|--------------------------------|
| `generateGaussian(center, spread, numBuckets, lowerBound, upperBound)` | `[{ type: 'point', center, spread }]` |
| `generateRange(low, high, numBuckets, lowerBound, upperBound, sharpness?)` | `[{ type: 'range', low, high, sharpness: sharpness ?? 1 }]`  -- single range |
| `generateRange(ranges[], numBuckets, lowerBound, upperBound)` | Multiple `RangeRegion` entries with per-range sharpness/weight  -- multi-range composition |
| `generateDip(center, spread, numBuckets, lowerBound, upperBound)` | `[{ type: 'point', center, spread: spread*1.5, inverted: true }]` |
| `generateLeftSkew(center, spread, numBuckets, lowerBound, upperBound, skewAmount?)` | `[{ type: 'point', center, spread, skew: -skewAmount }]` |
| `generateRightSkew(center, spread, numBuckets, lowerBound, upperBound, skewAmount?)` | `[{ type: 'point', center, spread, skew: skewAmount }]` |
| `generateCustomShape(controlValues, numBuckets, lowerBound, upperBound)` | `[{ type: 'spline', controlX: evenly-spaced, controlY: controlValues }]`  -- quadratic B-spline approximation of user control points |

### Region Types

```typescript
type Region = PointRegion | RangeRegion | SplineRegion;

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

interface SplineRegion {
  type: 'spline';
  controlX: number[];  // X positions in outcome space [lowerBound..upperBound], must be sorted ascending
  controlY: number[];  // Y values (unnormalized, e.g. [0, 25])
  weight?: number;     // Relative weight (default 1)
}
```

**`skew` details:** `|skew|` controls intensity (0 = symmetric, 1 = full asymmetry). Sign controls direction. At the kernel level, two multipliers interpolate based on `|skew|`: the wider side scales `1 + 2.0 * intensity` (up to 3x), the narrower side scales `1 - 0.7 * intensity` (down to 0.3x). Each side of center uses a different effective spread.

**`sharpness` details:** Interpolates two parameters in `rangeKernel`:
- Taper width: `(2/numBuckets) * (1 - sharpness)`  -- at 0, cosine taper over 2 coefficient bins; at 1, no taper (hard step).
- EPS (out-of-range floor): `0.001 - sharpness * 0.0009`  -- at 0, floor is 0.001; at 1, floor is 0.0001.

When `sharpness = 1`, the coefficient vector has a hard step function at the range boundaries. The actual visual sharpness on the chart depends on the polynomial degree `numBuckets` and the density evaluation (quadratic B-spline evaluation).

### When to Create a New L2 vs Call L1 Directly

| Scenario | What to do | Example |
|----------|-----------|---------|
| Simple shape with one region | Create L2 if it will be reused | `generateGaussian`, `generateDip` |
| Shape that's just existing L2 with different params | Call existing L2 with modified params  -- **no new function** | Spike = `generateGaussian(center, spread * 0.2, numBuckets, lowerBound, upperBound)` |
| Shape with multiple regions | Call `generateBelief` directly from the widget | Bimodal = two PointRegions with different centers/weights |
| Shape that is a special case of existing L2 | Call existing L2 with boundary params | Uniform = `generateRange(lowerBound, upperBound, numBuckets, lowerBound, upperBound)` |

**Rule of thumb:** Create a new L2 only when the shape has unique Region parameters that encode a distinct shape concept (like inversion or skew). If it's just "same generator, different numbers," let the widget pass different numbers.

**Multi-range composition:** For non-contiguous range selections (e.g., `BucketRangeSelector`), use `generateRange(ranges[], numBuckets, lowerBound, upperBound)` which accepts an array of `RangeInput` objects, each with its own `low`, `high`, `weight`, and `sharpness`. This composes multiple range regions into a single belief vector via `generateBelief`.

### End-to-End Belief Flow

```
Widget (e.g. TradePanel, ShapeCutter)
  → L2 generator or generateBelief directly
    → pointKernel / rangeKernel / splineKernel (private, internal)
      → normalize (private, internal)
        → BeliefVector (number[], numBuckets+1 elements, sums to 1)

BeliefVector → ctx.setPreviewBelief(belief)     [instant, on every input change]
            → ConsensusChart / MarketCharts reads ctx.previewBelief
              → evaluateDensityCurve(belief, lowerBound, upperBound, numPoints)  [quadratic B-spline evaluation]
                → rendered as dashed yellow area on chart (type="linear")

BeliefVector + collateral → previewPayoutCurve(client, marketId, belief, collateral, numBuckets)  [debounced 500ms]
                          → validateBeliefVector(belief, numBuckets) runs first [throws on invalid]
                          → ctx.setPreviewPayout(payoutCurve)
                            → ConsensusChart shows payout in tooltip

BeliefVector + collateral → buy(client, marketId, belief, collateral, numBuckets)
                          → validateBeliefVector(belief, numBuckets) runs first [throws on invalid]
                          → ctx.invalidate(marketId)  [refreshes all hooks]
                          Note: core buy() accepts optional { prediction } but useBuy does not forward it.
```

### Density Evaluation

All density rendering uses quadratic B-spline evaluation via a single function:

**`evaluateDensityCurve(coefficients, lowerBound, upperBound, numPoints)`  -- Multi-point curve for charting**

- Maps each output point to a position in the coefficient array
- Evaluates a quadratic B-spline basis over neighboring coefficients (smooth, C1-continuous curve)
- Applies density scaling `(numBuckets+1)/(upperBound-lowerBound)` for correct PDF normalization
- Boundary values are 0.5x interior values because the B-spline basis function support extends outside [0,1]
- Used by `ConsensusChart` for previews, consensus, and selected position curves

**`evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound)`  -- Single-point evaluation**

Same math as `evaluateDensityCurve` but for one x value. Used internally by `computeStatistics` and `queryDensityAt`.

**Invariants:**
- Coefficients are non-negative (guaranteed by kernel functions)
- Coefficients sum to 1 (guaranteed by `normalize` in `generateBelief`)
- Density scaling is `(numBuckets+1)/(upperBound-lowerBound)`
- Boundary values are 0.5x due to B-spline basis function support extending outside [0,1]
- Preview and consensus use the same evaluation  -- what the user sees before submitting matches what they see after

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

### Math/Position Generation (Positions category)
- `generateBelief(regions, numBuckets, lowerBound, upperBound)` → belief vector (L1  -- universal constructor, see above)
- `generateGaussian(center, spread, numBuckets, lowerBound, upperBound)` → belief vector (L2)
- `generateRange(low, high, numBuckets, lowerBound, upperBound, sharpness?)` → belief vector (L2, single range)
- `generateRange(ranges[], numBuckets, lowerBound, upperBound)` → belief vector (L2, multi-range composition)
- `generateDip(center, spread, numBuckets, lowerBound, upperBound)` → belief vector (L2)
- `generateLeftSkew(center, spread, numBuckets, lowerBound, upperBound, skewAmount?)` → belief vector (L2)
- `generateRightSkew(center, spread, numBuckets, lowerBound, upperBound, skewAmount?)` → belief vector (L2)
- `generateCustomShape(controlValues, numBuckets, lowerBound, upperBound)` → belief vector (L2  -- quadratic B-spline approximation of user control points)
- `generateBellShape(numPoints, peakPosition?, spread?, zeroTailPercent?)` → `number[]` (utility  -- default bell-shaped control values for custom shape editor)

### Math/Density & Statistics (L0 pure math)
- `evaluateDensityCurve(belief, lowerBound, upperBound, numPoints)` → chart points (quadratic B-spline evaluation)
- `evaluateDensityPiecewise(coefficients, x, lowerBound, upperBound)` → density at single point
- `computeStatistics(coefficients, lowerBound, upperBound)` → `{ mean, median, mode, variance, stdDev }`
- `computePercentiles(coefficients, lowerBound, upperBound)` → `PercentileSet` (9 percentiles via CDF integration)
- `calculateBucketDistribution(points, lowerBound, upperBound, numBuckets?, decimals?)` → `BucketData[]`

### Math/Fan Chart
- `transformHistoryToFanChart(snapshots, lowerBound, upperBound, maxPoints?)` → `FanChartPoint[]` (downsample + percentile extraction)

### Queries
All query functions accept an optional trailing `options?: { signal?: AbortSignal }` parameter (backward-compatible). Signal is forwarded through composed call chains.
- `queryMarketState(client, marketId, options?)` → `MarketState` (wraps `GET /api/views/markets/{market_id}`)
- `getConsensusCurve(client, marketId, numPoints?, options?)` → `ConsensusCurve` (market state + client-side density eval)
- `queryConsensusSummary(client, marketId, options?)` → `ConsensusSummary` (client-side stats from consensus coefficients)
- `queryDensityAt(client, marketId, x, options?)` → density value at a single outcome point
- `queryMarketHistory(client, marketId, limit?, offset?, options?)` → `MarketHistory` (wraps `GET /api/views/history/{market_id}`)
- `queryMarketPositions(client, marketId, options?)` → `Position[]` (wraps `GET /api/views/positions/{market_id}`)
- `queryPositionState(client, positionId, marketId, options?)` → `Position` (single position by ID)
- `mapPosition(raw)` → `Position` (raw API response → typed Position)
- `positionsToTradeEntries(positions, options?)` → `TradeEntry[]` (pure transform, sorted by timestamp desc)
- `queryTradeHistory(client, marketId, options?)` → `TradeEntry[]` (composed: queryMarketPositions → positionsToTradeEntries; options accepts limit and signal)

### Discovery
- `discoverMarkets(client, options?)` -> `MarketState[]` (L1 -- wraps `GET /api/views/markets/list`; accepts `MarketDiscoveryOptions` for client-side filtering/sorting)
- `filterMarkets(markets, options)` -> `MarketState[]` (L1 Discovery -- pure client-side filtering/sorting of `MarketState` arrays; field resolution checks top-level then metadata)
- `discoverPopularMarkets(client, options?)` -> `MarketState[]` (L2 -- preset: sortBy totalVolume desc, limit 10; merges caller options)
- `discoverActiveMarkets(client, options?)` -> `MarketState[]` (L2 -- preset: state 'open'; merges caller options)
- `discoverMarketsByCategory(client, categories, options?)` -> `MarketState[]` (L2 -- preset: categories filter; merges caller options)

### Auth
- `loginUser(client, username, password)` → `{ user: UserProfile, token: string }` (raw fetch, bypasses ensureAuth)
- `signupUser(client, username, password, options?)` → `{ user: UserProfile }` (no token  -- caller must login after)
- `fetchCurrentUser(client)` → `UserProfile` (uses client.get, requires token)
- `validateUsername(name)` → `{ valid: boolean, error?: string }` (3-32 chars, alphanumeric + dots/dashes/underscores)
- `passwordlessLoginUser(client, username)` → `PasswordlessLoginResult` (L1 Transaction -- try login, auto-signup on "Invalid username", throw PASSWORD_REQUIRED for password-protected accounts)
- `silentReAuth(client, username)` → `{ user: UserProfile, token: string }` (L1 Transaction -- silent token re-auth, throws PASSWORD_REQUIRED if password-protected)

### Chart Interaction (L0 Pure Math)
- `pixelToDataX(clientX, plotAreaLeft, plotAreaRight, xDomain)` → data-space X value (linear interpolation, clamped)
- `computeZoomedDomain(params: ZoomParams)` → `[number, number] | null` (cursor-centered zoom, null = reset to full)
- `computePannedDomain(params: PanParams)` → `[number, number]` (drag-to-pan, boundary clamped)
- `filterVisibleData(data, xKey, domain)` → filtered array (inclusive boundaries)
- `generateEvenTicks(domain, count)` → `number[]` (evenly spaced tick values)

### Transactions
- `buy(client, marketId, belief, collateral, numBuckets, options?)` -- wraps `POST /api/market/trading/buy/{marketId}` → BuyResult
- `sell(client, positionId, marketId)` -- wraps `POST /api/market/trading/sell/{marketId}/{positionId}` → SellResult

### Previews
- `previewPayoutCurve(client, marketId, belief, collateral, numBuckets, numOutcomes?, options?)` -- wraps `POST /api/views/preview/payout/{marketId}` → PayoutCurve
- `previewSell(client, positionId, marketId, options?)` -- wraps `GET /api/views/preview/sell/{marketId}/{positionId}` → PreviewSellResult

### Validation (L0)
- `validateBeliefVector(vector, numBuckets)` -- throws descriptive error if belief vector is invalid (length, finite, non-negative, sum-to-1)

---

**Metadata policy:** Mapping functions read fields from their primary source in the API response. lowerBound/upperBound/title come from root level. xAxisUnits/decimals come from the metadata dict (their only source). Do not add metadata fallback chains (e.g., `data.metadata?.X ?? data.X`).

**API field name discrepancy:** The list endpoint (`GET /api/views/markets/list`) and single endpoint (`GET /api/views/markets/{id}`) use different field names for the same data. Both mapping functions (`discoverMarkets` and `queryMarketState`) handle their respective names and produce identical `MarketState` objects:

| SDK field | List endpoint field | Single endpoint field |
|---|---|---|
| `participantCount` | `total_positions` | `num_positions` |
| `positionsOpen` | `open_positions` | `positions_currently_open` |
| `totalVolume` | Not returned (defaults to 0) | `total_volume` |
| `createdAt` | `created_at` | Not returned (defaults to null) |

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
const { numBuckets } = market.config;
const result = await buy(ctx.client, marketId, belief, collateral, numBuckets);
ctx.invalidate(marketId);  // Triggers useMarket/usePositions refetch
onSuccess?.(result);       // Notify parent
```

---

## Existing Widget Reference

| Widget | Purpose | Key Pattern |
|--------|---------|-------------|
| `AuthWidget` | Login/signup/user bar | Uses `useAuth` hook, form state, `validateUsername` from core |
| `PasswordlessAuthWidget` | Passwordless login/signup with modal | Uses `useAuth` hook, modal overlay, auto-signup, PASSWORD_REQUIRED sentinel, silent re-auth via `storedUsername` prop |
| `MarketStats` | Stats display | Minimal, read-only |
| `MarketCard` | Single market summary card | Presentational -- receives `MarketState` as prop, no internal data fetching. Displays title, consensusMean, volume, pool, positions, status badge, resolution date. `onSelect` callback. |
| `MarketList` | Responsive grid of MarketCards | Presentational -- receives `MarketState[]` as prop. Loading (skeleton cards), error, empty, and data states. Passes `onSelect` through to cards. |
| `MarketFilterBar` | Search, category chips, sort controls | Presentational filter bar driven by `useMarketFilters`. Spread `filterBarProps` from the hook. Props: `searchText`, `onSearchChange`, `onSearchClear`, `searchPlaceholder?`, `availableCategories`, `selectedCategories`, `onToggleCategory`, `featuredCategories?`, `sortOptions`, `activeSortField`, `sortOrder`, `onSortFieldChange`, `onSortOrderToggle`, `resultCount`, `loading?`, `onReset`, `maxWidth?`. |
| `MarketOverlay` | Browse-and-trade overlay | Compound widget combining `MarketFilterBar` + `MarketList` + `Overlay`. Uses `useMarketFilters` internally. Render prop `children(marketId)` for panel content. Props: `state?`, `categories?`, `pollInterval?`, `emptyMessage?`, `showFilterBar?`, `featuredCategories?`, `sortOptions?`, `searchPlaceholder?`, `filterBarMaxWidth?`. |
| `ConsensusChart` | Consensus PDF visualization | Standalone chart, reads context for overlays |
| `DistributionChart` | Distribution bar chart | Standalone chart with bucket slider |
| `TimelineChart` | Fan chart (percentile bands over time) | Standalone chart, fetches own history data (see note below) |
| `MarketCharts` | Tabbed chart wrapper | Combines ConsensusChart + DistributionChart + TimelineChart with tab switching |
| `TradePanel` | Form input | Debouncing, preview sync, three-phase pattern |
| `ShapeCutter` | Shape-based trade input | Shape definitions, two-column layout, skew/confidence sliders |
| `BinaryPanel` | Binary yes/no trade input | X-point modes (static/variable/dynamic-mode/dynamic-mean), extends `TradeInputBaseProps`, three-phase pattern |
| `BucketRangeSelector` | Bucket-based range selection with trade | Uses `useDistributionState` (shared or own), multi-range `generateRange`, bucket selection UI |
| `BucketTradePanel` | Composed chart + range selector | Composes `DistributionChart` + `BucketRangeSelector` with shared `useDistributionState` (see shared state composition below) |
| `PositionTable` | Data table | Tabbed views (Open Orders / Trade History / Market Positions), per-tab columns, pagination, row selection → chart overlay, sell actions |
| `TimeSales` | Time & sales ticker | Uses `useTradeHistory` with `pollInterval` (default 5s), read-only market activity feed |
| `CustomShapeEditor` | Custom shape trade input | Uses `useCustomShape` for control point state, draggable scatter dots + vertical sliders, quadratic B-spline approximation via `generateCustomShape`, three-phase trade pattern |

**TimelineChart data-fetching pattern:** Unlike Consensus/Distribution (which receive shared `market` + `consensus` data as props from `MarketCharts`), `TimelineChartContent` calls `useMarketHistory` internally. This avoids fetching history data when the timeline tab isn't active. The `timeFilter` state is lifted to `MarketCharts` so it persists across tab switches.

**Developer-configurable tabs pattern:** Both `MarketCharts` and `PositionTable` use the same tab pattern  -- an optional array prop controls which tabs appear, the first entry is initially active, and a single tab hides the tab bar:
```typescript
// MarketCharts: views?: ChartView[]    (default: ['consensus'])
// PositionTable: tabs?: PositionTabId[] (default: ['open-orders', 'trade-history'])
const effectiveTabs = tabs && tabs.length > 0 ? tabs : DEFAULT_TABS;
const showTabs = effectiveTabs.length > 1;
const [activeTab, setActiveTab] = useState(effectiveTabs[0]);
```
When adding a new tabbed widget, follow this exact pattern  -- do not invent a different approach.

**PositionTable tab-aware data fetching:** The table uses a single `usePositions` call. When the `market-positions` tab is enabled, username is omitted from the query to fetch all positions; client-side filtering by `ctx.user?.username` derives per-tab data. The authenticated user is read from context automatically -- no `username` prop is needed. Market value fetching (`previewSell`) only runs for open positions on the active tab -- never for Trade History.

**Shared state composition pattern:** `BucketTradePanel` is a "composed widget"  -- it renders `DistributionChart` + `BucketRangeSelector` and coordinates them via a shared `useDistributionState` instance passed as a prop. This differs from context-based coordination (used by charts + trade panels). Use this pattern when two public widgets need to share derived state that isn't relevant to the broader SDK context.

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
- [ ] **Add widget smoke tests** (see [Widget Component Testing Guide](../Docs/widget-component-testing-guide.md))  -- at minimum: provider guard, loading state, error state, primary action, unmount cleanup
- [ ] **Run `npx vitest run`  -- all tests pass**
- [ ] **Update `architecture.test.ts` if new exports or prop patterns**
- [ ] **Update PLAYBOOK.md** -- Widget Reference table, File Locations tree, derived-variables selector if new root class
- [ ] **Update docs site** -- Add MDX page at `packages/docs/docs/ui/{category}/{widgetname}.mdx` with live widget embed (see "Adding Widget Documentation" below)

### Adding a New Hook (Data-Fetching)
- [ ] Hook file in `packages/react/src/`
- [ ] Uses `FunctionSpaceContext` for client access
- [ ] Uses `useCacheSubscription` for data fetching (subscribes to cache via `useSyncExternalStore`)
- [ ] Returns `{ <named>, loading, isFetching, error, refetch }` pattern (named property matches hook purpose)
- [ ] Accepts optional `QueryOptions` (`pollInterval`, `enabled`) for cache-based polling and conditional fetching.
- [ ] `loading` is true only on first fetch (no cached data); `isFetching` is true whenever a request is in flight
- [ ] Exported from `packages/react/src/index.ts`
- [ ] **Add tests to `hooks.test.tsx` (context check, loading, success, error)**
- [ ] **Run `npx vitest run` -- all tests pass**
- [ ] **Update PLAYBOOK.md** -- Available Hooks table; **update CLAUDE.md** -- test table if new test file

### Adding a New Hook (Mutation)
- [ ] Hook file in `packages/react/src/`
- [ ] Uses `FunctionSpaceContext` for client access
- [ ] Uses local `useState` for `loading` and `error` -- NOT `useCacheSubscription`
- [ ] Returns `{ execute, loading, error, reset }` pattern
- [ ] `execute` is wrapped in `useCallback`
- [ ] On success: calls `ctx.invalidate(marketId)` if the mutation modifies state (buy/sell)
- [ ] On error: sets error state and re-throws
- [ ] `reset()` clears the error state
- [ ] For preview hooks: manages own `AbortController` via `useRef`, aborts previous request on new call
- [ ] Exported from `packages/react/src/index.ts`
- [ ] **Add tests to `hooks.test.tsx`**
- [ ] **Run `npx vitest run` -- all tests pass**
- [ ] **Update PLAYBOOK.md** -- Available Hooks table

### Adding a New Belief Shape

Before creating anything, decide the correct approach (see "When to Create a New L2" in the Position Generator Architecture section):

**If the shape needs new Region parameters (e.g., a new kernel behavior):**
- [ ] Extend `PointRegion` or `RangeRegion` with optional fields  -- do NOT create new region types
- [ ] Update the corresponding kernel function (`pointKernel` or `rangeKernel`) in `generators.ts` to handle new fields
- [ ] Ensure existing callers without the new fields produce identical output (backward compatible)

**If the shape needs a new L2 generator:**
- [ ] Add L2 function to `generators.ts`  -- one line of logic constructing a Region array and passing to `generateBelief`
- [ ] Export from `packages/core/src/index.ts`
- [ ] Add tests to `tests/shapes.test.ts`  -- valid vector (numBuckets+1 elements, all >= 0, sums to ~1) + shape-specific assertions

**If the shape is just existing generator with different params:**
- [ ] No new function needed  -- widget passes different params to existing L2 or calls `generateBelief` directly
- [ ] Document the parameter mapping in the widget code (e.g., `spike = generateGaussian with spread * 0.2`)

**For any new shape:**
- [ ] Add shape metadata to `SHAPE_DEFINITIONS` in `packages/core/src/shapes/definitions.ts` (id, name, description, parameters, svgPath)
- [ ] Add routing case in the trade input widget's `generateCurrentBelief` switch
- [ ] Add prediction calculation in the widget's `getPrediction` function
- [ ] **Run `npx vitest run`  -- all tests pass, no regressions on existing shapes**
- [ ] **Update PLAYBOOK.md**  -- L2 generators table if new generator, Region Types if new fields, Core Functions list

### Adding a New Core Function
- [ ] Function in appropriate `packages/core/src/` module
- [ ] TypeScript types defined in `types.ts`
- [ ] Exported from `packages/core/src/index.ts`
- [ ] **Add tests to `client-auth.test.ts` (math) or `api-integration.test.ts` (API)**
- [ ] **If the function maps an API endpoint:** Add mocked-fetch contract test to `tests/mappings.test.ts` (raw fixture, field mapping assertion, URL assertion, POST body assertion for writes)
- [ ] **Run `npx vitest run`  -- all tests pass**
- [ ] **Update PLAYBOOK.md**  -- Core Functions list (correct category + layer)

### Modifying Existing Components
- [ ] **Run `npx vitest run` before making changes**
- [ ] Make changes following existing patterns
- [ ] Update tests if prop interfaces or behavior changed
- [ ] **Run `npx vitest run` after changes  -- all tests pass**
- [ ] **Run `cd demo-app && npx vite build`  -- build succeeds**
- [ ] **Update CLAUDE.md and PLAYBOOK.md** if the change introduced new patterns, conventions, or reference data

### Adding Widget Documentation

When a new widget is added to `packages/ui/`, create a corresponding doc page:

1. Create `packages/docs/docs/ui/{category}/{widgetname}.mdx`
2. Add frontmatter with `title` and `sidebar_position`
3. Add imports and live widget embed:

```mdx
---
title: "MyWidget"
sidebar_position: N
---

import { MyWidget } from '@functionspace/ui';
import WidgetDemo from '@site/src/components/WidgetDemo';
import { DEMO_MARKET_ID } from '@site/src/constants';

# MyWidget

<WidgetDemo title="Live Demo" height="350px">
  <MyWidget marketId={DEMO_MARKET_ID} />
</WidgetDemo>

... props table, usage examples, behavior docs ...
```

Key rules:
- All widgets MUST be wrapped in `<WidgetDemo>` (provides `BrowserOnly` for SSR safety + error boundary)
- Use `DEMO_MARKET_ID` and `DEMO_USERNAME` from `@site/src/constants`
- Auth widget forms are globally disabled via CSS in `custom.css` (cancel/back buttons remain enabled)
- Starter kit pages import layout components from `@demo-app/` (alias for `demo-app/src/`), not from docs components. Each demo-app layout exports a named inner component that accepts `marketId`/`username` props.
- Escape curly braces in MDX prose text with `\{...\}` to prevent JSX interpretation
- Verify build: `cd packages/docs && npx docusaurus build`

---

## SDK Design Philosophy

### Simple by Default, Flexible When Needed

UI components work together automatically via shared context. Consumers just place components  -- no wiring required.

**Simple consumer (90% of use cases):**
```tsx
<FunctionSpaceProvider config={config}>
  <ConsensusChart marketId={ID} />
  <PositionTable marketId={ID} />
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
- Swap imports freely  -- behavior stays consistent

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

**Phase 1  -- Instant preview (no debounce):**
Generate the belief vector on every parameter change and write it to context immediately. The chart updates in real-time.
```typescript
const generateCurrentBelief = useCallback(() => {
  if (!market) return null;
  const { numBuckets, lowerBound, upperBound } = market.config;
  // Call appropriate generator based on current inputs
  return generateGaussian(prediction, stdDev, numBuckets, lowerBound, upperBound);
}, [market, prediction, stdDev, /* other deps */]);

useEffect(() => {
  const belief = generateCurrentBelief();
  ctx.setPreviewBelief(belief);
  if (!belief) { setPotentialPayout(null); ctx.setPreviewPayout(null); }
}, [generateCurrentBelief]);
```

**Phase 2  -- Debounced payout preview (500ms):**
Preview the payout curve via API. Debounced because this hits the server. Uses `usePreviewPayout` which manages its own AbortController internally.
```typescript
const { execute: preview } = usePreviewPayout(marketId);

useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  const belief = generateCurrentBelief();
  const collateral = parseFloat(amount);
  if (!belief || isNaN(collateral) || collateral <= 0) { setPotentialPayout(null); return; }
  debounceRef.current = setTimeout(async () => {
    try {
      const result = await preview(belief, collateral);
      setPotentialPayout(result.maxPayout);
      ctx.setPreviewPayout(result);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setPotentialPayout(null);
      ctx.setPreviewPayout(null);
    }
  }, 500);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
}, [generateCurrentBelief, amount, market, marketId]);
```

**Phase 3  -- Trade submission:**
Uses `useBuy` which handles invalidation and wallet refresh automatically on success.
```typescript
const { execute: executeBuy } = useBuy(marketId);

const result = await executeBuy(belief, collateral);
resetToDefaults();
ctx.setPreviewBelief(null);
ctx.setPreviewPayout(null);
onBuy?.(result);
```

### Confidence → Spread Conversion

Trade input widgets that offer a "confidence" slider (0-100%) convert it to a `spread` value for the generators. This is a UI concern, not a core math concern  -- each trade input widget owns its own conversion formula:

```typescript
const getSpreadFromConfidence = useCallback((conf: number): number => {
  if (!market) return 4.0;
  const { lowerBound, upperBound } = market.config;
  const range = upperBound - lowerBound;
  const minSigma = range * 0.01;   // 1% of range (high confidence = narrow)
  const maxSigma = range * 0.20;   // 20% of range (low confidence = wide)
  return maxSigma - ((conf / 100) * (maxSigma - minSigma));
}, [market]);
```

This formula is intentionally owned by each widget  -- different trade inputs may wish to tune the mapping differently. It is NOT in core because it maps a slider value (UI) to a math parameter.

### What Goes in Context vs Consumer App

| In SDK Context | In Consumer App |
|----------------|-----------------|
| `selectedPosition` (enables chart/table sync) | Custom multi-select logic |
| `previewBelief` (enables trade preview) | Filters, sorts, search |
| `invalidate`/`invalidateAll` (targeted/global cache invalidation) | UI preferences |

**Rule:** If multiple SDK components need to coordinate, it goes in context.

### Layer Boundaries

| Layer | Can Do | Cannot Do |
|-------|--------|-----------|
| `core` | Pure functions, API client, types | Import React |
| `react` | Hooks, context, state coordination | Import from ui |
| `ui` | Read/write context, call pure core functions, use mutation hooks, render | Make API calls directly, import buy/sell/previewPayoutCurve/previewSell from core |

**UI components CAN call pure core functions** like `evaluateDensityCurve` and `evaluateDensityPiecewise`. They CANNOT make API calls -- use hooks for that. **UI components MUST use mutation hooks** (`useBuy`, `useSell`, `usePreviewPayout`, `usePreviewSell`) for trade operations -- they MUST NOT import `buy`, `sell`, `previewPayoutCurve`, or `previewSell` from core directly.

---

## File Locations

```
packages/
├── core/src/
│   ├── index.ts              # All exports
│   ├── types.ts              # Type definitions
│   ├── client.ts             # FSClient class
│   ├── math/generators.ts    # Belief vector math (generateBelief, generateGaussian, generateRange, etc.)
│   ├── math/density.ts       # Density evaluation, statistics, percentiles
│   ├── math/distribution.ts  # calculateBucketDistribution
│   ├── math/fanChart.ts      # History → FanChartPoint[] transform
│   ├── shapes/definitions.ts # SHAPE_DEFINITIONS (id, name, svgPath, parameters)
│   ├── queries/market.ts     # Market state queries (queryMarketState, getConsensusCurve, etc.)
│   ├── queries/history.ts    # Market history queries (GET /api/views/history/{market_id})
│   ├── queries/positions.ts  # Position queries (queryMarketPositions, queryPositionState)
│   ├── queries/trades.ts     # Trade history (positionsToTradeEntries, queryTradeHistory)
│   ├── previews/             # previewPayoutCurve, previewSell
│   ├── transactions/         # buy, sell
│   ├── discovery/markets.ts      # discoverMarkets (with MarketDiscoveryOptions)
│   ├── discovery/filters.ts      # filterMarkets (pure client-side filtering)
│   ├── discovery/convenience.ts  # discoverPopularMarkets, discoverActiveMarkets, discoverMarketsByCategory
│   └── auth/auth.ts          # loginUser, signupUser, fetchCurrentUser, validateUsername
├── react/src/
│   ├── index.ts              # All exports
│   ├── context.ts            # FunctionSpaceContext (FSContext interface)
│   ├── themes.ts             # Theme types (FSTheme, ResolvedFSTheme, ThemePresetId) + 4 preset definitions + ChartColors + resolveChartColors
│   ├── FunctionSpaceProvider.tsx  # Provider + theme resolution (resolveTheme, applyDefaults)
│   ├── useAuth.ts            # Auth state/action hook (not data-fetching)
│   ├── useDistributionState.ts  # Shared distribution state for bucket components
│   ├── use*.ts               # Data-fetching hooks (useMarket, useConsensus, usePositions, etc.)
│   └── cache/                # Internal QueryCache (not exported from package root)
│       ├── types.ts          # CacheKey, CacheSnapshot, CacheEntry, QueryFn, QueryOptions, CacheConfig
│       ├── QueryCache.ts     # Cache class (subscribe, getSnapshot, ensureFetching, invalidate, polling, GC)
│       └── index.ts          # Barrel export
└── ui/src/
    ├── index.ts              # Re-exports all public components
    ├── theme.ts              # Deprecated static chart colors (use ctx.chartColors instead)
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
    │   ├── AuthWidget.tsx
    │   └── PasswordlessAuthWidget.tsx
    ├── market/               # Read-only market info
    │   ├── index.ts
    │   ├── MarketCard.tsx
    │   ├── MarketFilterBar.tsx
    │   ├── MarketList.tsx
    │   ├── MarketOverlay.tsx
    │   ├── MarketStats.tsx
    │   ├── PositionTable.tsx
    │   └── TimeSales.tsx
    └── components/           # Internal UI primitives (NOT exported from package root)
        ├── index.ts
        ├── Overlay.tsx
        ├── Slider.tsx
        └── RangeSlider.tsx

tests/
├── architecture.test.ts  # Layer boundaries, hook patterns, exports
├── hooks.test.tsx        # React hook unit tests (jsdom)
├── themes.test.ts        # Theme preset validation, resolveTheme behavior
├── shapes.test.ts        # Belief shape validation (vector properties, shape characteristics)
├── binary.test.ts        # Binary panel-specific tests
├── client-auth.test.ts   # Client auth, core math functions
├── api-integration.test.ts # API/transaction functions (live backend)
└── components.test.tsx   # Widget smoke tests (jsdom)

packages/docs/            # Docusaurus documentation site
├── docusaurus.config.js  # Site config (customFields, plugins, theme)
├── sidebars.js           # Autogenerated sidebar config
├── package.json          # Workspace deps: @functionspace/core, react, ui (via "*")
├── babel.config.js       # Docusaurus babel preset
├── tsconfig.json         # Extends @docusaurus/module-type-aliases
├── src/
│   ├── css/custom.css    # Infima theme vars, SDK CSS imports, auth widget disabling
│   ├── plugins/sdk-webpack-plugin.js  # Webpack aliases + extensionAlias for raw TS source
│   ├── theme/Root.tsx    # Global FunctionSpaceProvider wrapper (syncs Docusaurus color mode)
│   ├── constants.ts      # DEMO_MARKET_ID, DEMO_USERNAME
│   └── components/
│       ├── WidgetDemo.tsx           # BrowserOnly wrapper with error boundary
│       └── ChartToggle.tsx          # Toggleable consensus chart for trade input pages
├── docs/                 # All documentation content (Markdown + MDX)
│   ├── index.md          # Introduction (slug: /)
│   ├── core/             # Core package docs
│   ├── react/            # React package docs
│   ├── ui/               # UI component docs (MDX pages with live widgets)
│   ├── theming/          # Theme system docs
│   └── ...               # Other doc sections
├── static/
│   ├── img/favicon.ico
│   ├── llms.txt          # Full consumer integration guide
│   ├── core.txt          # Core-focused AI context
│   ├── react.txt         # React-focused AI context
│   └── ui.txt            # UI-focused AI context
└── build/                # Generated site output (gitignored)
```

## UI Component Categories

| Folder | Purpose | Examples |
|--------|---------|----------|
| `charts/` | Data visualizations | ConsensusChart, DistributionChart, TimelineChart, MarketCharts |
| `trading/` | User input/actions | TradePanel, ShapeCutter, BinaryPanel, BucketRangeSelector, BucketTradePanel |
| `market/` | Read-only market info | MarketCard, MarketList, MarketOverlay, MarketStats, PositionTable, TimeSales |
| `auth/` | Authentication | AuthWidget (login/signup forms), PasswordlessAuthWidget (username-only login with modal, auto-signup, silent re-auth) |
| `components/` | Internal UI primitives (not exported from package root) | Slider, RangeSlider (rc-slider wrappers with consistent styling), Overlay (reusable modal shell) |
