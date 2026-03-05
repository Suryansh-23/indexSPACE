---
name: add-hook
description: Add a new data-fetching hook to the @functionspace/react package following SDK patterns
---

# Add React Hook

Adds a new data-fetching hook to `packages/react/src/` following the SDK's established patterns.

## Required Pattern

Every data-fetching hook MUST:

1. Accept `marketId: string | number` as first parameter
2. Get context via `useContext(FunctionSpaceContext)` and throw if missing
3. Manage `useState` for: the named data field, `loading` (init `true`), and `error`
4. Wrap the fetch in `useCallback` depending on `[ctx.client, marketId]`
5. Call the fetch in `useEffect` depending on `[fetch, ctx.invalidationCount]`
6. Return `{ <namedField>, loading, error, refetch: fetch }`

## Reference Implementation

```typescript
// packages/react/src/useMarket.ts — canonical example
import { useState, useEffect, useCallback, useContext } from 'react';
import { queryMarketState } from '@functionspace/core';
import type { MarketState } from '@functionspace/core';
import { FunctionSpaceContext } from './context.js';

export function useMarket(marketId: string | number) {
  const ctx = useContext(FunctionSpaceContext);
  if (!ctx) throw new Error('useMarket must be used within FunctionSpaceProvider');

  const [market, setMarket] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await queryMarketState(ctx.client, marketId);
      setMarket(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [ctx.client, marketId]);

  useEffect(() => {
    fetch();
  }, [fetch, ctx.invalidationCount]);

  return { market, loading, error, refetch: fetch };
}
```

## Checklist

When adding a new hook, complete ALL of these steps:

### 1. Ensure the core function exists
- The hook wraps a function from `@functionspace/core` (e.g., `queryMarketState`)
- If the core function doesn't exist yet, create it first in the appropriate category:
  - `packages/core/src/queries/` for read-only data
  - `packages/core/src/transactions/` for mutations
  - `packages/core/src/projections/` for hypothetical calculations
- Export it from `packages/core/src/index.ts`

### 2. Create the hook file
- File: `packages/react/src/use<Name>.ts`
- Follow the exact pattern above — context check, useState triple, useCallback, useEffect with invalidationCount

### 3. Export from react index
- Add to `packages/react/src/index.ts`:
  ```typescript
  export { use<Name> } from './use<Name>.js';
  ```
- If the hook has custom types, export those too:
  ```typescript
  export type { <TypeName> } from './use<Name>.js';
  ```

### 4. Add architecture test coverage
- In `tests/architecture.test.ts`, add the hook name to the "all hooks are exported from react package index" test:
  ```typescript
  expect(indexContent).toContain('use<Name>');
  ```

### 5. Add hook behavior tests
- In `tests/hooks.test.tsx`, add a describe block following existing patterns:
  ```typescript
  describe('use<Name>', () => {
    it('returns loading true initially', ...);
    it('returns data after fetch', ...);
    it('returns error on failure', ...);
    it('refetches on invalidation', ...);
  });
  ```

### 6. Update docs
- Add to `sdk_iteration_docs/PLAYBOOK.md` Available Hooks table
- Add to `sdk_iteration_docs/CLAUDE.md` if a new test file was created

## Layer Rules
- Hooks live in `packages/react/src/` — they import from `@functionspace/core` only
- Never import from `@functionspace/ui` in a hook
- Never make direct API calls — always wrap a core function
- State/action hooks (like `useAuth`) are exceptions to the `invalidationCount` pattern
