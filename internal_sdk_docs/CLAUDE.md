# FunctionSpace Trading SDK
**This file and the files references in this document are specific to the developement OF the sdk NOT the consumption**
## What This Is

A TypeScript SDK for embedding prediction market trading widgets into web applications. Developers install the packages via npm and drop in themed, interactive components.

## Package Structure

```
packages/
├── core/     # Pure TypeScript - API client, math, transactions (no React)
├── react/    # React integration - Provider, hooks, theme system
├── ui/       # React components - TradePanel, ConsensusChart, etc.
└── docs/     # Docusaurus documentation site with live embedded widgets
demo-app/     # Example implementation showing widget usage
```

## Architecture

The SDK is organised around two orthogonal principles: **Layers** determine abstraction level, **Categories** determine functional domain. A category can contain functions at any layer. Higher layers compose lower layers  -- developers enter at the layer matching their control needs.

### Layers

| Layer | Name | Description | Examples |
|-------|------|-------------|----------|
| L0 | Pure Math | Protocol-agnostic math and validation. No awareness of markets or positions. | `evaluateDensityCurve()`, `computeStatistics()`, `computePercentiles()`, `validateBeliefVector()` |
| L1 | Core | Direct protocol interactions with full parameter control. Unopinionated and explicit. | `buy()`, `sell()`, `queryMarketState()`, `generateBelief()` |
| L2 | Convenience | Higher-level wrappers with sensible defaults. Named concepts mapping to common use cases. | `generateGaussian()`, `generateRange()`, `previewPayoutCurve()`, `previewSell()` |
| L3 | Intent | Domain-specific functions driven by user intent. May reference live market state and orchestrate across categories. | Composed workflows, multi-step operations |

### Categories

| Category | What It Does | State | Examples |
|----------|-------------|-------|----------|
| Positions | Pure computation  -- transforms inputs into belief vectors | Read-only (no network) | `generateBelief()`, `generateGaussian()`, `generateRange()` |
| Queries | Reads and interprets current server state | Read-only | `queryMarketState()`, `queryMarketPositions()` |
| Previews | Computes hypothetical outcomes without modifying state | Read-only | `previewPayoutCurve()`, `previewSell()` |
| Transactions | State-changing operations | Write | `buy()`, `sell()` |
| Discovery | Find and filter markets or positions | Read-only | `discoverMarkets()`, `filterMarkets()`, `discoverPopularMarkets()`, `discoverActiveMarkets()`, `discoverMarketsByCategory()` |
| Validation | Input correctness checks before network calls | Read-only (no network) | `validateBeliefVector()` |

### Layer × Category Rule

Every new function must be classifiable by both layer AND category. This keeps the SDK modular: position generators stay pure, queries stay read-only, and only transactions modify state. When adding a function, ask: "Which layer? Which category?" If it doesn't fit cleanly, it likely needs to be split.

## Key Principles

1. **Single entry point for theming**  -- Developers pass `theme="fs-dark"` or custom colors to `FunctionSpaceProvider`. All widgets inherit automatically.

2. **No hardcoded colors**  -- Every color in CSS must use `var(--fs-*)` variables. This is non-negotiable.

3. **Widgets are self-contained**  -- Each widget handles its own loading/error states and uses hooks internally.

4. **Cache-based invalidation** -- After mutations (buy/sell), call `ctx.invalidate(marketId)` to mark that market's cache entries as stale and trigger targeted refetch. Call `ctx.invalidateAll()` for global cache invalidation (e.g., after login/logout).

## Before Adding Code

**READ `PLAYBOOK.md` FIRST**  -- It contains:
- Position generator architecture (L1/L2 layering, kernel system, Region types)
- How to add new belief shapes (checklist + decision guide)
- Trade input widget three-phase pattern (instant preview → debounced payout → submit)
- Step-by-step guide for adding new widgets
- CSS variable reference (including the derived-variables selector gotcha)
- Hook patterns
- Export checklists

**For React layer changes** (hooks, caching, polling, mutations)  -- also read `REACT_ROADMAP.md`, which defines the React layer's evolution roadmap and review checklists.

