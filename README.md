# FunctionSpace Trading SDK

A TypeScript SDK for embedding prediction market trading widgets into web applications. Developers install the packages via npm and drop in themed, interactive components that handle market visualization, trade input, and position management.

## Architecture

The SDK is split into three layers with strict dependency boundaries. Each layer can be used independently — consumers pick the level of abstraction they need.

```
packages/
├── core/       @functionspace/core    Pure TypeScript — API client, math, types
├── react/      @functionspace/react   React integration — Provider, hooks, context
└── ui/         @functionspace/ui      React components — charts, trading panels, tables
demo-app/                              Example implementation showing widget usage
```

### Layer Boundaries

| Layer | Can Import | Cannot Import | Purpose |
|-------|-----------|---------------|---------|
| `core` | Nothing (zero dependencies) | `react`, `ui` | API client, belief math, types, queries, transactions |
| `react` | `core` | `ui` | Hooks, context, provider, theme system, state coordination |
| `ui` | `core`, `react` | — | Pre-built widgets with loading/error states, CSS theming |

These boundaries are enforced by `tests/architecture.test.ts` and will fail CI if violated.

### Data Flow

```
Widget (UI) → Hook (React) → Query/Transaction (Core) → Backend API
                  ↕
            Context (React)    ← coordinates preview state, selection, invalidation
```

- **Server state** flows through hooks: `useMarket`, `useConsensus`, `usePositions`, etc.
- **Preview state** flows through context: `previewBelief`, `previewPayout` (ephemeral, set by trade inputs)
- **Coordination state** flows through context: `selectedPosition` (syncs chart overlays with table selection)
- **Cache invalidation** uses `ctx.invalidate(marketId)` after mutations, which increments `invalidationCount` and triggers all hooks to refetch

---

## Packages

### `@functionspace/core`

Pure TypeScript with zero dependencies. Use this layer directly if you don't need React.

**API Client** — `FSClient` handles authentication (token-based with auto-retry on 401), request building, and guest mode for unauthenticated browsing.

**Math / Belief Building** — Two-layer architecture for constructing belief vectors:
- **L1**: `buildBelief(regions, K, L, H)` — universal constructor. All belief vectors route through this single normalization path.
- **L2**: Convenience builders — `buildGaussian`, `buildPlateau`, `buildDip`, `buildLeftSkew`, `buildRightSkew`. Thin wrappers that construct Region arrays and delegate to L1.

**Density Evaluation** — `evaluateDensityCurve` (multi-point for charts) and `evaluateDensityPiecewise` (single-point) use piecewise-linear interpolation over Bernstein coefficient arrays.

**Queries** — `queryMarketState`, `queryMarketPositions`, `queryTradeHistory`, `queryMarketHistory`, `getConsensusCurve`, `queryDensityAt`.

**Transactions** — `buy`, `sell`.

**Projections** — `projectPayoutCurve`, `projectSell` for trade previews without committing.

**Types** — `MarketState`, `Position`, `FSConfig`, `PayoutCurve`, `BeliefVector`, `TradeEntry`, `MarketHistory`, `FanChartPoint`, and more.

```typescript
import { FSClient, queryMarketState, buildGaussian, buy } from '@functionspace/core';

const client = new FSClient({ baseUrl: 'https://api.example.com', username: 'alice', password: 'secret' });
const market = await queryMarketState(client, 1);
const belief = buildGaussian(50, 5, market.config.K, market.config.L, market.config.H);
const result = await buy(client, 1, belief, 100);
```

### `@functionspace/react`

React integration layer. Provides the `FunctionSpaceProvider`, data-fetching hooks, and the context that coordinates widgets.

**Provider** — `FunctionSpaceProvider` creates the client, authenticates, sets CSS custom properties for theming, and provides the shared context to all child widgets.

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';

<FunctionSpaceProvider
  config={{ baseUrl: 'https://api.example.com', username: 'alice', password: 'secret' }}
  theme="fs-dark"
>
  {/* All SDK widgets go here */}
