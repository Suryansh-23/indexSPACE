---
title: "useCustomShape"
sidebar_position: 1
---

# useCustomShape

**`useCustomShape(market)`**

State management hook for the interactive custom shape editor. Manages control point values, locked points, and drag interaction state, and derives a normalized `BeliefVector` and mode prediction from the current control values. This is a state/action hook -- the consuming component manages loading and error states separately (typically from `useMarket`).

```typescript
function useCustomShape(market: MarketState | null): UseCustomShapeReturn
```

| Parameter | Type                  | Description                                                                                                                            |
| --------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `market`  | `MarketState \| null` | Market state providing `config.K`, `config.L`, `config.H` for belief construction. When `null`, `pVector` and `prediction` are `null`. |

**Returns `UseCustomShapeReturn`:**

_State fields:_

| Field           | Type       | Description                                                                                                           |
| --------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `controlValues` | `number[]` | Current height of each control point. Values range from 0 to 25. Initialized as a bell shape via `generateBellShape`. |
| `lockedPoints`  | `number[]` | Indices of currently locked control points (maximum 2). Locked points cannot be dragged or set.                       |
| `numPoints`     | `number`   | Current control point count (5 to 25, default 20).                                                                    |

_Derived fields:_

| Field        | Type                   | Description                                                                                                  |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pVector`    | `BeliefVector \| null` | Normalized belief vector derived from control values via `generateCustomShape`. `null` when `market` is `null`. |
| `prediction` | `number \| null`       | Mode (peak) of the derived distribution via `computeStatistics`. `null` when `market` is `null`.             |

_Action fields:_

| Field             | Type                                     | Description                                                                                                                   |
| ----------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `setControlValue` | `(index: number, value: number) => void` | Set a single control point's value. No-op if the point is locked or the index is out of range. Value is clamped to `[0, 25]`. |
| `toggleLock`      | `(index: number) => void`                | Toggle lock on a control point. If already at max locks (2), the oldest lock is dropped (FIFO) before the new lock is added.  |
| `setNumPoints`    | `(n: number) => void`                    | Change the control point count. `n` is rounded and clamped to `[5, 25]`. Resets all values to a bell shape and clears locks.  |
| `resetToDefault`  | `() => void`                             | Reset all control values to a bell shape at the current `numPoints`. Clears locks and ends any active drag.                   |

_Drag fields:_

| Field           | Type                      | Description                                                                                                                           |
| --------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `startDrag`     | `(index: number) => void` | Begin dragging a control point. No-op if the point is locked.                                                                         |
| `handleDrag`    | `(value: number) => void` | Update the currently dragged point's value. Value is clamped to `[0, 25]`. No-op if no drag is active or the dragged point is locked. |
| `endDrag`       | `() => void`              | End the current drag operation.                                                                                                       |
| `isDragging`    | `boolean`                 | Whether a drag is currently active (`draggingIndex !== null`).                                                                        |
| `draggingIndex` | `number \| null`          | Index of the point currently being dragged, or `null`.                                                                                |

**Behavior:**

* Requires `FunctionSpaceProvider`. Throws if called outside one.
* All value mutations (`setControlValue`, `handleDrag`) clamp to `[0, 25]`. Values outside this range are silently clamped, never rejected.
* `setControlValue` is a no-op for out-of-range indices (negative or beyond `controlValues.length`). No error is thrown.
* Locked points are fully protected: `setControlValue`, `startDrag`, and `handleDrag` all silently no-op when the target point is locked.
* `toggleLock` uses FIFO eviction: when already at the maximum of 2 locks, the oldest lock is removed before the new one is added. Toggling an already-locked point unlocks it.
* `setNumPoints` rounds the input to the nearest integer before clamping to `[5, 25]`, then regenerates control values as a bell shape and clears all locks.
* `resetToDefault` regenerates the bell shape at the current `numPoints` (does not reset `numPoints` to 20) and clears both locks and drag state.
* `pVector` recomputes whenever `controlValues` or `market` changes. `prediction` recomputes whenever `pVector` or `market` changes.

**Delegates to:** `generateCustomShape`, `generateBellShape`, `computeStatistics` from core.

**Example:**

```tsx
function ShapeEditor({ marketId }: { marketId: number }) {
  const { market } = useMarket(marketId);
  const shape = useCustomShape(market);

  return (
    
      {shape.controlValues.map((val, i) => (
        <input
          key={i}
          type="range"
          min={0}
          max={25}
          value={val}
          onChange={(e) => shape.setControlValue(i, Number(e.target.value))}
          disabled={shape.lockedPoints.includes(i)}
        />
      ))}
      <p>Prediction: {shape.prediction?.toFixed(2)}</p>
      <button onClick={shape.resetToDefault}>Reset</button>
    
  );
}
```