## Critical Constraints

| Rule | Why |
|------|-----|
| Use CSS variables for ALL colors | Theming breaks otherwise |
| ALL belief shapes route through `generateBelief` (L1) | Single normalization path, single point of change |
| New widget root classes must be added to derived-variables selector near the top of `base.css` | Derived vars (`--fs-primary-glow`, `--fs-primary-light`, `--fs-header-gradient`) won't resolve otherwise  -- breaks silently |
| Widgets must check `FunctionSpaceContext` | Throws helpful error if provider missing |
| Data-fetching hooks return `{ <named>, loading, isFetching, error, refetch }` | Named property matches hook purpose. `loading` is true only on first fetch (no cached data). `isFetching` is true whenever a request is in flight (first fetch or background refetch). State/action hooks (e.g. `useAuth`, `useCustomShape`) return context fields directly. |
| Data-fetching hooks use `useCacheSubscription`, not local `useState` | Hooks subscribe to the query cache via `useSyncExternalStore`. No per-hook `useState` for data/loading/error. |
| Data-fetching hooks accept optional `QueryOptions` (`pollInterval`, `enabled`). | All data-fetching hooks support cache-based polling and conditional fetching. |
| Hooks must provide `getServerSnapshot` for SSR | `useCacheSubscription` provides a frozen idle snapshot for server-side rendering. |
| Export types separately | `export type { Props }` for proper tree-shaking |
| Chart content components can fetch their own data | TimelineChartContent calls `useMarketHistory` internally  -- avoids wasteful fetches when tab is hidden |
| Docs `Root.tsx` SSR fallback must NOT wrap in `FunctionSpaceProvider` | `FunctionSpaceProvider` blocks rendering during SSR (`providerReady` depends on `useEffect`), producing empty HTML that breaks search indexing, SEO, and accessibility |
| UI components must NOT import `buy`, `sell`, `previewPayoutCurve`, or `previewSell` from core | Use mutation hooks (`useBuy`, `useSell`, `usePreviewPayout`, `usePreviewSell`) from `@functionspace/react` instead. Direct core imports bypass state management and auto-invalidation. |
| Mutation hooks return `{ execute, loading, error, reset }` | Distinct from data-fetching hooks which return `{ <named>, loading, isFetching, error, refetch }`. Mutation hooks use local `useState`, not `useCacheSubscription`. |

## File Locations

| Need to... | Look in... |
|------------|------------|
| Add a widget | `packages/ui/src/` |
| Add a hook | `packages/react/src/` |
| Add API/math function | `packages/core/src/` |
| Add widget styles | `packages/ui/src/styles/base.css` |
| Modify theme system | `packages/react/src/themes.ts` (types + presets + chart colors), `packages/react/src/FunctionSpaceProvider.tsx` (resolution + provider) |
| Modify chart colors | `packages/react/src/themes.ts` (ChartColors, resolveChartColors, preset overrides) |
| Add/modify belief shapes | `packages/core/src/shapes/definitions.ts` + `packages/core/src/math/generators.ts` |
| Add/modify cache behavior | `packages/react/src/cache/` (QueryCache, types, index) |
| Add/modify cache subscription | `packages/react/src/useCacheSubscription.ts` |
| Add/modify cache context | `packages/react/src/QueryCacheContext.ts` |
| Add auth functions | `packages/core/src/auth/auth.ts` |
| Add auth widgets | `packages/ui/src/auth/` (AuthWidget, PasswordlessAuthWidget) |
| Add chart zoom/pan math | `packages/core/src/chart/zoom.ts` |
| Add internal UI primitives | `packages/ui/src/components/` (not exported from package root) |
| Edit documentation content | `packages/docs/docs/` (Markdown/MDX files) |
| Add live widget demos | `packages/docs/src/components/` (WidgetDemo, ChartToggle); starter kit layouts import from `demo-app/src/` via `@demo-app` alias |
| Edit docs site config | `packages/docs/docusaurus.config.js`, `packages/docs/src/css/custom.css` |
| Edit docs search config | `packages/docs/docusaurus.config.js` (`themes` array, `@easyops-cn/docusaurus-search-local`) |
| Edit docs SDK integration | `packages/docs/src/plugins/sdk-webpack-plugin.js`, `packages/docs/src/theme/Root.tsx` |
| Update AI context files | `packages/docs/static/llms.txt`, `core.txt`, `react.txt`, `ui.txt` |
| Exported types from react | `CacheConfig`, `QueryOptions`, `FSContext`, `FSThemeInput`, `ChartColors`, `FanBandColors`, `ThemePresetId`, `FSTheme`, `ResolvedFSTheme`, `DistributionState`, `DistributionStateConfig`, `ChartZoomOptions`, `ChartZoomResult`, `UseCustomShapeReturn`, `UseBuyReturn`, `UseSellReturn`, `UsePreviewPayoutReturn`, `UsePreviewSellReturn`, `FunctionSpaceProviderProps`, `PasswordlessLoginResult`, `MarketDiscoveryOptions`, `SortOption`, `UseMarketFiltersConfig`, `UseMarketFiltersReturn`, `MarketFilterBarProps` |

