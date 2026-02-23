# FunctionSpace Trading SDK

## What This Is

A TypeScript SDK for embedding prediction market trading widgets into web applications. Developers install the packages via npm and drop in themed, interactive components.

## Package Structure

```
packages/
├── core/     # Pure TypeScript - API client, math, transactions (no React)
├── react/    # React integration - Provider, hooks, theme system
└── ui/       # React components - TradePanel, ConsensusChart, etc.
demo-app/     # Example implementation showing widget usage
```

## Architecture

The SDK is organised around two orthogonal principles: **Layers** determine abstraction level, **Categories** determine functional domain. A category can contain functions at any layer. Higher layers compose lower layers — developers enter at the layer matching their control needs.

### Layers

| Layer | Name | Description | Examples |
|-------|------|-------------|----------|
| L0 | Pure Math | Protocol-agnostic math. No awareness of markets or positions. | `evaluateDensityCurve()`, `computeStatistics()`, `computePercentiles()` |
| L1 | Core | Direct protocol interactions with full parameter control. Unopinionated and explicit. | `buy()`, `sell()`, `queryMarketState()`, `buildBelief()` |
| L2 | Convenience | Higher-level wrappers with sensible defaults. Named concepts mapping to common use cases. | `buildGaussian()`, `buildRange()`, `projectPayoutCurve()`, `projectSell()` |
| L3 | Intent | Domain-specific functions driven by user intent. May reference live market state and orchestrate across categories. | Composed workflows, multi-step operations |

### Categories

| Category | What It Does | State | Examples |
|----------|-------------|-------|----------|
| Builders | Pure computation — transforms inputs into belief vectors | Read-only (no network) | `buildBelief()`, `buildGaussian()`, `buildRange()` |
| Queries | Reads and interprets current server state | Read-only | `queryMarketState()`, `queryMarketPositions()` |
| Projections | Computes hypothetical outcomes without modifying state | Read-only | `projectPayoutCurve()`, `projectSell()` |
| Transactions | State-changing operations | Write | `buy()`, `sell()` |
| Discovery | Find and filter markets or positions | Read-only | `discoverMarkets()` |

### Layer × Category Rule

Every new function must be classifiable by both layer AND category. This keeps the SDK modular: builders stay pure, queries stay read-only, and only transactions modify state. When adding a function, ask: "Which layer? Which category?" If it doesn't fit cleanly, it likely needs to be split.

## Key Principles

1. **Single entry point for theming** — Developers pass `theme="light"` or custom colors to `FunctionSpaceProvider`. All widgets inherit automatically.

2. **No hardcoded colors** — Every color in CSS must use `var(--fs-*)` variables. This is non-negotiable.

3. **Widgets are self-contained** — Each widget handles its own loading/error states and uses hooks internally.

4. **Cache invalidation via context** — After mutations (buy/sell), call `ctx.invalidate(marketId)` to refresh all widgets.

## Before Adding Code

**READ `PLAYBOOK.md` FIRST** — It contains:
- Belief builder architecture (L1/L2 layering, kernel system, Region types)
- How to add new belief shapes (checklist + decision guide)
- Trade input widget three-phase pattern (instant preview → debounced payout → submit)
- Step-by-step guide for adding new widgets
- CSS variable reference (including the derived-variables selector gotcha)
- Hook patterns
- Export checklists

**For React layer changes** (hooks, caching, polling, mutations) — also read `REACT_ROADMAP.md`, which defines the React layer's evolution roadmap and review checklists.

## Critical Constraints

| Rule | Why |
|------|-----|
| Use CSS variables for ALL colors | Theming breaks otherwise |
| ALL belief shapes route through `buildBelief` (L1) | Single normalization path, single point of change |
| New widget root classes must be added to derived-variables selector near the top of `base.css` | Derived vars (`--fs-background-dark` etc.) won't resolve otherwise — breaks silently |
| Widgets must check `FunctionSpaceContext` | Throws helpful error if provider missing |
| Data-fetching hooks return `{ <named>, loading, error, refetch }` | Named property matches hook purpose. State/action hooks (e.g. `useAuth`) return context fields directly. |
| Export types separately | `export type { Props }` for proper tree-shaking |
| Chart content components can fetch their own data | TimelineChartContent calls `useMarketHistory` internally — avoids wasteful fetches when tab is hidden |

