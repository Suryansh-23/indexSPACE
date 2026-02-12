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

## Critical Constraints

| Rule | Why |
|------|-----|
| Use CSS variables for ALL colors | Theming breaks otherwise |
| ALL belief shapes route through `buildBelief` (L1) | Single normalization path, single point of change |
| New widget root classes must be added to derived-variables selector in `base.css` (lines 4-7) | Derived vars (`--fs-background-dark` etc.) won't resolve otherwise — breaks silently |
| Widgets must check `FunctionSpaceContext` | Throws helpful error if provider missing |
| Hooks return `{ <named>, loading, error, refetch }` | Named property matches hook (market, consensus, positions) |
| Export types separately | `export type { Props }` for proper tree-shaking |

## File Locations

| Need to... | Look in... |
|------------|------------|
| Add a widget | `packages/ui/src/` |
| Add a hook | `packages/react/src/` |
| Add API/math function | `packages/core/src/` |
| Add widget styles | `packages/ui/src/styles/base.css` |
| Modify theme system | `packages/react/src/FunctionSpaceProvider.tsx` |

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