## Testing Requirements

**Tests MUST pass before and after any changes.** All test wrappers use `React.StrictMode` to catch effect lifecycle bugs. Tests must be StrictMode-compatible. Run from repo root:

```bash
npx vitest run                          # All tests (required)
cd demo-app && npx vite build           # Demo app build verification (required)
cd packages/docs && npx docusaurus build  # Docs site build verification (required)
```

| Test File | Purpose | Update When... |
|-----------|---------|----------------|
| `tests/architecture.test.ts` | Enforces layer boundaries, hook patterns, export completeness | Adding new hooks, components, or changing imports |
| `tests/hooks.test.tsx` | Verifies hook behavior (loading, error, refetch, context) | Adding or modifying hooks |
| `tests/client-auth.test.ts` | Client auth, core math functions | Changing position generators, curve evaluation, or auth |
| `tests/api-integration.test.ts` | API/transaction functions (live backend) | Changing buy, sell, or query functions |
| `tests/shapes.test.ts` | Belief shape validation (vector properties, shape characteristics) | Adding new L2 generators or modifying kernel functions |
| `tests/chart-zoom.test.ts` | Chart zoom/pan math functions | Changing pixelToDataX, zoom/pan domain computation, data filtering |
| `tests/themes.test.ts` | Theme preset validation, resolveTheme behavior | Adding/modifying presets or theme resolution logic |
| `tests/binary.test.ts` | Binary panel-specific tests | Changing BinaryPanel behavior or x-point modes |
| `tests/cache.test.ts` | QueryCache class unit tests | Changing cache class, types, or lifecycle behavior |
| `tests/client-signal.test.ts` | FSClient signal forwarding and request() refactor | Changing FSClient.get(), FSClient.post(), or request() method |
| `tests/mappings.test.ts` | Mocked-fetch mapping contract tests (raw API shape to SDK type, POST body assertions) | Changing any mapping function, API endpoint shapes, or POST request bodies |
| `tests/validation.test.ts` | Belief vector and username validation (validateBeliefVector, validateUsername) | Changing validation logic or adding new validation functions |
| `tests/discovery.test.ts` | filterMarkets unit tests, L2 convenience function tests | Adding or modifying discovery/filter functions |
| `tests/components.test.tsx` | Widget smoke tests, interaction tests, and accessibility audit -- all UI components | Adding or modifying UI widgets -- see [Widget Component Testing Guide](../Docs/widget-component-testing-guide.md) |
| `tests/density-stats.test.ts` | L0 math functions (evaluateDensityCurve, evaluateDensityPiecewise, computeStatistics) | Changing density curve evaluation, B-spline evaluation, or statistics computation |

**When adding UI widgets:** Add 5 smoke tests to `components.test.tsx` (provider guard, loading state, error state, data rendering, unmount cleanup).

**When changing UI components:** Update `architecture.test.ts` if adding new exports or changing prop patterns.

