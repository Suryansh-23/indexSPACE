---
title: "computePannedDomain"
sidebar_position: 3
description: "Compute a shifted X domain after a drag-to-pan gesture, clamped to boundaries."
---

# computePannedDomain

**`computePannedDomain(params)`**

**Layer:** L0. Computes a new X domain after a drag-to-pan gesture. The domain range is preserved (only the position shifts). Dragging right shifts the view left in data space. Clamped to the full domain boundaries.

```typescript
function computePannedDomain(params: PanParams): [number, number]

interface PanParams {
  startDomain: [number, number];
  fullDomain: [number, number];
  pixelDelta: number;
  plotAreaWidth: number;
}
```
