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

### Derived Variables (set in base.css)

```css
--fs-background-dark    /* Darker bg for gradients */
--fs-input-bg           /* Input field backgrounds */
--fs-primary-glow       /* Focus rings, shadows */
--fs-primary-light      /* Hover states */
--fs-header-gradient    /* Header accent gradients */
```

### Never Hardcode Colors

```css
/* BAD */
.my-element { color: #3b82f6; }

/* GOOD */
.my-element { color: var(--fs-primary); }
```

---

## Available Hooks

| Hook | Returns | Use For |
|------|---------|---------|
| `useMarket(marketId)` | `{ market, loading, error, refetch }` | Market metadata, config, state |
| `useConsensus(marketId, points?)` | `{ consensus, loading, error, refetch }` | Probability density curves |
| `usePositions(marketId, username)` | `{ positions, loading, error, refetch }` | User's open/closed positions |

---

## Context API

```typescript
const ctx = useContext(FunctionSpaceContext);

// Read
ctx.client              // FSClient instance
ctx.previewBelief       // Current trade preview (number[] | null)
ctx.previewPayout       // Current payout preview (PayoutCurve | null)
ctx.invalidationCount   // Cache bust counter

// Write
ctx.setPreviewBelief(belief)   // Update preview visualization
ctx.setPreviewPayout(payout)   // Update payout projection
ctx.invalidate(marketId)       // Trigger data refetch after mutations
```

---

## Core Functions (from @functionspace/core)

### Math/Belief Building
- `buildGaussian(center, spread, K, L, H)` → belief vector
- `buildPlateau(low, high, K, L, H)` → belief vector
- `evaluateDensityCurve(belief, L, H, numPoints)` → chart points

### Transactions
- `buy(client, marketId, belief, collateral)` → BuyResult
- `sell(client, positionId, marketId)` → SellResult

### Projections (previews)
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

| Widget | Lines | Purpose | Key Pattern |
|--------|-------|---------|-------------|
| `MarketStats` | 56 | Stats display | Minimal, read-only |
| `ConsensusChart` | 313 | Visualization | Recharts, memoization |
| `TradePanel` | 265 | Form input | Debouncing, preview sync |
| `PositionTable` | 262 | Data table | Pagination, actions |

---

## SDK Expansion Checklist

### Adding a New Widget
- [ ] Component file in `packages/ui/src/`
- [ ] Props interface exported
- [ ] Uses theme CSS variables (no hardcoded colors)
- [ ] Styles added to `base.css`
- [ ] Exported from `packages/ui/src/index.ts`
- [ ] Error and loading states handled

### Adding a New Hook
- [ ] Hook file in `packages/react/src/`
- [ ] Uses `FunctionSpaceContext` for client access
- [ ] Returns `{ data, loading, error, refetch }` pattern
- [ ] Reacts to `ctx.invalidationCount` for cache busting
- [ ] Exported from `packages/react/src/index.ts`

### Adding a New Core Function
- [ ] Function in appropriate `packages/core/src/` module
- [ ] TypeScript types defined in `types.ts`
- [ ] Exported from `packages/core/src/index.ts`

---

## File Locations

```
packages/
├── core/src/
│   ├── index.ts          # All exports
│   ├── types.ts          # Type definitions
│   ├── math/builders.ts  # Belief vector math
│   ├── queries/          # Read operations
│   └── transactions/     # Write operations
├── react/src/
│   ├── index.ts          # All exports
│   ├── context.ts        # FunctionSpaceContext
│   ├── FunctionSpaceProvider.tsx  # Provider + themes
│   └── use*.ts           # Data hooks
└── ui/src/
    ├── index.ts          # Re-exports all components
    ├── theme.ts          # Chart colors
    ├── styles/base.css   # All widget styles
    ├── charts/           # Data visualizations
    │   ├── index.ts
    │   └── ConsensusChart.tsx
    ├── trading/          # User input/actions
    │   ├── index.ts
    │   └── TradePanel.tsx
    └── market/           # Read-only market info
        ├── index.ts
        ├── MarketStats.tsx
        └── PositionTable.tsx
```

## UI Component Categories

| Folder | Purpose | Examples |
|--------|---------|----------|
| `charts/` | Data visualizations | ConsensusChart, PayoutChart, HistoryChart |
| `trading/` | User input/actions | TradePanel, QuickBuy, LimitOrder |
| `market/` | Read-only market info | MarketStats, PositionTable, OrderBook |