**When adding hooks:** Add corresponding tests to `hooks.test.tsx` following existing patterns.

## Dev Server

```bash
cd demo-app && npx vite dev              # Demo app dev server
cd packages/docs && npx docusaurus start  # Docs site dev server
```

## Theme System

Developers configure once at provider level:

```tsx
// Simple
<FunctionSpaceProvider config={config} theme="fs-dark">

// Custom
<FunctionSpaceProvider config={config} theme={{
  preset: "fs-dark",
  primary: "#brand-color"
}}>
```

Available presets: `"fs-dark"` | `"fs-light"` | `"native-dark"` | `"native-light"`

Theme types and presets are defined in `packages/react/src/themes.ts`. Resolution logic lives in `FunctionSpaceProvider.tsx`. Each preset defines all 30 tokens. Custom themes only require the 9 core tokens  -- the remaining 21 are derived via `applyDefaults()`.

Chart colors (concrete hex values for Recharts SVG rendering) are resolved via `resolveChartColors()` and exposed on `ctx.chartColors`. Each preset has explicit chart color overrides (e.g., native themes use gray consensus instead of blue). Custom themes derive chart colors from semantic tokens (primary → consensus, accent → preview, etc.). Chart components access colors via `useContext(FunctionSpaceContext).chartColors`.

## What NOT To Do

- Don't skip running tests  -- `npx vitest run` must pass before and after changes
- Don't add colors as hex values in CSS  -- use `var(--fs-primary)` etc.
- Don't use CSS variables in Recharts SVG props  -- use `ctx.chartColors.*` instead
- Don't import from `packages/ui/src/theme.ts`  -- those are deprecated static values
- Don't create new CSS files  -- add to `base.css`
- Don't skip loading/error states in widgets
- Don't forget to export from `index.ts`
- Don't make API calls directly in widgets  -- use hooks for data fetching
- Don't require consumers to wire components together  -- they should work automatically via context
- Don't push SDK-level coordination state to consumers  -- keep it in context

## Automated Reviewers

The project has subagent reviewers in `.claude/agents/`. These MUST be run after relevant changes  -- they are not optional.

### Architecture Reviewer (`.claude/agents/architecture-reviewer.md`)

**Run after ANY of these changes:**
- Adding or modifying hooks in `packages/react/src/`
- Adding or modifying components in `packages/ui/src/`
- Changing imports between packages (layer boundary risk)
- Changing exports in any `index.ts` file
- Any change that touches more than one package

**What it checks:** Architecture tests, layer boundary violations, hook pattern conformance, export completeness, hardcoded colors in components, derived-variables CSS selector coverage.

### Theme Reviewer (`.claude/agents/theme-reviewer.md`)

**Run after ANY of these changes:**
- Modifying `packages/react/src/themes.ts` (presets, types, chart colors)
- Modifying `packages/react/src/FunctionSpaceProvider.tsx` (theme resolution, CSS variable injection)
- Modifying `packages/ui/src/styles/base.css` (CSS variables, derived-variables selector)
- Adding or modifying chart components in `packages/ui/src/charts/`
- Adding new widget root classes (`.fs-*`)

**What it checks:** Theme tests, TypeScript token ↔ CSS variable sync, preset completeness (30 tokens each), chart color resolution consistency, component chart color usage, derived-variables selector, theme resolution logic.

### When to run both

If a change touches both architecture (hooks, imports, exports) AND theming (CSS variables, chart colors, presets), run both reviewers.

## Skills

### add-hook (`.claude/skills/add-hook/SKILL.md`)

Use this skill when adding a new data-fetching hook to `packages/react/src/`. It contains the exact pattern, a reference implementation (`useMarket`), and a full checklist covering: core function, hook file, exports, architecture tests, hook behavior tests, and doc updates.

This skill should be invoked automatically when the task involves adding a hook  -- it is not restricted to manual invocation.

### implement-feature (`.claude/skills/implement-feature/SKILL.md`)