</FunctionSpaceProvider>
```

**Hooks** — Each returns `{ <named>, loading, error, refetch }` and reacts to `invalidationCount` for automatic cache busting after mutations.

| Hook | Returns | Use For |
|------|---------|---------|
| `useMarket(marketId)` | `{ market, loading, error, refetch }` | Market metadata, config, state |
| `useConsensus(marketId, points?)` | `{ consensus, loading, error, refetch }` | Probability density curves |
| `usePositions(marketId, username?)` | `{ positions, loading, error, refetch }` | Positions filtered by owner |
| `useTradeHistory(marketId)` | `{ history, loading, error, refetch }` | Trade log entries |
| `useMarketHistory(marketId, options?)` | `{ history, loading, error, refetch }` | Alpha vector snapshots for timeline charts |
| `useBucketDistribution(...)` | `{ buckets, loading, error, refetch }` | Discrete probability buckets |
| `useDistributionState(config)` | `{ state }` | Managed bucket count + selection state |

**Theme System** — Pass a preset string or a custom color scheme. The provider resolves 30 CSS tokens and chart-specific color values, making them available to all widgets automatically. See [Theming](#theming) for full documentation.

### `@functionspace/ui`

Pre-built React components organized by purpose. Each widget is self-contained — it checks for `FunctionSpaceProvider`, handles its own loading/error states, and uses hooks internally.

**Charts** (`charts/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `ConsensusChart` | `marketId`, `height?`, `overlayCurves?` | Consensus PDF with optional overlay curves (selected position, preview) |
| `DistributionChart` | `marketId`, `defaultBucketCount?`, `distributionState?` | Discrete probability bar chart with bucket slider |
| `TimelineChart` | `marketId` | Fan chart showing percentile bands over time |
| `MarketCharts` | `marketId`, `views?`, `overlayCurves?`, `defaultBucketCount?` | Tabbed wrapper combining the above charts. `views` controls which tabs appear (e.g., `['consensus', 'distribution', 'timeline']`) |