## File Locations

| Need to... | Look in... |
|------------|------------|
| Add a widget | `packages/ui/src/` |
| Add a hook | `packages/react/src/` |
| Add API/math function | `packages/core/src/` |
| Add widget styles | `packages/ui/src/styles/base.css` |
| Modify theme system | `packages/react/src/FunctionSpaceProvider.tsx` |
| Add/modify belief shapes | `packages/core/src/shapes/definitions.ts` + `packages/core/src/math/builders.ts` |
| Add auth functions | `packages/core/src/auth/auth.ts` |
| Add internal UI primitives | `packages/ui/src/components/` (not exported from package root) |

## Testing Requirements

**Tests MUST pass before and after any changes.** Run from repo root:

```bash
npx vitest run              # All tests (required)
cd demo-app && npx vite build   # Build verification (required)
```

| Test File | Purpose | Update When... |
|-----------|---------|----------------|
| `tests/architecture.test.ts` | Enforces layer boundaries, hook patterns, export completeness | Adding new hooks, components, or changing imports |
| `tests/hooks.test.tsx` | Verifies hook behavior (loading, error, refetch, context) | Adding or modifying hooks |
| `tests/stage1.test.ts` | Core math functions | Changing belief builders or curve evaluation |
| `tests/stage2.test.ts` | API/transaction functions | Changing buy, sell, or query functions |
| `tests/shapes.test.ts` | Belief shape validation (vector properties, shape characteristics) | Adding new L2 builders or modifying kernel functions |
| `tests/binary.test.ts` | Binary panel-specific tests | Changing BinaryPanel behavior or x-point modes |

**When changing UI components:** Update `architecture.test.ts` if adding new exports or changing prop patterns.

**When adding hooks:** Add corresponding tests to `hooks.test.tsx` following existing patterns.

## Dev Server

```bash
cd demo-app && npx vite dev
```

## Theme System

Developers configure once at provider level:

```tsx
// Simple
<FunctionSpaceProvider config={config} theme="light">

// Custom
<FunctionSpaceProvider config={config} theme={{
  preset: "dark",
  primary: "#brand-color"
}}>
```

Available presets: `"light"` | `"dark"`

## What NOT To Do

- Don't skip running tests — `npx vitest run` must pass before and after changes
- Don't add colors as hex values in CSS — use `var(--fs-primary)` etc.
- Don't create new CSS files — add to `base.css`
- Don't skip loading/error states in widgets
- Don't forget to export from `index.ts`
- Don't make API calls directly in widgets — use hooks for data fetching
- Don't require consumers to wire components together — they should work automatically via context
- Don't push SDK-level coordination state to consumers — keep it in context

## Keeping These Docs Current — MANDATORY

**These documents are living references. They MUST be updated after every implementation.**

After completing any change to the codebase, perform this two-step review:

### Step 1: Verify compliance
Re-read the relevant sections of CLAUDE.md and PLAYBOOK.md. Confirm the implementation followed the patterns and rules documented here. If it didn't, fix the implementation — the docs are the source of truth for how things should be built.

### Step 2: Update the docs
If the implementation introduced anything new or improved on existing patterns, update the docs to reflect it:

| What changed | Update in... |
|---|---|
| New widget added | PLAYBOOK.md — Widget Reference table, File Locations tree |
| New hook added | PLAYBOOK.md — Available Hooks table; CLAUDE.md — test table if new test file |
| New core function added | PLAYBOOK.md — Core Functions list (correct category + layer) |
| New belief shape added | PLAYBOOK.md — L2 builders table, Region Types if new fields |
| New CSS widget root class | PLAYBOOK.md — derived-variables selector example |
| New pattern discovered | PLAYBOOK.md — relevant section (e.g., Common Patterns, Trade Input) |
| New test file added | CLAUDE.md — Testing Requirements table |
| Architecture change | CLAUDE.md — Architecture section; PLAYBOOK.md — Layer Boundaries |

**If you added it to the code but not to the docs, the work is not done.**
