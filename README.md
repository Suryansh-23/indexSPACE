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
  theme="dark"
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

**Theme System** — Pass `theme="light"`, `theme="dark"`, or a custom object with per-property overrides:

```tsx
<FunctionSpaceProvider
  config={config}
  theme={{ preset: "dark", primary: "#ff6b6b" }}
>
```

All theme values become CSS custom properties (`--fs-primary`, `--fs-accent`, `--fs-positive`, etc.) that cascade to all widgets.

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
<FunctionSpaceProvider config={config} theme="dark">
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
      theme="dark"
    >
      <ConsensusChart marketId={1} height={400} />
      <TradePanel marketId={1} />
      <PositionTable marketId={1} username="alice" />
    </FunctionSpaceProvider>
  );
}
```

## Theme Presets

| Variable | Purpose |
|----------|---------|
| `--fs-primary` | Main accent (buttons, links, highlights) |
| `--fs-accent` | Secondary accent (previews, warnings) |
| `--fs-positive` | Success / profit states |
| `--fs-negative` | Error / loss states |
| `--fs-background` | Widget background |
| `--fs-surface` | Elevated surfaces (cards, inputs) |
| `--fs-text` | Primary text |
| `--fs-text-secondary` | Muted / secondary text |
| `--fs-border` | Borders and dividers |

Available presets: `"light"` | `"dark"`. Override individual properties by passing an object with `preset` plus any overrides.

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
| `tests/architecture.test.ts` | Layer boundaries, hook patterns, export completeness |
| `tests/hooks.test.tsx` | Hook behavior (loading, error, refetch, context) |
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
│   ├── context.ts            FSContext interface
│   ├── FunctionSpaceProvider.tsx  Provider + theme resolution
│   └── use*.ts               Data-fetching hooks
└── ui/src/
    ├── index.ts              Re-exports all components
    ├── theme.ts              Chart color constants (Recharts)
    ├── styles/base.css        All widget styles (CSS variables only)
    ├── charts/               ConsensusChart, DistributionChart, TimelineChart, MarketCharts
    ├── trading/              TradePanel, ShapeCutter, BinaryPanel, BucketRangeSelector
    └── market/               MarketStats, PositionTable, TimeSales
```