**Trading** (`trading/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `TradePanel` | `marketId`, `onBuy?` | Gaussian trade input with prediction/confidence sliders |
| `ShapeCutter` | `marketId`, `onBuy?` | Shape-based trade input with multiple belief shapes |
| `BinaryPanel` | `marketId`, `onBuy?` | Simplified yes/no trade input |
| `BucketRangeSelector` | `marketId`, `distributionState` | Range selection on distribution chart |
| `BucketTradePanel` | `marketId`, `distributionState`, `onBuy?` | Trade panel for bucket-based trades |

**Market** (`market/`)

| Component | Props | Description |
|-----------|-------|-------------|
| `MarketStats` | `marketId` | Read-only statistics bar (mean, median, mode, pool, volume) |
| `PositionTable` | `marketId`, `username`, `pageSize?`, `tabs?`, `onSell?` | Tabbed position/trade table with row selection and sell actions |
| `TimeSales` | `marketId` | Real-time trade log |

**Automatic coordination** — Widgets work together via shared context without any wiring:

```tsx
<FunctionSpaceProvider config={config} theme="fs-dark">
  <MarketCharts marketId={1} views={['consensus', 'distribution']} />
  <PositionTable marketId={1} username="alice" />
  <TradePanel marketId={1} />
</FunctionSpaceProvider>
```

Click a row in `PositionTable` and its belief curve appears on `ConsensusChart`. Adjust sliders in `TradePanel` and the preview renders on the chart in real time. Submit a trade and all widgets refetch automatically.

---

## Quick Start

```tsx
import { FunctionSpaceProvider } from '@functionspace/react';
import { ConsensusChart, TradePanel, PositionTable } from '@functionspace/ui';

function App() {
  return (
    <FunctionSpaceProvider
      config={{
        baseUrl: import.meta.env.VITE_FS_BASE_URL,
        username: import.meta.env.VITE_FS_USERNAME,
        password: import.meta.env.VITE_FS_PASSWORD,
      }}
      theme="fs-dark"
    >
      <ConsensusChart marketId={1} height={400} />
      <TradePanel marketId={1} />
      <PositionTable marketId={1} username="alice" />
    </FunctionSpaceProvider>
  );
}
```

## Theming

The SDK has a multi-layer theme system. You configure it once on the provider — all widgets (CSS, charts, tooltips, axes) respond automatically.

### Presets

Four built-in presets cover the most common use cases:

| Preset | Description |
|--------|-------------|
| `"fs-dark"` | FunctionSpace branded dark mode. Blue consensus, amber preview, rounded corners, thick borders. |
| `"fs-light"` | FunctionSpace branded light mode. Same brand colors on white backgrounds. |
| `"native-dark"` | De-branded dark mode. Gray consensus/preview (not blue), tight radii, thin borders, fast transitions. Blends into any host app. |
| `"native-light"` | De-branded light mode. Gray consensus, black preview, minimal styling. |

```tsx
<FunctionSpaceProvider config={config} theme="native-dark">
  {/* All widgets render with native styling */}
</FunctionSpaceProvider>
```

### Custom Color Schemes

You only need to provide the **9 core tokens** — the remaining 21 optional tokens plus all chart colors are derived automatically:

```tsx
<FunctionSpaceProvider
  config={config}
  theme={{
    primary: '#8B5CF6',       // → consensus line, active elements, focus rings
    accent: '#F59E0B',        // → trade preview line, secondary highlights
    positive: '#10B981',      // → profit states, payout curve, "yes" indicators
    negative: '#EF4444',      // → loss states, sell buttons, "no" indicators
    background: '#0F0F23',    // → widget backgrounds, chart areas
    surface: '#1A1A3E',       // → cards, panels, tooltip backgrounds
    text: '#E2E8F0',          // → primary text, tooltip text
    textSecondary: '#94A3B8', // → axis labels, muted labels, timestamps
    border: '#2D2D5A',        // → dividers, grid lines, tooltip borders
  }}
>
```

**What each core token controls:**

| Token | CSS Elements | Chart Elements |
|-------|-------------|----------------|
| `primary` | Buttons, links, active tabs, focus rings, header gradients | Consensus curve stroke & fill, fan chart mean line & bands |
| `accent` | Preview highlight, secondary badges | Trade preview line stroke & fill |
| `positive` | Profit text, success badges, buy buttons | Payout curve color, first position color |
| `negative` | Loss text, error states, sell buttons | Second position color |
| `background` | Widget backgrounds, gradient bases | Derived: chart background, tooltip bg, grid |
| `surface` | Cards, panels, elevated containers | Tooltip background |
| `text` | Primary text everywhere | Tooltip text |
| `textSecondary` | Labels, timestamps, muted copy | Crosshair/cursor stroke |
| `border` | All borders, dividers, separators | Tooltip border, cartesian grid |

### Extending a Preset

Start from a preset and override specific tokens:

```tsx
// Purple brand on top of FS Dark's layout and optional tokens
<FunctionSpaceProvider
  config={config}
  theme={{
    preset: "fs-dark",
    primary: "#8B5CF6",
    accent: "#A78BFA",
  }}
>
```

The consensus line becomes purple, the preview line becomes light purple, and everything else inherits from `fs-dark`.

### Optional Tokens

If you need finer control, these tokens can be set explicitly. When omitted, they're derived from the core 9:

| Token | Default Derivation | Purpose |
|-------|--------------------|---------|
| `bgSecondary` | `background` | Secondary background (chart areas) |
| `surfaceHover` | `surface` | Hover state for surface elements |
| `borderSubtle` | `border` | Lighter-weight borders, chart grid lines |
| `textMuted` | `textSecondary` | Lowest-contrast text, axis tick labels |
| `navFrom` / `navTo` | `background` | Navigation gradient endpoints |
| `overlay` | `rgba(0,0,0,0.2)` | Overlay backgrounds |
| `inputBg` | `background` | Input field backgrounds |
| `codeBg` | `background` | Code block backgrounds |
| `chartBg` | `background` | Chart area backgrounds |
| `accentGlow` | `rgba(59,130,246,0.25)` | Focus ring glow |
| `badgeBg` / `badgeBorder` / `badgeText` | Derived from grays / `textSecondary` | Badge styling |
| `logoFilter` | `none` | CSS filter for logos |
| `fontFamily` | `inherit` | Global font family |
| `radiusSm` / `radiusMd` / `radiusLg` | `0.375rem` / `0.75rem` / `1rem` | Border radii (smaller = tighter, more "native") |
| `borderWidth` | `1px` | Border thickness (`2px` for FS presets, `1px` for native) |
| `transitionSpeed` | `200ms` | Animation duration (`300ms` for FS, `150ms` for native) |

### Chart Colors

Recharts SVG components require concrete hex values — CSS variables don't work in `fill`/`stroke` props. The SDK solves this by resolving chart colors from the theme and exposing them on the context as `ctx.chartColors`.

**For preset themes**, chart colors are explicitly defined per preset. FS themes use brand blue for the consensus line; native themes override it to gray for a de-branded look.

**For custom themes**, all chart colors are derived automatically from your core 9 tokens:

| Chart Element | Derived From | Example |
|---------------|-------------|---------|
| Consensus curve | `primary` | Purple primary → purple consensus |
| Trade preview line | `accent` | Amber accent → amber preview |
| Payout curve | `positive` | Green positive → green payout |
| Grid lines | `borderSubtle` (or `border`) | Dark border → dark grid |
| Axis labels | `textMuted` (or `textSecondary`) | Gray text → gray labels |
| Tooltip background | `surface` | Dark surface → dark tooltip |
| Tooltip border | `border` | — |
| Tooltip text | `text` | — |
| Crosshair/cursor | `textSecondary` | — |
| Fan chart bands | Opacity variants of consensus color | Purple consensus → purple bands at 58%/40%/28%/20% opacity |

You never need to specify chart colors directly — they follow your theme tokens. If a preset overrides them (like native's gray consensus), that takes precedence over the derivation.

## Development

### Demo App

```bash
cd demo-app && npx vite dev
```

### Tests

```bash
npx vitest run
```

| Test File | Covers |
|-----------|--------|
| `tests/architecture.test.ts` | Layer boundaries, hook patterns, export completeness, context shape |
| `tests/hooks.test.tsx` | Hook behavior (loading, error, refetch, context) |
| `tests/themes.test.ts` | Theme presets, resolveTheme, resolveChartColors, chart color derivation |
| `tests/shapes.test.ts` | Belief shape validation (vector properties, shape characteristics) |
| `tests/binary.test.ts` | Binary panel-specific tests |
| `tests/stage1.test.ts` | Core math functions (belief builders, density evaluation) |
| `tests/stage2.test.ts` | API / transaction functions |

### Build Verification

```bash
cd demo-app && npx vite build
```

## Project Structure

```
packages/
├── core/src/
│   ├── index.ts              All exports
│   ├── types.ts              Type definitions
│   ├── client.ts             FSClient (auth, requests)
│   ├── math/builders.ts      Belief vector construction (L1/L2)
│   ├── math/density.ts       Density evaluation, statistics
│   ├── math/fanChart.ts      History → fan chart transform
│   ├── queries/              Read operations (market, positions, history)
│   ├── transactions/         Write operations (buy, sell)
│   ├── projections/          Preview operations (payout curve, sell estimate)
│   ├── shapes/               Shape definitions for trade inputs
│   └── discovery/            Market listing
├── react/src/
│   ├── index.ts              All exports
│   ├── context.ts            FSContext interface (includes chartColors)
│   ├── themes.ts             Theme types, 4 presets, ChartColors, resolveChartColors
│   ├── FunctionSpaceProvider.tsx  Provider, theme + chart color resolution
│   └── use*.ts               Data-fetching hooks
└── ui/src/
    ├── index.ts              Re-exports all components
    ├── theme.ts              Deprecated static chart colors (use ctx.chartColors)
    ├── styles/base.css        All widget styles (CSS variables only)
    ├── charts/               ConsensusChart, DistributionChart, TimelineChart, MarketCharts
    ├── trading/              TradePanel, ShapeCutter, BinaryPanel, BucketRangeSelector
    └── market/               MarketStats, PositionTable, TimeSales
```
