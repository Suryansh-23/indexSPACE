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
- Step-by-step guide for adding new widgets
- CSS variable reference
- Hook patterns
- Export checklists

## Critical Constraints

| Rule | Why |
|------|-----|
| Use CSS variables for ALL colors | Theming breaks otherwise |
| Widgets must check `FunctionSpaceContext` | Throws helpful error if provider missing |
| Hooks return `{ data, loading, error, refetch }` | Consistent API across all hooks |
| Export types separately | `export type { Props }` for proper tree-shaking |

## File Locations

| Need to... | Look in... |
|------------|------------|
| Add a widget | `packages/ui/src/` |
| Add a hook | `packages/react/src/` |
| Add API/math function | `packages/core/src/` |
| Add widget styles | `packages/ui/src/styles/base.css` |
| Modify theme system | `packages/react/src/FunctionSpaceProvider.tsx` |

## Verification Commands

```bash
# Run all tests (from repo root)
npx vitest run

# Build demo app
cd demo-app && npx vite build

# Dev server
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

- Don't add colors as hex values in CSS — use `var(--fs-primary)` etc.
- Don't create new CSS files — add to `base.css`
- Don't skip loading/error states in widgets
- Don't forget to export from `index.ts`
- Don't call API directly in widgets — use or create hooks