Unified skill for implementing new features. Enforces a 6-phase workflow: read living docs, understand input, ask clarifying questions, plan, implement, verify, update docs. Accepts a handoff document path or verbal description.

### implement-feature-review (`.claude/skills/implement-feature-review/SKILL.md`)

Multi-agent adversarial review of recent implementation work. Invoked manually with `/implement-feature-review <handoff-doc-path>`. Dispatches 7 parallel review agents (plan compliance, architecture, theme, SDK best practices, error handling, test quality, code quality catch-all) plus 1 sequential consolidation agent. Produces a detailed improvements document at `Docs/reviews/<feature-name>/review-<feature-name>.md` that can be handed to another agent with `/implement-feature` for remediation. Also produces `doc-updates-draft.md` with proposed edits to the living docs.

## Pending Fixes

- ~~**Race conditions in data hooks.**~~ **Resolved.** Cache-based data hooks use `useSyncExternalStore` with `QueryCache` managing an `AbortController` per in-flight request. Parameter changes abort previous requests, preventing stale responses from overwriting current data. Mutation hooks (`useBuy`, `useSell`) use local `useState` with `useCallback`, eliminating race conditions for trade operations.
- ~~**Missing mounted guards in data hooks.**~~ **Resolved.** Data-fetching hooks use `useSyncExternalStore`, which handles component lifecycle automatically -- no manual mounted guards needed. Mutation hooks use local `useState`, which React manages safely on unmount.

## Deferred Work

- **Prediction field cleanup.** `Position.prediction` and `TradeEntry.prediction` remain on the types. `buy()` still accepts `options.prediction` (deprecated, not sent to server). `useBuy` does not forward it. Removal was deferred -- when picked up, remove fields from both types, remove the option from `buy()`, remove Prediction columns from PositionTable/TimeSales, and update consumer docs.
- **Context-level marketId.** Phase 2B (MarketOverlay) uses render props and `onSelect` callbacks for market selection. A context-level `marketId` on `FunctionSpaceContext` was not needed for this pattern. Remains deferred as a potential future enhancement if multiple independent widgets need to react to market selection changes simultaneously across the widget tree.

## Commit Style

- Never add `Co-Authored-By` lines to git commits.

## Keeping These Docs Current  -- MANDATORY

**These documents are living references. They MUST be updated after every implementation.**

After completing any change to the codebase, perform this three-step review:

### Step 1: Verify compliance
Re-read the relevant sections of CLAUDE.md and PLAYBOOK.md. Confirm the implementation followed the patterns and rules documented here. If it didn't, fix the implementation  -- the docs are the source of truth for how things should be built.

### Step 2: Run reviewers
Run the appropriate automated reviewer(s) based on what changed (see Automated Reviewers section above). Fix any violations they report before considering the work complete.

### Step 3: Update the docs
If the implementation introduced anything new or improved on existing patterns, update the docs to reflect it:

| What changed | Update in... |
|---|---|
| New widget added | PLAYBOOK.md  -- Widget Reference table, File Locations tree |
| New hook added | PLAYBOOK.md  -- Available Hooks table; CLAUDE.md  -- test table if new test file |
| New core function added | PLAYBOOK.md  -- Core Functions list (correct category + layer) |
| New belief shape added | PLAYBOOK.md  -- L2 generators table, Region Types if new fields |
| New CSS widget root class | PLAYBOOK.md  -- derived-variables selector example |
| New pattern discovered | PLAYBOOK.md  -- relevant section (e.g., Common Patterns, Trade Input) |
| New test file added | CLAUDE.md  -- Testing Requirements table |
| Architecture change | CLAUDE.md  -- Architecture section; PLAYBOOK.md  -- Layer Boundaries |
| New agent or skill added | CLAUDE.md  -- Automated Reviewers or Skills section |
| New/changed public API (widget, hook, core function) | `llms.txt` -- consumer integration guide; `packages/docs/docs/` -- Docusaurus documentation pages |
| Docs site structure change | `packages/docs/docusaurus.config.js`, `packages/docs/sidebars.js` |

**If you added it to the code but not to the docs, the work is not done.**
