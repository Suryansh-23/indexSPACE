---
title: "usePreviewSell"
sidebar_position: 5
description: "Preview hook that wraps previewSell() from core with managed loading/error state and optional AbortSignal support."
---

# usePreviewSell

**`usePreviewSell(marketId)`**

Preview hook that wraps `previewSell()` from `@functionspace/core`. Manages loading and error state. Callers can optionally provide an `AbortSignal` for cancellation. Does not auto-invalidate the cache (previews are read-only).

```typescript
function usePreviewSell(
  marketId: string | number,
): {
  execute: (positionId: number, options?: { signal?: AbortSignal }) => Promise<PreviewSellResult>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}
```

| Parameter  | Type               | Description       |
| ---------- | ------------------ | ----------------- |
| `marketId` | `string \| number` | Market the position belongs to |

**Return shape:**

| Field | Type | Description |
| ----- | ---- | ----------- |
| `execute` | `(positionId: number, options?: { signal?: AbortSignal }) => Promise<PreviewSellResult>` | Call to preview sell proceeds. Optionally pass an `AbortSignal` for cancellation. Resolves with the `PreviewSellResult` on success. Throws on failure. |
| `loading` | `boolean` | `true` while a preview request is in flight |
| `error` | `Error \| null` | Most recent error from a failed preview, or `null` |
| `reset` | `() => void` | Clears the `error` state back to `null` |

**Behavior:**

* Callers can optionally pass `{ signal }` to `execute` for cancellation. When the signal is aborted, the `AbortError` is re-thrown but does **not** set the `error` state.
* Errors auto-clear after 5 seconds. Call `reset()` to clear immediately.
* No cache invalidation on success -- previews are read-only.
* Throws `"usePreviewSell must be used within FunctionSpaceProvider"` if rendered outside the provider.

**Delegates to:** `previewSell(client, positionId, marketId, { signal? })` from `@functionspace/core`.

**Example:**

```tsx
import { useState, useEffect } from 'react';
import { usePreviewSell } from '@functionspace/react';

function SellPreview({ marketId, positionId }: { marketId: string; positionId: number }) {
  const { execute: previewSellFn, loading, error } = usePreviewSell(marketId);
  const [returnAmount, setReturnAmount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    previewSellFn(positionId, { signal: controller.signal })
      .then((result) => {
        setReturnAmount(result.collateralReturned);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setReturnAmount(null);
      });
    return () => { controller.abort(); };
  }, [positionId]);

  if (loading) return <span>Calculating...</span>;
  if (error) return <span>Error: {error.message}</span>;
  if (returnAmount !== null) return <span>You would receive: {returnAmount.toFixed(2)}</span>;
  return null;
}
```
